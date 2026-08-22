import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import {
  Trophy,
  TableProperties,
  Calendar,
  BookOpen,
  Shield,
  Lock,
  Unlock,
  Radio,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    connectionState,
    isAdminUnlocked,
    unlockAdmin,
    lockAdmin,
    state,
    populateDemoResults
  } = useTournament();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const navItems = [
    { id: 'home', label: 'Inicio & En Directo', icon: Radio },
    { id: 'standings', label: 'Clasificación', icon: TableProperties },
    { id: 'bracket', label: 'Cuadro Eliminatorio', icon: Trophy },
    { id: 'schedule', label: 'Calendario', icon: Calendar },
    { id: 'regulations', label: 'Reglamento', icon: BookOpen },
    { id: 'admin', label: 'Administración', icon: Shield, adminOnly: true }
  ];

  const handleAdminClick = () => {
    if (isAdminUnlocked) {
      setActiveTab('admin');
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockAdmin(pinInput)) {
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      setActiveTab('admin');
    } else {
      setPinError(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl">🏓</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    {state.config.name}
                  </h1>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                    10 Jugadores
                  </span>
                  <span>•</span>
                  <span>{state.config.startTime}h</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (item.adminOnly) {
                  return (
                    <button
                      key={item.id}
                      onClick={handleAdminClick}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : isAdminUnlocked
                          ? 'text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {isAdminUnlocked ? (
                        <Unlock className="w-3.5 h-3.5 text-amber-400 ml-1" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 ml-1" />
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Status Indicators */}
            <div className="flex items-center space-x-3">
              {/* Quick Demo Simulator (Admin Only or Helper) */}
              <button
                onClick={populateDemoResults}
                title="Rellenar resultados de prueba automáticamente para comprobar todo el flujo"
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simular Fase 1</span>
              </button>

              {/* Realtime 3-State Connection Badge */}
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                  connectionState === 'CONNECTED'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                    : connectionState === 'RECONNECTING'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                }`}
                title={
                  connectionState === 'CONNECTED'
                    ? 'Conectado al servidor backend y WebSocket en tiempo real'
                    : connectionState === 'RECONNECTING'
                    ? 'Reconectando con el servidor backend...'
                    : 'Sin conexión con el servidor backend'
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionState === 'CONNECTED'
                      ? 'bg-emerald-400 animate-pulse'
                      : connectionState === 'RECONNECTING'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-[11px]">
                  {connectionState === 'CONNECTED' && '🟢 EN DIRECTO'}
                  {connectionState === 'RECONNECTING' && '🟡 RECONECTANDO...'}
                  {connectionState === 'DISCONNECTED' && '🔴 SIN CONEXIÓN'}
                </span>
              </div>

              {/* Admin Lock Status icon */}
              {isAdminUnlocked ? (
                <button
                  onClick={lockAdmin}
                  title="Bloquear modo Administrador"
                  className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowPinModal(true)}
                  title="Desbloquear Panel de Administrador"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 overflow-x-auto">
          <div className="flex items-center justify-between px-2 py-1.5 min-w-max space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.adminOnly) {
                return (
                  <button
                    key={item.id}
                    onClick={handleAdminClick}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Admin PIN Unlock Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Panel de Administración</h3>
                <p className="text-xs text-slate-400">Introduce el PIN de organizador</p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  PIN de Acceso (Por defecto: 1234)
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="1234"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-center text-xl tracking-widest text-white outline-none"
                />
                {pinError && (
                  <p className="text-xs text-rose-400 mt-1.5 text-center">
                    PIN incorrecto. Vuelve a intentarlo.
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/30"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
