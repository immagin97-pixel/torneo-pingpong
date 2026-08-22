import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isMatchFinished,
  applyPoint,
  undoLastPoint,
  setPalSaque,
  calculateStandings,
  deriveBracketMatches,
  INITIAL_PLAYERS,
  INITIAL_CONFIG
} from '../server/logic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'tournament_state.json');

describe('Supabase Service Layer & Data Integrity', () => {
  it('1. El archivo tournament_state.json tiene la estructura válida para migración a Supabase', () => {
    expect(fs.existsSync(DATA_FILE)).toBe(true);
    const state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    expect(state.config).toBeDefined();
    expect(state.config.id).toBe('torneo-2026');
    expect(state.config.pointsToWin).toBe(11);
    expect(state.config.minimumWinningDifference).toBe(2);

    expect(state.players).toHaveLength(10);
    expect(state.players[0]).toHaveProperty('id');
    expect(state.players[0]).toHaveProperty('name');
    expect(state.players[0]).toHaveProperty('level');
    expect(state.players[0]).toHaveProperty('initialSeed');

    expect(state.matches).toHaveLength(19);
    expect(state.matches.filter((m: any) => m.phase === 'FASE_INICIAL')).toHaveLength(10);
  });

  it('2. Registro de puntos con asignación de saque estilo voleibol', () => {
    const match = {
      id: 'match-init-1',
      tournamentId: 'torneo-2026',
      phase: 'FASE_INICIAL' as const,
      matchNumber: 1,
      scheduledTime: '11:00',
      player1Id: 'player-1',
      player2Id: 'player-2',
      score1: 0,
      score2: 0,
      status: 'PENDIENTE' as const,
      winnerId: null,
      initialServerId: 'player-1',
      currentServerId: 'player-1',
      pointHistory: []
    };

    // Point 1 won by Player 2 -> server should become Player 2
    const step1 = applyPoint(match, 'player-2', 11, 2);
    expect(step1.score1).toBe(0);
    expect(step1.score2).toBe(1);
    expect(step1.currentServerId).toBe('player-2');
    expect(step1.pointHistory).toHaveLength(1);

    // Point 2 won by Player 1 -> server should become Player 1
    const step2 = applyPoint(step1, 'player-1', 11, 2);
    expect(step2.score1).toBe(1);
    expect(step2.score2).toBe(1);
    expect(step2.currentServerId).toBe('player-1');
    expect(step2.pointHistory).toHaveLength(2);
  });

  it('3. Deshacer punto (Undo) restaura fielmente el marcador y sacador previo', () => {
    const match = {
      id: 'match-init-1',
      tournamentId: 'torneo-2026',
      phase: 'FASE_INICIAL' as const,
      matchNumber: 1,
      scheduledTime: '11:00',
      player1Id: 'player-1',
      player2Id: 'player-2',
      score1: 0,
      score2: 0,
      status: 'PENDIENTE' as const,
      winnerId: null,
      initialServerId: 'player-1',
      currentServerId: 'player-1',
      pointHistory: []
    };

    const step1 = applyPoint(match, 'player-2', 11, 2);
    const step2 = applyPoint(step1, 'player-2', 11, 2);
    expect(step2.score2).toBe(2);

    const undone = undoLastPoint(step2, 11, 2);
    expect(undone.score1).toBe(0);
    expect(undone.score2).toBe(1);
    expect(undone.pointHistory).toHaveLength(1);

    const undoneToZero = undoLastPoint(undone, 11, 2);
    expect(undoneToZero.score1).toBe(0);
    expect(undoneToZero.score2).toBe(0);
    expect(undoneToZero.pointHistory).toHaveLength(0);
  });

  it('4. Cálculo de clasificación de 4 criterios a partir de partidos en Supabase', () => {
    const sampleMatches = [
      {
        id: 'm1',
        phase: 'FASE_INICIAL' as const,
        player1Id: 'player-1',
        player2Id: 'player-2',
        score1: 11,
        score2: 5,
        status: 'FINALIZADO' as const,
        winnerId: 'player-1'
      },
      {
        id: 'm2',
        phase: 'FASE_INICIAL' as const,
        player1Id: 'player-3',
        player2Id: 'player-4',
        score1: 11,
        score2: 9,
        status: 'FINALIZADO' as const,
        winnerId: 'player-3'
      }
    ];

    const standings = calculateStandings(sampleMatches as any, INITIAL_PLAYERS, 'FASE_INICIAL');
    expect(standings[0].player.id).toBe('player-1');
    expect(standings[0].puntos).toBe(1);
    expect(standings[0].dif).toBe(6); // 11 - 5 = +6

    expect(standings[1].player.id).toBe('player-3');
    expect(standings[1].puntos).toBe(1);
    expect(standings[1].dif).toBe(2); // 11 - 9 = +2
  });
});
