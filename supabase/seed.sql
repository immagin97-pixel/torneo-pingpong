-- ==========================================================
-- SEED DE DATOS INICIALES PARA SUPABASE POSTGRESQL
-- ==========================================================

-- 1. Insertar Torneo
INSERT INTO tournaments (
    id, name, start_time, match_duration_minutes, points_to_win, minimum_winning_difference, regulations_markdown, admin_pin, status, version
) VALUES (
    'torneo-2026',
    'Gran Torneo Ping-Pong 2026',
    '11:00',
    10,
    11,
    2,
    '# REGLAMENTO OFICIAL DEL TORNEO DE PING-PONG\n\n### 1. Sistema de Competición\nEl torneo consta de **10 participantes** y se divide en dos fases:\n* **Fase Inicial**: 10 partidos en total. Cada jugador disputa exactamente 2 partidos.\n* **Fase Eliminatoria**: Los 8 mejores jugadores clasificados avanzan al Cuadro Principal (Cuartos de final).\n* **Fase de Consolación**: Los jugadores clasificados en 9.ª y 10.ª posición disputan un partido de consolación.\n\n---\n\n### 2. Duración de los Partidos\nCada partido tiene una duración estimada de **10 minutos**, comenzando a las **11:00**.\n\n---\n\n### 3. Puntuación\nLos partidos se disputan a **11 puntos**.\n\n---\n\n### 4. Condición de Victoria\nGana quien alcance primero 11 puntos con ventaja mínima de 2 puntos.\n\n---\n\n### 5. Empate a 10-10 (Deuce)\nSi ambos empatan a 10-10, se continúa sin límite hasta obtener ventaja de 2 puntos.\n\n---\n\n### 6. Saque Inicial ("Pal Saque")\nSe decide mediante punto previo de "Pal saque" o sorteo aleatorio.\n\n---\n\n### 7. Saque Durante el Partido (Estilo Voleibol)\nSaca el jugador que haya ganado el punto anterior.\n\n---\n\n### 8. Puntos de Clasificación\n* Victoria: 1 punto de clasificación.\n* Derrota: 0 puntos.\n\n---\n\n### 9. Criterios de Desempate en Clasificación\n1. Puntos de clasificación (1 por victoria) DESC\n2. Diferencia total de puntos de partido (PF - PC) DESC\n3. Puntos de partido a favor (PF) DESC\n4. Orden alfabético por nombre ASC',
    '1234',
    'ACTIVE',
    1
) ON CONFLICT (id) DO NOTHING;

-- 2. Insertar los 10 Jugadores
INSERT INTO players (id, tournament_id, name, level, initial_seed) VALUES
('player-1', 'torneo-2026', 'Alejandro Viñeta', 'Muy bueno', 1),
('player-2', 'torneo-2026', 'Pol Ginebra', 'Muy bueno', 2),
('player-3', 'torneo-2026', 'Joan Ginebra', 'Muy bueno', 3),
('player-4', 'torneo-2026', 'Alex Viñeta', 'Nivel medio', 4),
('player-5', 'torneo-2026', 'Guille Morales', 'Nivel medio', 5),
('player-6', 'torneo-2026', 'Fran Montobio', 'Nivel medio', 6),
('player-7', 'torneo-2026', 'Elisabet Ginebra', 'Nivel medio', 7),
('player-8', 'torneo-2026', 'Imma Ginebra', 'Más flojo', 8),
('player-9', 'torneo-2026', 'Gabriel Ginebra', 'Más flojo', 9),
('player-10', 'torneo-2026', 'Anna Ginebra', 'Más flojo', 10)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar los 10 Partidos de Fase Inicial
INSERT INTO matches (id, tournament_id, phase, match_number, scheduled_time, player1_id, player2_id, score1, score2, status) VALUES
('match-init-1', 'torneo-2026', 'FASE_INICIAL', 1, '11:00', 'player-1', 'player-4', 0, 0, 'PENDIENTE'),
('match-init-2', 'torneo-2026', 'FASE_INICIAL', 2, '11:10', 'player-2', 'player-5', 0, 0, 'PENDIENTE'),
('match-init-3', 'torneo-2026', 'FASE_INICIAL', 3, '11:20', 'player-3', 'player-6', 0, 0, 'PENDIENTE'),
('match-init-4', 'torneo-2026', 'FASE_INICIAL', 4, '11:30', 'player-7', 'player-8', 0, 0, 'PENDIENTE'),
('match-init-5', 'torneo-2026', 'FASE_INICIAL', 5, '11:40', 'player-9', 'player-10', 0, 0, 'PENDIENTE'),
('match-init-6', 'torneo-2026', 'FASE_INICIAL', 6, '11:50', 'player-1', 'player-7', 0, 0, 'PENDIENTE'),
('match-init-7', 'torneo-2026', 'FASE_INICIAL', 7, '12:00', 'player-2', 'player-8', 0, 0, 'PENDIENTE'),
('match-init-8', 'torneo-2026', 'FASE_INICIAL', 8, '12:10', 'player-3', 'player-9', 0, 0, 'PENDIENTE'),
('match-init-9', 'torneo-2026', 'FASE_INICIAL', 9, '12:20', 'player-4', 'player-10', 0, 0, 'PENDIENTE'),
('match-init-10', 'torneo-2026', 'FASE_INICIAL', 10, '12:30', 'player-5', 'player-6', 0, 0, 'PENDIENTE')
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar las Plantillas de Eliminatorias y Consolación
INSERT INTO matches (id, tournament_id, phase, match_number, scheduled_time, bracket_code, source_desc1, source_desc2, score1, score2, status) VALUES
('match-playoff-consolation', 'torneo-2026', 'CONSOLACION', 11, '12:40', 'CONSOLATION', '9.º Clasificado', '10.º Clasificado', 0, 0, 'PENDIENTE'),
('match-playoff-qf1', 'torneo-2026', 'CUARTOS', 12, '12:50', 'QF1', '1.º Clasificado', '8.º Clasificado', 0, 0, 'PENDIENTE'),
('match-playoff-qf2', 'torneo-2026', 'CUARTOS', 13, '13:00', 'QF2', '2.º Clasificado', '7.º Clasificado', 0, 0, 'PENDIENTE'),
('match-playoff-qf3', 'torneo-2026', 'CUARTOS', 14, '13:10', 'QF3', '3.º Clasificado', '6.º Clasificado', 0, 0, 'PENDIENTE'),
('match-playoff-qf4', 'torneo-2026', 'CUARTOS', 15, '13:20', 'QF4', '4.º Clasificado', '5.º Clasificado', 0, 0, 'PENDIENTE'),
('match-playoff-sf1', 'torneo-2026', 'SEMIFINAL', 16, '13:30', 'SF1', 'Ganador QF1 (1º/8º)', 'Ganador QF2 (2º/7º)', 0, 0, 'PENDIENTE'),
('match-playoff-sf2', 'torneo-2026', 'SEMIFINAL', 17, '13:40', 'SF2', 'Ganador QF3 (3º/6º)', 'Ganador QF4 (4º/5º)', 0, 0, 'PENDIENTE'),
('match-playoff-3rd_place', 'torneo-2026', 'TERCER_CUARTO', 18, '14:00', '3RD_PLACE', 'Perdedor Semifinal 1', 'Perdedor Semifinal 2', 0, 0, 'PENDIENTE'),
('match-playoff-final', 'torneo-2026', 'FINAL', 19, '14:10', 'FINAL', 'Ganador Semifinal 1', 'Ganador Semifinal 2', 0, 0, 'PENDIENTE')
ON CONFLICT (id) DO NOTHING;
