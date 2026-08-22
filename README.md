# 🏓 Sistema Integral de Torneo de Ping-Pong en Tiempo Real

Aplicación web completa, reactiva y profesional para gestionar un torneo de ping-pong de **10 participantes** con aplicación estricta y automática de toda la normativa deportiva oficial, desempates de clasificación de 4 niveles, generación automática de cuadros eliminatorios y marcador en vivo táctil.

---

## 🌟 Características Principales

1. **Página Pública y En Directo**:
   - Marcador gigante en vivo con indicador de saque 🏓 y estado del partido (🔴 EN DIRECTO, 🟡 PENDIENTE, 🟢 FINALIZADO).
   - Vista de próximo partido con horario.
   - Tabla de clasificación oficial en tiempo real con cortes visuales para Cuartos de Final (puestos 1.º-8.º) y Consolación (puestos 9.º-10.º).
   - Resumen de últimos resultados.
   - Acceso interactivo a cuadros y reglamento.

2. **Panel de Administración Protegido**:
   - Acceso con PIN rápido (por defecto: `1234`).
   - Control de marcador táctil ergonómico optimizado para tablets y móviles en pista (+1 Punto por jugador, ↩ Deshacer Punto, 🎲 Sorteo Pal Saque).
   - Gestión de participantes (añadir, editar nombre, modificar nivel deportivo, reordenar).
   - Gestión de calendario y cruces (modificar horas, reordenar partidos, forzar resultados con validación).
   - Configuración del torneo (hora de inicio a las 11:00h, duración por partido de 10 min, puntos de victoria a 11, diferencia mínima de 2).
   - Herramienta de simulación con un solo clic para verificar el flujo de competición completo.
   - Botón de reinicio seguro del torneo.

3. **Lógica Deportiva y Reglamento Automático**:
   - **Condición de Victoria**: Regla matemática central `isMatchFinished(score1, score2)` $\rightarrow$ `max(score1, score2) >= 11 && abs(score1 - score2) >= 2`.
   - **Regla del 10-10 (Deuce)**: Si empatan a 10-10, el partido continúa indefinidamente hasta que un jugador obtenga una ventaja exacta de 2 puntos (ej. 12-10, 13-11, 14-12).
   - **Saque "Estilo Voleibol"**:
     - Saque inicial decidido mediante **"Pal Saque"** (botón de sorteo aleatorio 🎲 con animación).
     - Durante el partido, saca el jugador que haya ganado el punto anterior.
   - **Deshacer Puntos (Undo)**: Restaura marcador, historial de eventos y el jugador al saque previo.

4. **Sistema Estricto de Clasificación (4 Niveles de Desempate)**:
   La clasificación de la Fase Inicial se ordena **exclusivamente** mediante estos 4 criterios:
   1. `Puntos de clasificación` (1 punto por victoria, 0 por derrota) **DESC**
   2. `Diferencia total de puntos de partido` ($PF - PC$) **DESC**
   3. `Puntos de partido a favor` ($PF$) **DESC**
   4. `Orden alfabético por nombre` **ASC**
   *(Sin criterios ocultos, sin sorteos manuales, sin enfrentamiento directo).*

5. **Generación Reactiva de Cuadros Eliminatorios**:
   - **Cuartos de Final (Top 8)**:
     - QF1: 1.º vs 8.º
     - QF2: 2.º vs 7.º
     - QF3: 3.º vs 6.º
     - QF4: 4.º vs 5.º
   - **Semifinales**:
     - SF1: Ganador QF1 vs Ganador QF2
     - SF2: Ganador QF3 vs Ganador QF4
   - **Gran Final**:
     - Final: Ganador SF1 vs Ganador SF2 $\rightarrow$ 🏆 **Campeón del Torneo** con celebración y confeti.
   - **3.º y 4.º Puesto**:
     - Perdedor SF1 vs Perdedor SF2
   - **Fase de Consolación**:
     - Partido independiente: 9.º vs 10.º (garantiza que todos jueguen al menos 3 partidos).

