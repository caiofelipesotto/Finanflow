import React from 'react';
import { Plus, Download, FileSpreadsheet, Camera, Users, ArrowLeft, LogOut } from 'lucide-react';
import { ViewTab } from '../types/finance';
import { User, HouseholdDoc } from '../services/cloudSyncService';
import { GoogleIcon } from './GoogleIcon';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../utils/theme';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenNewTransaction: () => void;
  onOpenScanInvoice: () => void;
  onOpenImportSpreadsheet: () => void;
  onOpenBackupModal: () => void;
  user: User | null;
  household: HouseholdDoc | null;
  onOpenShareHousehold: () => void;
  onReturnToLogin?: () => void;
  onLogout?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTransaction,
  onOpenScanInvoice,
  onOpenImportSpreadsheet,
  onOpenBackupModal,
  user,
  household,
  onOpenShareHousehold,
  onReturnToLogin,
  onLogout,
  theme,
  onToggleTheme,
}) => {
  const navItems: { id: ViewTab; label: string; short: string }[] = [
    { id: 'dashboard', label: 'Visão Geral', short: 'Geral' },
    { id: 'transactions', label: 'Transações', short: 'Lançamentos' },
    { id: 'budgets', label: 'Limites', short: 'Limites' },
    { id: 'goals', label: 'Metas', short: 'Metas' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0a0a0c]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Zone 1: Wordmark & Home trigger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            title="Voltar para a Aba Principal (Visão Geral)"
          >
            <LogoMark className="w-8 h-8 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-zinc-400 transition-colors truncate">
                FinanFlow
              </span>
              <span className="hidden sm:inline text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950/70 border border-zinc-800/60 px-1.5 py-0.5 rounded">
                Pro
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden xl:flex items-center gap-5 2xl:gap-8 text-sm font-medium min-w-0 overflow-hidden">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap shrink-0 relative py-2 cursor-pointer ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions — no celular só o essencial fica na barra */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Cloud & Sync status button */}
          {user ? (
            <div className="flex items-center gap-1.5">
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sair da conta"
                  aria-label="Sair da conta"
                  className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-zinc-400 hover:text-red-300 bg-zinc-800/60 hover:bg-red-950/50 border border-zinc-700 hover:border-red-800/60 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Sair</span>
                </button>
              )}
              <button
                onClick={onOpenShareHousehold}
                title={`Espaço conectado: ${household?.name || 'Compartilhado'}`}
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold rounded-xl transition-all border shrink-0 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border-zinc-700 shadow-xs cursor-pointer"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'Avatar'}
                    className="w-5 h-5 rounded-full object-cover border border-orange-500/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-orange-600 text-zinc-950 flex items-center justify-center text-[10px] font-bold">
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-bold">
                  {user.name ? user.name.split(' ')[0] : 'Conectado'}
                </span>
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {onReturnToLogin && (
                <button
                  onClick={onReturnToLogin}
                  title="Voltar para a tela inicial de login"                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Tela Inicial</span>
                </button>
              )}
              <button
                onClick={onOpenShareHousehold}
                title="Entrar com Conta Google e sincronizar na Nuvem"
                aria-label="Entrar com Google"
                className="btn-google flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl transition-all border shrink-0 shadow-md cursor-pointer"
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Entrar com Google</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenScanInvoice}
            title="Escanear Fatura ou Print com IA"
            className="hidden md:flex items-center gap-1.5 px-2.5 2xl:px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden 2xl:inline">Escanear Print</span>
            <span className="hidden md:inline 2xl:hidden">Print</span>
          </button>

          <button
            onClick={onOpenImportSpreadsheet}
            title="Importar Planilha Google Sheets / Excel"
            className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
            <span>Planilha</span>
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <button
            onClick={onOpenBackupModal}
            title="Dados e Backup"
            className="hidden sm:flex p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-zinc-950 bg-zinc-500 hover:bg-orange-400 rounded-xl transition-all shadow-md shadow-orange-500/20 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-400 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Lançamento</span>
          </button>
        </div>
      </div>

      {/* Mobile nav strip: 4 colunas iguais, texto que cabe na largura */}
      <div className="xl:hidden grid grid-cols-4 gap-1 border-t border-zinc-800 bg-[#1d1d20] px-1.5 py-1.5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              className={`min-w-0 px-1 py-1.5 text-[10px] sm:text-xs text-center rounded-lg truncate transition-colors cursor-pointer ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
