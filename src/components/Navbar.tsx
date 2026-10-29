import React from 'react';
import { Plus, Download, FileSpreadsheet, Camera, ArrowLeft, LogOut } from 'lucide-react';
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
    { id: 'dashboard', label: 'Visão geral', short: 'Geral' },
    { id: 'transactions', label: 'Transações', short: 'Lançamentos' },
    { id: 'budgets', label: 'Limites', short: 'Limites' },
    { id: 'goals', label: 'Metas', short: 'Metas' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[var(--app-bg)]/95 backdrop-blur-md border-b border-[var(--border-1)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Marca */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
          title="Voltar para a visão geral"
        >
          <LogoMark className="w-8 h-8 group-hover:opacity-90 transition-opacity" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg font-black tracking-tight text-[var(--text-1)] truncate">
              FinanFlow
            </span>
            <span className="hidden sm:inline ui-badge">Pro</span>
          </div>
        </button>

        {/* Navegação desktop */}
        <nav className="hidden xl:flex items-center gap-1 text-xs font-semibold min-w-0">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-[var(--r-control)] whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-3)] text-[var(--text-1)]'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Ações */}
        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            <>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sair da conta"
                  aria-label="Sair da conta"
                  className="ui-btn ui-btn-ghost !px-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Sair</span>
                </button>
              )}

              <button
                onClick={onOpenShareHousehold}
                title={`Espaço conectado: ${household?.name || 'Compartilhado'}`}
                className="ui-btn ui-btn-secondary !py-1.5"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'Avatar'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center text-[10px] font-bold">
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline font-bold max-w-[9rem] truncate">
                  {user.name ? user.name.split(' ')[0] : 'Conectado'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)]" />
              </button>
            </>
          ) : (
            <>
              {onReturnToLogin && (
                <button
                  onClick={onReturnToLogin}
                  title="Voltar para a tela inicial"
                  className="hidden xl:inline-flex ui-btn ui-btn-ghost !px-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Tela inicial</span>
                </button>
              )}

              <button
                onClick={onOpenShareHousehold}
                title="Entrar com conta Google e sincronizar na nuvem"
                aria-label="Entrar com Google"
                className="btn-google ui-btn !py-1.5"
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Entrar com Google</span>
              </button>
            </>
          )}

          <button onClick={onOpenScanInvoice} title="Escanear fatura ou print" className="hidden md:inline-flex ui-btn ui-btn-secondary !px-2">
            <Camera className="w-4 h-4" />
            <span className="hidden 2xl:inline">Escanear</span>
          </button>

          <button onClick={onOpenImportSpreadsheet} title="Importar planilha" className="hidden 2xl:inline-flex ui-btn ui-btn-secondary !px-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Planilha</span>
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <button onClick={onOpenBackupModal} title="Dados e backup" aria-label="Dados e backup" className="hidden sm:inline-flex ui-btn ui-btn-ghost !px-2">
            <Download className="w-4 h-4" />
          </button>

          <button onClick={onOpenNewTransaction} className="ui-btn ui-btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Lançamento</span>
          </button>
        </div>
      </div>

      {/* Navegação mobile */}
      <nav className="xl:hidden grid grid-cols-4 gap-1 border-t border-[var(--border-1)] bg-[var(--surface-2)] px-1.5 py-1.5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              className={`min-w-0 px-1 py-1.5 text-[10px] sm:text-xs text-center rounded-[var(--r-control)] truncate transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-bold'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
