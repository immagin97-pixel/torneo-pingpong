import { Match, Player, PlayerStats, HeadToHeadStats, MatchPhase } from '../types/tournament';
import { calculateStandings } from './standings';

/**
 * Calcula las estadísticas detalladas e individuales para un jugador en el torneo.
 */
export function getPlayerStats(
  playerId: string,
  players: Player[],
  matches: Match[]
): PlayerStats | null {
  const player = players.find(p => p.id === playerId);
  if (!player) return null;

  const playerMap = new Map<string, Player>();
  players.forEach(p => playerMap.set(p.id, p));

  const standings = calculateStandings(matches, players, 'FASE_INICIAL');
  const standingRow = standings.find(s => s.playerId === playerId);
  const position = standingRow?.position || 0;

  // Filtrar todos los partidos donde participa el jugador
  const playerMatches = matches.filter(
    m => m.player1Id === playerId || m.player2Id === playerId
  );

  let pj = 0;
  let pg = 0;
  let pp = 0;
  let pf = 0;
  let pc = 0;

  const matchDetails: PlayerStats['matches'] = [];
  const opponentMap = new Map<string, HeadToHeadStats>();

  // Partidos ordenados cronológicamente
  const sortedMatches = [...playerMatches].sort((a, b) => a.matchNumber - b.matchNumber);

  const streakList: ('W' | 'L')[] = [];

  let nextMatch: Match | null = null;
  let currentPhase: MatchPhase = 'FASE_INICIAL';

  for (const m of sortedMatches) {
    const isP1 = m.player1Id === playerId;
    const oppId = isP1 ? m.player2Id : m.player1Id;
    const oppPlayer = oppId ? playerMap.get(oppId) || null : null;
    const userScore = isP1 ? m.score1 : m.score2;
    const oppScore = isP1 ? m.score2 : m.score1;

    if (m.status === 'FINALIZADO') {
      pj += 1;
      pf += userScore;
      pc += oppScore;
      const won = m.winnerId === playerId;
      if (won) {
        pg += 1;
        streakList.push('W');
      } else {
        pp += 1;
        streakList.push('L');
      }

      currentPhase = m.phase;

      matchDetails.push({
        match: m,
        opponent: oppPlayer,
        won,
        userScore,
        oppScore
      });

      // Estadísticas frente a rival (H2H)
      if (oppId && oppPlayer) {
        let h2h = opponentMap.get(oppId);
        if (!h2h) {
          h2h = {
            opponentId: oppId,
            opponentName: oppPlayer.name,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            matchResults: []
          };
          opponentMap.set(oppId, h2h);
        }

        h2h.matchesPlayed += 1;
        if (won) h2h.wins += 1;
        else h2h.losses += 1;
        h2h.pointsFor += userScore;
        h2h.pointsAgainst += oppScore;
        h2h.matchResults.push({
          matchId: m.id,
          phase: m.phase,
          score: `${userScore}-${oppScore}`,
          won,
          scheduledTime: m.scheduledTime
        });
      }
    } else if (m.status === 'PENDIENTE' || m.status === 'EN_JUEGO') {
      if (!nextMatch) {
        nextMatch = m;
      }
    }
  }

  // Calcular racha actual
  let streakType: 'W' | 'L' | 'NONE' = 'NONE';
  let streakCount = 0;

  if (streakList.length > 0) {
    const lastResult = streakList[streakList.length - 1];
    streakType = lastResult;
    for (let i = streakList.length - 1; i >= 0; i--) {
      if (streakList[i] === lastResult) {
        streakCount++;
      } else {
        break;
      }
    }
  }

  const winRate = pj > 0 ? Math.round((pg / pj) * 100) : 0;
  const dif = pf - pc;
  const puntos = pg; // 1 punto por victoria

  return {
    player,
    position,
    pj,
    pg,
    pp,
    winRate,
    puntos,
    pf,
    pc,
    dif,
    currentStreak: {
      type: streakType,
      count: streakCount
    },
    matches: matchDetails,
    opponents: Array.from(opponentMap.values()),
    nextMatch,
    currentPhase
  };
}
