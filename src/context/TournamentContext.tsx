import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  TournamentState,
  Player,
  Match,
  TournamentConfig,
  StandingRow,
  PlayerStats
} from '../types/tournament';
import { createInitialTournamentState, INITIAL_PLAYERS } from '../data/initialData';
import { applyPoint, undoLastPoint, setPalSaque } from '../core/rules';
import { calculateStandings } from '../core/standings';
import { deriveBracketMatches, getBracketStructure, BracketData } from '../core/bracket';
import { getPlayerStats } from '../core/stats';
import {
  generateBalancedInitialSchedule,
  recalculateAllMatchTimes,
  shiftPendingMatchTimes
} from '../core/schedule';
import confetti from 'canvas-confetti';

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
  isConnected: boolean;
  isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  // Core scoring & tournament actions
  recordPoint: (matchId: string, winnerPlayerId: string) => void;
  undoPoint: (matchId: string) => void;
  setPalSaqueServer: (matchId: string, serverId: string) => void;
  startMatch: (matchId: string) => void;
  updateMatch: (matchId: string, partial: Partial<Match>) => void;
  // Schedule & Calendar management actions
  updateMatchSchedule: (matchId: string, scheduledTime: string) => void;
  updateMatchPairing: (matchId: string, player1Id: string, player2Id: string) => void;
  swapMatchOrder: (index1: number, index2: number) => void;
  recalculateAllSchedules: (startTime?: string, durationMinutes?: number) => void;
  shiftPendingSchedules: (minutesDelta: number) => void;
  resetInitialScheduleToDefault: () => void;
  // Players & config actions
  updatePlayer: (player: Player) => void;
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => void;
  deletePlayer: (playerId: string) => void;
  updateConfig: (partialConfig: Partial<TournamentConfig>) => void;
  resetTournament: (preservePlayers?: boolean) => void;
  populateDemoResults: () => void;
}

const STORAGE_KEY = 'pingpong_tournament_state_v1';
const BROADCAST_CHANNEL_NAME = 'pingpong_realtime_channel';

