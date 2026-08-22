import React from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  X,
  Trophy,
  Flame,
  Award,
  Clock,
  Target,
  Swords,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const PlayerStatsModal: React.FC = () => {
  const {
    selectedPlayerStatsId,
    setSelectedPlayerStatsId,
    selectedPlayerStats,
    setActiveMatchId
  } = useTournament();

  if (!selectedPlayerStatsId || !selectedPlayerStats) {
    return null;
  }

  const s = selectedPlayerStats;
  const p = s.player;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header Banner */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800/60 to-slate-900 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-2xl font-black text-white shadow-xl">
              {p.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">{p.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {p.level}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                <span>Posición #{s.position} en Fase Inicial</span>
                <span>•</span>
                <span>Semilla #{p.initialSeed}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedPlayerStatsId(null)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Puntos Clasificación</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {s.puntos}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">1 pt por victoria</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Victorias / Derrotas</div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                <span className="text-emerald-400">{s.pg}</span>
                <span className="text-slate-500 text-lg mx-1">/</span>
                <span className="text-rose-400">{s.pp}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.pj} jugados</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Diferencial Puntos</div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
                  s.dif > 0
                    ? 'text-emerald-400'
                    : s.dif < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {s.dif > 0 ? `+${s.dif}` : s.dif}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {s.pf} PF • {s.pc} PC
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center">
              <div className="text-xs text-slate-400 font-medium">Efectividad</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                {s.winRate}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center space-x-1">
                {s.currentStreak.type === 'W' && (
                  <span className="text-amber-400 flex items-center space-x-0.5">
                    <Flame className="w-3 h-3" />
                    <span>{s.currentStreak.count}W seguidas</span>
                  </span>
                )}
                {s.currentStreak.type === 'L' && (
                  <span className="text-rose-400">{s.currentStreak.count}L</span>
                )}
                {s.currentStreak.type === 'NONE' && <span>Sin racha</span>}
              </div>
            </div>
          </div>

          {/* Next Match Card if pending */}
          {s.nextMatch && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Próximo Partido Programado
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Partido #{s.nextMatch.matchNumber} • {s.nextMatch.scheduledTime}h •{' '}
                    {s.nextMatch.phase.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveMatchId(s.nextMatch?.id || null);
                  setSelectedPlayerStatsId(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Ver en Marcador
              </button>
            </div>
          )}

          {/* Match History */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Swords className="w-4 h-4 text-emerald-400" />
              <span>Historial de Partidos ({s.matches.length})</span>
            </h4>

            {s.matches.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-xl">
                Aún no ha disputado partidos finalizados en el torneo.
              </p>
            ) : (
              <div className="space-y-2">
                {s.matches.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {item.won ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">
                          vs {item.opponent ? item.opponent.name : 'Rival'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.match.phase} • #{item.match.matchNumber}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-white">
                        <span className={item.won ? 'text-emerald-400' : 'text-slate-300'}>
                          {item.userScore}
                        </span>
                        <span className="text-slate-500 mx-1">-</span>
                        <span className={!item.won ? 'text-rose-400' : 'text-slate-400'}>
                          {item.oppScore}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        {item.won ? 'Victoria' : 'Derrota'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Head-to-Head Table */}
          {s.opponents.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Enfrentamientos Directos (H2H)</span>
              </h4>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Rival</th>
                      <th className="py-2.5 px-3 text-center">Partidos</th>
                      <th className="py-2.5 px-3 text-center">Balance (V-D)</th>
                      <th className="py-2.5 px-3 text-center">Puntos (PF-PC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {s.opponents.map((h2h) => (
                      <tr key={h2h.opponentId}>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {h2h.opponentName}
                        </td>
                        <td className="py-2.5 px-3 text-center">{h2h.matchesPlayed}</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span className="text-emerald-400">{h2h.wins}</span>
                          <span className="text-slate-500 mx-1">-</span>
                          <span className="text-rose-400">{h2h.losses}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {h2h.pointsFor} - {h2h.pointsAgainst}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
