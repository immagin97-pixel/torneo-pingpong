import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TournamentState,
  Player,
  Match,
  TournamentConfig,
  StandingRow,
  PlayerStats
} from '../types/tournament';
import { createInitialTournamentState } from '../data/initialData';
import { calculateStandings } from '../core/standings';
import { getBracketStructure, BracketData } from '../core/bracket';
import { getPlayerStats } from '../core/stats';
import confetti from 'canvas-confetti';

export type ConnectionState = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

interface TournamentContextType {
  state: TournamentState;
  standings: StandingRow[];
  bracket: BracketData;
  activeMatch: Match | null;
  activeMatchId: string | null;
  setActiveMatchId: (id: string | null) => void;
  selectedPlayerStatsId: string | null;
  setSelectedPlayerStatsId: (id: string | null) => void;
  selectedPlayerStats: PlayerStats | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isAdminUnlocked: boolean;
  adminPin: string;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  // Core scoring & tournament actions (routed to backend)
  recordPoint: (matchId: string, winnerPlayerId: string) => Promise<void>;
  undoPoint: (matchId: string) => Promise<void>;
  setPalSaqueServer: (matchId: string, serverId: string) => Promise<void>;
  startMatch: (matchId: string) => Promise<void>;
  updateMatch: (matchId: string, partial: Partial<Match>) => Promise<void>;
  // Schedule & Calendar management actions
  updateMatchSchedule: (matchId: string, scheduledTime: string) => Promise<void>;
  updateMatchPairing: (matchId: string, player1Id: string, player2Id: string) => Promise<void>;
  swapMatchOrder: (index1: number, index2: number) => Promise<void>;
  recalculateAllSchedules: (startTime?: string, durationMinutes?: number) => Promise<void>;
  shiftPendingSchedules: (minutesDelta: number) => Promise<void>;
  resetInitialScheduleToDefault: () => Promise<void>;
  // Players & config actions
  updatePlayer: (player: Player) => Promise<void>;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  updateConfig: (partialConfig: Partial<TournamentConfig>) => Promise<void>;
  resetTournament: (preservePlayers?: boolean) => Promise<void>;
  populateDemoResults: () => Promise<void>;
}

// Compute API and WS URLs dynamically from environment variable or window location
function getBackendUrls() {
  const envApiUrl = import.meta.env.VITE_API_URL;
  let httpUrl = envApiUrl;

  if (!httpUrl) {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // If accessed via localhost or port 5173, point to backend on port 3001
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        httpUrl = `http://${hostname}:3001`;
      } else {
        httpUrl = `${window.location.protocol}//${window.location.host}`;
      }
    } else {
      httpUrl = 'http://localhost:3001';
    }
  }

  // Remove trailing slash if present
  httpUrl = httpUrl.replace(/\/$/, '');

  // Derive WebSocket URL (https -> wss, http -> ws)
  let wsUrl = httpUrl.replace(/^http/, 'ws');

  return { httpUrl, wsUrl };
}

const { httpUrl: API_BASE_URL, wsUrl: WS_BASE_URL } = getBackendUrls();

