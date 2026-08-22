/**
 * Lógica deportiva y de competición del Torneo de Ping-Pong
 * Ejecutada en el backend como ÚNICA FUENTE DE VERDAD
 */

export const INITIAL_PLAYERS = [
  // Muy buenos
  { id: 'player-1', name: 'Alejandro Viñeta', level: 'Muy bueno', initialSeed: 1, createdAt: new Date().toISOString() },
  { id: 'player-2', name: 'Pol Ginebra', level: 'Muy bueno', initialSeed: 2, createdAt: new Date().toISOString() },
  { id: 'player-3', name: 'Joan Ginebra', level: 'Muy bueno', initialSeed: 3, createdAt: new Date().toISOString() },
  // Nivel medio
  { id: 'player-4', name: 'Alex Viñeta', level: 'Nivel medio', initialSeed: 4, createdAt: new Date().toISOString() },
  { id: 'player-5', name: 'Guille Morales', level: 'Nivel medio', initialSeed: 5, createdAt: new Date().toISOString() },
  { id: 'player-6', name: 'Fran Montobio', level: 'Nivel medio', initialSeed: 6, createdAt: new Date().toISOString() },
  { id: 'player-7', name: 'Elisabet Ginebra', level: 'Nivel medio', initialSeed: 7, createdAt: new Date().toISOString() },
  // Más flojos
  { id: 'player-8', name: 'Imma Ginebra', level: 'Más flojo', initialSeed: 8, createdAt: new Date().toISOString() },
  { id: 'player-9', name: 'Gabriel Ginebra', level: 'Más flojo', initialSeed: 9, createdAt: new Date().toISOString() },
  { id: 'player-10', name: 'Anna Ginebra', level: 'Más flojo', initialSeed: 10, createdAt: new Date().toISOString() }
];

export const INITIAL_REGULATIONS = `# REGLAMENTO OFICIAL DEL TORNEO DE PING-PONG

### 1. Sistema de Competición
El torneo consta de **10 participantes** y se divide en dos fases:
* **Fase Inicial**: 10 partidos en total. Cada jugador disputa exactamente 2 partidos.
* **Fase Eliminatoria**: Los 8 mejores jugadores clasificados avanzan al Cuadro Principal (Cuartos de final).
* **Fase de Consolación**: Los jugadores clasificados en 9.ª y 10.ª posición disputan un partido de consolación.

---

### 2. Duración de los Partidos
Cada partido tiene una duración estimada de **10 minutos**, comenzando a las **11:00**.

---

### 3. Puntuación
Los partidos se disputan a **11 puntos**.

---

### 4. Condición de Victoria
Gana quien alcance primero 11 puntos con ventaja mínima de 2 puntos.

---

### 5. Empate a 10-10 (Deuce)
Si ambos empatan a 10-10, se continúa sin límite hasta obtener ventaja de 2 puntos.

---

### 6. Saque Inicial ("Pal Saque")
Se decide mediante punto previo de "Pal saque" o sorteo aleatorio.

---

### 7. Saque Durante el Partido (Estilo Voleibol)
Saca el jugador que haya ganado el punto anterior.

---

### 8. Puntos de Clasificación
* Victoria: 1 punto de clasificación.
* Derrota: 0 puntos.

---

### 9. Criterios de Desempate en Clasificación
1. Puntos de clasificación (1 por victoria) DESC
2. Diferencia total de puntos de partido (PF - PC) DESC
3. Puntos de partido a favor (PF) DESC
4. Orden alfabético por nombre ASC
`;

export const INITIAL_CONFIG = {
  id: 'torneo-2026',
  name: 'Gran Torneo Ping-Pong 2026',
  startTime: '11:00',
  matchDurationMinutes: 10,
  pointsToWin: 11,
  minimumWinningDifference: 2,
  regulationsMarkdown: INITIAL_REGULATIONS,
  adminPin: '1234',
  updatedAt: new Date().toISOString()
};

/**
 * Función central para determinar si un partido ha finalizado.
 */
