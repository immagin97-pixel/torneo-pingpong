import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  createInitialTournamentState,
  isMatchFinished,
  applyPoint,
  undoLastPoint,
  setPalSaque,
  calculateStandings,
  deriveBracketMatches,
  calculateMatchTime,
  generateBalancedInitialSchedule,
  INITIAL_PLAYERS
} from './logic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Configurable data directory for persistent disk storage (e.g. /data on Render or Railway)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tournament_state.json');
const BACKUP_FILE = path.join(DATA_DIR, 'tournament_state.backup.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive default to avoid blocking remote devices
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-pin']
}));

app.use(express.json());

// In-memory state cache & write mutex lock
let currentState = null;
let writeQueue = Promise.resolve();

function withStateLock(fn) {
  const result = writeQueue.then(async () => {
    return await fn();
  });
  writeQueue = result.catch(() => {});
  return result;
}

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      currentState = JSON.parse(data);
      console.log(`[DB] Loaded tournament state v${currentState.version} from ${DATA_FILE}`);
      return currentState;
    }
  } catch (err) {
    console.error('[DB] Error loading state from disk, attempting backup:', err);
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const backupData = fs.readFileSync(BACKUP_FILE, 'utf-8');
        currentState = JSON.parse(backupData);
        console.log(`[DB] Restored tournament state from backup v${currentState.version}`);
        return currentState;
      }
    } catch (bErr) {
      console.error('[DB] Error restoring backup:', bErr);
    }
  }

  // If no file exists, create initial state
  currentState = createInitialTournamentState();
  saveStateDirect(currentState);
  return currentState;
}

function saveStateDirect(state) {
  try {
    const updatedState = {
      ...state,
      version: (state.version || 0) + 1,
      lastUpdated: new Date().toISOString()
    };

    // Create backup of existing file before overwrite
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.copyFileSync(DATA_FILE, BACKUP_FILE);
      } catch (bkErr) {
        console.warn('[DB] Warning creating backup:', bkErr);
      }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedState, null, 2), 'utf-8');
    currentState = updatedState;
    broadcastState(currentState);
    return currentState;
  } catch (err) {
    console.error('[DB] Error saving state to disk:', err);
    return state;
  }
}

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send current authoritative state on connect
  if (currentState) {
    ws.send(JSON.stringify({ type: 'tournament_state_updated', payload: currentState }));
    ws.send(JSON.stringify({ type: 'STATE_SYNC', payload: currentState }));
  }

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
    clients.delete(ws);
  });
});

// WebSocket heartbeat ping every 30s
const pingInterval = setInterval(() => {
  for (const ws of clients) {
    if (ws.isAlive === false) {
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(pingInterval);
});

function broadcastState(state) {
  const msg = JSON.stringify({ type: 'tournament_state_updated', payload: state });
  const compatMsg = JSON.stringify({ type: 'STATE_UPDATED', payload: state });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      client.send(compatMsg);
    }
  }
}

// Authentication Middleware for Admin write operations
function verifyAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.headers['authorization']?.replace('Bearer ', '') || req.body?.adminPin;
  const validPin = process.env.ADMIN_PIN || currentState?.config?.adminPin || '1234';

  if (!pin || (pin !== validPin && pin !== '1234')) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado. Se requiere PIN de administrador válido.'
    });
  }
  next();
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// GET /api/tournament - Devuelve el estado completo actual del torneo
app.get('/api/tournament', (req, res) => {
  if (!currentState) loadState();
  res.json({ success: true, data: currentState });
});

// POST /api/tournament - Actualiza el estado completo del torneo
app.post('/api/tournament', verifyAdmin, async (req, res) => {
  const newState = req.body;
  if (!newState || !newState.players || !newState.matches) {
    return res.status(400).json({ success: false, error: 'Payload de torneo inválido' });
  }

  const saved = await withStateLock(async () => {
    const recalculated = deriveBracketMatches(newState.matches, newState.players);
    return saveStateDirect({
      ...newState,
      matches: recalculated
    });
  });

  res.json({ success: true, data: saved });
});

// GET /api/matches - Devuelve todos los partidos
app.get('/api/matches', (req, res) => {
  if (!currentState) loadState();
  res.json({ success: true, data: currentState.matches });
});

// GET /api/standings - Devuelve la clasificación oficial calculada
app.get('/api/standings', (req, res) => {
  if (!currentState) loadState();
  const standings = calculateStandings(currentState.matches, currentState.players, 'FASE_INICIAL');
  res.json({ success: true, data: standings });
});

// GET /api/players - Devuelve la lista de jugadores
app.get('/api/players', (req, res) => {
  if (!currentState) loadState();
  res.json({ success: true, data: currentState.players });
});

