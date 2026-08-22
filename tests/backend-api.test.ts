import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3099;
const TEST_DATA_DIR = path.join(__dirname, '..', 'data_test');
const TEST_DATA_FILE = path.join(TEST_DATA_DIR, 'tournament_state.json');
const TEST_BACKUP_FILE = path.join(TEST_DATA_DIR, 'tournament_state.backup.json');

process.env.PORT = String(TEST_PORT);
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.ADMIN_PIN = '1234';

let server: http.Server;
let wsServerClients: WebSocket[] = [];

describe('Backend Express API, WebSockets, Persistencia y Concurrencia (Opción C)', () => {
  beforeAll(async () => {
    // Ensure clean test directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

    // Import the server module dynamically with test env
    const serverModule = await import('../server/index.js');
    server = serverModule.server;

    // Wait a brief moment for server to listen
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // Close all open WS clients
    for (const ws of wsServerClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }

    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Clean up test files
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  it('1. GET /api/tournament - Devuelve el estado completo del torneo y crea tournament_state.json', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/tournament`);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.players).toHaveLength(10);
    expect(json.data.matches).toHaveLength(19); // 10 initial + 4 QF + 2 SF + 1 3rd + 1 Final + 1 Consolation

    // Check JSON persistence on disk
    expect(fs.existsSync(TEST_DATA_FILE)).toBe(true);
    const diskContent = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf-8'));
    expect(diskContent.players).toHaveLength(10);
  });

  it('2. GET /api/players y GET /api/standings - Devuelve datos calculados en backend', async () => {
    const playersRes = await fetch(`http://localhost:${TEST_PORT}/api/players`);
    expect(playersRes.status).toBe(200);
    const players = await playersRes.json();
    expect(players.data).toHaveLength(10);

    const standingsRes = await fetch(`http://localhost:${TEST_PORT}/api/standings`);
    expect(standingsRes.status).toBe(200);
    const standings = await standingsRes.json();
    expect(standings.data).toHaveLength(10);
    expect(standings.data[0].position).toBe(1);
  });

  it('3. POST /api/matches/:matchId/point - Requiere PIN de administrador', async () => {
    const resWithoutPin = await fetch(`http://localhost:${TEST_PORT}/api/matches/match-init-1/point`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerPlayerId: 'player-1' })
    });
    expect(resWithoutPin.status).toBe(401);

    const resWithPin = await fetch(`http://localhost:${TEST_PORT}/api/matches/match-init-1/point`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': '1234'
      },
      body: JSON.stringify({ winnerPlayerId: 'player-1' })
    });
    expect(resWithPin.status).toBe(200);
    const json = await resWithPin.json();
    expect(json.success).toBe(true);

    const match1 = json.data.matches.find((m: any) => m.id === 'match-init-1');
    expect(match1.score1).toBe(1);
    expect(match1.score2).toBe(0);
    expect(match1.currentServerId).toBe('player-1');
  });

  it('4. POST /api/matches/:matchId/undo - Deshace el punto y persiste en JSON', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/matches/match-init-1/undo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': '1234'
      }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    const match1 = json.data.matches.find((m: any) => m.id === 'match-init-1');
    expect(match1.score1).toBe(0);
    expect(match1.score2).toBe(0);
  });

  it('5. Finalización automática a 11 puntos con ventaja de 2 y backup creado', async () => {
    // Simulate scoring until 11-0
    for (let i = 1; i <= 11; i++) {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/matches/match-init-1/point`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': '1234'
        },
        body: JSON.stringify({ winnerPlayerId: 'player-1' })
      });
      expect(res.status).toBe(200);
    }

    const res = await fetch(`http://localhost:${TEST_PORT}/api/tournament`);
    const json = await res.json();
    const match1 = json.data.matches.find((m: any) => m.id === 'match-init-1');
    expect(match1.score1).toBe(11);
    expect(match1.score2).toBe(0);
    expect(match1.status).toBe('FINALIZADO');
    expect(match1.winnerId).toBe('player-1');

    // Verify backup file exists
    expect(fs.existsSync(TEST_BACKUP_FILE)).toBe(true);
  });

  it('6. WebSocket en tiempo real: Cliente A anota un punto y Cliente B recibe el nuevo estado', async () => {
    const clientA_WS = new WebSocket(`ws://localhost:${TEST_PORT}`);
    const clientB_WS = new WebSocket(`ws://localhost:${TEST_PORT}`);
    wsServerClients.push(clientA_WS, clientB_WS);

    await Promise.all([
      new Promise((resolve) => clientA_WS.on('open', resolve)),
      new Promise((resolve) => clientB_WS.on('open', resolve))
    ]);

    // Set up listener on Client B for the upcoming update
    const clientBReceivedPromise = new Promise<any>((resolve) => {
      clientB_WS.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (
            (parsed.type === 'tournament_state_updated' || parsed.type === 'STATE_UPDATED') &&
            parsed.payload?.matches?.find((m: any) => m.id === 'match-init-2')?.score1 === 1
          ) {
            resolve(parsed.payload);
          }
        } catch {}
      });
    });

    // Admin (Client A) triggers +1 on match 2
    const postRes = await fetch(`http://localhost:${TEST_PORT}/api/matches/match-init-2/point`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-pin': '1234'
      },
      body: JSON.stringify({ winnerPlayerId: 'player-2' })
    });
    expect(postRes.status).toBe(200);

    // Client B must receive the update automatically without refresh
    const receivedState = await clientBReceivedPromise;
    const match2 = receivedState.matches.find((m: any) => m.id === 'match-init-2');
    expect(match2.score1).toBe(1);
  });

  it('7. Concurrencia de escrituras: Mutex previene sobreescrituras concurrentes', async () => {
    // Send 5 concurrent point additions simultaneously
    const promises = Array.from({ length: 5 }).map(() =>
      fetch(`http://localhost:${TEST_PORT}/api/matches/match-init-3/point`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': '1234'
        },
        body: JSON.stringify({ winnerPlayerId: 'player-3' })
      })
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r.status).toBe(200);
    }

    const stateRes = await fetch(`http://localhost:${TEST_PORT}/api/tournament`);
    const json = await stateRes.json();
    const match3 = json.data.matches.find((m: any) => m.id === 'match-init-3');
    expect(match3.score1).toBe(5); // Exact 5 points registered sequentially
  });
});
