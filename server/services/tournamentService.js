import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';
import {
  createInitialTournamentState,
  applyPoint,
  undoLastPoint,
  setPalSaque as setPalSaqueLogic,
  deriveBracketMatches,
  calculateStandings,
  calculateMatchTime,
  generateBalancedInitialSchedule,
  createPlayoffMatchTemplates,
  isMatchFinished,
  INITIAL_PLAYERS,
  INITIAL_CONFIG
} from '../logic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalDataPaths() {
  const dir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
  return {
    dir,
    file: path.join(dir, 'tournament_state.json'),
    backup: path.join(dir, 'tournament_state.backup.json')
  };
}

// Memory cache & write queue lock
let cachedState = null;
let writeQueue = Promise.resolve();

export function withServiceLock(fn) {
  const result = writeQueue.then(async () => {
    return await fn();
  });
  writeQueue = result.catch(() => {});
  return result;
}

// -------------------------------------------------------------
// MAPPER FUNCTIONS: Supabase PostgreSQL <-> Domain JS Models
// -------------------------------------------------------------

function mapDbTournamentToConfig(t) {
  return {
    id: t.id,
    name: t.name,
    startTime: t.start_time,
    matchDurationMinutes: t.match_duration_minutes,
    pointsToWin: t.points_to_win,
    minimumWinningDifference: t.minimum_winning_difference,
    regulationsMarkdown: t.regulations_markdown,
    adminPin: t.admin_pin,
    updatedAt: t.updated_at
  };
}

function mapDbPlayerToPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    initialSeed: p.initial_seed,
    createdAt: p.created_at
  };
}

function mapDbMatchToMatch(m, points = []) {
  return {
    id: m.id,
    tournamentId: m.tournament_id,
    phase: m.phase,
    matchNumber: m.match_number,
    scheduledTime: m.scheduled_time,
    player1Id: m.player1_id,
    player2Id: m.player2_id,
    score1: m.score1,
    score2: m.score2,
    status: m.status,
    winnerId: m.winner_id,
    initialServerId: m.initial_server_id,
    currentServerId: m.current_server_id,
    bracketCode: m.bracket_code,
    sourceDesc1: m.source_desc1,
    sourceDesc2: m.source_desc2,
    pointHistory: points.map(pt => ({
      id: pt.id,
      matchId: pt.match_id,
      pointNumber: pt.point_number,
      winnerPlayerId: pt.winner_player_id,
      score1After: pt.score1_after,
      score2After: pt.score2_after,
      serverBefore: pt.server_before,
      serverAfter: pt.server_after,
      timestamp: pt.created_at
    })),
    createdAt: m.created_at,
    updatedAt: m.updated_at
  };
}

// -------------------------------------------------------------
// LOCAL FALLBACK HANDLERS
// -------------------------------------------------------------

function loadLocalJsonState() {
  const { file } = getLocalDataPaths();
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf-8');
      cachedState = JSON.parse(data);
      return cachedState;
    }
  } catch (e) {
    console.error('[Fallback DB] Error reading local JSON:', e);
  }
  cachedState = createInitialTournamentState();
  saveLocalJsonState(cachedState);
  return cachedState;
}

function saveLocalJsonState(state) {
  const { dir, file, backup } = getLocalDataPaths();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(file)) {
      try {
        fs.copyFileSync(file, backup);
      } catch {}
    }
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Fallback DB] Could not write local file (normal in read-only clouds):', err.message);
  }
}

// -------------------------------------------------------------
// CORE REPOSITORY FUNCTIONS
// -------------------------------------------------------------

/**
 * Carga el estado completo del torneo desde Supabase (o fallback local)
 */
