import React from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  BookOpen,
  Clock,
  Target,
  Trophy,
  Dices,
  RotateCcw,
  Scale,
  Award,
  Sparkles,
  ShieldAlert,
  Zap
} from 'lucide-react';

export const RegulationsView: React.FC = () => {
  const { state } = useTournament();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 pb-6 border-b border-slate-800">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Reglamento Oficial del Torneo
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Normativa deportiva estricta aplicada de forma automática por el sistema de competición
        </p>
      </div>

      {/* Visual Rule Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 11 points + diff 2 */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg">
            11
          </div>
          <h4 className="font-bold text-white text-base">Partidos a 11 Puntos</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gana el jugador que alcance 11 puntos con al menos <strong className="text-white">2 puntos de ventaja</strong> (11-9, 12-10, 13-11). Si empatan 10-10, se continúa sin límite hasta lograr la ventaja de 2.
          </p>
        </div>

        {/* Card 2: Volleyball Serve Rule */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-base">Saque Estilo Voleibol</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            El saque inicial se decide mediante <strong className="text-white">"Pal Saque"</strong>. Durante el partido, <strong className="text-white">saca quien haya ganado el punto anterior</strong> y mantiene el saque mientras siga anotando.
          </p>
        </div>

        {/* Card 3: 4 Strict Tiebreakers */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-base">4 Niveles de Desempate</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            1. Puntos por victoria $\to$ 2. Diferencial de puntos ($PF - PC$) $\to$ 3. Puntos a favor ($PF$) $\to$ 4. Orden alfabético por nombre.
          </p>
        </div>
      </div>

      {/* Detailed Articles Accordion / Cards */}
      <div className="space-y-4">
        {/* Article 1 */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              Artículo 1
            </span>
            <span>Estructura y Fases del Torneo</span>
          </div>
          <h3 className="text-lg font-bold text-white">Participantes y Fases</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            El torneo cuenta con <strong>10 participantes</strong>. En la <strong>Fase Inicial</strong> se disputan exactamente 10 partidos, garantizando que cada jugador juegue 2 partidos. Los <strong>puestos 1.º a 8.º</strong> clasifican a Cuartos de Final del Cuadro Principal, mientras que los <strong>puestos 9.º y 10.º</strong> disputan la Fase de Consolación.
          </p>
        </div>

        {/* Article 2 */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              Artículo 2
            </span>
            <span>Horarios y Calendario</span>
          </div>
          <h3 className="text-lg font-bold text-white">Duración e Intervalos</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            El torneo comienza a las <strong>{state.config.startTime}h</strong>. Cada partido tiene una duración programada de <strong>{state.config.matchDurationMinutes} minutos</strong> (Partido 1 a las 11:00, Partido 2 a las 11:10, Partido 3 a las 11:20, etc.).
          </p>
        </div>

        {/* Article 3 & 4 */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              Artículo 3 & 4
            </span>
            <span>Puntuación y Regla del 10-10</span>
          </div>
          <h3 className="text-lg font-bold text-white">Finalización del Partido</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Se requiere alcanzar un mínimo de 11 puntos y una diferencia mínima de 2 puntos sobre el adversario. La función matemática central que valida el final de cualquier encuentro es:
          </p>
          <div className="p-3 rounded-xl bg-slate-950 font-mono text-emerald-400 text-xs sm:text-sm border border-slate-800">
            max(score1, score2) &gt;= 11 &amp;&amp; abs(score1 - score2) &gt;= 2
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
              ✓ 11-0, 11-8, 11-9 (Termina)
            </div>
            <div className="p-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/20">
              ✗ 11-10 (Continúa)
            </div>
            <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
              ✓ 12-10 (Termina)
            </div>
            <div className="p-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/20">
              ✗ 12-11 (Continúa)
            </div>
          </div>
        </div>

        {/* Article 5 */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              Artículo 5
            </span>
            <span>Sistema de Puntuación de la Fase Inicial</span>
          </div>
          <h3 className="text-lg font-bold text-white">Puntos de Clasificación</h3>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1">
            <li><strong>Victoria:</strong> 1 punto de clasificación.</li>
            <li><strong>Derrota:</strong> 0 puntos de clasificación.</li>
            <li><em>No existen empates en los partidos.</em></li>
          </ul>
        </div>

        {/* Article 6: Desempates */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              Artículo 6
            </span>
            <span>Desempates Oficiales en Clasificación</span>
          </div>
          <h3 className="text-lg font-bold text-white">Orden Estricto de Resolución</h3>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-emerald-400">1.º Puntos de Clasificación:</strong> El jugador con más victorias se clasifica por delante.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-emerald-400">2.º Diferencia total de puntos (DIF):</strong> Se calcula como $(PF - PC)$. Ejemplo: Jugador A (+5 DIF) supera al Jugador B (+4 DIF) a igualdad de victorias.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-emerald-400">3.º Puntos de partido a favor (PF):</strong> Quien haya sumado más puntos totales. Ejemplo: Jugador C (21 PF) supera al Jugador D (19 PF) a igualdad de puntos y DIF.
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-emerald-400">4.º Orden alfabético:</strong> Ordenación alfabética ascendente por nombre del participante (ej: Alejandro Viñeta antes que Pol Ginebra).
            </div>
          </div>
        </div>

        {/* Article 7: Cuadro Eliminatorio */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              Artículo 7
            </span>
            <span>Cruces de Cuartos, Semifinales y Final</span>
          </div>
          <h3 className="text-lg font-bold text-white">Cuadro Principal y Consolación</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-slate-300">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-white block mb-1">Cuartos de Final</span>
              <span>• QF1: 1.º vs 8.º</span><br />
              <span>• QF2: 2.º vs 7.º</span><br />
              <span>• QF3: 3.º vs 6.º</span><br />
              <span>• QF4: 4.º vs 5.º</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-white block mb-1">Semifinales & Final</span>
              <span>• SF1: Ganador QF1 vs Ganador QF2</span><br />
              <span>• SF2: Ganador QF3 vs Ganador QF4</span><br />
              <span>• Final: Ganador SF1 vs Ganador SF2</span><br />
              <span>• Consolación: 9.º vs 10.º</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
