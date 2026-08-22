import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { Trophy, Info, HelpCircle, Flame, ShieldAlert, Award } from 'lucide-react';

export const StandingsTable: React.FC = () => {
  const { standings, setSelectedPlayerStatsId } = useTournament();

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-emerald-400" />
            <span>Clasificación • Fase Inicial</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Puestos 1.º a 8.º avanzan al Cuadro Principal • Puestos 9.º y 10.º disputan Consolación
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Cuartos (1º-8º)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Consolación (9º-10º)</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-xl">
        <table className="w-full text-left text-sm text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-xs font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4 text-center w-12">Pos.</th>
              <th className="py-3.5 px-4">Jugador</th>
              <th className="py-3.5 px-3 text-center" title="Partidos Jugados">PJ</th>
              <th className="py-3.5 px-3 text-center" title="Partidos Ganados">PG</th>
              <th className="py-3.5 px-3 text-center" title="Partidos Perdidos">PP</th>
              <th className="py-3.5 px-4 text-center font-extrabold text-white" title="Puntos de Clasificación (1 por victoria)">
                PUNTOS
              </th>
              <th className="py-3.5 px-3 text-center" title="Puntos de partido a favor">PF</th>
              <th className="py-3.5 px-3 text-center" title="Puntos de partido en contra">PC</th>
              <th className="py-3.5 px-3 text-center font-bold text-slate-200" title="Diferencia de puntos (PF - PC)">
                DIF
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {standings.map((row, idx) => {
              const isPlayoff = row.position <= 8;
              const isConsolation = row.position >= 9;

              return (
                <tr
                  key={row.playerId}
                  onClick={() => setSelectedPlayerStatsId(row.playerId)}
                  className={`group cursor-pointer transition-colors ${
                    isPlayoff
                      ? 'hover:bg-emerald-500/10'
                      : 'hover:bg-amber-500/10'
                  } ${idx === 7 ? 'border-b-2 border-emerald-500/40' : ''}`}
                >
                  {/* Position */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs shadow-sm ${
                        row.position === 1
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/40'
                          : row.position === 2
                          ? 'bg-slate-300 text-slate-950'
                          : row.position === 3
                          ? 'bg-amber-700 text-amber-100'
                          : isPlayoff
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {row.position}º
                    </span>
                  </td>

                  {/* Player Name & Badge */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                          isPlayoff
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                            : 'bg-gradient-to-br from-amber-600 to-orange-700'
                        }`}
                      >
                        {row.player.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center space-x-2">
                          <span>{row.player.name}</span>
                          {row.position === 1 && (
                            <Award className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {row.player.level}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* PJ */}
                  <td className="py-3.5 px-3 text-center font-medium text-slate-300">
                    {row.pj}
                  </td>

                  {/* PG */}
                  <td className="py-3.5 px-3 text-center font-medium text-emerald-400">
                    {row.pg}
                  </td>

                  {/* PP */}
                  <td className="py-3.5 px-3 text-center font-medium text-rose-400">
                    {row.pp}
                  </td>

                  {/* Puntos */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-sm border border-emerald-500/30">
                      {row.puntos}
                    </span>
                  </td>

                  {/* PF */}
                  <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                    {row.pf}
                  </td>

                  {/* PC */}
                  <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                    {row.pc}
                  </td>

                  {/* DIF */}
                  <td className="py-3.5 px-3 text-center font-mono font-bold">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        row.dif > 0
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : row.dif < 0
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.dif > 0 ? `+${row.dif}` : row.dif}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tiebreak Explanation Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-200">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Criterios estrictos de desempate (en este orden exacto):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="font-bold text-white block">1.º Puntos de Clasificación</span>
            <span>1 punto por cada victoria obtenida.</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="font-bold text-white block">2.º Diferencia de Puntos</span>
            <span>Mayor DIF (Puntos a favor - Puntos en contra).</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="font-bold text-white block">3.º Puntos a Favor</span>
            <span>Mayor número de puntos anotados (PF).</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="font-bold text-white block">4.º Orden Alfabético</span>
            <span>Ordenación por nombre (ej: Alejandro &lt; Pol).</span>
          </div>
        </div>
      </div>
    </div>
  );
};
