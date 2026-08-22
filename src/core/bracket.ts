import { Match, Player, StandingRow } from '../types/tournament';
import { calculateStandings } from './standings';

export interface BracketData {
  standings: StandingRow[];
  isInitialPhaseComplete: boolean;
  consolationMatch: Match | undefined;
  quarterFinals: Match[];
  semiFinals: Match[];
  thirdPlaceMatch: Match | undefined;
  finalMatch: Match | undefined;
  champion: Player | null;
  thirdPlacePlayer: Player | null;
}

/**
 * Sincroniza y deriva automáticamente los emparejamientos del cuadro eliminatorio y consolación
 * a partir de la clasificación calculada en tiempo real.
 */
export function deriveBracketMatches(
  allMatches: Match[],
  players: Player[]
): Match[] {
  // 1. Obtener la clasificación calculada de la fase inicial
  const standings = calculateStandings(allMatches, players, 'FASE_INICIAL');

  // Clasificados 1º al 8º
  const p1 = standings[0]?.playerId || null;
  const p2 = standings[1]?.playerId || null;
  const p3 = standings[2]?.playerId || null;
  const p4 = standings[3]?.playerId || null;
  const p5 = standings[4]?.playerId || null;
  const p6 = standings[5]?.playerId || null;
  const p7 = standings[6]?.playerId || null;
  const p8 = standings[7]?.playerId || null;
  // Consolación 9º y 10º
  const p9 = standings[8]?.playerId || null;
  const p10 = standings[9]?.playerId || null;

  const updatedMatches = [...allMatches];

  function updateMatchSlot(
    code: string,
    targetP1: string | null,
    targetP2: string | null,
    sourceDesc1: string,
    sourceDesc2: string
  ) {
    const idx = updatedMatches.findIndex(m => m.bracketCode === code);
    if (idx === -1) return;

    const current = updatedMatches[idx];
    const playersChanged = current.player1Id !== targetP1 || current.player2Id !== targetP2;

    if (playersChanged) {
      updatedMatches[idx] = {
        ...current,
        player1Id: targetP1,
        player2Id: targetP2,
        sourceDesc1,
        sourceDesc2,
        score1: 0,
        score2: 0,
        status: 'PENDIENTE',
        winnerId: null,
        initialServerId: null,
        currentServerId: null,
        pointHistory: [],
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedMatches[idx] = {
        ...current,
        sourceDesc1,
        sourceDesc2
      };
    }
  }

  // Comprobar si los 10 partidos iniciales han finalizado
  const initialMatches = updatedMatches.filter(m => m.phase === 'FASE_INICIAL');
  const initialPhaseFinished = initialMatches.length >= 10 && initialMatches.every(m => m.status === 'FINALIZADO');

  // Actualizar Cuartos y Consolación
  updateMatchSlot('QF1', initialPhaseFinished ? p1 : null, initialPhaseFinished ? p8 : null, '1.º Clasificado', '8.º Clasificado');
  updateMatchSlot('QF2', initialPhaseFinished ? p2 : null, initialPhaseFinished ? p7 : null, '2.º Clasificado', '7.º Clasificado');
  updateMatchSlot('QF3', initialPhaseFinished ? p3 : null, initialPhaseFinished ? p6 : null, '3.º Clasificado', '6.º Clasificado');
  updateMatchSlot('QF4', initialPhaseFinished ? p4 : null, initialPhaseFinished ? p5 : null, '4.º Clasificado', '5.º Clasificado');
  updateMatchSlot('CONSOLATION', initialPhaseFinished ? p9 : null, initialPhaseFinished ? p10 : null, '9.º Clasificado', '10.º Clasificado');

  // Obtener ganadores de Cuartos
  const qf1 = updatedMatches.find(m => m.bracketCode === 'QF1');
  const qf2 = updatedMatches.find(m => m.bracketCode === 'QF2');
  const qf3 = updatedMatches.find(m => m.bracketCode === 'QF3');
  const qf4 = updatedMatches.find(m => m.bracketCode === 'QF4');

  const winnerQF1 = qf1?.status === 'FINALIZADO' ? qf1.winnerId : null;
  const winnerQF2 = qf2?.status === 'FINALIZADO' ? qf2.winnerId : null;
  const winnerQF3 = qf3?.status === 'FINALIZADO' ? qf3.winnerId : null;
  const winnerQF4 = qf4?.status === 'FINALIZADO' ? qf4.winnerId : null;

  // Actualizar Semifinales
  updateMatchSlot('SF1', winnerQF1, winnerQF2, 'Ganador QF1 (1º/8º)', 'Ganador QF2 (2º/7º)');
  updateMatchSlot('SF2', winnerQF3, winnerQF4, 'Ganador QF3 (3º/6º)', 'Ganador QF4 (4º/5º)');

  // Obtener ganadores y perdedores de Semifinales
  const sf1 = updatedMatches.find(m => m.bracketCode === 'SF1');
  const sf2 = updatedMatches.find(m => m.bracketCode === 'SF2');

  const winnerSF1 = sf1?.status === 'FINALIZADO' ? sf1.winnerId : null;
  const winnerSF2 = sf2?.status === 'FINALIZADO' ? sf2.winnerId : null;

  const loserSF1 = sf1?.status === 'FINALIZADO'
    ? (sf1.winnerId === sf1.player1Id ? sf1.player2Id : sf1.player1Id)
    : null;
  const loserSF2 = sf2?.status === 'FINALIZADO'
    ? (sf2.winnerId === sf2.player1Id ? sf2.player2Id : sf2.player1Id)
    : null;

  // Actualizar Gran Final y Tercer Puesto
  updateMatchSlot('FINAL', winnerSF1, winnerSF2, 'Ganador Semifinal 1', 'Ganador Semifinal 2');
  updateMatchSlot('3RD_PLACE', loserSF1, loserSF2, 'Perdedor Semifinal 1', 'Perdedor Semifinal 2');

  return updatedMatches;
}

/**
 * Extrae y estructura los datos visuales del cuadro del torneo.
 */
export function getBracketStructure(allMatches: Match[], players: Player[]): BracketData {
  const playerMap = new Map<string, Player>();
  players.forEach(p => playerMap.set(p.id, p));

  const standings = calculateStandings(allMatches, players, 'FASE_INICIAL');
  const initialMatches = allMatches.filter(m => m.phase === 'FASE_INICIAL');
  const isInitialPhaseComplete = initialMatches.length >= 10 && initialMatches.every(m => m.status === 'FINALIZADO');

  const qf1 = allMatches.find(m => m.bracketCode === 'QF1');
  const qf2 = allMatches.find(m => m.bracketCode === 'QF2');
  const qf3 = allMatches.find(m => m.bracketCode === 'QF3');
  const qf4 = allMatches.find(m => m.bracketCode === 'QF4');

  const sf1 = allMatches.find(m => m.bracketCode === 'SF1');
  const sf2 = allMatches.find(m => m.bracketCode === 'SF2');

  const finalMatch = allMatches.find(m => m.bracketCode === 'FINAL');
  const thirdPlaceMatch = allMatches.find(m => m.bracketCode === '3RD_PLACE');
  const consolationMatch = allMatches.find(m => m.bracketCode === 'CONSOLATION');

  let champion: Player | null = null;
  if (finalMatch?.status === 'FINALIZADO' && finalMatch.winnerId) {
    champion = playerMap.get(finalMatch.winnerId) || null;
  }

  let thirdPlacePlayer: Player | null = null;
  if (thirdPlaceMatch?.status === 'FINALIZADO' && thirdPlaceMatch.winnerId) {
    thirdPlacePlayer = playerMap.get(thirdPlaceMatch.winnerId) || null;
  }

  return {
    standings,
    isInitialPhaseComplete,
    consolationMatch,
    quarterFinals: [qf1, qf2, qf3, qf4].filter((m): m is Match => !!m),
    semiFinals: [sf1, sf2].filter((m): m is Match => !!m),
    thirdPlaceMatch,
    finalMatch,
    champion,
    thirdPlacePlayer
  };
}
