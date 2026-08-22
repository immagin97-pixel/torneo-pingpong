import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Radio,
  Dices,
  RotateCcw,
  Plus,
  Trophy,
  Clock,
  ChevronRight,
  Sparkles,
  Award,
  ChevronDown
} from 'lucide-react';

export const HeroLiveScore: React.FC = () => {
  const {
    state,
    activeMatch,
    setActiveMatchId,
    recordPoint,
    undoPoint,
    setPalSaqueServer,
    startMatch,
    isAdminUnlocked,
    setSelectedPlayerStatsId
  } = useTournament();

  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceWinnerName, setDiceWinnerName] = useState<string | null>(null);
  const [showMatchSelector, setShowMatchSelector] = useState(false);

  if (!activeMatch) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
        <p className="text-slate-400">No hay partidos configurados.</p>
      </div>
    );
  }

  const p1 = state.players.find((p) => p.id === activeMatch.player1Id);
  const p2 = state.players.find((p) => p.id === activeMatch.player2Id);

  const isServerP1 = activeMatch.currentServerId === p1?.id;
  const isServerP2 = activeMatch.currentServerId === p2?.id;

  const currentServerPlayer = isServerP1 ? p1 : isServerP2 ? p2 : null;

  // Next match preview
  const upcomingMatches = state.matches.filter(
    (m) => m.status === 'PENDIENTE' && m.id !== activeMatch.id && m.player1Id && m.player2Id
  );
  const nextMatch = upcomingMatches[0] || null;
  const nextP1 = nextMatch ? state.players.find((p) => p.id === nextMatch.player1Id) : null;
  const nextP2 = nextMatch ? state.players.find((p) => p.id === nextMatch.player2Id) : null;

  // Pal Saque Roll Animation
  const handlePalSaqueRoll = () => {
    if (!p1 || !p2) return;
    setIsRollingDice(true);
    setDiceWinnerName(null);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setDiceWinnerName(count % 2 === 0 ? p1.name : p2.name);
      if (count > 10) {
        clearInterval(interval);
        const chosen = Math.random() < 0.5 ? p1 : p2;
        setDiceWinnerName(chosen.name);
        setIsRollingDice(false);
        setPalSaqueServer(activeMatch.id, chosen.id);
      }
    }, 100);
  };

  const getPhaseName = (phase: string) => {
    switch (phase) {
      case 'FASE_INICIAL':
        return `Fase Inicial • Partido #${activeMatch.matchNumber}`;
      case 'CUARTOS':
        return `Cuartos de Final • ${activeMatch.bracketCode}`;
      case 'SEMIFINAL':
        return `Semifinal • ${activeMatch.bracketCode}`;
      case 'FINAL':
        return `🏆 Gran Final del Torneo`;
      case 'TERCER_CUARTO':
        return `3.º y 4.º Puesto`;
      case 'CONSOLACION':
        return `Partido de Consolación (9.º vs 10.º)`;
      default:
        return phase;
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Match Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Match Header & Selector */}
        <div className="relative z-10 px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            {activeMatch.status === 'EN_JUEGO' && (
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>En Directo</span>
              </span>
            )}
            {activeMatch.status === 'PENDIENTE' && (
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>Pendiente</span>
              </span>
            )}
            {activeMatch.status === 'FINALIZADO' && (
              <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5" />
                <span>Finalizado</span>
              </span>
            )}

            <div className="text-sm font-semibold text-slate-300">
              {getPhaseName(activeMatch.phase)}
            </div>

            <div className="text-xs text-slate-400 hidden sm:inline-flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{activeMatch.scheduledTime}h</span>
            </div>
          </div>

          {/* Match Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMatchSelector(!showMatchSelector)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors border border-slate-700"
            >
              <span>Cambiar partido</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showMatchSelector && (
              <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto z-50 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl">
                <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                  Seleccionar Partido
                </div>
                {state.matches.map((m) => {
                  const m1 = state.players.find((p) => p.id === m.player1Id);
                  const m2 = state.players.find((p) => p.id === m.player2Id);
                  const isCurrent = m.id === activeMatch.id;

                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActiveMatchId(m.id);
                        setShowMatchSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold truncate">
                          {m.matchNumber}. {m1 ? m1.name : m.sourceDesc1 || 'TBD'} vs{' '}
                          {m2 ? m2.name : m.sourceDesc2 || 'TBD'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.scheduledTime}h • {m.phase}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-200">
                        {m.score1} - {m.score2}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Big Scoreboard Grid */}
        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
            {/* Player 1 Card */}
            <div
              className={`md:col-span-4 rounded-2xl p-6 transition-all relative ${
                activeMatch.winnerId === p1?.id
                  ? 'bg-emerald-950/40 border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800/40 border border-slate-800'
              }`}
            >
              {isServerP1 && (
                <div className="absolute -top-3 left-6 inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                  <span>🏓 SACA</span>
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  onClick={() => p1 && setSelectedPlayerStatsId(p1.id)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-2xl font-black text-white shadow-xl group-hover:scale-105 transition-transform">
                    {p1 ? p1.name.charAt(0) : '?'}
                  </div>
                  <h3 className="mt-3 text-lg sm:text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {p1 ? p1.name : activeMatch.sourceDesc1 || 'Por Determinar'}
                  </h3>
                  {p1 && (
                    <span className="inline-block px-2.5 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-medium mt-1">
                      {p1.level}
                    </span>
                  )}
                </div>

                {/* Big Score */}
                <div className="font-teko text-7xl sm:text-9xl font-bold text-white tracking-tighter leading-none select-none">
                  {activeMatch.score1}
                </div>

                {/* Fast Point Button */}
                <button
                  onClick={() => p1 && recordPoint(activeMatch.id, p1.id)}
                  disabled={!p1 || activeMatch.status === 'FINALIZADO'}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-lg sm:text-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-xl ${
                    activeMatch.status === 'FINALIZADO'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/30'
                  }`}
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                  <span>+1 Punto</span>
                </button>
              </div>
            </div>

            {/* Middle VS & Action Controls */}
            <div className="md:col-span-3 flex flex-col items-center justify-center space-y-4">
              <div className="text-2xl font-black text-slate-500 uppercase tracking-widest">
                VS
              </div>

              {/* Serving Indicator Banner */}
              {currentServerPlayer && activeMatch.status !== 'FINALIZADO' && (
                <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center space-x-2 animate-bounce-short">
                  <span>🏓 Saca:</span>
                  <span className="font-bold text-white">{currentServerPlayer.name}</span>
                </div>
              )}

              {/* Match Winner Celebration Banner */}
              {activeMatch.status === 'FINALIZADO' && activeMatch.winnerId && (
                <div className="w-full text-center p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 animate-fade-in">
                  <div className="flex items-center justify-center space-x-2 font-bold text-base">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>¡Ganador!</span>
                  </div>
                  <div className="text-lg font-extrabold text-white mt-1">
                    {state.players.find((p) => p.id === activeMatch.winnerId)?.name}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Marcador final: {activeMatch.score1} - {activeMatch.score2}
                  </div>
                </div>
              )}

              {/* Pal Saque & Match Action Buttons */}
              <div className="flex flex-col w-full space-y-2 max-w-xs">
                {/* Pal Saque Dice Button */}
                <button
                  onClick={handlePalSaqueRoll}
                  disabled={!p1 || !p2 || isRollingDice || activeMatch.status === 'FINALIZADO'}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all border ${
                    isRollingDice
                      ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border-amber-500/30 hover:border-amber-400 shadow-md'
                  }`}
                >
                  <Dices className={`w-4 h-4 ${isRollingDice ? 'animate-spin' : ''}`} />
                  <span>
                    {isRollingDice
                      ? `Sorteando... ${diceWinnerName || ''}`
                      : diceWinnerName
                      ? `🎲 Pal Saque: ${diceWinnerName}`
                      : '🎲 PAL SAQUE'}
                  </span>
                </button>

                {/* Undo Last Point Button */}
                <button
                  onClick={() => undoPoint(activeMatch.id)}
                  disabled={activeMatch.score1 === 0 && activeMatch.score2 === 0}
                  className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Deshacer punto</span>
                </button>

                {/* Start Match button if Pending */}
                {activeMatch.status === 'PENDIENTE' && p1 && p2 && (
                  <button
                    onClick={() => startMatch(activeMatch.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Iniciar Partido</span>
                  </button>
                )}
              </div>
            </div>

            {/* Player 2 Card */}
            <div
              className={`md:col-span-4 rounded-2xl p-6 transition-all relative ${
                activeMatch.winnerId === p2?.id
                  ? 'bg-emerald-950/40 border-2 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800/40 border border-slate-800'
              }`}
            >
              {isServerP2 && (
                <div className="absolute -top-3 right-6 inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                  <span>🏓 SACA</span>
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  onClick={() => p2 && setSelectedPlayerStatsId(p2.id)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center text-2xl font-black text-white shadow-xl group-hover:scale-105 transition-transform">
                    {p2 ? p2.name.charAt(0) : '?'}
                  </div>
                  <h3 className="mt-3 text-lg sm:text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {p2 ? p2.name : activeMatch.sourceDesc2 || 'Por Determinar'}
                  </h3>
                  {p2 && (
                    <span className="inline-block px-2.5 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 font-medium mt-1">
                      {p2.level}
                    </span>
                  )}
                </div>

                {/* Big Score */}
                <div className="font-teko text-7xl sm:text-9xl font-bold text-white tracking-tighter leading-none select-none">
                  {activeMatch.score2}
                </div>

                {/* Fast Point Button */}
                <button
                  onClick={() => p2 && recordPoint(activeMatch.id, p2.id)}
                  disabled={!p2 || activeMatch.status === 'FINALIZADO'}
                  className={`w-full py-4 px-6 rounded-2xl font-extrabold text-lg sm:text-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-xl ${
                    activeMatch.status === 'FINALIZADO'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  <Plus className="w-6 h-6 stroke-[3]" />
                  <span>+1 Punto</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Deuce rule visual badge if applicable */}
        {activeMatch.score1 >= 10 && activeMatch.score2 >= 10 && activeMatch.status !== 'FINALIZADO' && (
          <div className="bg-amber-500/20 border-t border-amber-500/40 px-6 py-2.5 text-center text-xs sm:text-sm font-semibold text-amber-300 flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <span>
              Empate a 10-10 (Deuce) • El juego continúa hasta obtener una ventaja de 2 puntos.
            </span>
          </div>
        )}
      </div>

      {/* Next Match Banner */}
      {nextMatch && nextP1 && nextP2 && (
        <div
          onClick={() => setActiveMatchId(nextMatch.id)}
          className="cursor-pointer group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all hover:bg-slate-900/90 shadow-md"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-800/80 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                <span>⏭️ Próximo Partido</span>
                <span>•</span>
                <span>{nextMatch.scheduledTime}h</span>
              </div>
              <div className="font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                {nextP1.name} <span className="text-slate-500 font-normal">vs</span> {nextP2.name}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 group-hover:text-white">
            <span className="hidden sm:inline">Ver partido</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}
    </div>
  );
};