export function isMatchFinished(score1, score2, pointsToWin = 11, minDiff = 2) {
  if (score1 < 0 || score2 < 0) return false;
  const maxScore = Math.max(score1, score2);
  const diff = Math.abs(score1 - score2);
  return maxScore >= pointsToWin && diff >= minDiff;
}

export function getNextServer(lastPointWinnerId) {
  return lastPointWinnerId;
}

export function applyPoint(match, pointWinnerId, pointsToWin = 11, minDiff = 2) {
  if (!match.player1Id || !match.player2Id) return match;
  if (match.status === 'FINALIZADO') return match;

  const isPlayer1 = pointWinnerId === match.player1Id;
  const isPlayer2 = pointWinnerId === match.player2Id;

  if (!isPlayer1 && !isPlayer2) return match;

  const newScore1 = isPlayer1 ? match.score1 + 1 : match.score1;
  const newScore2 = isPlayer2 ? match.score2 + 1 : match.score2;

  const serverBefore = match.currentServerId || match.initialServerId || match.player1Id;
  const serverAfter = getNextServer(pointWinnerId);

  const newPointEvent = {
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

export function undoLastPoint(match, pointsToWin = 11, minDiff = 2) {
  if (!match.pointHistory || match.pointHistory.length === 0) {
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
  updatedHistory.pop();

  let newScore1 = 0;
  let newScore2 = 0;
  let serverAfterUndo = match.initialServerId;

  if (updatedHistory.length > 0) {
    const lastRemainingPoint = updatedHistory[updatedHistory.length - 1];
    newScore1 = lastRemainingPoint.score1After;
    newScore2 = lastRemainingPoint.score2After;
    serverAfterUndo = lastRemainingPoint.serverAfter;
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

export function setPalSaque(match, serverId) {
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

export function calculateStandings(matches, players, phase = 'FASE_INICIAL') {
  const statsMap = new Map();
  players.forEach(player => {
    statsMap.set(player.id, { pj: 0, pg: 0, pp: 0, puntos: 0, pf: 0, pc: 0 });
  });

  const phaseMatches = matches.filter(m => m.phase === phase);

  for (const match of phaseMatches) {
    const stats1 = match.player1Id ? statsMap.get(match.player1Id) : undefined;
    const stats2 = match.player2Id ? statsMap.get(match.player2Id) : undefined;

    if (!stats1 && !stats2) continue;

    if (match.status === 'FINALIZADO') {
      if (stats1) {
        stats1.pj += 1;
        stats1.pf += match.score1;
        stats1.pc += match.score2;
        if (match.score1 > match.score2) {
          stats1.pg += 1;
          stats1.puntos += 1;
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
          stats2.puntos += 1;
        } else if (match.score1 > match.score2) {
          stats2.pp += 1;
        }
      }
    }
  }

  const rows = players.map(player => {
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

  rows.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dif !== a.dif) return b.dif - a.dif;
    if (b.pf !== a.pf) return b.pf - a.pf;
    return a.player.name.localeCompare(b.player.name, 'es', { sensitivity: 'base' });
  });

  return rows.map((row, index) => ({
    ...row,
    position: index + 1
  }));
}

export function deriveBracketMatches(allMatches, players) {
  const standings = calculateStandings(allMatches, players, 'FASE_INICIAL');

  const p1 = standings[0]?.playerId || null;
  const p2 = standings[1]?.playerId || null;
  const p3 = standings[2]?.playerId || null;
  const p4 = standings[3]?.playerId || null;
  const p5 = standings[4]?.playerId || null;
  const p6 = standings[5]?.playerId || null;
  const p7 = standings[6]?.playerId || null;
  const p8 = standings[7]?.playerId || null;
  const p9 = standings[8]?.playerId || null;
  const p10 = standings[9]?.playerId || null;

  const updatedMatches = [...allMatches];

  function updateMatchSlot(code, targetP1, targetP2, sourceDesc1, sourceDesc2) {
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

  const initialMatches = updatedMatches.filter(m => m.phase === 'FASE_INICIAL');
  const initialPhaseFinished = initialMatches.length >= 10 && initialMatches.every(m => m.status === 'FINALIZADO');

  updateMatchSlot('QF1', initialPhaseFinished ? p1 : null, initialPhaseFinished ? p8 : null, '1.º Clasificado', '8.º Clasificado');
  updateMatchSlot('QF2', initialPhaseFinished ? p2 : null, initialPhaseFinished ? p7 : null, '2.º Clasificado', '7.º Clasificado');
  updateMatchSlot('QF3', initialPhaseFinished ? p3 : null, initialPhaseFinished ? p6 : null, '3.º Clasificado', '6.º Clasificado');
  updateMatchSlot('QF4', initialPhaseFinished ? p4 : null, initialPhaseFinished ? p5 : null, '4.º Clasificado', '5.º Clasificado');
  updateMatchSlot('CONSOLATION', initialPhaseFinished ? p9 : null, initialPhaseFinished ? p10 : null, '9.º Clasificado', '10.º Clasificado');

  const qf1 = updatedMatches.find(m => m.bracketCode === 'QF1');
  const qf2 = updatedMatches.find(m => m.bracketCode === 'QF2');
  const qf3 = updatedMatches.find(m => m.bracketCode === 'QF3');
  const qf4 = updatedMatches.find(m => m.bracketCode === 'QF4');

  const winnerQF1 = qf1?.status === 'FINALIZADO' ? qf1.winnerId : null;
  const winnerQF2 = qf2?.status === 'FINALIZADO' ? qf2.winnerId : null;
  const winnerQF3 = qf3?.status === 'FINALIZADO' ? qf3.winnerId : null;
  const winnerQF4 = qf4?.status === 'FINALIZADO' ? qf4.winnerId : null;

  updateMatchSlot('SF1', winnerQF1, winnerQF2, 'Ganador QF1 (1º/8º)', 'Ganador QF2 (2º/7º)');
  updateMatchSlot('SF2', winnerQF3, winnerQF4, 'Ganador QF3 (3º/6º)', 'Ganador QF4 (4º/5º)');

  const sf1 = updatedMatches.find(m => m.bracketCode === 'SF1');
  const sf2 = updatedMatches.find(m => m.bracketCode === 'SF2');

  const winnerSF1 = sf1?.status === 'FINALIZADO' ? sf1.winnerId : null;
  const winnerSF2 = sf2?.status === 'FINALIZADO' ? sf2.winnerId : null;

  const loserSF1 = sf1?.status === 'FINALIZADO' ? (sf1.winnerId === sf1.player1Id ? sf1.player2Id : sf1.player1Id) : null;
  const loserSF2 = sf2?.status === 'FINALIZADO' ? (sf2.winnerId === sf2.player1Id ? sf2.player2Id : sf2.player1Id) : null;

  updateMatchSlot('FINAL', winnerSF1, winnerSF2, 'Ganador Semifinal 1', 'Ganador Semifinal 2');
  updateMatchSlot('3RD_PLACE', loserSF1, loserSF2, 'Perdedor Semifinal 1', 'Perdedor Semifinal 2');

  return updatedMatches;
}

export function calculateMatchTime(baseTime, matchIndex, intervalMinutes) {
  const [hoursStr, minutesStr] = baseTime.split(':');
  const baseHours = parseInt(hoursStr, 10) || 11;
  const baseMinutes = parseInt(minutesStr, 10) || 0;

  const totalMinutes = baseHours * 60 + baseMinutes + matchIndex * intervalMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;

  const hh = newHours.toString().padStart(2, '0');
  const mm = newMinutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function generateBalancedInitialSchedule(players, startTime = '11:00', durationMinutes = 10, tournamentId = 'torneo-2026') {
  const pairings = [
    [0, 3], [1, 4], [2, 5], [6, 7], [8, 9],
    [0, 6], [1, 7], [2, 8], [3, 9], [4, 5]
  ];

  return pairings.map((pair, index) => {
    const p1 = players[pair[0]];
    const p2 = players[pair[1]];
    const time = calculateMatchTime(startTime, index, durationMinutes);

    return {
      id: `match-init-${index + 1}`,
      tournamentId,
      phase: 'FASE_INICIAL',
      matchNumber: index + 1,
      scheduledTime: time,
      player1Id: p1.id,
      player2Id: p2.id,
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
  });
}

export function createPlayoffMatchTemplates(startTime = '11:00', durationMinutes = 10, tournamentId = 'torneo-2026') {
  const templates = [
    { bracketCode: 'CONSOLATION', phase: 'CONSOLACION', matchNumber: 11, sourceDesc1: '9.º Clasificado', sourceDesc2: '10.º Clasificado', offsetMinutes: 100 },
    { bracketCode: 'QF1', phase: 'CUARTOS', matchNumber: 12, sourceDesc1: '1.º Clasificado', sourceDesc2: '8.º Clasificado', offsetMinutes: 110 },
    { bracketCode: 'QF2', phase: 'CUARTOS', matchNumber: 13, sourceDesc1: '2.º Clasificado', sourceDesc2: '7.º Clasificado', offsetMinutes: 120 },
    { bracketCode: 'QF3', phase: 'CUARTOS', matchNumber: 14, sourceDesc1: '3.º Clasificado', sourceDesc2: '6.º Clasificado', offsetMinutes: 130 },
    { bracketCode: 'QF4', phase: 'CUARTOS', matchNumber: 15, sourceDesc1: '4.º Clasificado', sourceDesc2: '5.º Clasificado', offsetMinutes: 140 },
    { bracketCode: 'SF1', phase: 'SEMIFINAL', matchNumber: 16, sourceDesc1: 'Ganador QF1', sourceDesc2: 'Ganador QF2', offsetMinutes: 155 },
    { bracketCode: 'SF2', phase: 'SEMIFINAL', matchNumber: 17, sourceDesc1: 'Ganador QF3', sourceDesc2: 'Ganador QF4', offsetMinutes: 165 },
    { bracketCode: '3RD_PLACE', phase: 'TERCER_CUARTO', matchNumber: 18, sourceDesc1: 'Perdedor SF1', sourceDesc2: 'Perdedor SF2', offsetMinutes: 180 },
    { bracketCode: 'FINAL', phase: 'FINAL', matchNumber: 19, sourceDesc1: 'Ganador SF1', sourceDesc2: 'Ganador SF2', offsetMinutes: 195 }
  ];

  return templates.map(t => {
    const time = calculateMatchTime(startTime, Math.floor(t.offsetMinutes / durationMinutes), durationMinutes);
    return {
      id: `match-playoff-${t.bracketCode.toLowerCase()}`,
      tournamentId,
      phase: t.phase,
      matchNumber: t.matchNumber,
      scheduledTime: time,
      player1Id: null,
      player2Id: null,
      score1: 0,
      score2: 0,
      status: 'PENDIENTE',
      winnerId: null,
      initialServerId: null,
      currentServerId: null,
      pointHistory: [],
      bracketCode: t.bracketCode,
      sourceDesc1: t.sourceDesc1,
      sourceDesc2: t.sourceDesc2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}

export function createInitialTournamentState() {
  const initialMatches = generateBalancedInitialSchedule(INITIAL_PLAYERS, INITIAL_CONFIG.startTime, INITIAL_CONFIG.matchDurationMinutes, INITIAL_CONFIG.id);
  const playoffMatches = createPlayoffMatchTemplates(INITIAL_CONFIG.startTime, INITIAL_CONFIG.matchDurationMinutes, INITIAL_CONFIG.id);
  const allMatches = deriveBracketMatches([...initialMatches, ...playoffMatches], INITIAL_PLAYERS);

  return {
    config: INITIAL_CONFIG,
    players: INITIAL_PLAYERS,
    matches: allMatches,
    version: 1,
    lastUpdated: new Date().toISOString()
  };
}
