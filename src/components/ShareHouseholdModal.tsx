import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Share2,
  Cloud,
  LogOut,
  LogIn,
  Sparkles,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  User,
  HouseholdDoc,
  joinHouseholdWithCode,
  signOutFromCloud,
  signInUrl,
} from '../services/cloudSyncService';

interface ShareHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  household: HouseholdDoc | null;
  onJoinHouseholdSuccess: (household: HouseholdDoc) => void;
  onSyncLocalToCloud: () => void;
  localTransactionsCount: number;
}

export const ShareHouseholdModal: React.FC<ShareHouseholdModalProps> = ({
  isOpen,
  onClose,
  user,
  household,
  onJoinHouseholdSuccess,
  onSyncLocalToCloud,
  localTransactionsCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair da sua conta?')) {
      try {
        await signOutFromCloud();
      } finally {
        // Recarrega: zera todo o estado e volta para a tela de login.
        window.location.reload();
      }
    }
  };

  const handleCopyCode = () => {
    if (!household?.inviteCode) return;
    navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareableUrl = household?.inviteCode
    ? `${window.location.origin}${window.location.pathname}?convite=${household.inviteCode}`
    : window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setJoinError('Faça login com sua conta Google antes de conectar.');
      return;
    }
    if (!inviteInput.trim()) return;

    try {
      setJoinLoading(true);
      setJoinError(null);
      const joined = await joinHouseholdWithCode(inviteInput.trim());
      setJoinSuccess(`Conectado com sucesso ao espaço "${joined.household.name}"!`);
      onJoinHouseholdSuccess(joined.household);
      setInviteInput('');
    } catch (err: any) {
      setJoinError('Erro ao entrar no espaço: ' + (err.message || 'Tente novamente'));
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLocalSync = () => {
    onSyncLocalToCloud();
    setSyncDone(true);
    setTimeout(() => setSyncDone(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161618] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-[#0a0a0c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-400 flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-orange-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Espaço Financeiro na Nuvem
              </h2>
              <p className="text-xs text-zinc-400">
                Sincronização em tempo real entre membros e aparelhos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Auth State */}
          {!user ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-950/30 via-zinc-900 to-zinc-900 border border-zinc-800/40 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Entrar com Freebuff
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-xs mx-auto">
                  Acesse em qualquer celular ou computador sem perder dados e compartilhe em tempo real com outra pessoa.
                </p>
              </div>

              <a
                href={signInUrl('/')}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl transition-all shadow-md text-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-zinc-600" />
                <span>Entrar com Freebuff</span>
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'Avatar'}
                    className="w-10 h-10 rounded-full border border-orange-500/50 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-zinc-400 font-bold">
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <span>{user.name || 'Usuário'}</span>
                    <ShieldCheck className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="text-xs text-zinc-400 truncate max-w-[200px]">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-800/40 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}

          {/* Household Connection details */}
          {user && household && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Espaço Compartilhado Ativo
                  </span>
                </div>

                <div className="text-base font-bold text-white">
                  {household.name}
                </div>

                <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
                  <div className="text-xs text-zinc-300 font-medium">
                    Código de Convite / Conexão:
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2 px-3 bg-black/50 border border-zinc-700 rounded-lg font-mono text-center text-lg font-bold tracking-widest text-zinc-300 select-all">
                      {household.inviteCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3.5 py-2.5 bg-zinc-500 hover:bg-orange-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      {copiedLink ? 'Link direto copiado para WhatsApp!' : 'Copiar Link direto para WhatsApp'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Local Data Migration */}
              {localTransactionsCount > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <UploadCloud className="w-5 h-5 text-zinc-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Sincronizar dados locais com a Nuvem
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {localTransactionsCount} lançamento(s) prontos para upload
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLocalSync}
                    className="px-3 py-1.5 text-xs font-bold text-zinc-300 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-700/60 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    {syncDone ? 'Enviado!' : 'Enviar agora'}
                  </button>
                </div>
              )}

              {/* Enter another code to connect */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="text-xs text-zinc-400">
                  Ou já tem o código de outro espaço?
                </div>
                <form onSubmit={handleJoinByCode} className="flex gap-2">
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                    placeholder="DIGITE O CÓDIGO"
                    maxLength={10}
                    className="flex-1 bg-black/60 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white uppercase placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 font-mono tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !inviteInput.trim()}
                    className="px-4 py-2 bg-zinc-500 hover:bg-orange-400 text-zinc-950 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {joinLoading ? 'Entrando...' : 'Conectar'}
                  </button>
                </form>

                {joinError && (
                  <p className="text-xs text-red-400 font-medium">{joinError}</p>
                )}
                {joinSuccess && (
                  <p className="text-xs text-orange-400 font-medium">{joinSuccess}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#0a0a0c] flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
            Nuvem Google Firestore
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
