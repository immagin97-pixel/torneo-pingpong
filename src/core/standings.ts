import { Match, Player, StandingRow } from '../types/tournament';

/**
 * Calcula la clasificación estricta de la fase inicial (o fase indicada)
 * aplicando exclusivamente los 4 criterios de desempate en orden:
 * 
 * 1. Puntos de clasificación (1 por victoria, 0 por derrota) DESC
 * 2. Diferencia total de puntos (PF - PC) DESC
 * 3. Total de puntos de partido a favor (PF) DESC
 * 4. Orden alfabético del nombre del jugador ASC
 * 
 * Sin criterios ocultos, sin sorteo, sin enfrentamiento directo.
 */
export function calculateStandings(
  matches: Match[],
  players: Player[],
  phase: string = 'FASE_INICIAL'
): StandingRow[] {
  const statsMap = new Map<
    string,
    {
      pj: number;
      pg: number;
      pp: number;
      puntos: number;
      pf: number;
      pc: number;
    }
  >();

  players.forEach(player => {
    statsMap.set(player.id, {
      pj: 0,
      pg: 0,
      pp: 0,
      puntos: 0,
      pf: 0,
      pc: 0
    });
  });

  // Filtrar partidos de la fase correspondiente
  const phaseMatches = matches.filter(m => m.phase === phase);

  for (const match of phaseMatches) {
    const stats1 = match.player1Id ? statsMap.get(match.player1Id) : undefined;
    const stats2 = match.player2Id ? statsMap.get(match.player2Id) : undefined;

    if (!stats1 && !stats2) continue;

    // Solo contabilizar partidos finalizados para la tabla oficial
    if (match.status === 'FINALIZADO') {
      if (stats1) {
        stats1.pj += 1;
        stats1.pf += match.score1;
        stats1.pc += match.score2;

        if (match.score1 > match.score2) {
          stats1.pg += 1;
          stats1.puntos += 1; // 1 punto por victoria
        } else if (match.score2 > match.score1) {
          stats1.pp += 1;
        }
      }

      if (stats2) {
        stats2.pj += 1;
        stats2.pf += match.score2;
        stats2.pc += match.score1;

        if (match.score2 > match.score1) {
          stats2.pg += 1;
          stats2.puntos += 1; // 1 punto por victoria
        } else if (match.score1 > match.score2) {
          stats2.pp += 1;
        }
      }
    }
  }

  // Convertir a lista de filas de clasificación
  const rows: StandingRow[] = players.map(player => {
    const s = statsMap.get(player.id) || { pj: 0, pg: 0, pp: 0, puntos: 0, pf: 0, pc: 0 };
    return {
      position: 0,
      playerId: player.id,
      player,
      pj: s.pj,
      pg: s.pg,
      pp: s.pp,
      puntos: s.puntos,
      pf: s.pf,
      pc: s.pc,
      dif: s.pf - s.pc
    };
  });

  // Ordenación estricta por los 4 criterios
  rows.sort((a, b) => {
    // Criterio 1: Puntos de clasificación DESC
    if (b.puntos !== a.puntos) {
      return b.puntos - a.puntos;
    }

    // Criterio 2: Diferencia total de puntos (DIF) DESC
    if (b.dif !== a.dif) {
      return b.dif - a.dif;
    }

    // Criterio 3: Puntos de partido a favor (PF) DESC
    if (b.pf !== a.pf) {
      return b.pf - a.pf;
    }

    // Criterio 4: Orden alfabético por nombre ASC
    return a.player.name.localeCompare(b.player.name, 'es', { sensitivity: 'base' });
  });

  // Asignar posición ordinal (1, 2, 3, ...)
  return rows.map((row, index) => ({
    ...row,
    position: index + 1
  }));
}
