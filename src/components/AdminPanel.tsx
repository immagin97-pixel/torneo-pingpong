import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Player, PlayerLevel, Match } from '../types/tournament';
import { validateInitialSchedule } from '../core/schedule';
import {
  Shield,
  Users,
  Calendar,
  Settings,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Sparkles,
  Radio,
  Clock,
  Save,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  FastForward,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    state,
    activeMatch,
    setActiveMatchId,
    recordPoint,
    undoPoint,
    setPalSaqueServer,
    updateMatch,
    updateMatchSchedule,
    updateMatchPairing,
    swapMatchOrder,
    recalculateAllSchedules,
    shiftPendingSchedules,
    resetInitialScheduleToDefault,
    updatePlayer,
    addPlayer,
    deletePlayer,
    updateConfig,
    resetTournament,
    populateDemoResults
  } = useTournament();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'schedule' | 'scoreboard' | 'players' | 'config' | 'tools'
  >('schedule');

  // Player Editing State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState<PlayerLevel>('Nivel medio');

  // Match Schedule & Pairing Editing State
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editMatchTime, setEditMatchTime] = useState<string>('');
  const [editMatchP1, setEditMatchP1] = useState<string>('');
  const [editMatchP2, setEditMatchP2] = useState<string>('');
  const [scheduleFilterPhase, setScheduleFilterPhase] = useState<string>('ALL');

  // Schedule Global Configuration Inputs
  const [globalStartTime, setGlobalStartTime] = useState<string>(state.config.startTime);
  const [globalDuration, setGlobalDuration] = useState<number>(state.config.matchDurationMinutes);

  // Config State
  const [configName, setConfigName] = useState(state.config.name);
  const [configStartTime, setConfigStartTime] = useState(state.config.startTime);
  const [configDuration, setConfigDuration] = useState(state.config.matchDurationMinutes);
  const [configPin, setConfigPin] = useState(state.config.adminPin);

  // Confirmation dialog state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const scheduleValidation = validateInitialSchedule(state.matches, state.players);

  const p1 = activeMatch ? state.players.find((p) => p.id === activeMatch.player1Id) : null;
  const p2 = activeMatch ? state.players.find((p) => p.id === activeMatch.player2Id) : null;

  const filteredAdminMatches = state.matches.filter((m) => {
    if (scheduleFilterPhase === 'ALL') return true;
    return m.phase === scheduleFilterPhase;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Admin Top Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
              <span>Panel de Control de Administración</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Modificación de horarios, calendario, jugadores y configuración
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold animate-fade-in flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {[
          { id: 'schedule', label: '📅 Horarios & Calendario', icon: Calendar },
          { id: 'scoreboard', label: '🏓 Marcador en Directo', icon: Radio },
          { id: 'players', label: '👥 Jugadores (10)', icon: Users },
          { id: 'config', label: '⚙️ Configuración', icon: Settings },
          { id: 'tools', label: '✨ Simulador & Reset', icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Horarios & Calendario (Featured!) */}
      {activeAdminTab === 'schedule' && (
        <div className="space-y-6">
          {/* Global Schedule Tools Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span>Ajustes Globales de Horarios</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica la hora de inicio del torneo y los intervalos de duración de los partidos
                </p>
              </div>

              {/* Quick Shift Pending Matches (+5m, +10m, -5m) */}
              <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center space-x-1">
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>Desplazar pendientes:</span>
                </span>
                <button
                  onClick={() => {
                    shiftPendingSchedules(5);
                    showFeedback('Horarios pendientes retrasados +5 min');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors"
                >
                  +5m
                </button>
                <button
                  onClick={() => {
                    shiftPendingSchedules(10);
                    showFeedback('Horarios pendientes retrasados +10 min');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors"
                >
                  +10m
                </button>
                <button
                  onClick={() => {
                    shiftPendingSchedules(-5);
                    showFeedback('Horarios pendientes adelantados -5 min');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  -5m
                </button>
              </div>
            </div>

            {/* Recalculate Start Time & Duration Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">
                  Hora de Inicio General (Primer partido)
                </label>
                <input
                  type="time"
                  value={globalStartTime}
                  onChange={(e) => setGlobalStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">
                  Duración Prevista por Partido (minutos)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={globalDuration}
                  onChange={(e) => setGlobalDuration(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={() => {
                  recalculateAllSchedules(globalStartTime, globalDuration);
                  showFeedback('Todos los horarios han sido recalculados');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recalcular Todos los Horarios</span>
              </button>
            </div>

            {/* Live Schedule Integrity Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                scheduleValidation.isValid
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                {scheduleValidation.isValid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm text-white">
                    {scheduleValidation.isValid
                      ? '✓ Calendario de Fase Inicial Válido'
                      : '⚠️ Advertencia en el Calendario de la Fase Inicial'}
                  </div>
                  <div className="text-xs text-slate-300">
                    {scheduleValidation.isValid ? (
                      <span>
                        10 partidos programados • 10 participantes • Cada jugador disputa exactamente 2 partidos
                      </span>
                    ) : (
                      <span>{scheduleValidation.errors.join(' • ')}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  resetInitialScheduleToDefault();
                  showFeedback('Calendario equilibrado por defecto restaurado');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
              >
                Restablecer Calendario Equilibrado
              </button>
            </div>
          </div>

          {/* Match-by-Match Interactive Schedule & Pairing Editor */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Edición Individual de Partidos, Horas y Jugadores
                </h3>
                <p className="text-xs text-slate-400">
                  Modifica la hora exacta o los contrincantes de cualquier partido del torneo
                </p>
              </div>

              {/* Phase Filter */}
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'FASE_INICIAL', label: 'Fase Inicial (1-10)' },
                  { id: 'CUARTOS', label: 'Cuartos' },
                  { id: 'SEMIFINAL', label: 'Semifinales' },
                  { id: 'FINAL', label: 'Final & 3º' },
                  { id: 'CONSOLACION', label: 'Consolación' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setScheduleFilterPhase(f.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      scheduleFilterPhase === f.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Matches List */}
            <div className="space-y-3">
              {filteredAdminMatches.map((m, index) => {
                const isEditing = editingMatchId === m.id;
                const p1Obj = state.players.find((p) => p.id === m.player1Id);
                const p2Obj = state.players.find((p) => p.id === m.player2Id);
                const isInitial = m.phase === 'FASE_INICIAL';

                return (
                  <div
                    key={m.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isEditing
                        ? 'bg-slate-950 border-amber-500/60 ring-2 ring-amber-500/20'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isEditing ? (
                      /* Active Match Edit Form */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-extrabold text-amber-400 text-sm">
                            Editando Partido #{m.matchNumber} ({m.phase.replace('_', ' ')})
                          </span>
                          <span className="text-xs text-slate-400">Estado: {m.status}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Scheduled Time Input */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">
                              Hora del Partido
                            </label>
                            <input
                              type="time"
                              value={editMatchTime}
                              onChange={(e) => setEditMatchTime(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Player 1 Selector (Only for Initial Phase or Playoffs) */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">
                              Jugador 1 {isInitial ? '' : '(o fuente)'}
                            </label>
                            {isInitial ? (
                              <select
                                value={editMatchP1}
                                onChange={(e) => setEditMatchP1(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                              >
                                <option value="">-- Seleccionar --</option>
                                {state.players.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.level})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                                {p1Obj ? p1Obj.name : m.sourceDesc1 || 'Por clasificar'}
                              </div>
                            )}
                          </div>

                          {/* Player 2 Selector */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-400">
                              Jugador 2 {isInitial ? '' : '(o fuente)'}
                            </label>
                            {isInitial ? (
                              <select
                                value={editMatchP2}
                                onChange={(e) => setEditMatchP2(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                              >
                                <option value="">-- Seleccionar --</option>
                                {state.players.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.level})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                                {p2Obj ? p2Obj.name : m.sourceDesc2 || 'Por clasificar'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end space-x-2 pt-2">
                          <button
                            onClick={() => setEditingMatchId(null)}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                          >
                            Cancelar
                          </button>

                          {isInitial && (
                            <button
                              onClick={() => {
                                const temp = editMatchP1;
                                setEditMatchP1(editMatchP2);
                                setEditMatchP2(temp);
                              }}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center space-x-1"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                              <span>Invertir Lados</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              updateMatchSchedule(m.id, editMatchTime);
                              if (isInitial && editMatchP1 && editMatchP2) {
                                updateMatchPairing(m.id, editMatchP1, editMatchP2);
                              }
                              setEditingMatchId(null);
                              showFeedback(`Partido #${m.matchNumber} actualizado`);
                            }}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Row */
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          {/* Order Reorder Controls */}
                          {isInitial && (
                            <div className="flex flex-col space-y-0.5">
                              <button
                                disabled={index === 0}
                                onClick={() => swapMatchOrder(index, index - 1)}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                                title="Subir orden del partido"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={index === filteredAdminMatches.length - 1}
                                onClick={() => swapMatchOrder(index, index + 1)}
                                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                                title="Bajar orden del partido"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-extrabold text-amber-400 text-sm">
                            #{m.matchNumber}
                          </div>

                          <div>
                            <div className="text-sm font-bold text-white flex items-center space-x-2">
                              <span>
                                {p1Obj ? p1Obj.name : m.sourceDesc1 || 'Por clasificar'}
                              </span>
                              <span className="text-slate-500 font-normal">vs</span>
                              <span>
                                {p2Obj ? p2Obj.name : m.sourceDesc2 || 'Por clasificar'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                              <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{m.scheduledTime}h</span>
                              </span>
                              <span>•</span>
                              <span>{m.phase.replace('_', ' ')}</span>
                              {m.bracketCode && <span>({m.bracketCode})</span>}
                            </div>
                          </div>
                        </div>

                        {/* Right Action buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingMatchId(m.id);
                              setEditMatchTime(m.scheduledTime);
                              setEditMatchP1(m.player1Id || '');
                              setEditMatchP2(m.player2Id || '');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Modificar Horario / Rival</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMatchId(m.id);
                              setActiveAdminTab('scoreboard');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-colors"
                          >
                            Marcador en Vivo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Scoreboard Controller */}
      {activeAdminTab === 'scoreboard' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-300">
              <span>Partido Activo en Marcador:</span>
              <select
                value={activeMatch?.id || ''}
                onChange={(e) => setActiveMatchId(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-amber-500 text-xs sm:text-sm"
              >
                {state.matches.map((m) => {
                  const m1 = state.players.find((p) => p.id === m.player1Id);
                  const m2 = state.players.find((p) => p.id === m.player2Id);
                  return (
                    <option key={m.id} value={m.id}>
                      #{m.matchNumber} ({m.phase}) • {m1 ? m1.name : m.sourceDesc1} vs{' '}
                      {m2 ? m2.name : m.sourceDesc2} [{m.score1}-{m.score2}] ({m.status})
                    </option>
                  );
                })}
              </select>
            </div>

            {activeMatch && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    updateMatch(activeMatch.id, {
                      score1: 0,
                      score2: 0,
                      status: 'PENDIENTE',
                      winnerId: null,
                      pointHistory: []
                    });
                    showFeedback('Marcador del partido reseteado');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                >
                  Reiniciar Puntuación
                </button>
              </div>
            )}
          </div>

          {activeMatch && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Control Táctil de Puntos
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Partido #{activeMatch.matchNumber} • {activeMatch.scheduledTime}h •{' '}
                    {activeMatch.phase}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-slate-400">Estado:</span>
                  <select
                    value={activeMatch.status}
                    onChange={(e) =>
                      updateMatch(activeMatch.id, { status: e.target.value as any })
                    }
                    className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="EN_JUEGO">EN JUEGO</option>
                    <option value="FINALIZADO">FINALIZADO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className={`p-6 rounded-2xl border transition-all text-center space-y-4 ${
                    activeMatch.currentServerId === p1?.id
                      ? 'bg-emerald-950/30 border-emerald-500/60 ring-2 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">JUGADOR 1</span>
                    {activeMatch.currentServerId === p1?.id && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                        🏓 Saca
                      </span>
                    )}
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-white truncate">
                    {p1 ? p1.name : activeMatch.sourceDesc1 || 'TBD'}
                  </h4>

                  <div className="font-teko text-8xl font-black text-white leading-none select-none">
                    {activeMatch.score1}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => p1 && recordPoint(activeMatch.id, p1.id)}
                      disabled={!p1 || activeMatch.status === 'FINALIZADO'}
                      className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-30"
                    >
                      +1 Punto
                    </button>
                    <button
                      onClick={() => p1 && setPalSaqueServer(activeMatch.id, p1.id)}
                      className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition-colors"
                    >
                      Asignar Saque
                    </button>
                  </div>
                </div>

                <div
                  className={`p-6 rounded-2xl border transition-all text-center space-y-4 ${
                    activeMatch.currentServerId === p2?.id
                      ? 'bg-indigo-950/30 border-indigo-500/60 ring-2 ring-indigo-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">JUGADOR 2</span>
                    {activeMatch.currentServerId === p2?.id && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                        🏓 Saca
                      </span>
                    )}
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-white truncate">
                    {p2 ? p2.name : activeMatch.sourceDesc2 || 'TBD'}
                  </h4>

                  <div className="font-teko text-8xl font-black text-white leading-none select-none">
                    {activeMatch.score2}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => p2 && recordPoint(activeMatch.id, p2.id)}
                      disabled={!p2 || activeMatch.status === 'FINALIZADO'}
                      className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-30"
                    >
                      +1 Punto
                    </button>
                    <button
                      onClick={() => p2 && setPalSaqueServer(activeMatch.id, p2.id)}
                      className="py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition-colors"
                    >
                      Asignar Saque
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => undoPoint(activeMatch.id)}
                  disabled={activeMatch.score1 === 0 && activeMatch.score2 === 0}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold flex items-center space-x-2 transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Deshacer Último Punto (Undo)</span>
                </button>

                <div className="text-xs text-slate-400">
                  {activeMatch.pointHistory?.length || 0} puntos registrados en este partido
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Players Management */}
      {activeAdminTab === 'players' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Gestión de Participantes ({state.players.length})
              </h3>
              <p className="text-xs text-slate-400">
                Modifica nombres, niveles o añade nuevos participantes
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <input
              type="text"
              placeholder="Nombre del nuevo jugador..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <select
              value={newPlayerLevel}
              onChange={(e) => setNewPlayerLevel(e.target.value as PlayerLevel)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="Muy bueno">Muy bueno</option>
              <option value="Nivel medio">Nivel medio</option>
              <option value="Más flojo">Más flojo</option>
            </select>
            <button
              onClick={() => {
                if (newPlayerName.trim()) {
                  addPlayer({
                    name: newPlayerName.trim(),
                    level: newPlayerLevel,
                    initialSeed: state.players.length + 1
                  });
                  setNewPlayerName('');
                  showFeedback('Jugador añadido correctamente');
                }
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Jugador</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-xs">
                <tr>
                  <th className="py-3 px-4 text-center"># Semilla</th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Nivel Asignado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {state.players.map((player) => (
                  <tr key={player.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {player.initialSeed}
                    </td>
                    <td className="py-3 px-4">
                      {editingPlayer?.id === player.id ? (
                        <input
                          type="text"
                          value={editingPlayer.name}
                          onChange={(e) =>
                            setEditingPlayer({ ...editingPlayer, name: e.target.value })
                          }
                          className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs sm:text-sm"
                        />
                      ) : (
                        <span className="font-bold text-white">{player.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingPlayer?.id === player.id ? (
                        <select
                          value={editingPlayer.level}
                          onChange={(e) =>
                            setEditingPlayer({
                              ...editingPlayer,
                              level: e.target.value as PlayerLevel
                            })
                          }
                          className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs sm:text-sm"
                        >
                          <option value="Muy bueno">Muy bueno</option>
                          <option value="Nivel medio">Nivel medio</option>
                          <option value="Más flojo">Más flojo</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            player.level === 'Muy bueno'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : player.level === 'Nivel medio'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {player.level}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {editingPlayer?.id === player.id ? (
                        <button
                          onClick={() => {
                            updatePlayer(editingPlayer);
                            setEditingPlayer(null);
                            showFeedback('Jugador actualizado');
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                        >
                          Guardar
                        </button>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setEditingPlayer(player)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar al jugador ${player.name}?`)) {
                                deletePlayer(player.id);
                                showFeedback('Jugador eliminado');
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Config */}
      {activeAdminTab === 'config' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Configuración del Torneo</h3>
            <p className="text-xs text-slate-400">
              Ajusta los parámetros reglamentarios y de seguridad
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Nombre del Torneo
              </label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Hora de Inicio (ej: 11:00)
              </label>
              <input
                type="time"
                value={configStartTime}
                onChange={(e) => setConfigStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Duración Prevista por Partido (minutos)
              </label>
              <input
                type="number"
                value={configDuration}
                onChange={(e) => setConfigDuration(parseInt(e.target.value, 10) || 10)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                PIN de Administrador
              </label>
              <input
                type="password"
                maxLength={6}
                value={configPin}
                onChange={(e) => setConfigPin(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <button
            onClick={() => {
              updateConfig({
                name: configName,
                startTime: configStartTime,
                matchDurationMinutes: configDuration,
                adminPin: configPin
              });
              showFeedback('Configuración guardada con éxito');
            }}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      )}

      {/* Tab 5: Tools & Reset */}
      {activeAdminTab === 'tools' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Herramientas de Simulación y Reinicio
            </h3>
            <p className="text-xs text-slate-400">
              Prueba el flujo completo del torneo o restablece los datos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <Sparkles className="w-5 h-5" />
                <span>Simulador Automático de Fase Inicial</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Genera marcadores deportivos realistas para los 10 partidos iniciales, calcula la clasificación con los 4 desempates y propaga los clasificados a los Cuartos de Final y Consolación.
              </p>
              <button
                onClick={() => {
                  populateDemoResults();
                  showFeedback('Fase inicial simulada con éxito');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-md"
              >
                Simular Resultados de Fase 1
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-3">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Reiniciar Torneo</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Borra todos los marcadores y restablece los 10 partidos iniciales a su estado pendiente con los horarios predeterminados a las 11:00h.
              </p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-md"
              >
                Reiniciar Todos los Partidos
              </button>
            </div>
          </div>

          {showResetConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-700 max-w-sm w-full space-y-4 shadow-2xl">
                <div className="flex items-center space-x-3 text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                  <h4 className="font-bold text-white text-base">¿Confirmar reinicio?</h4>
                </div>
                <p className="text-xs text-slate-300">
                  Esta acción restablecerá los marcadores, puntos y cuadros del torneo a 0-0.
                </p>
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      resetTournament(true);
                      setShowResetConfirm(false);
                      showFeedback('Torneo reiniciado');
                    }}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                  >
                    Sí, Reiniciar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
