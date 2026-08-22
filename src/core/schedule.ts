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
 * Jugadores ordenados por nivel:
 * Muy buenos: 3
 * Nivel medio: 4
 * Más flojos: 3
 */
export function generateBalancedInitialSchedule(
  players: Player[],
  startTime: string = '11:00',
  durationMinutes: number = 10,
  tournamentId: string = 'torneo-2026'
): Match[] {
  // Asegurar 10 jugadores
  if (players.length !== 10) {
    throw new Error('Se requieren exactamente 10 jugadores para generar el calendario.');
  }

  // Distribución equilibrada (Evita cruces entre los 3 mejores en fase inicial):
  // Jugadores:
  // 1: Alejandro Viñeta (Muy bueno)
  // 2: Pol Ginebra (Muy bueno)
  // 3: Joan Ginebra (Muy bueno)
  // 4: Alex Viñeta (Medio)
  // 5: Guille Morales (Medio)
  // 6: Fran Montobio (Medio)
  // 7: Elisabet Ginebra (Medio)
  // 8: Imma Ginebra (Flojo)
  // 9: Gabriel Ginebra (Flojo)
  // 10: Anna Ginebra (Flojo)
  
  // Matriz 2-regular conexa en grafo de 10 vértices:
  // Cada vértice tiene grado 2 (exactamente 2 partidos por jugador)
  // Emparejamientos (índices 0-9):
  // 1. P0 (Alejandro) vs P3 (Alex Viñeta) [Muy bueno vs Medio]
  // 2. P1 (Pol) vs P4 (Guille) [Muy bueno vs Medio]
  // 3. P2 (Joan) vs P5 (Fran) [Muy bueno vs Medio]
  // 4. P6 (Elisabet) vs P7 (Imma) [Medio vs Flojo]
  // 5. P8 (Gabriel) vs P9 (Anna) [Flojo vs Flojo]
  // 6. P0 (Alejandro) vs P6 (Elisabet) [Muy bueno vs Medio]
  // 7. P1 (Pol) vs P7 (Imma) [Muy bueno vs Flojo]
  // 8. P2 (Joan) vs P8 (Gabriel) [Muy bueno vs Flojo]
  // 9. P3 (Alex) vs P9 (Anna) [Medio vs Flojo]
  // 10. P4 (Guille) vs P5 (Fran) [Medio vs Medio]

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
 * Crea la plantilla de partidos para las fases eliminatorias y de consolación
 */
export function createPlayoffMatchTemplates(
  startTime: string = '11:00',
  durationMinutes: number = 10,
  tournamentId: string = 'torneo-2026'
): Match[] {
  // 10 partidos iniciales finalizan aprox a las 12:40 (11:00 a 12:30 inicio M10 -> 12:40 fin)
  // Consolación y Cuartos de Final:
  // M11: Consolación (9º vs 10º) -> 12:40
  // M12: QF1 (1º vs 8º) -> 12:50
  // M13: QF2 (2º vs 7º) -> 13:00
  // M14: QF3 (3º vs 6º) -> 13:10
  // M15: QF4 (4º vs 5º) -> 13:20
  // M16: Semifinal 1 -> 13:35
  // M17: Semifinal 2 -> 13:45
  // M18: 3º y 4º Puesto -> 14:00
  // M19: Gran Final -> 14:15

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
