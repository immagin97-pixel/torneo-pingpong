-- ==========================================================
-- ESQUEMA OFICIAL POSTGRESQL PARA SUPABASE
-- TORNEO DE PING-PONG EN TIEMPO REAL
-- ==========================================================

-- Extensión para generación de UUIDs si fuera necesaria
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: tournaments (Configuración y estado maestro del torneo)
CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '11:00',
    match_duration_minutes INTEGER NOT NULL DEFAULT 10,
    points_to_win INTEGER NOT NULL DEFAULT 11,
    minimum_winning_difference INTEGER NOT NULL DEFAULT 2,
    regulations_markdown TEXT,
    admin_pin TEXT NOT NULL DEFAULT '1234',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: players (Participantes, niveles y cabezas de serie)
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Nivel medio',
    initial_seed INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: matches (Partidos de fase inicial, consolación y eliminatorias)
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    phase TEXT NOT NULL, -- 'FASE_INICIAL', 'CUARTOS', 'SEMIFINAL', 'TERCER_CUARTO', 'FINAL', 'CONSOLACION'
    match_number INTEGER NOT NULL,
    scheduled_time TEXT NOT NULL,
    player1_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    player2_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    score1 INTEGER NOT NULL DEFAULT 0,
    score2 INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'EN_JUEGO', 'FINALIZADO'
    winner_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    initial_server_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    current_server_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    bracket_code TEXT, -- 'QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', '3RD_PLACE', 'FINAL', 'CONSOLATION'
    source_desc1 TEXT,
    source_desc2 TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: match_points (Registro punto a punto e historial para Undo seguro)
CREATE TABLE IF NOT EXISTS match_points (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    winner_player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score1_after INTEGER NOT NULL,
    score2_after INTEGER NOT NULL,
    server_before TEXT,
    server_after TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_number ON matches(match_number);
CREATE INDEX IF NOT EXISTS idx_match_points_match ON match_points(match_id, point_number);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_points ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública (cualquier cliente puede consultar el torneo)
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read match_points" ON match_points FOR SELECT USING (true);

-- Políticas de escritura solo para Backend (service_role)
CREATE POLICY "Service role full access tournaments" ON tournaments FOR ALL USING (auth.role() = 'service_role' OR current_user = 'service_role');
CREATE POLICY "Service role full access players" ON players FOR ALL USING (auth.role() = 'service_role' OR current_user = 'service_role');
CREATE POLICY "Service role full access matches" ON matches FOR ALL USING (auth.role() = 'service_role' OR current_user = 'service_role');
CREATE POLICY "Service role full access match_points" ON match_points FOR ALL USING (auth.role() = 'service_role' OR current_user = 'service_role');
