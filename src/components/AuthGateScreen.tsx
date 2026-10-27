import React, { useState } from 'react';
import {
  WalletCards,
  Users,
  ShieldCheck,
  Sparkles,
  Camera,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Heart,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, User } from '../firebase';

interface AuthGateScreenProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
  inviteCode: string | null;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  inviteCode,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMsg('O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para fazer login.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('A janela do Google foi fechada antes de concluir o login.');
      } else {
        setErrorMsg(err.message || 'Erro ao autenticar com a Conta Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-zinc-500 selection:text-white">
      {/* Background ambient glow effects in Orange and Graphite */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-orange-500/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[420px] h-[320px] bg-zinc-700/10 blur-3xl pointer-events-none" />

      {/* Top micro-bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-500 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-orange-500/25 shrink-0">
            <WalletCards className="w-5 h-5 stroke-[2.5]" />
          </div>
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
          <span className="hidden sm:inline">Modo Visitante (Offline)</span>
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

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/70 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Google Login Primary Button */}
            <div className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3.5 py-3.5 px-5 rounded-2xl font-semibold text-zinc-900 bg-white hover:bg-zinc-100 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-white/10 border border-white disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                    <span>Conectando com Google...</span>
                  </>
                ) : (
                  <>
                    {/* Official Google 'G' icon */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                    <span className="text-sm font-bold text-zinc-900">
                      Entrar com Conta Google
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

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
                  <strong>Segurança e Backup na Nuvem:</strong> seus dados protegidos na Google Cloud com acesso restrito a você.
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
      <footer className="relative z-10 py-4 text-center text-[11px] text-zinc-600 border-t border-zinc-800/80">
        FinanFlow · Planejamento e Controle Financeiro Inteligente
      </footer>
    </div>
  );
};
