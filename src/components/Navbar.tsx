import React from 'react';
import { Plus, Download, FileSpreadsheet, Camera, ArrowLeft, LogOut } from 'lucide-react';
import { User, HouseholdDoc } from '../services/cloudSyncService';
import { GoogleIcon } from './GoogleIcon';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../utils/theme';

interface NavbarProps {
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
  return (
    <header className="sticky top-0 z-30 bg-[var(--app-bg)]/95 backdrop-blur-md border-b border-[var(--border-1)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Marca — única tela do app */}
        <div
          aria-label="FinanFlow · Visão geral"
          className="flex items-center gap-2.5 text-left shrink-0"
        >
          <LogoMark className="w-8 h-8" aria-hidden="true" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg font-black tracking-tight text-[var(--text-1)] truncate">
              FinanFlow
            </span>
            <span className="hidden sm:inline ui-badge">Visão geral</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            <>
              {onLogout && (
                <button
                  onClick={onLogout}
                  aria-label="Sair da conta"
                  className="ui-btn ui-btn-ghost !px-2"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
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
                  aria-label="Voltar para a tela inicial"
                  className="hidden xl:inline-flex ui-btn ui-btn-ghost !px-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tela inicial</span>
                </button>
              )}

              <button
                onClick={onOpenShareHousehold}
                aria-label="Entrar com Google"
                className="btn-google ui-btn !py-1.5"
              >
                <GoogleIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Entrar com Google</span>
              </button>
            </>
          )}

          <button onClick={onOpenScanInvoice} aria-label="Escanear fatura ou print" className="hidden md:inline-flex ui-btn ui-btn-secondary !px-2">
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span className="hidden 2xl:inline">Escanear</span>
          </button>

          <button onClick={onOpenImportSpreadsheet} aria-label="Importar planilha" className="hidden 2xl:inline-flex ui-btn ui-btn-secondary !px-2">
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            <span>Planilha</span>
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          <button onClick={onOpenBackupModal} aria-label="Dados e backup" className="hidden sm:inline-flex ui-btn ui-btn-ghost !px-2">
            <Download className="w-4 h-4" aria-hidden="true" />
          </button>

          <button onClick={onOpenNewTransaction} aria-label="Novo lançamento" className="ui-btn ui-btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Lançamento</span>
          </button>
        </div>
      </div>
    </header>
  );
};
