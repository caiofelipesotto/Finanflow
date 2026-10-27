import React from 'react';
import { Plus, Download, WalletCards, FileSpreadsheet, Camera, Users, ArrowLeft, LogIn } from 'lucide-react';
import { ViewTab } from '../types/finance';
import { User } from '../firebase';
import { HouseholdDoc } from '../services/firebaseSyncService';

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
}) => {
  const navItems: { id: ViewTab; label: string }[] = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'transactions', label: 'Transações' },
    { id: 'budgets', label: 'Orçamentos' },
    { id: 'goals', label: 'Metas & CDB' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0a0a0c]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Wordmark & Home trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            title="Voltar para a Aba Principal (Visão Geral)"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-500 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-orange-500/20 group-hover:bg-orange-400 transition-colors">
              <WalletCards className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-zinc-400 transition-colors">
                FinanFlow
              </span>
              <span className="hidden sm:inline text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950/70 border border-zinc-800/60 px-1.5 py-0.5 rounded">
                Pro
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden xl:flex items-center gap-6 lg:gap-8 text-sm font-medium">
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

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cloud & Sync status button */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenShareHousehold}
                title={`Espaço conectado: ${household?.name || 'Compartilhado'}`}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-all border shrink-0 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border-zinc-700 shadow-xs cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-5 h-5 rounded-full object-cover border border-orange-500/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-orange-600 text-zinc-950 flex items-center justify-center text-[10px] font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-bold">
                  {user.displayName ? user.displayName.split(' ')[0] : 'Conectado'}
                </span>
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {onReturnToLogin && (
                <button
                  onClick={onReturnToLogin}
                  title="Voltar para a tela inicial de login"
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Tela Inicial</span>
                </button>
              )}
              <button
                onClick={onOpenShareHousehold}
                title="Entrar com Conta Google e sincronizar na Nuvem"
                aria-label="Entrar com Google"
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl transition-all border shrink-0 bg-white hover:bg-zinc-100 text-zinc-950 border-white shadow-md cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Entrar com Google</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenScanInvoice}
            title="Escanear Fatura ou Print com IA"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden xl:inline">Escanear Print</span>
            <span className="hidden sm:inline xl:hidden">Print</span>
          </button>

          <button
            onClick={onOpenImportSpreadsheet}
            title="Importar Planilha Google Sheets / Excel"
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
            <span>Planilha</span>
          </button>

          <button
            onClick={onOpenBackupModal}
            title="Dados e Backup"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
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

      {/* Mobile nav strip */}
      <div className="xl:hidden flex items-center justify-around border-t border-zinc-800 bg-[#1d1d20] px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 min-w-0 px-1 py-1.5 text-[11px] sm:text-xs text-center rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
