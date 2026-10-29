import React from 'react';
import {
  ShieldCheck,
  Camera,
  CheckCircle2,
  ArrowRight,
  Heart,
  Sparkles,
} from 'lucide-react';
import { signInUrl } from '../services/cloudSyncService';
import { GoogleIcon } from './GoogleIcon';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../utils/theme';

interface AuthGateScreenProps {
  onContinueAsGuest: () => void;
  inviteCode: string | null;
  theme: Theme;
  onToggleTheme: () => void;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onContinueAsGuest,
  inviteCode,
  theme,
  onToggleTheme,
}) => {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-1)] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Brilho de fundo discreto */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[300px] bg-[var(--accent-soft)] blur-3xl pointer-events-none opacity-70" />

      {/* Barra superior */}
      <header className="relative z-10 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <LogoMark className="w-8 h-8 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-black tracking-tight text-[var(--text-1)] whitespace-nowrap">FinanFlow</span>
            <span className="hidden sm:inline ui-badge">Finanças inteligentes</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button onClick={onContinueAsGuest} className="ui-btn ui-btn-ghost">
            <span className="hidden sm:inline">Continuar sem conta</span>
            <span className="sm:hidden">Visitante</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {inviteCode && (
            <div className="mb-4 ui-alert !border-[color-mix(in_srgb,var(--accent-text)_30%,transparent)] !bg-[var(--accent-soft)]">
              <div className="ui-icon ui-icon-accent">
                <Heart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="ui-label !mb-0 !text-[var(--accent-text)]">Convite para espaço compartilhado</span>
                  <span className="ui-badge">{inviteCode}</span>
                </div>
                <h3 className="text-xs font-bold text-[var(--text-1)] mt-1">
                  Você foi convidado(a) a compartilhar o controle financeiro
                </h3>
                <p className="text-[11px] text-[var(--text-3)] mt-1 leading-relaxed">
                  Entre com sua conta Google abaixo para sincronizar lançamentos, despesas e limites
                  em tempo real.
                </p>
              </div>
            </div>
          )}

          <div className="ui-card p-6 sm:p-7">
            <div className="text-center mb-6">
              <div className="ui-icon ui-icon-accent !w-12 !h-12 mx-auto mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="ui-h1 !text-xl">
                {inviteCode ? 'Acessar espaço compartilhado' : 'Acessar FinanFlow'}
              </h1>
              <p className="ui-sub mt-1.5 leading-relaxed">
                Planejamento financeiro completo, com sincronização na nuvem para você e sua família.
              </p>
            </div>

            <div className="space-y-2.5">
              <a
                href={signInUrl(inviteCode ? '/household/join' : '/')}
                className="btn-google ui-btn w-full !py-3 !text-sm"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">Entrar com Google</span>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </a>

              <button onClick={onContinueAsGuest} className="ui-btn ui-btn-ghost w-full !py-2.5">
                Continuar sem login (modo visitante)
              </button>
            </div>

            <ul className="mt-6 pt-5 border-t border-[var(--border-1)] space-y-2.5">
              <li className="flex items-start gap-2.5 text-[11px] text-[var(--text-3)] leading-relaxed">
                <span className="ui-icon ui-icon-accent !w-6 !h-6 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <span>
                  <strong className="text-[var(--text-2)]">Sincronização em tempo real:</strong> lançamentos
                  salvos e atualizados em qualquer aparelho.
                </span>
              </li>

              <li className="flex items-start gap-2.5 text-[11px] text-[var(--text-3)] leading-relaxed">
                <span className="ui-icon !w-6 !h-6 mt-0.5">
                  <Camera className="w-3.5 h-3.5" />
                </span>
                <span>
                  <strong className="text-[var(--text-2)]">Leitor de faturas e prints:</strong> extração
                  automática das compras do cartão.
                </span>
              </li>

              <li className="flex items-start gap-2.5 text-[11px] text-[var(--text-3)] leading-relaxed">
                <span className="ui-icon !w-6 !h-6 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
                <span>
                  <strong className="text-[var(--text-2)]">Segurança e backup:</strong> seus dados ficam no
                  seu banco, com acesso restrito à sua conta.
                </span>
              </li>
            </ul>
          </div>

          <div className="text-center mt-5 text-[11px] text-[var(--text-4)] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Autenticação rápida e segura via Google</span>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 flex items-center justify-center gap-2 text-[11px] text-[var(--text-4)] border-t border-[var(--border-1)]">
        <LogoMark className="w-4 h-4" />
        <span>FinanFlow · Planejamento e controle financeiro</span>
      </footer>
    </div>
  );
};
