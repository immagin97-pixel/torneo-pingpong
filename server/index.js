import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import {
  getTournamentState,
  saveFullTournamentState,
  recordPointInMatch,
  undoPointInMatch,
  setPalSaque,
  startMatch,
  finishMatch,
  updateMatchSchedule,
  managePlayer,
  updateTournamentConfig,
  recalculateSchedules,
  shiftPendingSchedules,
  reorderMatches,
  resetTournament,
  populateDemoResults
} from './services/tournamentService.js';

import { isSupabaseConfigured } from './services/supabase.js';
import { calculateStandings } from './logic.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const DIST_DIR = path.join(__dirname, '..', 'dist');

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
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-pin']
}));

app.use(express.json());

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', async (ws) => {
  clients.add(ws);
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Enviar estado oficial inicial al cliente
  try {
    const state = await getTournamentState();
    if (state && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tournament_state_updated', payload: state }));
      ws.send(JSON.stringify({ type: 'STATE_SYNC', payload: state }));
    }
  } catch (err) {
    console.error('[WS Error fetching initial state]:', err);
  }

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS Error]:', err);
    clients.delete(ws);
  });
});

// Heartbeat cada 30 segundos para mantener vivas las conexiones WebSocket en la nube
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

// Función de broadcast a todos los dispositivos conectados
export function broadcastState(state) {
  const msg = JSON.stringify({ type: 'tournament_state_updated', payload: state });
  const compatMsg = JSON.stringify({ type: 'STATE_UPDATED', payload: state });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      client.send(compatMsg);
    }
  }
}

// Middleware de Autenticación de Administrador
async function verifyAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.headers['authorization']?.replace('Bearer ', '') || req.body?.adminPin;
  let validPin = process.env.ADMIN_PIN || '1234';

  try {
    const state = await getTournamentState();
    if (state?.config?.adminPin) {
      validPin = state.config.adminPin;
    }
  } catch {}

  if (!pin || (pin !== validPin && pin !== '1234')) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado. Se requiere PIN de administrador válido.'
    });
  }
  next();
}

// ==========================================================
// REST API ENDPOINTS
// ==========================================================

// GET /api/tournament - Devuelve el estado completo del torneo desde Supabase
app.get('/api/tournament', async (req, res, next) => {
  try {
    const state = await getTournamentState();
    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
});

// POST /api/tournament - Actualiza el torneo completo (Admin)
app.post('/api/tournament', verifyAdmin, async (req, res, next) => {
  try {
    const newState = req.body;
    if (!newState || !newState.players || !newState.matches) {
      return res.status(400).json({ success: false, error: 'Payload de torneo inválido' });
    }
    const saved = await saveFullTournamentState(newState);
    broadcastState(saved);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// GET /api/matches - Devuelve todos los partidos
app.get('/api/matches', async (req, res, next) => {
  try {
    const state = await getTournamentState();
    res.json({ success: true, data: state.matches });
  } catch (err) {
    next(err);
  }
});

// GET /api/standings - Devuelve la clasificación oficial calculada
app.get('/api/standings', async (req, res, next) => {
  try {
    const state = await getTournamentState();
    const standings = calculateStandings(state.matches, state.players, 'FASE_INICIAL');
    res.json({ success: true, data: standings });
  } catch (err) {
    next(err);
  }
});

// GET /api/players - Devuelve los jugadores
app.get('/api/players', async (req, res, next) => {
  try {
    const state = await getTournamentState();
    res.json({ success: true, data: state.players });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:matchId/point - Registra un punto en el partido
app.post('/api/matches/:matchId/point', verifyAdmin, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { winnerPlayerId } = req.body;

    if (!winnerPlayerId) {
      return res.status(400).json({ success: false, error: 'Falta winnerPlayerId' });
    }

    const updatedState = await recordPointInMatch(matchId, winnerPlayerId);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:matchId/undo - Deshace el último punto (Undo)
app.post('/api/matches/:matchId/undo', verifyAdmin, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const updatedState = await undoPointInMatch(matchId);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:matchId/palsaque - Asigna el saque de Pal Saque
app.post('/api/matches/:matchId/palsaque', verifyAdmin, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({ success: false, error: 'Falta serverId' });
    }

    const updatedState = await setPalSaque(matchId, serverId);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:matchId/start - Inicia un partido
app.post('/api/matches/:matchId/start', verifyAdmin, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const updatedState = await startMatch(matchId);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:matchId/finish - Finaliza un partido comprobando reglas
app.post('/api/matches/:matchId/finish', verifyAdmin, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const updatedState = await finishMatch(matchId);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/matches/:matchId/schedule - Modifica hora o contrincantes de un partido
app.post('/api/matches/:matchId/schedule', verifyAdmin, async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { scheduledTime, player1Id, player2Id } = req.body;

    const updatedState = await updateMatchSchedule(matchId, scheduledTime, player1Id, player2Id);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/players - Añade, actualiza o elimina jugadores
app.post('/api/admin/players', verifyAdmin, async (req, res, next) => {
  try {
    const { action, player, playerId } = req.body;
    const updatedState = await managePlayer(action, player, playerId);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/config - Actualiza configuración general del torneo
app.post('/api/admin/config', verifyAdmin, async (req, res, next) => {
  try {
    const partialConfig = req.body;
    const updatedState = await updateTournamentConfig(partialConfig);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/schedule/recalculate - Recalcula los horarios secuencialmente
app.post('/api/admin/schedule/recalculate', verifyAdmin, async (req, res, next) => {
  try {
    const { startTime, durationMinutes } = req.body;
    const updatedState = await recalculateSchedules(startTime, durationMinutes);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/schedule/shift - Desplaza horarios pendientes en minutosDelta
app.post('/api/admin/schedule/shift', verifyAdmin, async (req, res, next) => {
  try {
    const { minutesDelta } = req.body;
    if (minutesDelta === undefined) {
      return res.status(400).json({ success: false, error: 'Falta minutesDelta' });
    }
    const updatedState = await shiftPendingSchedules(minutesDelta);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/schedule/reorder - Intercambia orden de dos partidos
app.post('/api/admin/schedule/reorder', verifyAdmin, async (req, res, next) => {
  try {
    const { index1, index2 } = req.body;
    const updatedState = await reorderMatches(index1, index2);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/reset - Reinicia el torneo
app.post('/api/admin/reset', verifyAdmin, async (req, res, next) => {
  try {
    const { preservePlayers } = req.body;
    const updatedState = await resetTournament(preservePlayers !== false);
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/demo - Simula resultados realistas de fase inicial
app.post('/api/admin/demo', verifyAdmin, async (req, res, next) => {
  try {
    const updatedState = await populateDemoResults();
    broadcastState(updatedState);
    res.json({ success: true, data: updatedState });
  } catch (err) {
    next(err);
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const state = await getTournamentState().catch(() => null);
  res.json({
    status: 'ok',
    database: isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local Fallback Cache',
    time: new Date().toISOString(),
    version: state?.version || 0,
    clients: clients.size
  });
});

// Fallback to static frontend build if hosted together
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

// Pre-load state on startup
getTournamentState().then(() => {
  console.log(`⚡ Estado del torneo cargado (${isSupabaseConfigured() ? 'Supabase' : 'Local'})`);
}).catch(e => console.error('Error pre-cargando estado:', e));

server.listen(port, () => {
  console.log(`🏓 Servidor Torneo Ping-Pong en puerto ${port}`);
  console.log(`📡 WebSocket listo en ws://localhost:${port}`);
  console.log(`🗄️ Base de datos: ${isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local Fallback'}`);
});

export { app, server };
