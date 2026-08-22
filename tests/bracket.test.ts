import { describe, it, expect } from 'vitest';
import { deriveBracketMatches, getBracketStructure } from '../src/core/bracket';
import { INITIAL_PLAYERS, createInitialTournamentState } from '../src/data/initialData';
import { Match } from '../src/types/tournament';

describe('Cuadro Eliminatorio y Fases Automáticas', () => {
  it('Asigna correctamente 1º-8º a Cuartos (1v8, 2v7, 3v6, 4v5) y 9º-10º a Consolación al terminar la fase inicial', () => {
    const state = createInitialTournamentState();
    
    // Simular que los 10 partidos iniciales han finalizado
    const finishedInitialMatches: Match[] = state.matches.map(m => {
      if (m.phase === 'FASE_INICIAL') {
        const p1Num = parseInt(m.player1Id?.replace('player-', '') || '99', 10);
        const p2Num = parseInt(m.player2Id?.replace('player-', '') || '99', 10);
        const p1Wins = p1Num < p2Num;

        return {
          ...m,
          score1: p1Wins ? 11 : 5,
          score2: p1Wins ? 5 : 11,
          status: 'FINALIZADO',
          winnerId: p1Wins ? m.player1Id : m.player2Id
        };
      }
      return m;
    });

    const updatedMatches = deriveBracketMatches(finishedInitialMatches, INITIAL_PLAYERS);
    const bracket = getBracketStructure(updatedMatches, INITIAL_PLAYERS);

    expect(bracket.isInitialPhaseComplete).toBe(true);

    const qf1 = updatedMatches.find(m => m.bracketCode === 'QF1');
    const qf2 = updatedMatches.find(m => m.bracketCode === 'QF2');
    const qf3 = updatedMatches.find(m => m.bracketCode === 'QF3');
    const qf4 = updatedMatches.find(m => m.bracketCode === 'QF4');
    const cons = updatedMatches.find(m => m.bracketCode === 'CONSOLATION');

    // 1º vs 8º
    expect(qf1?.player1Id).toBe(bracket.standings[0].playerId);
    expect(qf1?.player2Id).toBe(bracket.standings[7].playerId);

    // 2º vs 7º
    expect(qf2?.player1Id).toBe(bracket.standings[1].playerId);
    expect(qf2?.player2Id).toBe(bracket.standings[6].playerId);

    // 3º vs 6º
    expect(qf3?.player1Id).toBe(bracket.standings[2].playerId);
    expect(qf3?.player2Id).toBe(bracket.standings[5].playerId);

    // 4º vs 5º
    expect(qf4?.player1Id).toBe(bracket.standings[3].playerId);
    expect(qf4?.player2Id).toBe(bracket.standings[4].playerId);

    // Consolación 9º vs 10º
    expect(cons?.player1Id).toBe(bracket.standings[8].playerId);
    expect(cons?.player2Id).toBe(bracket.standings[9].playerId);
  });

  it('Propaga ganadores de QF a Semifinales, Final y proclama Campeón', () => {
    let matches = createInitialTournamentState().matches;

    // 1. Finalizar fase inicial
    matches = matches.map(m => {
      if (m.phase === 'FASE_INICIAL') {
        return {
          ...m,
          score1: 11,
          score2: 7,
          status: 'FINALIZADO',
          winnerId: m.player1Id
        };
      }
      return m;
    });
    matches = deriveBracketMatches(matches, INITIAL_PLAYERS);

    // 2. Jugar y finalizar Cuartos de final
    matches = matches.map(m => {
      if (m.bracketCode === 'QF1' || m.bracketCode === 'QF2' || m.bracketCode === 'QF3' || m.bracketCode === 'QF4') {
        return {
          ...m,
          score1: 11,
          score2: 9,
          status: 'FINALIZADO',
          winnerId: m.player1Id
        };
      }
      return m;
    });
    matches = deriveBracketMatches(matches, INITIAL_PLAYERS);

    const sf1 = matches.find(m => m.bracketCode === 'SF1');
    const sf2 = matches.find(m => m.bracketCode === 'SF2');
    const qf1 = matches.find(m => m.bracketCode === 'QF1');
    const qf2 = matches.find(m => m.bracketCode === 'QF2');

    expect(sf1?.player1Id).toBe(qf1?.winnerId);
    expect(sf1?.player2Id).toBe(qf2?.winnerId);

    // 3. Jugar y finalizar Semifinales
    matches = matches.map(m => {
      if (m.bracketCode === 'SF1' || m.bracketCode === 'SF2') {
        return {
          ...m,
          score1: 11,
          score2: 8,
          status: 'FINALIZADO',
          winnerId: m.player1Id
        };
      }
      return m;
    });
    matches = deriveBracketMatches(matches, INITIAL_PLAYERS);

    const finalMatch = matches.find(m => m.bracketCode === 'FINAL');
    const thirdPlaceMatch = matches.find(m => m.bracketCode === '3RD_PLACE');

    expect(finalMatch?.player1Id).toBe(sf1?.player1Id); // sf1.player1Id fue el ganador
    expect(finalMatch?.player2Id).toBe(sf2?.player1Id);

    // 4. Jugar y finalizar Final
    matches = matches.map(m => {
      if (m.bracketCode === 'FINAL') {
        return {
          ...m,
          score1: 11,
          score2: 9,
          status: 'FINALIZADO',
          winnerId: m.player1Id
        };
      }
      return m;
    });

    const finalBracket = getBracketStructure(matches, INITIAL_PLAYERS);
    expect(finalBracket.champion?.id).toBe(finalMatch?.player1Id);
  });
});
