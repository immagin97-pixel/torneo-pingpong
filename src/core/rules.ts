import { Match, PointEvent } from '../types/tournament';

/**
 * Función central para determinar si un partido ha finalizado.
 * Regla oficial:
 * - Uno de los jugadores alcanza al menos 'pointsToWin' (11 puntos por defecto).
 * - Y tiene una diferencia mínima de 'minDiff' (2 puntos por defecto) sobre el rival.
 * 
 * Matemáticamente:
 * max(score1, score2) >= 11 && abs(score1 - score2) >= 2
 */
export function isMatchFinished(
  score1: number, 
  score2: number, 
  pointsToWin: number = 11, 
  minDiff: number = 2
): boolean {
  if (score1 < 0 || score2 < 0) return false;
  const maxScore = Math.max(score1, score2);
  const diff = Math.abs(score1 - score2);
  return maxScore >= pointsToWin && diff >= minDiff;
}

/**
 * Obtiene el ID del ganador si el partido ha finalizado según las reglas.
 */
export function getMatchWinner(
  score1: number,
  score2: number,
  player1Id: string | null,
  player2Id: string | null,
  pointsToWin: number = 11,
  minDiff: number = 2
): string | null {
  if (!isMatchFinished(score1, score2, pointsToWin, minDiff)) {
    return null;
  }
  if (score1 > score2) return player1Id;
  if (score2 > score1) return player2Id;
  return null;
}

/**
 * Lógica del Saque durante el partido:
 * Saca el jugador que haya ganado el punto anterior (Estilo voleibol).
 */
export function getNextServer(lastPointWinnerId: string): string {
  return lastPointWinnerId;
}

/**
 * Añade un punto al partido y actualiza marcador, saque, historial y estado.
 */
export function applyPoint(
  match: Match,
  pointWinnerId: string,
  pointsToWin: number = 11,
  minDiff: number = 2
): Match {
  if (!match.player1Id || !match.player2Id) return match;
  if (match.status === 'FINALIZADO') return match;

  const isPlayer1 = pointWinnerId === match.player1Id;
  const isPlayer2 = pointWinnerId === match.player2Id;

  if (!isPlayer1 && !isPlayer2) return match;

  const newScore1 = isPlayer1 ? match.score1 + 1 : match.score1;
  const newScore2 = isPlayer2 ? match.score2 + 1 : match.score2;

  // Servidor antes del punto
  const serverBefore = match.currentServerId || match.initialServerId || match.player1Id;
  // El ganador del punto pasa a sacar
  const serverAfter = getNextServer(pointWinnerId);

  const newPointEvent: PointEvent = {
    id: `pt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    matchId: match.id,
    pointNumber: (match.pointHistory?.length || 0) + 1,
    winnerPlayerId: pointWinnerId,
    score1After: newScore1,
    score2After: newScore2,
    serverBefore,
    serverAfter,
    timestamp: new Date().toISOString()
  };

  const finished = isMatchFinished(newScore1, newScore2, pointsToWin, minDiff);
  const winnerId = finished ? (newScore1 > newScore2 ? match.player1Id : match.player2Id) : null;

  return {
    ...match,
    score1: newScore1,
    score2: newScore2,
    status: finished ? 'FINALIZADO' : 'EN_JUEGO',
    winnerId,
    currentServerId: finished ? null : serverAfter,
    pointHistory: [...(match.pointHistory || []), newPointEvent],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Deshace el último punto anotado en el partido.
 */
export function undoLastPoint(
  match: Match,
  pointsToWin: number = 11,
  minDiff: number = 2
): Match {
  if (!match.pointHistory || match.pointHistory.length === 0) {
    // Si no hay historial pero hay puntos, reiniciar a 0-0
    if (match.score1 > 0 || match.score2 > 0) {
      return {
        ...match,
        score1: 0,
        score2: 0,
        status: 'PENDIENTE',
        winnerId: null,
        currentServerId: match.initialServerId,
        pointHistory: [],
        updatedAt: new Date().toISOString()
      };
    }
    return match;
  }

  const updatedHistory = [...match.pointHistory];
  const removedPoint = updatedHistory.pop()!;

  let newScore1 = 0;
  let newScore2 = 0;
  let serverAfterUndo: string | null = match.initialServerId;

  if (updatedHistory.length > 0) {
    const lastRemainingPoint = updatedHistory[updatedHistory.length - 1];
    newScore1 = lastRemainingPoint.score1After;
    newScore2 = lastRemainingPoint.score2After;
    serverAfterUndo = lastRemainingPoint.serverAfter;
  } else {
    // Volvemos al inicio del partido
    serverAfterUndo = match.initialServerId;
  }

  const finished = isMatchFinished(newScore1, newScore2, pointsToWin, minDiff);
  const winnerId = finished ? (newScore1 > newScore2 ? match.player1Id : match.player2Id) : null;
  const newStatus = (newScore1 === 0 && newScore2 === 0) ? 'PENDIENTE' : (finished ? 'FINALIZADO' : 'EN_JUEGO');

  return {
    ...match,
    score1: newScore1,
    score2: newScore2,
    status: newStatus,
    winnerId,
    currentServerId: finished ? null : serverAfterUndo,
    pointHistory: updatedHistory,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Configura el saque inicial de "Pal Saque"
 */
export function setPalSaque(match: Match, serverId: string): Match {
  if (serverId !== match.player1Id && serverId !== match.player2Id) {
    return match;
  }
  return {
    ...match,
    initialServerId: serverId,
    currentServerId: match.status === 'PENDIENTE' ? serverId : match.currentServerId || serverId,
    updatedAt: new Date().toISOString()
  };
}