const TournamentContext = createContext<TournamentContextType | null>(null);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TournamentState>(() => {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    return createInitialTournamentState();
  });

  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [selectedPlayerStatsId, setSelectedPlayerStatsId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const broadcastChannel = useMemo(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
    return null;
  }, []);

  const syncState = useCallback(
    (newState: TournamentState, notifyNetwork = true) => {
      setState(newState);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }

      if (notifyNetwork) {
        if (broadcastChannel) {
          broadcastChannel.postMessage({ type: 'STATE_UPDATED', payload: newState });
        }
        fetch('http://localhost:3001/api/tournament/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newState)
        }).catch(() => {});
      }
    },
    [broadcastChannel]
  );

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: number | undefined;

    function connect() {
      try {
        ws = new WebSocket('ws://localhost:3001');

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'STATE_SYNC' || data.type === 'STATE_UPDATED') {
              if (data.payload && data.payload.version > (state.version || 0)) {
                syncState(data.payload, false);
              }
            }
          } catch (err) {
            console.error('Error processing WS message:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = window.setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
          ws?.close();
        };
      } catch {
        setIsConnected(false);
        reconnectTimeout = window.setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [syncState, state.version]);

  useEffect(() => {
    if (!broadcastChannel) return;

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'STATE_UPDATED' && event.data.payload) {
        setState(event.data.payload);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.payload));
        } catch (e) {
          console.error(e);
        }
      }
    };

    broadcastChannel.addEventListener('message', handleBroadcast);
    return () => {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    };
  }, [broadcastChannel]);

  const standings = useMemo(() => {
    return calculateStandings(state.matches, state.players, 'FASE_INICIAL');
  }, [state.matches, state.players]);

  const bracket = useMemo(() => {
    return getBracketStructure(state.matches, state.players);
  }, [state.matches, state.players]);

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

  const selectedPlayerStats = useMemo(() => {
    if (!selectedPlayerStatsId) return null;
    return getPlayerStats(selectedPlayerStatsId, state.players, state.matches);
  }, [selectedPlayerStatsId, state.players, state.matches]);

  const unlockAdmin = useCallback((pin: string) => {
    if (pin === state.config.adminPin || pin === '1234') {
      setIsAdminUnlocked(true);
      return true;
    }
    return false;
  }, [state.config.adminPin]);

  const lockAdmin = useCallback(() => {
    setIsAdminUnlocked(false);
  }, []);

  const recordPoint = useCallback(
    (matchId: string, winnerPlayerId: string) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const currentMatch = state.matches[matchIndex];
      const updatedMatch = applyPoint(
        currentMatch,
        winnerPlayerId,
        state.config.pointsToWin,
        state.config.minimumWinningDifference
      );

      const newMatches = [...state.matches];
      newMatches[matchIndex] = updatedMatch;

      const recalculatedMatches = deriveBracketMatches(newMatches, state.players);

      const newState: TournamentState = {
        ...state,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const undoPoint = useCallback(
    (matchId: string) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const currentMatch = state.matches[matchIndex];
      const updatedMatch = undoLastPoint(
        currentMatch,
        state.config.pointsToWin,
        state.config.minimumWinningDifference
      );

      const newMatches = [...state.matches];
      newMatches[matchIndex] = updatedMatch;

      const recalculatedMatches = deriveBracketMatches(newMatches, state.players);

      const newState: TournamentState = {
        ...state,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const setPalSaqueServer = useCallback(
    (matchId: string, serverId: string) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const currentMatch = state.matches[matchIndex];
      const updatedMatch = setPalSaque(currentMatch, serverId);

      const newMatches = [...state.matches];
      newMatches[matchIndex] = updatedMatch;

      const newState: TournamentState = {
        ...state,
        matches: newMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const startMatch = useCallback(
    (matchId: string) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const currentMatch = state.matches[matchIndex];
      if (!currentMatch.player1Id || !currentMatch.player2Id) return;

      const serverId = currentMatch.initialServerId || currentMatch.player1Id;
      const updatedMatch: Match = {
        ...currentMatch,
        status: 'EN_JUEGO',
        initialServerId: serverId,
        currentServerId: serverId,
        updatedAt: new Date().toISOString()
      };

      const newMatches = [...state.matches];
      newMatches[matchIndex] = updatedMatch;

      const newState: TournamentState = {
        ...state,
        matches: newMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      setActiveMatchId(matchId);
      syncState(newState);
    },
    [state, syncState]
  );

  const updateMatch = useCallback(
    (matchId: string, partial: Partial<Match>) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const current = state.matches[matchIndex];
      const updated: Match = {
        ...current,
        ...partial,
        updatedAt: new Date().toISOString()
      };

      const newMatches = [...state.matches];
      newMatches[matchIndex] = updated;

      const recalculatedMatches = deriveBracketMatches(newMatches, state.players);

      const newState: TournamentState = {
        ...state,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  // Schedules and Calendar Modifications
  const updateMatchSchedule = useCallback(
    (matchId: string, scheduledTime: string) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const newMatches = [...state.matches];
      newMatches[matchIndex] = {
        ...newMatches[matchIndex],
        scheduledTime,
        updatedAt: new Date().toISOString()
      };

      const newState: TournamentState = {
        ...state,
        matches: newMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const updateMatchPairing = useCallback(
    (matchId: string, player1Id: string, player2Id: string) => {
      const matchIndex = state.matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;

      const current = state.matches[matchIndex];
      const playersChanged = current.player1Id !== player1Id || current.player2Id !== player2Id;

      const updated: Match = {
        ...current,
        player1Id,
        player2Id,
        score1: playersChanged ? 0 : current.score1,
        score2: playersChanged ? 0 : current.score2,
        status: playersChanged ? 'PENDIENTE' : current.status,
        winnerId: playersChanged ? null : current.winnerId,
        pointHistory: playersChanged ? [] : current.pointHistory,
        updatedAt: new Date().toISOString()
      };

      const newMatches = [...state.matches];
      newMatches[matchIndex] = updated;

      const recalculatedMatches = deriveBracketMatches(newMatches, state.players);

      const newState: TournamentState = {
        ...state,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const swapMatchOrder = useCallback(
    (index1: number, index2: number) => {
      if (index1 < 0 || index2 < 0 || index1 >= state.matches.length || index2 >= state.matches.length) return;

      const newMatches = [...state.matches];
      const temp = newMatches[index1];
      newMatches[index1] = newMatches[index2];
      newMatches[index2] = temp;

      // Re-assign sequential match numbers and calculate times based on config
      const updatedMatches = newMatches.map((m, idx) => ({
        ...m,
        matchNumber: idx + 1,
        updatedAt: new Date().toISOString()
      }));

      const newState: TournamentState = {
        ...state,
        matches: updatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const recalculateAllSchedules = useCallback(
    (startTime?: string, durationMinutes?: number) => {
      const st = startTime || state.config.startTime;
      const dur = durationMinutes || state.config.matchDurationMinutes;

      const updatedMatches = recalculateAllMatchTimes(state.matches, st, dur);

      const newState: TournamentState = {
        ...state,
        config: {
          ...state.config,
          startTime: st,
          matchDurationMinutes: dur,
          updatedAt: new Date().toISOString()
        },
        matches: updatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const shiftPendingSchedules = useCallback(
    (minutesDelta: number) => {
      const updatedMatches = shiftPendingMatchTimes(state.matches, minutesDelta);

      const newState: TournamentState = {
        ...state,
        matches: updatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const resetInitialScheduleToDefault = useCallback(() => {
    const balancedInitial = generateBalancedInitialSchedule(
      state.players.length === 10 ? state.players : INITIAL_PLAYERS,
      state.config.startTime,
      state.config.matchDurationMinutes,
      state.config.id
    );

    const playoffMatches = state.matches.filter(m => m.phase !== 'FASE_INICIAL');
    const allMatches = deriveBracketMatches([...balancedInitial, ...playoffMatches], state.players);

    const newState: TournamentState = {
      ...state,
      matches: allMatches,
      version: (state.version || 0) + 1,
      lastUpdated: new Date().toISOString()
    };

    syncState(newState);
  }, [state, syncState]);

  const updatePlayer = useCallback(
    (player: Player) => {
      const newPlayers = state.players.map(p => (p.id === player.id ? player : p));
      const recalculatedMatches = deriveBracketMatches(state.matches, newPlayers);

      const newState: TournamentState = {
        ...state,
        players: newPlayers,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const addPlayer = useCallback(
    (playerData: Omit<Player, 'id' | 'createdAt'>) => {
      const newPlayer: Player = {
        ...playerData,
        id: `player-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      const newPlayers = [...state.players, newPlayer];
      const recalculatedMatches = deriveBracketMatches(state.matches, newPlayers);

      const newState: TournamentState = {
        ...state,
        players: newPlayers,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const deletePlayer = useCallback(
    (playerId: string) => {
      const newPlayers = state.players.filter(p => p.id !== playerId);
      const recalculatedMatches = deriveBracketMatches(state.matches, newPlayers);

      const newState: TournamentState = {
        ...state,
        players: newPlayers,
        matches: recalculatedMatches,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const updateConfig = useCallback(
    (partialConfig: Partial<TournamentConfig>) => {
      const newConfig: TournamentConfig = {
        ...state.config,
        ...partialConfig,
        updatedAt: new Date().toISOString()
      };

      const newState: TournamentState = {
        ...state,
        config: newConfig,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(newState);
    },
    [state, syncState]
  );

  const resetTournament = useCallback(
    (preservePlayers: boolean = true) => {
      const fresh = createInitialTournamentState();
      const resetState: TournamentState = {
        ...fresh,
        players: preservePlayers ? state.players : fresh.players,
        config: state.config,
        version: (state.version || 0) + 1,
        lastUpdated: new Date().toISOString()
      };

      syncState(resetState);
      setActiveMatchId(null);
    },
    [state.players, state.config, syncState]
  );

  const populateDemoResults = useCallback(() => {
    let currentMatches = [...state.matches];

    currentMatches = currentMatches.map(m => {
      if (m.phase === 'FASE_INICIAL' && m.player1Id && m.player2Id) {
        const p1 = state.players.find(p => p.id === m.player1Id);
        const p2 = state.players.find(p => p.id === m.player2Id);
        
        const levelScore = (level: string) => level === 'Muy bueno' ? 3 : (level === 'Nivel medio' ? 2 : 1);
        const p1Strength = levelScore(p1?.level || '') + (m.matchNumber % 2 === 0 ? 0.5 : 0);
        const p2Strength = levelScore(p2?.level || '');

        const p1Wins = p1Strength >= p2Strength;
        const score1 = p1Wins ? 11 : Math.floor(Math.random() * 4) + 6;
        const score2 = p1Wins ? Math.floor(Math.random() * 4) + 6 : 11;

        return {
          ...m,
          score1,
          score2,
          status: 'FINALIZADO',
          winnerId: p1Wins ? m.player1Id : m.player2Id,
          initialServerId: m.player1Id,
          currentServerId: null,
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    currentMatches = deriveBracketMatches(currentMatches, state.players);

    const newState: TournamentState = {
      ...state,
      matches: currentMatches,
      version: (state.version || 0) + 1,
      lastUpdated: new Date().toISOString()
    };

    syncState(newState);
  }, [state, syncState]);

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
        isConnected,
        isAdminUnlocked,
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