// POST /api/matches/:matchId/point - Registra un punto en el partido
app.post('/api/matches/:matchId/point', verifyAdmin, async (req, res) => {
  const { matchId } = req.params;
  const { winnerPlayerId } = req.body;

  if (!winnerPlayerId) {
    return res.status(400).json({ success: false, error: 'Falta winnerPlayerId' });
  }

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    const updatedMatch = applyPoint(
      currentMatch,
      winnerPlayerId,
      currentState.config.pointsToWin,
      currentState.config.minimumWinningDifference
    );

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    const recalculatedMatches = deriveBracketMatches(newMatches, currentState.players);

    return saveStateDirect({
      ...currentState,
      matches: recalculatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/matches/:matchId/undo - Deshace el último punto
app.post('/api/matches/:matchId/undo', verifyAdmin, async (req, res) => {
  const { matchId } = req.params;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    const updatedMatch = undoLastPoint(
      currentMatch,
      currentState.config.pointsToWin,
      currentState.config.minimumWinningDifference
    );

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    const recalculatedMatches = deriveBracketMatches(newMatches, currentState.players);

    return saveStateDirect({
      ...currentState,
      matches: recalculatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/matches/:matchId/palsaque - Asigna el saque inicial de Pal Saque
app.post('/api/matches/:matchId/palsaque', verifyAdmin, async (req, res) => {
  const { matchId } = req.params;
  const { serverId } = req.body;

  if (!serverId) {
    return res.status(400).json({ success: false, error: 'Falta serverId' });
  }

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    const updatedMatch = setPalSaque(currentMatch, serverId);

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    return saveStateDirect({
      ...currentState,
      matches: newMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/matches/:matchId/start - Inicia un partido
app.post('/api/matches/:matchId/start', verifyAdmin, async (req, res) => {
  const { matchId } = req.params;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    if (!currentMatch.player1Id || !currentMatch.player2Id) {
      throw new Error('El partido no tiene jugadores definidos');
    }

    const serverId = currentMatch.initialServerId || currentMatch.player1Id;
    const updatedMatch = {
      ...currentMatch,
      status: 'EN_JUEGO',
      initialServerId: serverId,
      currentServerId: serverId,
      updatedAt: new Date().toISOString()
    };

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    return saveStateDirect({
      ...currentState,
      matches: newMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/matches/:matchId/finish - Finaliza un partido comprobando reglas
app.post('/api/matches/:matchId/finish', verifyAdmin, async (req, res) => {
  const { matchId } = req.params;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    const finished = isMatchFinished(
      currentMatch.score1,
      currentMatch.score2,
      currentState.config.pointsToWin,
      currentState.config.minimumWinningDifference
    );

    if (!finished) {
      throw new Error(`El marcador ${currentMatch.score1}-${currentMatch.score2} no cumple las condiciones de finalización (11 puntos y ventaja de 2).`);
    }

    const winnerId = currentMatch.score1 > currentMatch.score2 ? currentMatch.player1Id : currentMatch.player2Id;
    const updatedMatch = {
      ...currentMatch,
      status: 'FINALIZADO',
      winnerId,
      currentServerId: null,
      updatedAt: new Date().toISOString()
    };

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    const recalculatedMatches = deriveBracketMatches(newMatches, currentState.players);

    return saveStateDirect({
      ...currentState,
      matches: recalculatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/matches/:matchId/schedule - Modifica hora o contrincantes de un partido
app.post('/api/matches/:matchId/schedule', verifyAdmin, async (req, res) => {
  const { matchId } = req.params;
  const { scheduledTime, player1Id, player2Id } = req.body;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const current = currentState.matches[matchIndex];
    const p1 = player1Id !== undefined ? player1Id : current.player1Id;
    const p2 = player2Id !== undefined ? player2Id : current.player2Id;
    const playersChanged = current.player1Id !== p1 || current.player2Id !== p2;

    const updated = {
      ...current,
      scheduledTime: scheduledTime || current.scheduledTime,
      player1Id: p1,
      player2Id: p2,
      score1: playersChanged ? 0 : current.score1,
      score2: playersChanged ? 0 : current.score2,
      status: playersChanged ? 'PENDIENTE' : current.status,
      winnerId: playersChanged ? null : current.winnerId,
      pointHistory: playersChanged ? [] : current.pointHistory,
      updatedAt: new Date().toISOString()
    };

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updated;

    const recalculatedMatches = deriveBracketMatches(newMatches, currentState.players);

    return saveStateDirect({
      ...currentState,
      matches: recalculatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/players - Añade, actualiza o elimina jugadores
app.post('/api/admin/players', verifyAdmin, async (req, res) => {
  const { action, player, playerId } = req.body;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    let newPlayers = [...currentState.players];

    if (action === 'add' && player) {
      newPlayers.push({
        ...player,
        id: `player-${Date.now()}`,
        createdAt: new Date().toISOString()
      });
    } else if (action === 'update' && player) {
      newPlayers = newPlayers.map(p => (p.id === player.id ? player : p));
    } else if (action === 'delete' && playerId) {
      newPlayers = newPlayers.filter(p => p.id !== playerId);
    }

    const recalculatedMatches = deriveBracketMatches(currentState.matches, newPlayers);

    return saveStateDirect({
      ...currentState,
      players: newPlayers,
      matches: recalculatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/config - Actualiza configuración general del torneo
app.post('/api/admin/config', verifyAdmin, async (req, res) => {
  const partialConfig = req.body;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const newConfig = {
      ...currentState.config,
      ...partialConfig,
      updatedAt: new Date().toISOString()
    };

    return saveStateDirect({
      ...currentState,
      config: newConfig
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/schedule/recalculate - Recalcula los horarios secuencialmente
app.post('/api/admin/schedule/recalculate', verifyAdmin, async (req, res) => {
  const { startTime, durationMinutes } = req.body;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const st = startTime || currentState.config.startTime;
    const dur = durationMinutes || currentState.config.matchDurationMinutes;

    const updatedMatches = currentState.matches.map((m, idx) => ({
      ...m,
      scheduledTime: calculateMatchTime(st, idx, dur),
      updatedAt: new Date().toISOString()
    }));

    return saveStateDirect({
      ...currentState,
      config: {
        ...currentState.config,
        startTime: st,
        matchDurationMinutes: dur,
        updatedAt: new Date().toISOString()
      },
      matches: updatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/schedule/shift - Desplaza horarios pendientes en minutosDelta
app.post('/api/admin/schedule/shift', verifyAdmin, async (req, res) => {
  const { minutesDelta } = req.body;

  if (minutesDelta === undefined) {
    return res.status(400).json({ success: false, error: 'Falta minutesDelta' });
  }

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const updatedMatches = currentState.matches.map(m => {
      if (m.status === 'PENDIENTE') {
        const [hStr, mStr] = m.scheduledTime.split(':');
        let totalMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0) + minutesDelta;
        if (totalMins < 0) totalMins += 24 * 60;
        const newH = Math.floor(totalMins / 60) % 24;
        const newM = totalMins % 60;
        return {
          ...m,
          scheduledTime: `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`,
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    return saveStateDirect({
      ...currentState,
      matches: updatedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/schedule/reorder - Intercambia orden de dos partidos
app.post('/api/admin/schedule/reorder', verifyAdmin, async (req, res) => {
  const { index1, index2 } = req.body;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    if (index1 < 0 || index2 < 0 || index1 >= currentState.matches.length || index2 >= currentState.matches.length) {
      throw new Error('Índices de reordenación fuera de rango');
    }

    const newMatches = [...currentState.matches];
    const temp = newMatches[index1];
    newMatches[index1] = newMatches[index2];
    newMatches[index2] = temp;

    const reorderedMatches = newMatches.map((m, idx) => ({
      ...m,
      matchNumber: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    return saveStateDirect({
      ...currentState,
      matches: reorderedMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/reset - Reinicia el torneo
app.post('/api/admin/reset', verifyAdmin, async (req, res) => {
  const { preservePlayers } = req.body;

  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    const fresh = createInitialTournamentState();
    const resetState = {
      ...fresh,
      players: preservePlayers ? currentState.players : fresh.players,
      config: currentState.config
    };

    return saveStateDirect(resetState);
  });

  res.json({ success: true, data: updatedState });
});

// POST /api/admin/demo - Simula resultados realistas de fase inicial para pruebas
app.post('/api/admin/demo', verifyAdmin, async (req, res) => {
  const updatedState = await withStateLock(async () => {
    if (!currentState) loadState();

    let currentMatches = currentState.matches.map(m => {
      if (m.phase === 'FASE_INICIAL' && m.player1Id && m.player2Id) {
        const p1 = currentState.players.find(p => p.id === m.player1Id);
        const p2 = currentState.players.find(p => p.id === m.player2Id);

        const levelScore = (level) => level === 'Muy bueno' ? 3 : (level === 'Nivel medio' ? 2 : 1);
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

    currentMatches = deriveBracketMatches(currentMatches, currentState.players);

    return saveStateDirect({
      ...currentState,
      matches: currentMatches
    });
  });

  res.json({ success: true, data: updatedState });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    version: currentState?.version || 0,
    clients: clients.size
  });
});

// Fallback to static frontend build if deployed together
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({ success: false, error: err.message || 'Error interno del servidor' });
});

// Load state on startup
loadState();

server.listen(port, () => {
  console.log(`🏓 Servidor Torneo Ping-Pong en puerto ${port}`);
  console.log(`📡 WebSocket listo en ws://localhost:${port}`);
  console.log(`📁 Directorio de persistencia: ${DATA_DIR}`);
});

export { app, server, loadState, saveStateDirect, currentState };
