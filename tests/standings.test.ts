import { describe, it, expect } from 'vitest';
import { calculateStandings } from '../src/core/standings';
import { Player, Match } from '../src/types/tournament';

describe('Sistema de Clasificación y Desempates', () => {
  const pA: Player = { id: 'pA', name: 'Alejandro Viñeta', level: 'Muy bueno', initialSeed: 1, createdAt: '' };
  const pB: Player = { id: 'pB', name: 'Pol Ginebra', level: 'Muy bueno', initialSeed: 2, createdAt: '' };
  const pC: Player = { id: 'pC', name: 'Joan Ginebra', level: 'Muy bueno', initialSeed: 3, createdAt: '' };
  const pD: Player = { id: 'pD', name: 'Alex Viñeta', level: 'Nivel medio', initialSeed: 4, createdAt: '' };

  it('Criterio 1: 1 punto por victoria, 0 por derrota. Mayor número de victorias queda por delante', () => {
    const players = [pA, pB];
    const matches: Match[] = [
      {
        id: 'm1',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 1,
        scheduledTime: '11:00',
        player1Id: 'pA',
        player2Id: 'pB',
        score1: 11,
        score2: 8,
        status: 'FINALIZADO',
        winnerId: 'pA',
        initialServerId: 'pA',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      }
    ];

    const standings = calculateStandings(matches, players);
    expect(standings[0].playerId).toBe('pA');
    expect(standings[0].puntos).toBe(1);
    expect(standings[0].pg).toBe(1);
    expect(standings[0].pp).toBe(0);

    expect(standings[1].playerId).toBe('pB');
    expect(standings[1].puntos).toBe(0);
    expect(standings[1].pg).toBe(0);
    expect(standings[1].pp).toBe(1);
  });

  it('Criterio 2 (Desempate por DIF): Si empatan a puntos, mayor DIF queda por delante (+5 > +4)', () => {
    // Ejemplo exacto del enunciado:
    // Jugador A: 2 victorias (2 pts), PF=22, PC=17, DIF=+5
    // Jugador B: 2 victorias (2 pts), PF=23, PC=19, DIF=+4
    const players = [pB, pA]; // pB primero en lista para probar ordenación
    const matches: Match[] = [
      // Partidos de pA: 11-8 (+3) y 11-9 (+2) -> PF=22, PC=17, DIF=+5
      {
        id: 'm1',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 1,
        scheduledTime: '11:00',
        player1Id: 'pA',
        player2Id: 'dummy1',
        score1: 11,
        score2: 8,
        status: 'FINALIZADO',
        winnerId: 'pA',
        initialServerId: 'pA',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'm2',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 2,
        scheduledTime: '11:10',
        player1Id: 'pA',
        player2Id: 'dummy2',
        score1: 11,
        score2: 9,
        status: 'FINALIZADO',
        winnerId: 'pA',
        initialServerId: 'pA',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      // Partidos de pB: 11-9 (+2) y 12-10 (+2) -> PF=23, PC=19, DIF=+4
      {
        id: 'm3',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 3,
        scheduledTime: '11:20',
        player1Id: 'pB',
        player2Id: 'dummy3',
        score1: 11,
        score2: 9,
        status: 'FINALIZADO',
        winnerId: 'pB',
        initialServerId: 'pB',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'm4',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 4,
        scheduledTime: '11:30',
        player1Id: 'pB',
        player2Id: 'dummy4',
        score1: 12,
        score2: 10,
        status: 'FINALIZADO',
        winnerId: 'pB',
        initialServerId: 'pB',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      }
    ];

    const standings = calculateStandings(matches, players);
    expect(standings[0].playerId).toBe('pA');
    expect(standings[0].dif).toBe(5);
    expect(standings[1].playerId).toBe('pB');
    expect(standings[1].dif).toBe(4);
  });

  it('Criterio 3 (Desempate por PF): Si empatan a puntos y DIF, mayor PF queda por delante (PF 21 > PF 19)', () => {
    // Ejemplo exacto del enunciado:
    // Jugador C: 1 victoria (1 pt), DIF=+3, PF=21
    // Jugador D: 1 victoria (1 pt), DIF=+3, PF=19
    const players = [pD, pC];
    const matches: Match[] = [
      // pC: 11-4 (+7) y 10-14 (-4) -> PJ=2, PG=1, PP=1, Puntos=1, PF=21, PC=18, DIF=+3
      {
        id: 'm1',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 1,
        scheduledTime: '11:00',
        player1Id: 'pC',
        player2Id: 'dummy1',
        score1: 11,
        score2: 4,
        status: 'FINALIZADO',
        winnerId: 'pC',
        initialServerId: 'pC',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'm2',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 2,
        scheduledTime: '11:10',
        player1Id: 'pC',
        player2Id: 'dummy2',
        score1: 10,
        score2: 14,
        status: 'FINALIZADO',
        winnerId: 'dummy2',
        initialServerId: 'pC',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      // pD: 11-3 (+8) y 8-13 (-5) -> PJ=2, PG=1, PP=1, Puntos=1, PF=19, PC=16, DIF=+3
      {
        id: 'm3',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 3,
        scheduledTime: '11:20',
        player1Id: 'pD',
        player2Id: 'dummy3',
        score1: 11,
        score2: 3,
        status: 'FINALIZADO',
        winnerId: 'pD',
        initialServerId: 'pD',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'm4',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 4,
        scheduledTime: '11:30',
        player1Id: 'pD',
        player2Id: 'dummy4',
        score1: 8,
        score2: 13,
        status: 'FINALIZADO',
        winnerId: 'dummy4',
        initialServerId: 'pD',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      }
    ];

    const standings = calculateStandings(matches, players);
    expect(standings[0].playerId).toBe('pC');
    expect(standings[0].pf).toBe(21);
    expect(standings[1].playerId).toBe('pD');
    expect(standings[1].pf).toBe(19);
  });

  it('Criterio 4 (Orden Alfabético): Si empatan a puntos, DIF y PF, orden alfabético por nombre', () => {
    // Alejandro Viñeta vs Pol Ginebra con estadísticas idénticas
    const players = [pB, pA]; // Pol primero, Alejandro segundo
    const matches: Match[] = [
      {
        id: 'm1',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 1,
        scheduledTime: '11:00',
        player1Id: 'pA',
        player2Id: 'dummy1',
        score1: 11,
        score2: 8,
        status: 'FINALIZADO',
        winnerId: 'pA',
        initialServerId: 'pA',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'm2',
        tournamentId: 't1',
        phase: 'FASE_INICIAL',
        matchNumber: 2,
        scheduledTime: '11:10',
        player1Id: 'pB',
        player2Id: 'dummy2',
        score1: 11,
        score2: 8,
        status: 'FINALIZADO',
        winnerId: 'pB',
        initialServerId: 'pB',
        currentServerId: null,
        pointHistory: [],
        createdAt: '',
        updatedAt: ''
      }
    ];

    const standings = calculateStandings(matches, players);
    // 'Alejandro Viñeta' debe ir antes que 'Pol Ginebra' alfabéticamente
    expect(standings[0].playerId).toBe('pA');
    expect(standings[0].player.name).toBe('Alejandro Viñeta');
    expect(standings[1].playerId).toBe('pB');
    expect(standings[1].player.name).toBe('Pol Ginebra');
  });
});
