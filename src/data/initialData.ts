import { Player, TournamentConfig, TournamentState } from '../types/tournament';
import { generateBalancedInitialSchedule, createPlayoffMatchTemplates } from '../core/schedule';
import { deriveBracketMatches } from '../core/bracket';

export const INITIAL_PLAYERS: Player[] = [
  // Muy buenos
  {
    id: 'player-1',
    name: 'Alejandro Viñeta',
    level: 'Muy bueno',
    initialSeed: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-2',
    name: 'Pol Ginebra',
    level: 'Muy bueno',
    initialSeed: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-3',
    name: 'Joan Ginebra',
    level: 'Muy bueno',
    initialSeed: 3,
    createdAt: new Date().toISOString()
  },
  // Nivel medio
  {
    id: 'player-4',
    name: 'Alex Viñeta',
    level: 'Nivel medio',
    initialSeed: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-5',
    name: 'Guille Morales',
    level: 'Nivel medio',
    initialSeed: 5,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-6',
    name: 'Fran Montobio',
    level: 'Nivel medio',
    initialSeed: 6,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-7',
    name: 'Elisabet Ginebra',
    level: 'Nivel medio',
    initialSeed: 7,
    createdAt: new Date().toISOString()
  },
  // Más flojos
  {
    id: 'player-8',
    name: 'Imma Ginebra',
    level: 'Más flojo',
    initialSeed: 8,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-9',
    name: 'Gabriel Ginebra',
    level: 'Más flojo',
    initialSeed: 9,
    createdAt: new Date().toISOString()
  },
  {
    id: 'player-10',
    name: 'Anna Ginebra',
    level: 'Más flojo',
    initialSeed: 10,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_REGULATIONS = `# REGLAMENTO OFICIAL DEL TORNEO DE PING-PONG

### 1. Sistema de Competición
El torneo consta de **10 participantes** y se divide en dos fases:
* **Fase Inicial**: 10 partidos en total. Cada jugador disputa exactamente 2 partidos.
* **Fase Eliminatoria**: Los 8 mejores jugadores clasificados avanzan al Cuadro Principal (Cuartos de final).
* **Fase de Consolación**: Los jugadores clasificados en 9.ª y 10.ª posición disputan un partido de consolación, asegurando que todos los participantes jueguen al menos 3 partidos en el torneo.

---

### 2. Duración de los Partidos
Cada partido tiene una duración estimada de **10 minutos**, comenzando el torneo puntualmente a las **11:00**.

---

### 3. Puntuación
Los partidos se disputan al primero que llegue a **11 puntos**.

---

### 4. Condición de Victoria
Gana el partido el primer jugador que alcance **11 puntos con una ventaja mínima de 2 puntos** sobre el oponente (ej. 11-0, 11-8, 11-9, 12-10, 13-11).

---

### 5. Empate a 10-10 (Deuce)
Si ambos jugadores empatan a **10-10**, el partido no termina a los 11 puntos. Se continúa jugando consecutivamente sin límite de puntos hasta que uno de los dos jugadores logre una **diferencia exacta de 2 puntos** (ej. 12-10, 13-11, 14-12).

---

### 6. Saque Inicial ("Pal Saque")
Antes de comenzar cada partido, el saque inicial se decide mediante un punto previo de **"Pal saque"** o mediante el botón de sorteo aleatorio oficial de la aplicación.

---

### 7. Saque Durante el Partido (Estilo Voleibol)
Durante todo el encuentro, **saca el jugador que haya ganado el punto anterior**. Si el jugador A anota, saca A; si el jugador B anota el siguiente, pasa a sacar B y conserva el saque mientras siga anotando puntos.

---

### 8. Puntos de Clasificación
* **Victoria**: 1 punto de clasificación.
* **Derrota**: 0 puntos de clasificación.
*(No existen empates en los partidos)*.

---

### 9. Criterios de Desempate en Clasificación
Si dos o más jugadores igualan en puntos, la clasificación se resolverá **estrictamente en este orden**:
1. **Puntos de clasificación** (Mayor número de victorias) $\\downarrow$
2. **Diferencia total de puntos de partido** ($PF - PC$) $\\downarrow$
3. **Puntos de partido a favor** ($PF$) $\\downarrow$
4. **Orden alfabético** por nombre $\\uparrow$

*No se aplica enfrentamiento directo ni sorteos manuales.*

---

### 10. Cuartos de Final
Cruces automáticos determinados por la clasificación final de la Fase Inicial:
* **QF1**: 1.º Clasificado vs 8.º Clasificado
* **QF2**: 2.º Clasificado vs 7.º Clasificado
* **QF3**: 3.º Clasificado vs 6.º Clasificado
* **QF4**: 4.º Clasificado vs 5.º Clasificado

---

### 11. Semifinales
* **Semifinal 1**: Ganador QF1 vs Ganador QF2
* **Semifinal 2**: Ganador QF3 vs Ganador QF4

---

### 12. Final y Tercer Puesto
* **Gran Final**: Ganador Semifinal 1 vs Ganador Semifinal 2 $\\rightarrow$ **🏆 Campeón del Torneo**
* **3.º y 4.º Puesto**: Perdedor Semifinal 1 vs Perdedor Semifinal 2

---

### 13. Consolación
* **Partido de Consolación**: 9.º Clasificado vs 10.º Clasificado
`;

export const INITIAL_CONFIG: TournamentConfig = {
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
 * Genera el estado inicial completo del torneo
 */
export function createInitialTournamentState(): TournamentState {
  const initialMatches = generateBalancedInitialSchedule(
    INITIAL_PLAYERS,
    INITIAL_CONFIG.startTime,
    INITIAL_CONFIG.matchDurationMinutes,
    INITIAL_CONFIG.id
  );

  const playoffMatches = createPlayoffMatchTemplates(
    INITIAL_CONFIG.startTime,
    INITIAL_CONFIG.matchDurationMinutes,
    INITIAL_CONFIG.id
  );

  const allMatches = deriveBracketMatches(
    [...initialMatches, ...playoffMatches],
    INITIAL_PLAYERS
  );

  return {
    config: INITIAL_CONFIG,
    players: INITIAL_PLAYERS,
    matches: allMatches,
    version: 1,
    lastUpdated: new Date().toISOString()
  };
}