export async function getTournamentState() {
  if (!isSupabaseConfigured()) {
    if (!cachedState) loadLocalJsonState();
    return cachedState;
  }

  const supabase = getSupabaseClient();

  // 1. Obtener Torneo
  const { data: tournaments, error: tErr } = await supabase
    .from('tournaments')
    .select('*')
    .limit(1);

  if (tErr) {
    console.error('[Supabase Error] Error fetching tournament:', tErr);
    if (!cachedState) loadLocalJsonState();
    return cachedState;
  }

  if (!tournaments || tournaments.length === 0) {
    console.log('⚡ Base de datos Supabase vacía. Sembrando estado inicial...');
    const initial = createInitialTournamentState();
    await saveFullTournamentState(initial);
    cachedState = initial;
    return cachedState;
  }

  const tournamentRow = tournaments[0];
  const tournamentId = tournamentRow.id;

  // 2. Obtener Jugadores
  const { data: playersRows, error: pErr } = await supabase
    .from('players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('initial_seed', { ascending: true });

  if (pErr) throw pErr;

  // 3. Obtener Partidos
  const { data: matchesRows, error: mErr } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: true });

  if (mErr) throw mErr;

  // 4. Obtener Puntos
  const { data: pointsRows, error: ptErr } = await supabase
    .from('match_points')
    .select('*')
    .order('point_number', { ascending: true });

  if (ptErr) throw ptErr;

  // Agrupar puntos por partido
  const pointsByMatch = new Map();
  (pointsRows || []).forEach(pt => {
    if (!pointsByMatch.has(pt.match_id)) {
      pointsByMatch.set(pt.match_id, []);
    }
    pointsByMatch.get(pt.match_id).push(pt);
  });

  const players = (playersRows || []).map(mapDbPlayerToPlayer);
  const matches = (matchesRows || []).map(m => mapDbMatchToMatch(m, pointsByMatch.get(m.id) || []));

  cachedState = {
    config: mapDbTournamentToConfig(tournamentRow),
    players,
    matches,
    version: tournamentRow.version || 1,
    lastUpdated: tournamentRow.updated_at || new Date().toISOString()
  };

  return cachedState;
}

/**
 * Guarda o migra el estado completo en Supabase
 */
export async function saveFullTournamentState(state) {
  const updatedState = {
    ...state,
    version: (state.version || 0) + 1,
    lastUpdated: new Date().toISOString()
  };

  cachedState = updatedState;

  if (!isSupabaseConfigured()) {
    saveLocalJsonState(updatedState);
    return updatedState;
  }

  const supabase = getSupabaseClient();
  const t = updatedState.config;

  // 1. Upsert Torneo
  const { error: tErr } = await supabase.from('tournaments').upsert({
    id: t.id || 'torneo-2026',
    name: t.name || 'Gran Torneo Ping-Pong 2026',
    start_time: t.startTime || '11:00',
    match_duration_minutes: t.matchDurationMinutes || 10,
    points_to_win: t.pointsToWin || 11,
    minimum_winning_difference: t.minimumWinningDifference || 2,
    regulations_markdown: t.regulationsMarkdown || '',
    admin_pin: t.adminPin || '1234',
    status: 'ACTIVE',
    version: updatedState.version,
    updated_at: updatedState.lastUpdated
  });

  if (tErr) throw tErr;

  // 2. Upsert Jugadores
  if (updatedState.players && updatedState.players.length > 0) {
    const playerRows = updatedState.players.map(p => ({
      id: p.id,
      tournament_id: t.id || 'torneo-2026',
      name: p.name,
      level: p.level || 'Nivel medio',
      initial_seed: p.initialSeed || 1,
      updated_at: updatedState.lastUpdated
    }));

    const { error: pErr } = await supabase.from('players').upsert(playerRows);
    if (pErr) throw pErr;
  }

  // 3. Upsert Partidos
  if (updatedState.matches && updatedState.matches.length > 0) {
    const matchRows = updatedState.matches.map(m => ({
      id: m.id,
      tournament_id: t.id || 'torneo-2026',
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
      updated_at: updatedState.lastUpdated
    }));

    const { error: mErr } = await supabase.from('matches').upsert(matchRows);
    if (mErr) throw mErr;
  }

  saveLocalJsonState(updatedState);
  return updatedState;
}

// -------------------------------------------------------------
// DOMAIN ACTIONS WITH SUPABASE TRANSACTIONS & MUTEX LOCK
// -------------------------------------------------------------

/**
 * Registra un punto (+1) en un partido en Supabase
 */
