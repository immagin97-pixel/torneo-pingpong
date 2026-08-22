import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tournament_state.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory state cache
let currentState = null;

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      currentState = JSON.parse(data);
      return currentState;
    }
  } catch (err) {
    console.error('Error loading state from disk:', err);
  }
  return null;
}

function saveState(state) {
  try {
    currentState = {
      ...state,
      version: (state.version || 0) + 1,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentState, null, 2), 'utf-8');
    broadcastState(currentState);
    return currentState;
  } catch (err) {
    console.error('Error saving state to disk:', err);
    return state;
  }
}

// Create HTTP and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send current state on connect
  if (currentState) {
    ws.send(JSON.stringify({ type: 'STATE_SYNC', payload: currentState }));
  }

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'SYNC_STATE_CLIENT') {
        saveState(parsed.payload);
      }
    } catch (e) {
      console.error('Invalid WS message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err);
    clients.delete(ws);
  });
});

function broadcastState(state) {
  const msg = JSON.stringify({ type: 'STATE_UPDATED', payload: state });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// REST API Endpoints
app.get('/api/tournament', (req, res) => {
  if (!currentState) {
    loadState();
  }
  res.json({ success: true, data: currentState });
});

app.post('/api/tournament/sync', (req, res) => {
  const newState = req.body;
  if (!newState || !newState.players || !newState.matches) {
    return res.status(400).json({ success: false, error: 'Invalid tournament payload' });
  }
  const saved = saveState(newState);
  res.json({ success: true, data: saved });
});

app.post('/api/tournament/reset', (req, res) => {
  const newState = req.body;
  const saved = saveState(newState);
  res.json({ success: true, data: saved });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), clients: clients.size });
});

// Serve frontend static build if available
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Load state on startup
loadState();

server.listen(port, () => {
  console.log(`🏓 Servidor Torneo Ping-Pong ejecutándose en http://localhost:${port}`);
  console.log(`📡 WebSocket listo en ws://localhost:${port}`);
});
