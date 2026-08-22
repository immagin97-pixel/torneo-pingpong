import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, MatchPhase } from '../types/tournament';
import { Calendar, Clock, Trophy, Play, CheckCircle2, Search, Filter } from 'lucide-react';

export const ScheduleList: React.FC = () => {
  const { state, setActiveMatchId, setSelectedPlayerStatsId } = useTournament();
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const phases: { id: string; label: string }[] = [
    { id: 'ALL', label: 'Todos los Partidos' },
    { id: 'FASE_INICIAL', label: 'Fase Inicial (1-10)' },
    { id: 'CUARTOS', label: 'Cuartos de Final' },
    { id: 'SEMIFINAL', label: 'Semifinales' },
    { id: 'FINAL', label: 'Gran Final' },
    { id: 'TERCER_CUARTO', label: '3.º y 4.º Puesto' },
    { id: 'CONSOLACION', label: 'Consolación' }
  ];

  const filteredMatches = useMemo(() => {
    return state.matches.filter((m) => {
      if (selectedPhase !== 'ALL' && m.phase !== selectedPhase) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const p1 = state.players.find((p) => p.id === m.player1Id);
        const p2 = state.players.find((p) => p.id === m.player2Id);
        const name1 = p1?.name.toLowerCase() || m.sourceDesc1?.toLowerCase() || '';
        const name2 = p2?.name.toLowerCase() || m.sourceDesc2?.toLowerCase() || '';
        return name1.includes(query) || name2.includes(query);
      }
      return true;
    });
  }, [state.matches, state.players, selectedPhase, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            <span>Calendario Oficial & Resultados</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Horarios programados cada 10 minutos desde las {state.config.startTime}h
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por jugador..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Phase Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2">
        {phases.map((phase) => (
          <button
            key={phase.id}
            onClick={() => setSelectedPhase(phase.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedPhase === phase.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            {phase.label}
          </button>
        ))}
      </div>

      {/* Match Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.map((m) => {
          const p1 = state.players.find((p) => p.id === m.player1Id);
          const p2 = state.players.find((p) => p.id === m.player2Id);
          const isFinished = m.status === 'FINALIZADO';
          const isLive = m.status === 'EN_JUEGO';

          return (
            <div
              key={m.id}
              onClick={() => setActiveMatchId(m.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group shadow-lg ${
                isLive
                  ? 'bg-slate-900 border-rose-500/60 shadow-rose-500/10 ring-1 ring-rose-500/40'
                  : isFinished
                  ? 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                  : 'bg-slate-900/40 border-slate-800/60 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-xs">
                <div className="flex items-center space-x-2 font-bold text-slate-400">
                  <span className="text-slate-300 font-extrabold">#{m.matchNumber}</span>
                  <span>•</span>
                  <span>{m.phase.replace('_', ' ')}</span>
                  {m.bracketCode && <span>({m.bracketCode})</span>}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 text-slate-400 text-[11px] font-semibold">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{m.scheduledTime}h</span>
                  </span>

                  {isLive && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-black text-[10px] uppercase animate-pulse">
                      🔴 En Directo
                    </span>
                  )}
                  {isFinished && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">
                      🟢 Finalizado
                    </span>
                  )}
                  {!isLive && !isFinished && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase">
                      🟡 Pendiente
                    </span>
                  )}
                </div>
              </div>

              {/* Match Content */}
              <div className="grid grid-cols-5 gap-2 items-center">
                {/* Player 1 */}
                <div className="col-span-2 space-y-1">
                  <div
                    onClick={(e) => {
                      if (p1) {
                        e.stopPropagation();
                        setSelectedPlayerStatsId(p1.id);
                      }
                    }}
                    className={`font-bold text-sm truncate hover:text-emerald-400 transition-colors ${
                      isFinished && m.winnerId === p1?.id
                        ? 'text-emerald-300 font-extrabold'
                        : 'text-white'
                    }`}
                  >
                    {p1 ? p1.name : m.sourceDesc1 || 'Por Clasificar'}
                  </div>
                  {p1 && (
                    <div className="text-[10px] text-slate-400">{p1.level}</div>
                  )}
                </div>

                {/* Score in Middle */}
                <div className="col-span-1 text-center font-mono">
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {m.score1} - {m.score2}
                  </div>
                </div>

                {/* Player 2 */}
                <div className="col-span-2 text-right space-y-1">
                  <div
                    onClick={(e) => {
                      if (p2) {
                        e.stopPropagation();
                        setSelectedPlayerStatsId(p2.id);
                      }
                    }}
                    className={`font-bold text-sm truncate hover:text-emerald-400 transition-colors ${
                      isFinished && m.winnerId === p2?.id
                        ? 'text-emerald-300 font-extrabold'
                        : 'text-white'
                    }`}
                  >
                    {p2 ? p2.name : m.sourceDesc2 || 'Por Clasificar'}
                  </div>
                  {p2 && (
                    <div className="text-[10px] text-slate-400">{p2.level}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