export async function recordPointInMatch(matchId, winnerPlayerId) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    const updatedMatch = applyPoint(
      currentMatch,
      winnerPlayerId,
      currentState.config.pointsToWin,
      currentState.config.minimumWinningDifference
    );

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    // Recalcular cruces del cuadro automáticamente
    const recalculatedMatches = deriveBracketMatches(newMatches, currentState.players);

    // Guardar en Supabase
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const lastPoint = updatedMatch.pointHistory[updatedMatch.pointHistory.length - 1];

      // 1. Insertar punto en match_points
      if (lastPoint) {
        await supabase.from('match_points').insert({
          id: lastPoint.id,
          match_id: matchId,
          point_number: lastPoint.pointNumber,
          winner_player_id: lastPoint.winnerPlayerId,
          score1_after: lastPoint.score1After,
          score2_after: lastPoint.score2After,
          server_before: lastPoint.serverBefore || null,
          server_after: lastPoint.serverAfter || null,
          created_at: lastPoint.timestamp
        });
      }

      // 2. Actualizar partido modificado
      await supabase.from('matches').update({
        score1: updatedMatch.score1,
        score2: updatedMatch.score2,
        status: updatedMatch.status,
        winner_id: updatedMatch.winnerId,
        current_server_id: updatedMatch.currentServerId,
        finished_at: updatedMatch.status === 'FINALIZADO' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq('id', matchId);

      // 3. Sincronizar cuadros eliminatorios
      const playoffMatches = recalculatedMatches.filter(m => m.phase !== 'FASE_INICIAL');
      for (const pm of playoffMatches) {
        await supabase.from('matches').update({
          player1_id: pm.player1Id,
          player2_id: pm.player2Id,
          source_desc1: pm.sourceDesc1,
          source_desc2: pm.sourceDesc2,
          updated_at: new Date().toISOString()
        }).eq('id', pm.id);
      }

      // 4. Incrementar versión en tournaments
      const newVersion = (currentState.version || 1) + 1;
      await supabase.from('tournaments').update({
        version: newVersion,
        updated_at: new Date().toISOString()
      }).eq('id', currentState.config.id);

      currentState.version = newVersion;
      currentState.matches = recalculatedMatches;
      currentState.lastUpdated = new Date().toISOString();
      cachedState = currentState;
      saveLocalJsonState(cachedState);
      return cachedState;
    }

    return await saveFullTournamentState({
      ...currentState,
      matches: recalculatedMatches
    });
  });
}

/**
 * Deshace el último punto (Undo) en Supabase
 */
export async function undoPointInMatch(matchId) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      throw new Error(`Partido ${matchId} no encontrado`);
    }

    const currentMatch = currentState.matches[matchIndex];
    if (!currentMatch.pointHistory || currentMatch.pointHistory.length === 0) {
      return currentState;
    }

    const lastPoint = currentMatch.pointHistory[currentMatch.pointHistory.length - 1];
    const updatedMatch = undoLastPoint(
      currentMatch,
      currentState.config.pointsToWin,
      currentState.config.minimumWinningDifference
    );

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;
    const recalculatedMatches = deriveBracketMatches(newMatches, currentState.players);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();

      // 1. Eliminar último punto de match_points
      if (lastPoint && lastPoint.id) {
        await supabase.from('match_points').delete().eq('id', lastPoint.id);
      }

      // 2. Actualizar partido
      await supabase.from('matches').update({
        score1: updatedMatch.score1,
        score2: updatedMatch.score2,
        status: updatedMatch.status,
        winner_id: updatedMatch.winnerId,
        current_server_id: updatedMatch.currentServerId,
        finished_at: null,
        updated_at: new Date().toISOString()
      }).eq('id', matchId);

      // 3. Sincronizar cuadros
      const playoffMatches = recalculatedMatches.filter(m => m.phase !== 'FASE_INICIAL');
      for (const pm of playoffMatches) {
        await supabase.from('matches').update({
          player1_id: pm.player1Id,
          player2_id: pm.player2Id,
          source_desc1: pm.sourceDesc1,
          source_desc2: pm.sourceDesc2,
          updated_at: new Date().toISOString()
        }).eq('id', pm.id);
      }

      const newVersion = (currentState.version || 1) + 1;
      await supabase.from('tournaments').update({
        version: newVersion,
        updated_at: new Date().toISOString()
      }).eq('id', currentState.config.id);

      currentState.version = newVersion;
      currentState.matches = recalculatedMatches;
      currentState.lastUpdated = new Date().toISOString();
      cachedState = currentState;
      saveLocalJsonState(cachedState);
      return cachedState;
    }

    return await saveFullTournamentState({
      ...currentState,
      matches: recalculatedMatches
    });
  });
}