6. **Estadísticas Individuales Detalladas**:
   - Al pulsar sobre cualquier jugador se abre su ficha completa: balance V/D, efectividad %, puntos a favor/contra, racha actual, historial de partidos y enfrentamientos directos (H2H) contra cada rival.

7. **Sincronización en Tiempo Real**:
   - Servidor WebSocket backend (puerto `3001`).
   - Sincronización dual mediante `BroadcastChannel` para comunicación instantánea entre múltiples pestañas del navegador incluso en modo local.

---

## 👥 Jugadores Iniciales

* **Muy buenos**: Alejandro Viñeta, Pol Ginebra, Joan Ginebra
* **Nivel medio**: Alex Viñeta, Guille Morales, Fran Montobio, Elisabet Ginebra
* **Más flojos**: Imma Ginebra, Gabriel Ginebra, Anna Ginebra

---

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js $\ge$ 18.x
- npm $\ge$ 9.x

### 1. Iniciar el Servidor de Producción (Fullstack + WebSockets)
```bash
npm run build
npm start
```
Abre tu navegador en: [http://localhost:3001](http://localhost:3001)

### 2. Iniciar en Modo Desarrollo (Vite HMR)
```bash
npm run dev
```
Abre tu navegador en: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Ejecución de Tests Automatizados

La suite de tests unitarios con Vitest valida el 100% de las reglas deportivas y desempates:

```bash
npm test
```

### Casos de Prueba Verificados:
- Reglas de puntuación (11-0, 11-8, 11-9, 11-10 -> no termina, 12-10, 12-11 -> no termina, 13-11, 14-12).
- Alternancia del saque según el ganador del punto y resultado del "Pal Saque".
- Deshacer punto (undo) y reversión de servidor.
- Desempates en clasificación (puntos $\rightarrow$ DIF $+5 > +4$ $\rightarrow$ PF $21 > 19$ $\rightarrow$ orden alfabético).
- Integridad del calendario (10 partidos, 10 jugadores, 2 partidos c/u, sin repeticiones).
- Asignación y propagación automática de cuadros (Cuartos, Semis, Final y Consolación).

---

## 📁 Estructura del Código

```text
torneo-pingpong/
├── server/
│   └── index.js              # Servidor Express + WebSocket API + Servidor estático
├── src/
│   ├── core/
│   │   ├── rules.ts          # isMatchFinished, getNextServer, applyPoint, undoLastPoint
│   │   ├── standings.ts      # calculateStandings con los 4 criterios de desempate
│   │   ├── bracket.ts        # deriveBracketMatches y getBracketStructure
│   │   ├── schedule.ts       # validateInitialSchedule y generación de horarios
│   │   └── stats.ts          # getPlayerStats y cálculo de H2H
│   ├── types/
│   │   └── tournament.ts     # Definiciones e interfaces TypeScript
│   ├── data/
│   │   └── initialData.ts    # 10 jugadores iniciales, calendario y reglamento
│   ├── context/
│   │   └── TournamentContext.tsx # Estado global, sincronización en vivo y acciones
│   ├── components/
│   │   ├── Navbar.tsx        # Navegación y desbloqueo de PIN admin
│   │   ├── HeroLiveScore.tsx # Marcador central en vivo con Pal Saque
│   │   ├── StandingsTable.tsx# Tabla de clasificación oficial y desempates
│   │   ├── InteractiveBracket.tsx # Árbol del cuadro eliminatorio y consolación
│   │   ├── ScheduleList.tsx  # Calendario de partidos con filtros por fase
│   │   ├── PlayerStatsModal.tsx # Ficha estadística individual y H2H
│   │   ├── RegulationsView.tsx  # Vista de reglamento con 13 artículos
│   │   └── AdminPanel.tsx    # Panel de administración completo
│   ├── App.tsx               # Aplicación React principal
│   └── main.tsx              # Punto de entrada
├── tests/
│   ├── rules.test.ts         # Tests de finalización y saque
│   ├── standings.test.ts     # Tests de los 4 desempates de clasificación
│   ├── schedule.test.ts      # Tests de integridad de calendario
│   └── bracket.test.ts       # Tests de propagación de cuadros
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```
