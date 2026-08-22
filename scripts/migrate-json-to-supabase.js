/**
 * Script de migración: data/tournament_state.json -> Supabase PostgreSQL
 * Uso: npm run migrate (o node scripts/migrate-json-to-supabase.js)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'tournament_state.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 INICIANDO MIGRACIÓN: JSON -> SUPABASE POSTGRESQL');
  console.log('====================================================');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ ERROR: Debes definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu archivo .env');
    console.error('Ejemplo en .env:');
    console.error('SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co');
    console.error('SUPABASE_SERVICE_ROLE_KEY=eyJh...');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`❌ ERROR: No se encontró el archivo ${DATA_FILE}`);
    process.exit(1);
  }

  console.log(`📁 Leyendo estado actual desde ${DATA_FILE}...`);
  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const tournamentState = JSON.parse(rawData);

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const tournamentId = tournamentState.config?.id || 'torneo-2026';
  const config = tournamentState.config;
  const players = tournamentState.players || [];
  const matches = tournamentState.matches || [];

  console.log(`📊 Datos a migrar:`);
  console.log(` - Torneo: "${config.name}" (ID: ${tournamentId})`);
  console.log(` - Jugadores: ${players.length}`);
  console.log(` - Partidos: ${matches.length}`);

  // 1. Migrar Torneo
  console.log('\n1. Migrando tabla `tournaments`...');
  const { error: tErr } = await supabase.from('tournaments').upsert({
    id: tournamentId,
    name: config.name || 'Gran Torneo Ping-Pong 2026',
    start_time: config.startTime || '11:00',
    match_duration_minutes: config.matchDurationMinutes || 10,
    points_to_win: config.pointsToWin || 11,
    minimum_winning_difference: config.minimumWinningDifference || 2,
    regulations_markdown: config.regulationsMarkdown || '',
    admin_pin: config.adminPin || '1234',
    status: 'ACTIVE',
    version: tournamentState.version || 1,
    updated_at: tournamentState.lastUpdated || new Date().toISOString()
  });

  if (tErr) {
    console.error('❌ Error migrando torneo:', tErr);
    process.exit(1);
  }
  console.log('✓ Torneo migrado con éxito.');

  // 2. Migrar Jugadores
  console.log('\n2. Migrando tabla `players`...');
  if (players.length > 0) {
    const playerRows = players.map(p => ({
      id: p.id,
      tournament_id: tournamentId,
      name: p.name,
      level: p.level || 'Nivel medio',
      initial_seed: p.initialSeed || 1,
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: pErr } = await supabase.from('players').upsert(playerRows);
    if (pErr) {
      console.error('❌ Error migrando jugadores:', pErr);
      process.exit(1);
    }
    console.log(`✓ ${playerRows.length} jugadores migrados con éxito.`);
  }

  // 3. Migrar Partidos
  console.log('\n3. Migrando tabla `matches`...');
  if (matches.length > 0) {
    const matchRows = matches.map(m => ({
      id: m.id,
      tournament_id: tournamentId,
      phase: m.phase,
      match_number: m.matchNumber,
      scheduled_time: m.scheduledTime,
      player1_id: m.player1Id || null,
      player2_id: m.player2Id || null,
      score1: m.score1 || 0,
      score2: m.score2 || 0,
      status: m.status || 'PENDIENTE',
      winner_id: m.winnerId || null,
      initial_server_id: m.initialServerId || null,
      current_server_id: m.currentServerId || null,
      bracket_code: m.bracketCode || null,
      source_desc1: m.sourceDesc1 || null,
      source_desc2: m.sourceDesc2 || null,
      created_at: m.createdAt || new Date().toISOString(),
      updated_at: m.updatedAt || new Date().toISOString()
    }));

    const { error: mErr } = await supabase.from('matches').upsert(matchRows);
    if (mErr) {
      console.error('❌ Error migrando partidos:', mErr);
      process.exit(1);
    }
    console.log(`✓ ${matchRows.length} partidos migrados con éxito.`);
  }

  // 4. Migrar Puntos Históricos (para Undo)
  console.log('\n4. Migrando tabla `match_points`...');
  let totalPoints = 0;
  for (const m of matches) {
    if (m.pointHistory && m.pointHistory.length > 0) {
      const pointRows = m.pointHistory.map(pt => ({
        id: pt.id || `pt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        match_id: m.id,
        point_number: pt.pointNumber,
        winner_player_id: pt.winnerPlayerId,
        score1_after: pt.score1After,
        score2_after: pt.score2After,
        server_before: pt.serverBefore || null,
        server_after: pt.serverAfter || null,
        created_at: pt.timestamp || new Date().toISOString()
      }));

      const { error: ptErr } = await supabase.from('match_points').upsert(pointRows);
      if (ptErr) {
        console.error(`❌ Error migrando puntos del partido ${m.id}:`, ptErr);
      } else {
        totalPoints += pointRows.length;
      }
    }
  }
  console.log(`✓ ${totalPoints} puntos históricos migrados.`);

  console.log('\n====================================================');
  console.log('✅ MIGRACIÓN COMPLETADA CON ÉXITO A SUPABASE');
  console.log('====================================================');
}

runMigration().catch(err => {
  console.error('❌ Error fatal en migración:', err);
  process.exit(1);
});