/**
 * Asigna sacador de Pal Saque
 */
export async function setPalSaque(matchId, serverId) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error(`Partido ${matchId} no encontrado`);

    const currentMatch = currentState.matches[matchIndex];
    const updatedMatch = setPalSaqueLogic(currentMatch, serverId);

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updatedMatch;

    return await saveFullTournamentState({
      ...currentState,
      matches: newMatches
    });
  });
}

/**
 * Inicia un partido
 */
export async function startMatch(matchId) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error(`Partido ${matchId} no encontrado`);

    const current = currentState.matches[matchIndex];
    const serverId = current.initialServerId || current.player1Id;

    const updated = {
      ...current,
      status: 'EN_JUEGO',
      initialServerId: serverId,
      currentServerId: serverId,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updated;

    return await saveFullTournamentState({
      ...currentState,
      matches: newMatches
    });
  });
}

/**
 * Finaliza un partido comprobando reglas
 */
export async function finishMatch(matchId) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error(`Partido ${matchId} no encontrado`);

    const current = currentState.matches[matchIndex];
    const finished = isMatchFinished(
      current.score1,
      current.score2,
      currentState.config.pointsToWin,
      currentState.config.minimumWinningDifference
    );

    if (!finished) {
      throw new Error(`El marcador ${current.score1}-${current.score2} no cumple las condiciones de finalización (11 puntos y ventaja mínima de 2).`);
    }

    const winnerId = current.score1 > current.score2 ? current.player1Id : current.player2Id;
    const updated = {
      ...current,
      status: 'FINALIZADO',
      winnerId,
      currentServerId: null,
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updated;
    const recalculated = deriveBracketMatches(newMatches, currentState.players);

    return await saveFullTournamentState({
      ...currentState,
      matches: recalculated
    });
  });
}

/**
 * Modifica horario o rivales de un partido
 */
export async function updateMatchSchedule(matchId, scheduledTime, player1Id, player2Id) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const matchIndex = currentState.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error(`Partido ${matchId} no encontrado`);

    const current = currentState.matches[matchIndex];
    const p1 = player1Id !== undefined ? player1Id : current.player1Id;
    const p2 = player2Id !== undefined ? player2Id : current.player2Id;
    const playersChanged = current.player1Id !== p1 || current.player2Id !== p2;

    const updated = {
      ...current,
      scheduledTime: scheduledTime || current.scheduledTime,
      player1Id: p1,
      player2Id: p2,
      score1: playersChanged ? 0 : current.score1,
      score2: playersChanged ? 0 : current.score2,
      status: playersChanged ? 'PENDIENTE' : current.status,
      winnerId: playersChanged ? null : current.winnerId,
      pointHistory: playersChanged ? [] : current.pointHistory,
      updatedAt: new Date().toISOString()
    };

    const newMatches = [...currentState.matches];
    newMatches[matchIndex] = updated;
    const recalculated = deriveBracketMatches(newMatches, currentState.players);

    return await saveFullTournamentState({
      ...currentState,
      matches: recalculated
    });
  });
}

/**
 * Modifica, añade o elimina jugadores
 */
