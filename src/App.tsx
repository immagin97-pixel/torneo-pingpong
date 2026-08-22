import React, { useState } from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Navbar } from './components/Navbar';
import { HeroLiveScore } from './components/HeroLiveScore';
import { StandingsTable } from './components/StandingsTable';
import { InteractiveBracket } from './components/InteractiveBracket';
import { ScheduleList } from './components/ScheduleList';
import { RegulationsView } from './components/RegulationsView';
import { AdminPanel } from './components/AdminPanel';
import { PlayerStatsModal } from './components/PlayerStatsModal';
import {
  Trophy,
  TableProperties,
  BookOpen,
  ArrowRight,
  Clock
} from 'lucide-react';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const { state, setActiveMatchId } = useTournament();

  // Recent finished matches for home view
  const recentFinished = state.matches
    .filter((m) => m.status === 'FINALIZADO')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-10">
            {/* Live Match Hero Section */}
            <HeroLiveScore />

            {/* Quick Summary Grid: Standings + Recent Matches */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Standings Summary (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                    <TableProperties className="w-5 h-5 text-emerald-400" />
                    <span>Top Clasificación • Fase Inicial</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('standings')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <span>Ver tabla completa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <StandingsTable />
              </div>

              {/* Recent Results & Shortcuts (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Recent Results Card */}
                <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>🕐 Últimos Resultados</span>
                    </h4>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Ver todos
                    </button>
                  </div>

                  {recentFinished.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      Aún no hay partidos finalizados.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {recentFinished.map((m) => {
                        const p1 = state.players.find((p) => p.id === m.player1Id);
                        const p2 = state.players.find((p) => p.id === m.player2Id);
                        const p1Won = m.winnerId === m.player1Id;

                        return (
                          <div
                            key={m.id}
                            onClick={() => setActiveMatchId(m.id)}
                            className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span>#{m.matchNumber} • {m.phase.replace('_', ' ')}</span>
                              <span>{m.scheduledTime}h</span>
                            </div>
                            <div className="flex items-center justify-between font-semibold">
                              <span
                                className={
                                  p1Won ? 'text-emerald-400 font-bold' : 'text-slate-300'
                                }
                              >
                                {p1?.name || 'TBD'}
                              </span>
                              <span className="font-mono font-bold text-white">
                                {m.score1} - {m.score2}
                              </span>
                              <span
                                className={
                                  !p1Won && m.winnerId ? 'text-emerald-400 font-bold' : 'text-slate-300'
                                }
                              >
                                {p2?.name || 'TBD'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setActiveTab('bracket')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer group shadow-lg"
                  >
                    <Trophy className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs sm:text-sm text-white">Cuadro del Torneo</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Cuartos, Semis y Final
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('regulations')}
                    className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-lg"
                  >
                    <BookOpen className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-bold text-xs sm:text-sm text-white">Reglamento Oficial</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      10-10, saque y desempates
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Knockout Bracket Preview on Home */}
            <div className="pt-6 border-t border-slate-800">
              <InteractiveBracket />
            </div>
          </div>
        )}

        {/* Tab 2: STANDINGS */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            <StandingsTable />
          </div>
        )}

        {/* Tab 3: BRACKET */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            <InteractiveBracket />
          </div>
        )}

        {/* Tab 4: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <ScheduleList />
          </div>
        )}

        {/* Tab 5: REGULATIONS */}
        {activeTab === 'regulations' && (
          <div className="space-y-6">
            <RegulationsView />
          </div>
        )}

        {/* Tab 6: ADMIN */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <AdminPanel />
          </div>
        )}
      </main>

      {/* Global Player Statistics Modal */}
      <PlayerStatsModal />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-base">🏓</span>
            <span className="font-bold text-slate-300">{state.config.name}</span>
            <span>•</span>
            <span>Reglamento Deportivo Automatizado</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('regulations')}
              className="hover:text-emerald-400 transition-colors"
            >
              Reglamento
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className="hover:text-emerald-400 transition-colors"
            >
              Clasificación
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className="hover:text-emerald-400 transition-colors"
            >
              Cuadro
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className="text-amber-400 hover:text-amber-300 transition-colors font-semibold"
            >
              Administración
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <TournamentProvider>
      <MainContent />
    </TournamentProvider>
  );
}
export default App;
