export type PlayerLevel = 'Muy bueno' | 'Nivel medio' | 'Más flojo';

export interface Player {
  id: string;
  name: string;
  level: PlayerLevel;
  initialSeed: number; // 1 to 10
  avatar?: string;
  createdAt: string;
}

export type MatchPhase = 
  | 'FASE_INICIAL'
  | 'CUARTOS'
  | 'SEMIFINAL'
  | 'TERCER_CUARTO'
  | 'FINAL'
  | 'CONSOLACION';

export type MatchStatus = 'PENDIENTE' | 'EN_JUEGO' | 'FINALIZADO';

export interface PointEvent {
  id: string;
  matchId: string;
  pointNumber: number;
  winnerPlayerId: string;
  score1After: number;
  score2After: number;
  serverBefore: string | null;
  serverAfter: string | null;
  timestamp: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  phase: MatchPhase;
  matchNumber: number;
  scheduledTime: string; // e.g. "11:00"
  player1Id: string | null;
  player2Id: string | null;
  score1: number;
  score2: number;
  status: MatchStatus;
  winnerId: string | null;
  initialServerId: string | null;
  currentServerId: string | null;
  pointHistory: PointEvent[];
  bracketCode?: string; // e.g. "QF1", "QF2", "QF3", "QF4", "SF1", "SF2", "FINAL", "3RD_PLACE", "CONSOLATION"
  sourceDesc1?: string; // e.g. "1.º Clasificado" or "Ganador QF1"
  sourceDesc2?: string; // e.g. "8.º Clasificado" or "Ganador QF2"
  createdAt: string;
  updatedAt: string;
}

export interface StandingRow {
  position: number;
  playerId: string;
  player: Player;
  pj: number; // Partidos Jugados
  pg: number; // Partidos Ganados
  pp: number; // Partidos Perdidos
  puntos: number; // Puntos de Clasificación (1 por victoria, 0 por derrota)
  pf: number; // Puntos de partido a favor
  pc: number; // Puntos de partido en contra
  dif: number; // PF - PC
}

export interface HeadToHeadStats {
  opponentId: string;
  opponentName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  matchResults: {
    matchId: string;
    phase: MatchPhase;
    score: string;
    won: boolean;
    scheduledTime: string;
  }[];
}

export interface PlayerStats {
  player: Player;
  position: number;
  pj: number;
  pg: number;
  pp: number;
  winRate: number; // Percentage 0-100
  puntos: number;
  pf: number;
  pc: number;
  dif: number;
  currentStreak: {
    type: 'W' | 'L' | 'NONE';
    count: number;
  };
  matches: {
    match: Match;
    opponent: Player | null;
    won: boolean;
    userScore: number;
    oppScore: number;
  }[];
  opponents: HeadToHeadStats[];
  nextMatch: Match | null;
  currentPhase: MatchPhase;
}

export interface TournamentConfig {
  id: string;
  name: string;
  startTime: string; // e.g. "11:00"
  matchDurationMinutes: number; // default 10
  pointsToWin: number; // default 11
  minimumWinningDifference: number; // default 2
  regulationsMarkdown: string;
  adminPin: string; // default "1234"
  updatedAt: string;
}

export interface TournamentState {
  config: TournamentConfig;
  players: Player[];
  matches: Match[];
  version: number;
  lastUpdated: string;
}