export async function managePlayer(action, player, playerId) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    let newPlayers = [...currentState.players];

    if (action === 'add' && player) {
      newPlayers.push({
        ...player,
        id: `player-${Date.now()}`,
        createdAt: new Date().toISOString()
      });
    } else if (action === 'update' && player) {
      newPlayers = newPlayers.map(p => (p.id === player.id ? player : p));
    } else if (action === 'delete' && playerId) {
      newPlayers = newPlayers.filter(p => p.id !== playerId);
    }

    const recalculated = deriveBracketMatches(currentState.matches, newPlayers);

    return await saveFullTournamentState({
      ...currentState,
      players: newPlayers,
      matches: recalculated
    });
  });
}

/**
 * Actualiza la configuración general
 */
export async function updateTournamentConfig(partialConfig) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const newConfig = {
      ...currentState.config,
      ...partialConfig,
      updatedAt: new Date().toISOString()
    };

    return await saveFullTournamentState({
      ...currentState,
      config: newConfig
    });
  });
}

/**
 * Recalcula los horarios secuencialmente
 */
export async function recalculateSchedules(startTime, durationMinutes) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const st = startTime || currentState.config.startTime;
    const dur = durationMinutes || currentState.config.matchDurationMinutes;

    const updatedMatches = currentState.matches.map((m, idx) => ({
      ...m,
      scheduledTime: calculateMatchTime(st, idx, dur),
      updatedAt: new Date().toISOString()
    }));

    return await saveFullTournamentState({
      ...currentState,
      config: {
        ...currentState.config,
        startTime: st,
        matchDurationMinutes: dur,
        updatedAt: new Date().toISOString()
      },
      matches: updatedMatches
    });
  });
}

/**
 * Desplaza partidos pendientes
 */
export async function shiftPendingSchedules(minutesDelta) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const updatedMatches = currentState.matches.map(m => {
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

    return await saveFullTournamentState({
      ...currentState,
      matches: updatedMatches
    });
  });
}

/**
 * Reordena dos partidos
 */
export async function reorderMatches(index1, index2) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    if (index1 < 0 || index2 < 0 || index1 >= currentState.matches.length || index2 >= currentState.matches.length) {
      throw new Error('Índices de reordenación fuera de rango');
    }

    const newMatches = [...currentState.matches];
    const temp = newMatches[index1];
    newMatches[index1] = newMatches[index2];
    newMatches[index2] = temp;

    const reorderedMatches = newMatches.map((m, idx) => ({
      ...m,
      matchNumber: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    return await saveFullTournamentState({
      ...currentState,
      matches: reorderedMatches
    });
  });
}

/**
 * Reinicia el torneo
 */
export async function resetTournament(preservePlayers = true) {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();
    const fresh = createInitialTournamentState();

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.from('match_points').delete().neq('id', 'dummy');
    }

    const resetState = {
      ...fresh,
      players: preservePlayers ? currentState.players : fresh.players,
      config: currentState.config
    };

    return await saveFullTournamentState(resetState);
  });
}

/**
 * Simula resultados de fase 1
 */
export async function populateDemoResults() {
  return await withServiceLock(async () => {
    const currentState = await getTournamentState();

    let currentMatches = currentState.matches.map(m => {
      if (m.phase === 'FASE_INICIAL' && m.player1Id && m.player2Id) {
        const p1 = currentState.players.find(p => p.id === m.player1Id);
        const p2 = currentState.players.find(p => p.id === m.player2Id);

        const levelScore = (level) => level === 'Muy bueno' ? 3 : (level === 'Nivel medio' ? 2 : 1);
        const p1Strength = levelScore(p1?.level || '') + (m.matchNumber % 2 === 0 ? 0.5 : 0);
        const p2Strength = levelScore(p2?.level || '');

        const p1Wins = p1Strength >= p2Strength;
        const score1 = p1Wins ? 11 : Math.floor(Math.random() * 4) + 6;
        const score2 = p1Wins ? Math.floor(Math.random() * 4) + 6 : 11;

        return {
          ...m,
          score1,
          score2,
          status: 'FINALIZADO',
          winnerId: p1Wins ? m.player1Id : m.player2Id,
          initialServerId: m.player1Id,
          currentServerId: null,
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    currentMatches = deriveBracketMatches(currentMatches, currentState.players);

    return await saveFullTournamentState({
      ...currentState,
      matches: currentMatches
    });
  });
}