const TournamentContext = createContext<TournamentContextType | null>(null);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure in-memory reactive state (authoritative state lives solely in backend tournament_state.json)
  const [state, setState] = useState<TournamentState>(() => createInitialTournamentState());
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [selectedPlayerStatsId, setSelectedPlayerStatsId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('RECONNECTING');
  const [adminPin, setAdminPin] = useState<string>('1234');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Helper for authenticated API calls
  const apiFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-pin': adminPin,
        ...(options.headers as Record<string, string> || {})
      };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${res.status}: ${res.statusText}`);
      }

      return res.json();
    },
    [adminPin]
  );

  // Fetch full state from backend
  const fetchStateFromBackend = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tournament`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setState(data.data);
          setConnectionState('CONNECTED');
        }
      } else {
        setConnectionState('DISCONNECTED');
      }
    } catch {
      setConnectionState('DISCONNECTED');
    }
  }, []);

  // WebSocket Connection & Real-Time Sync
  useEffect(() => {
    let reconnectTimeout: number | undefined;
    let isUnmounted = false;

    function connectWs() {
      if (isUnmounted) return;
      setConnectionState('RECONNECTING');

      try {
        const ws = new WebSocket(WS_BASE_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setConnectionState('CONNECTED');
          console.log('📡 Conectado al WebSocket del Torneo en', WS_BASE_URL);
          // Sync state immediately upon connection
          fetchStateFromBackend();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'tournament_state_updated' || msg.type === 'STATE_UPDATED' || msg.type === 'STATE_SYNC') {
              if (msg.payload) {
                setState(msg.payload);
                setConnectionState('CONNECTED');
              }
            }
          } catch (err) {
            console.error('[WS Error parsing message]:', err);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setConnectionState('RECONNECTING');
          reconnectTimeout = window.setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          if (isUnmounted) return;
          setConnectionState('DISCONNECTED');
          ws.close();
        };
      } catch {
        if (!isUnmounted) {
          setConnectionState('DISCONNECTED');
          reconnectTimeout = window.setTimeout(connectWs, 5000);
        }
      }
    }

    // Initial fetch + start WS
    fetchStateFromBackend();
    connectWs();

    // 5-second polling recovery mechanism (as requested in Section 6)
    pollTimerRef.current = window.setInterval(() => {
      fetchStateFromBackend();
    }, 5000);

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchStateFromBackend]);

  // Derived Standings & Brackets
  const standings = useMemo(() => {
    return calculateStandings(state.matches, state.players, 'FASE_INICIAL');
  }, [state.matches, state.players]);

  const bracket = useMemo(() => {
    return getBracketStructure(state.matches, state.players);
  }, [state.matches, state.players]);

  // Confetti when champion is determined
  useEffect(() => {
    if (bracket.champion) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.warn('Confetti error', e);
      }
    }
  }, [bracket.champion]);

  // Active match helper
  const activeMatch = useMemo(() => {
    if (activeMatchId) {
      const found = state.matches.find(m => m.id === activeMatchId);
      if (found) return found;
    }
    const inGame = state.matches.find(m => m.status === 'EN_JUEGO');
    if (inGame) return inGame;
    const pending = state.matches.find(m => m.status === 'PENDIENTE' && m.player1Id && m.player2Id);
    if (pending) return pending;
    return state.matches[0] || null;
  }, [activeMatchId, state.matches]);

  // Selected player stats
  const selectedPlayerStats = useMemo(() => {
    if (!selectedPlayerStatsId) return null;
    return getPlayerStats(selectedPlayerStatsId, state.players, state.matches);
  }, [selectedPlayerStatsId, state.players, state.matches]);

  // Admin PIN verification
  const unlockAdmin = useCallback((pin: string) => {
    if (pin === state.config.adminPin || pin === '1234') {
      setAdminPin(pin);
      setIsAdminUnlocked(true);
      return true;
    }
    return false;
  }, [state.config.adminPin]);

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
  }, []);

  // ==========================================
  // BACKEND API MUTATION ACTIONS
  // ==========================================

  const recordPoint = useCallback(
    async (matchId: string, winnerPlayerId: string) => {
      const data = await apiFetch(`/api/matches/${matchId}/point`, {
        method: 'POST',
        body: JSON.stringify({ winnerPlayerId })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const undoPoint = useCallback(
    async (matchId: string) => {
      const data = await apiFetch(`/api/matches/${matchId}/undo`, {
        method: 'POST'
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const setPalSaqueServer = useCallback(
    async (matchId: string, serverId: string) => {
      const data = await apiFetch(`/api/matches/${matchId}/palsaque`, {
        method: 'POST',
        body: JSON.stringify({ serverId })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const startMatch = useCallback(
    async (matchId: string) => {
      const data = await apiFetch(`/api/matches/${matchId}/start`, {
        method: 'POST'
      });
      if (data.success && data.data) {
        setState(data.data);
        setActiveMatchId(matchId);
      }
    },
    [apiFetch]
  );

  const updateMatch = useCallback(
    async (matchId: string, partial: Partial<Match>) => {
      const data = await apiFetch(`/api/matches/${matchId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(partial)
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const updateMatchSchedule = useCallback(
    async (matchId: string, scheduledTime: string) => {
      const data = await apiFetch(`/api/matches/${matchId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduledTime })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const updateMatchPairing = useCallback(
    async (matchId: string, player1Id: string, player2Id: string) => {
      const data = await apiFetch(`/api/matches/${matchId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ player1Id, player2Id })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const swapMatchOrder = useCallback(
    async (index1: number, index2: number) => {
      const data = await apiFetch(`/api/admin/schedule/reorder`, {
        method: 'POST',
        body: JSON.stringify({ index1, index2 })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const recalculateAllSchedules = useCallback(
    async (startTime?: string, durationMinutes?: number) => {
      const data = await apiFetch(`/api/admin/schedule/recalculate`, {
        method: 'POST',
        body: JSON.stringify({ startTime, durationMinutes })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const shiftPendingSchedules = useCallback(
    async (minutesDelta: number) => {
      const data = await apiFetch(`/api/admin/schedule/shift`, {
        method: 'POST',
        body: JSON.stringify({ minutesDelta })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const resetInitialScheduleToDefault = useCallback(
    async () => {
      const data = await apiFetch(`/api/admin/reset`, {
        method: 'POST',
        body: JSON.stringify({ preservePlayers: true })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const updatePlayer = useCallback(
    async (player: Player) => {
      const data = await apiFetch(`/api/admin/players`, {
        method: 'POST',
        body: JSON.stringify({ action: 'update', player })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const addPlayer = useCallback(
    async (playerData: Omit<Player, 'id' | 'createdAt'>) => {
      const data = await apiFetch(`/api/admin/players`, {
        method: 'POST',
        body: JSON.stringify({ action: 'add', player: playerData })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const deletePlayer = useCallback(
    async (playerId: string) => {
      const data = await apiFetch(`/api/admin/players`, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', playerId })
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const updateConfig = useCallback(
    async (partialConfig: Partial<TournamentConfig>) => {
      const data = await apiFetch(`/api/admin/config`, {
        method: 'POST',
        body: JSON.stringify(partialConfig)
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  const resetTournament = useCallback(
    async (preservePlayers: boolean = true) => {
      const data = await apiFetch(`/api/admin/reset`, {
        method: 'POST',
        body: JSON.stringify({ preservePlayers })
      });
      if (data.success && data.data) {
        setState(data.data);
        setActiveMatchId(null);
      }
    },
    [apiFetch]
  );

  const populateDemoResults = useCallback(
    async () => {
      const data = await apiFetch(`/api/admin/demo`, {
        method: 'POST'
      });
      if (data.success && data.data) {
        setState(data.data);
      }
    },
    [apiFetch]
  );

  return (
    <TournamentContext.Provider
      value={{
        state,
        standings,
        bracket,
        activeMatch,
        activeMatchId,
        setActiveMatchId,
        selectedPlayerStatsId,
        setSelectedPlayerStatsId,
        selectedPlayerStats,
        connectionState,
        isConnected: connectionState === 'CONNECTED',
        isAdminUnlocked,
        adminPin,
        unlockAdmin,
        lockAdmin,
        recordPoint,
        undoPoint,
        setPalSaqueServer,
        startMatch,
        updateMatch,
        updateMatchSchedule,
        updateMatchPairing,
        swapMatchOrder,
        recalculateAllSchedules,
        shiftPendingSchedules,
        resetInitialScheduleToDefault,
        updatePlayer,
        addPlayer,
        deletePlayer,
        updateConfig,
        resetTournament,
        populateDemoResults
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};
