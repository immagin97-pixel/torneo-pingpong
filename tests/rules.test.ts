import { describe, it, expect } from 'vitest';
import { isMatchFinished, getMatchWinner, getNextServer, applyPoint, undoLastPoint, setPalSaque } from '../src/core/rules';
import { Match } from '../src/types/tournament';

describe('Reglamento de Partidos y Puntuación', () => {
  it('11-0 debe finalizar el partido', () => {
    expect(isMatchFinished(11, 0)).toBe(true);
    expect(isMatchFinished(0, 11)).toBe(true);
  });

  it('11-8 debe finalizar el partido', () => {
    expect(isMatchFinished(11, 8)).toBe(true);
    expect(isMatchFinished(8, 11)).toBe(true);
  });

  it('11-9 debe finalizar el partido', () => {
    expect(isMatchFinished(11, 9)).toBe(true);
    expect(isMatchFinished(9, 11)).toBe(true);
  });

  it('11-10 NO debe finalizar el partido (requiere ventaja de 2)', () => {
    expect(isMatchFinished(11, 10)).toBe(false);
    expect(isMatchFinished(10, 11)).toBe(false);
  });

  it('12-10 debe finalizar el partido', () => {
    expect(isMatchFinished(12, 10)).toBe(true);
    expect(isMatchFinished(10, 12)).toBe(true);
  });

  it('12-11 NO debe finalizar el partido', () => {
    expect(isMatchFinished(12, 11)).toBe(false);
    expect(isMatchFinished(11, 12)).toBe(false);
  });

  it('13-11 debe finalizar el partido', () => {
    expect(isMatchFinished(13, 11)).toBe(true);
    expect(isMatchFinished(11, 13)).toBe(true);
  });

  it('14-12 debe finalizar el partido', () => {
    expect(isMatchFinished(14, 12)).toBe(true);
    expect(isMatchFinished(12, 14)).toBe(true);
  });

  it('Identifica correctamente al ganador del partido', () => {
    expect(getMatchWinner(11, 9, 'p1', 'p2')).toBe('p1');
    expect(getMatchWinner(10, 12, 'p1', 'p2')).toBe('p2');
    expect(getMatchWinner(11, 10, 'p1', 'p2')).toBeNull();
  });
});

describe('Lógica del Saque y Pal Saque', () => {
  it('El saque inicial se asigna mediante Pal Saque', () => {
    const match: Match = {
      id: 'm1',
      tournamentId: 't1',
      phase: 'FASE_INICIAL',
      matchNumber: 1,
      scheduledTime: '11:00',
      player1Id: 'p1',
      player2Id: 'p2',
      score1: 0,
      score2: 0,
      status: 'PENDIENTE',
      winnerId: null,
      initialServerId: null,
      currentServerId: null,
      pointHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const matchWithPalSaque = setPalSaque(match, 'p2');
    expect(matchWithPalSaque.initialServerId).toBe('p2');
    expect(matchWithPalSaque.currentServerId).toBe('p2');
  });

  it('El ganador del punto pasa a sacar (estilo voleibol)', () => {
    let match: Match = {
      id: 'm1',
      tournamentId: 't1',
      phase: 'FASE_INICIAL',
      matchNumber: 1,
      scheduledTime: '11:00',
      player1Id: 'p1',
      player2Id: 'p2',
      score1: 0,
      score2: 0,
      status: 'PENDIENTE',
      winnerId: null,
      initialServerId: 'p1',
      currentServerId: 'p1',
      pointHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // P1 saca y gana el punto -> P1 saca de nuevo, marcador 1-0
    match = applyPoint(match, 'p1');
    expect(match.score1).toBe(1);
    expect(match.score2).toBe(0);
    expect(match.currentServerId).toBe('p1');
    expect(match.status).toBe('EN_JUEGO');

    // P2 gana el siguiente punto -> P2 pasa a sacar, marcador 1-1
    match = applyPoint(match, 'p2');
    expect(match.score1).toBe(1);
    expect(match.score2).toBe(1);
    expect(match.currentServerId).toBe('p2');

    // P2 gana otro punto -> P2 sigue sacando, marcador 1-2
    match = applyPoint(match, 'p2');
    expect(match.score1).toBe(1);
    expect(match.score2).toBe(2);
    expect(match.currentServerId).toBe('p2');
  });

  it('Deshacer punto restaura marcador, historial y servidor previo', () => {
    let match: Match = {
      id: 'm1',
      tournamentId: 't1',
      phase: 'FASE_INICIAL',
      matchNumber: 1,
      scheduledTime: '11:00',
      player1Id: 'p1',
      player2Id: 'p2',
      score1: 0,
      score2: 0,
      status: 'PENDIENTE',
      winnerId: null,
      initialServerId: 'p1',
      currentServerId: 'p1',
      pointHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    match = applyPoint(match, 'p1'); // 1-0, saca p1
    match = applyPoint(match, 'p2'); // 1-1, saca p2
    match = applyPoint(match, 'p2'); // 1-2, saca p2

    expect(match.score1).toBe(1);
    expect(match.score2).toBe(2);
    expect(match.currentServerId).toBe('p2');

    // Deshacer punto 3 -> vuelve a 1-1 y saca p2
    match = undoLastPoint(match);
    expect(match.score1).toBe(1);
    expect(match.score2).toBe(1);
    expect(match.currentServerId).toBe('p2');

    // Deshacer punto 2 -> vuelve a 1-0 y saca p1
    match = undoLastPoint(match);
    expect(match.score1).toBe(1);
    expect(match.score2).toBe(0);
    expect(match.currentServerId).toBe('p1');

    // Deshacer punto 1 -> vuelve a 0-0 y PENDIENTE
    match = undoLastPoint(match);
    expect(match.score1).toBe(0);
    expect(match.score2).toBe(0);
    expect(match.status).toBe('PENDIENTE');
  });

  it('Finaliza automáticamente cuando se llega a 11 con ventaja de 2 y asigna ganador', () => {
    let match: Match = {
      id: 'm1',
      tournamentId: 't1',
      phase: 'FASE_INICIAL',
      matchNumber: 1,
      scheduledTime: '11:00',
      player1Id: 'p1',
      player2Id: 'p2',
      score1: 10,
      score2: 9,
      status: 'EN_JUEGO',
      winnerId: null,
      initialServerId: 'p1',
      currentServerId: 'p1',
      pointHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    match = applyPoint(match, 'p1');
    expect(match.score1).toBe(11);
    expect(match.score2).toBe(9);
    expect(match.status).toBe('FINALIZADO');
    expect(match.winnerId).toBe('p1');
  });
});
