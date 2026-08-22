import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { Match, Player } from '../types/tournament';
import { Trophy, Award, Clock, ArrowRight, ShieldCheck, Flame, Radio } from 'lucide-react';

export const InteractiveBracket: React.FC = () => {
  const { bracket, state, setActiveMatchId, setSelectedPlayerStatsId } = useTournament();

  const getPlayer = (id: string | null): Player | null => {
    if (!id) return null;
    return state.players.find((p) => p.id === id) || null;
  };

  const renderMatchCard = (match: Match | undefined, title: string) => {
    if (!match) return null;

    const p1 = getPlayer(match.player1Id);
    const p2 = getPlayer(match.player2Id);
    const isFinished = match.status === 'FINALIZADO';
    const isLive = match.status === 'EN_JUEGO';

    return (
      <div
        onClick={() => setActiveMatchId(match.id)}
        className={`group relative overflow-hidden rounded-2xl border transition-all cursor-pointer shadow-lg ${
          isLive
            ? 'bg-slate-900 border-rose-500/60 shadow-rose-500/10 ring-1 ring-rose-500/40'
            : isFinished
            ? 'bg-slate-900/90 border-slate-700/70 hover:border-emerald-500/50'
            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] bg-slate-950/40">
          <span className="font-bold text-slate-400 uppercase tracking-wider">{title}</span>
          <div className="flex items-center space-x-1.5">
            {isLive && (
              <span className="flex items-center space-x-1 text-rose-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>En Directo</span>
              </span>
            )}
            {isFinished && <span className="text-emerald-400 font-medium">Finalizado</span>}
            {!isLive && !isFinished && (
              <span className="text-slate-400 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{match.scheduledTime}h</span>
              </span>
            )}
          </div>
        </div>

        {/* Players & Scores */}
        <div className="p-3 space-y-2">
          {/* Player 1 Row */}
          <div
            className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
              isFinished && match.winnerId === match.player1Id
                ? 'bg-emerald-950/50 text-emerald-300 font-bold'
                : isFinished && match.player1Id
                ? 'opacity-50 text-slate-400'
                : 'text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2 truncate pr-2">
              <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-300">
                {p1 ? p1.name.charAt(0) : '1'}
              </span>
              <span className="text-xs sm:text-sm truncate">
                {p1 ? p1.name : match.sourceDesc1 || 'Por clasificar'}
              </span>
            </div>
            <span className="font-mono text-sm sm:text-base font-extrabold px-1.5">
              {match.score1}
            </span>
          </div>

          {/* Player 2 Row */}
          <div
            className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
              isFinished && match.winnerId === match.player2Id
                ? 'bg-emerald-950/50 text-emerald-300 font-bold'
                : isFinished && match.player2Id
                ? 'opacity-50 text-slate-400'
                : 'text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2 truncate pr-2">
              <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-300">
                {p2 ? p2.name.charAt(0) : '2'}
              </span>
              <span className="text-xs sm:text-sm truncate">
                {p2 ? p2.name : match.sourceDesc2 || 'Por clasificar'}
              </span>
            </div>
            <span className="font-mono text-sm sm:text-base font-extrabold px-1.5">
              {match.score2}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Cuadro Eliminatorio Principal</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Cruces automáticos según la clasificación oficial de la Fase Inicial
          </p>
        </div>

        {bracket.champion && (
          <div
            onClick={() => setSelectedPlayerStatsId(bracket.champion?.id || null)}
            className="cursor-pointer px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 flex items-center space-x-3 shadow-xl hover:scale-105 transition-transform"
          >
            <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                🏆 Campeón del Torneo
              </div>
              <div className="text-sm font-black text-white">{bracket.champion.name}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Bracket Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Column 1: Quarterfinals */}
        <div className="space-y-6">
          <div className="text-center font-black text-xs uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
            Cuartos de Final (Top 8)
          </div>
          <div className="space-y-4">
            {bracket.quarterFinals.map((match, i) => (
              <div key={match.id} className="relative">
                {renderMatchCard(match, `QF ${i + 1} • ${match.sourceDesc1} vs ${match.sourceDesc2}`)}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Semifinals */}
        <div className="space-y-6">
          <div className="text-center font-black text-xs uppercase tracking-widest text-emerald-400 border-b border-slate-800 pb-2">
            Semifinales
          </div>
          <div className="space-y-12 my-auto">
            {bracket.semiFinals.map((match, i) => (
              <div key={match.id} className="relative">
                {renderMatchCard(match, `Semifinal ${i + 1}`)}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Final & 3rd Place */}
        <div className="space-y-6">
          <div className="text-center font-black text-xs uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-2">
            Gran Final & 3.º Puesto
          </div>
          <div className="space-y-6">
            {/* Final Match */}
            <div className="p-1 rounded-3xl bg-gradient-to-b from-amber-500/40 via-yellow-500/20 to-amber-600/30 shadow-2xl">
              {renderMatchCard(bracket.finalMatch, '🏆 GRAN FINAL')}
            </div>

            {/* 3rd Place Match */}
            <div className="mt-8">
              {renderMatchCard(bracket.thirdPlaceMatch, '🥉 3.º y 4.º Puesto')}
            </div>
          </div>
        </div>
      </div>

      {/* Separate Consolation Bracket Section */}
      <div className="mt-12 pt-8 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Cuadro de Consolación (Puestos 9.º y 10.º)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Garantiza que todos los participantes jueguen al menos 3 partidos en el torneo
            </p>
          </div>
        </div>

        <div className="max-w-md">
          {renderMatchCard(bracket.consolationMatch, 'Fase de Consolación • 9.º vs 10.º')}
        </div>
      </div>
    </div>
  );
};
