import { Match, Player } from '../types/tournament';

export interface ScheduleValidationResult {
  isValid: boolean;
  totalMatches: number;
  totalPlayers: number;
  matchesPerPlayer: Record<string, number>;
  errors: string[];
}

/**
 * Valida automáticamente las reglas obligatorias del calendario de la Fase Inicial:
 * 1. Existen exactamente 10 partidos en la fase inicial.
 * 2. Participan exactamente 10 jugadores.
 * 3. Cada jugador disputa exactamente 2 partidos.
 * 4. Ningún jugador juega contra sí mismo.
 * 5. No existen partidos duplicados (A vs B y B vs A).
 */
export function validateInitialSchedule(
  matches: Match[],
  players: Player[]
): ScheduleValidationResult {
  const errors: string[] = [];
  const initialMatches = matches.filter(m => m.phase === 'FASE_INICIAL');

  if (players.length !== 10) {
    errors.push(`Debe haber exactamente 10 jugadores registrados (actual: ${players.length}).`);
  }

  if (initialMatches.length !== 10) {
    errors.push(`La fase inicial debe tener exactamente 10 partidos (actual: ${initialMatches.length}).`);
  }

  const matchesPerPlayer: Record<string, number> = {};
  players.forEach(p => {
    matchesPerPlayer[p.id] = 0;
  });

  const matchupSet = new Set<string>();

  initialMatches.forEach((m, idx) => {
    const num = m.matchNumber || idx + 1;
    if (!m.player1Id || !m.player2Id) {
      errors.push(`Partido #${num} no tiene ambos jugadores asignados.`);
      return;
    }

    if (m.player1Id === m.player2Id) {
      errors.push(`Partido #${num}: Un jugador no puede jugar contra sí mismo (${m.player1Id}).`);
    }

    // Comprobar enfrentamientos duplicados
    const pairKey = [m.player1Id, m.player2Id].sort().join('__VS__');
    if (matchupSet.has(pairKey)) {
      errors.push(`Partido #${num}: El enfrentamiento entre estos jugadores ya existe en el calendario.`);
    }
    matchupSet.add(pairKey);

    // Contabilizar partidos por jugador
    matchesPerPlayer[m.player1Id] = (matchesPerPlayer[m.player1Id] || 0) + 1;
    matchesPerPlayer[m.player2Id] = (matchesPerPlayer[m.player2Id] || 0) + 1;
  });

  players.forEach(p => {
    const count = matchesPerPlayer[p.id] || 0;
    if (count !== 2) {
      errors.push(`El jugador ${p.name} disputa ${count} partidos (debe disputar exactamente 2).`);
    }
  });

  return {
    isValid: errors.length === 0,
    totalMatches: initialMatches.length,
    totalPlayers: players.length,
    matchesPerPlayer,
    errors
  };
}

/**
 * Genera el calendario inicial equilibrado con 10 partidos y horarios calculados.
 */
export function generateBalancedInitialSchedule(
  players: Player[],
  startTime: string = '11:00',
  durationMinutes: number = 10,
  tournamentId: string = 'torneo-2026'
): Match[] {
  if (players.length !== 10) {
    throw new Error('Se requieren exactamente 10 jugadores para generar el calendario.');
  }

  const pairings: [number, number][] = [
    [0, 3], // P1 vs P4
    [1, 4], // P2 vs P5
    [2, 5], // P3 vs P6
    [6, 7], // P7 vs P8
    [8, 9], // P9 vs P10
    [0, 6], // P1 vs P7
    [1, 7], // P2 vs P8
    [2, 8], // P3 vs P9
    [3, 9], // P4 vs P10
    [4, 5]  // P5 vs P6
  ];

  const matches: Match[] = pairings.map((pair, index) => {
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

  return matches;
}

/**
 * Calcula la hora de inicio de un partido sumando minutos a la hora base.
 */
export function calculateMatchTime(
  baseTime: string,
  matchIndex: number,
  intervalMinutes: number
): string {
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

/**
 * Recalcula todos los horarios del calendario secuencialmente según la hora de inicio e intervalo.
 */
export function recalculateAllMatchTimes(
  matches: Match[],
  startTime: string,
  durationMinutes: number
): Match[] {
  return matches.map((m, idx) => ({
    ...m,
    scheduledTime: calculateMatchTime(startTime, idx, durationMinutes),
    updatedAt: new Date().toISOString()
  }));
}

/**
 * Desplaza (adelanta o retrasa) el horario de los partidos pendientes en X minutos.
 */
export function shiftPendingMatchTimes(
  matches: Match[],
  minutesDelta: number
): Match[] {
  return matches.map(m => {
    if (m.status === 'PENDIENTE') {
      const [hStr, mStr] = m.scheduledTime.split(':');
      let totalMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0) + minutesDelta;
      if (totalMins < 0) totalMins += 24 * 60;
      const newH = Math.floor(totalMins / 60) % 24;
      const newM = totalMins % 60;
      return {
        ...m,
        scheduledTime: `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`,
        updatedAt: new Date().toISOString()
      };
    }
    return m;
  });
}

/**
 * Crea la plantilla de partidos para las fases eliminatorias y de consolación
 */
export function createPlayoffMatchTemplates(
  startTime: string = '11:00',
  durationMinutes: number = 10,
  tournamentId: string = 'torneo-2026'
): Match[] {
  const templates: {
    bracketCode: string;
    phase: Match['phase'];
    matchNumber: number;
    sourceDesc1: string;
    sourceDesc2: string;
    offsetMinutes: number;
  }[] = [
    { bracketCode: 'CONSOLATION', phase: 'CONSOLACION', matchNumber: 11, sourceDesc1: '9.º Clasificado', sourceDesc2: '10.º Clasificado', offsetMinutes: 100 },
    { bracketCode: 'QF1', phase: 'CUARTOS', matchNumber: 12, sourceDesc1: '1.º Clasificado', sourceDesc2: '8.º Clasificado', offsetMinutes: 110 },
    { bracketCode: 'QF2', phase: 'CUARTOS', matchNumber: 13, sourceDesc1: '2.º Clasificado', sourceDesc2: '7.º Clasificado', offsetMinutes: 120 },
    { bracketCode: 'QF3', phase: 'CUARTOS', matchNumber: 14, sourceDesc1: '3.º Clasificado', sourceDesc2: '6.º Clasificado', offsetMinutes: 130 },
    { bracketCode: 'QF4', phase: 'CUARTOS', matchNumber: 15, sourceDesc1: '4.º Clasificado', sourceDesc2: '5.º Clasificado', offsetMinutes: 140 },
    { bracketCode: 'SF1', phase: 'SEMIFINAL', matchNumber: 16, sourceDesc1: 'Ganador QF1', sourceDesc2: 'Ganador QF2', offsetMinutes: 155 },
    { bracketCode: 'SF2', phase: 'SEMIFINAL', matchNumber: 17, sourceDesc1: 'Ganador QF3', sourceDesc2: 'Ganador QF4', offsetMinutes: 165 },
    { bracketCode: '3RD_PLACE', phase: 'TERCER_CUARTO', matchNumber: 18, sourceDesc1: 'Perdedor SF1', sourceDesc2: 'Perdedor SF2', offsetMinutes: 180 },
    { bracketCode: 'FINAL', phase: 'FINAL', matchNumber: 19, sourceDesc1: 'Ganador SF1', sourceDesc2: 'Ganador SF2', offsetMinutes: 195 },
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
