import React from 'react';
import {
  Users,
  ShieldCheck,
  Sparkles,
  Camera,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Heart,
} from 'lucide-react';
import { signInUrl } from '../services/cloudSyncService';
import { GoogleIcon } from './GoogleIcon';
import { LogoMark } from './Logo';

interface AuthGateScreenProps {
  onContinueAsGuest: () => void;
  inviteCode: string | null;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onContinueAsGuest,
  inviteCode,
}) => {

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-zinc-500 selection:text-white">
      {/* Background ambient glow effects in Orange and Graphite */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-orange-500/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[420px] h-[320px] bg-zinc-700/10 blur-3xl pointer-events-none" />

      {/* Top micro-bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <LogoMark className="w-9 h-9 shadow-lg shadow-orange-500/25 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl font-black tracking-tight text-white whitespace-nowrap">FinanFlow</span>
            <span className="hidden sm:inline text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950/70 border border-zinc-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">
              Finanças Inteligentes
            </span>
          </div>
        </div>

        <button
          onClick={onContinueAsGuest}
          className="shrink-0 text-xs text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-xl border border-zinc-700/80 hover:border-zinc-800 bg-zinc-800/80 cursor-pointer flex items-center gap-1.5"
        >
          <span className="hidden sm:inline">Continuar sem conta (offline)</span>
          <span className="sm:hidden">Visitante</span>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </header>

      {/* Main card & hero */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Household Invitation Alert Banner if opened via link */}
          {inviteCode && (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-orange-950/70 to-orange-900 border border-orange-500/40 shadow-xl shadow-orange-950/20 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
                  <Heart className="w-5 h-5 fill-orange-400/30 text-zinc-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Convite para Espaço Compartilhado
                    </span>
                    <span className="text-[10px] bg-zinc-900/60 text-zinc-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      {inviteCode}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Você foi convidado(a) para compartilhar o controle financeiro!
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Entre com sua conta Google abaixo para sincronizar seus lançamentos, despesas e orçamentos em tempo real.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-zinc-950/20 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative">
            {/* Header within card */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-orange-950 shadow-xl shadow-orange-500/25 mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {inviteCode ? 'Acessar Espaço Compartilhado' : 'Acessar FinanFlow'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                Planejamento financeiro completo, inteligente e com sincronização na nuvem para você e sua família.
              </p>
            </div>

            {/* Login com Google via Supabase (redireciona e volta para o app) */}
            <div className="space-y-3">
              <a
              href={signInUrl(inviteCode ? '/household/join' : '/')}
                className="w-full flex items-center justify-center gap-3.5 py-3.5 px-5 rounded-2xl font-semibold text-zinc-900 bg-white hover:bg-zinc-100 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-white/10 border border-white group cursor-pointer"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold text-zinc-900">
                  Entrar com Google
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <button
                onClick={onContinueAsGuest}
                className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-400 hover:text-white transition-colors text-center block rounded-xl hover:bg-zinc-800/50 cursor-pointer"
              >
                Continuar sem login (modo visitante / offline)
              </button>
            </div>

            {/* Feature Pills */}
            <div className="mt-7 pt-6 border-t border-zinc-800 space-y-3">
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-orange-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong>Sincronização em tempo real:</strong> lançamentos salvos e atualizados instantaneamente em qualquer aparelho.
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-zinc-700/30 border border-zinc-800/40 flex items-center justify-center shrink-0 text-zinc-300">
                  <Camera className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <span>
                  <strong>Leitor de Faturas & Prints com IA:</strong> extração automática de compras de faturas e cartões em 1 clique.
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-zinc-700/30 border border-zinc-800/40 flex items-center justify-center shrink-0 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <span>
                  <strong>Segurança e Backup na Nuvem:</strong> seus dados ficam no seu próprio banco, com acesso restrito à sua conta.
                </span>
              </div>
            </div>
          </div>

          {/* Micro Footer */}
          <div className="text-center mt-6 text-xs text-zinc-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Autenticação rápida e segura via Google</span>
          </div>
        </div>
      </main>

      {/* Footer minimal info */}
      <footer className="relative z-10 py-4 flex items-center justify-center gap-2 text-[11px] text-zinc-600 border-t border-zinc-800/80">
        <LogoMark className="w-4 h-4" />
        <span>FinanFlow · Planejamento e Controle Financeiro Inteligente</span>
      </footer>
    </div>
  );
};
