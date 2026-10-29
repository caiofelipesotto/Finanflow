import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  Share2,
  Cloud,
  LogOut,
  Sparkles,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  User,
  HouseholdDoc,
  HouseholdMember,
  joinHouseholdWithCode,
  signOutFromCloud,
  signInUrl,
} from '../services/cloudSyncService';
import { GoogleIcon } from './GoogleIcon';

interface ShareHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  household: HouseholdDoc | null;
  members: HouseholdMember[];
  onJoinHouseholdSuccess: (household: HouseholdDoc) => void;
  onSyncLocalToCloud: () => Promise<number>;
  /** Lançamentos que ainda não estão na nuvem (não é o total da tela). */
  pendingUploadCount: number;
}

export const ShareHouseholdModal: React.FC<ShareHouseholdModalProps> = ({
  isOpen,
  onClose,
  user,
  household,
  members,
  onJoinHouseholdSuccess,
  onSyncLocalToCloud,
  pendingUploadCount,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

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

  const handleLocalSync = async () => {
    setSyncing(true);
    try {
      const sent = await onSyncLocalToCloud();
      setSentCount(sent);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal max-w-lg">
        {/* Header */}
        <div className="ui-modal-header justify-between">
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
        <div className="ui-modal-body space-y-5">
          {/* Auth State */}
          {!user ? (
            <div className="ui-panel p-5 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Entrar com o Google
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-xs mx-auto">
                  Acesse em qualquer celular ou computador sem perder dados e compartilhe em tempo real com outra pessoa.
                </p>
              </div>

              <a
                href={signInUrl('/')}
                className="btn-google w-full flex items-center justify-center gap-2.5 py-3 px-4 font-bold rounded-xl transition-all shadow-md text-sm cursor-pointer"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Entrar com Google</span>
              </a>
            </div>
          ) : (
            <div className="ui-panel p-4 flex items-center justify-between">
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
              <div className="ui-panel p-4 space-y-3">
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
                      className="ui-btn ui-btn-primary shrink-0"
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

              {/* Quem participa do espaço */}
              <div className="ui-panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Quem compartilha este espaço
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {members.length} {members.length === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                </div>

                <ul className="space-y-2">
                  {members.map((m) => {
                    const isMe = m.uid === user.sub;
                    const isOwner = m.uid === household.ownerId;
                    const displayName = m.name || (isMe ? user.name : null) || 'Membro';
                    const picture = isMe ? user.picture : undefined;
                    return (
                      <li
                        key={m.uid}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-black/25 border border-zinc-800/70"
                      >
                        {picture ? (
                          <img
                            src={picture}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover border border-orange-500/40"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-orange-600/25 border border-orange-500/40 flex items-center justify-center text-zinc-200 text-xs font-bold shrink-0">
                            {displayName[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-white truncate">
                              {displayName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] font-bold text-orange-300 bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 rounded">
                                Você
                              </span>
                            )}
                            {isOwner && (
                              <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                                Criou o espaço
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {isMe && user.email ? user.email : `Entrou em ${m.joinedAt?.slice(0, 10).split('-').reverse().join('/')}`}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {members.length < 2 && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Ninguém entrou ainda. Envie o link acima para a pessoa aceitar o convite: ela entra com a conta Google dela e já aparece aqui.
                  </p>
                )}
              </div>

              {/* Só aparece quando existe algo realmente fora da nuvem */}
              {pendingUploadCount > 0 ? (
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <UploadCloud className="w-5 h-5 text-orange-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {pendingUploadCount} lançamento(s) fora da nuvem
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Criados neste aparelho (offline ou no modo sem conta).
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLocalSync}
                    disabled={syncing}
                    className="ui-btn ui-btn-primary shrink-0"
                  >
                    {syncing ? 'Enviando...' : 'Enviar agora'}
                  </button>
                </div>
              ) : sentCount !== null && sentCount > 0 ? (
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-orange-500/40 flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="text-[11px] text-zinc-300">
                    {sentCount} lançamento(s) enviados. Agora tudo está na nuvem.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Tudo o que está aqui já foi salvo na nuvem.
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
                    className="ui-input flex-1 uppercase font-mono tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !inviteInput.trim()}
                    className="ui-btn ui-btn-primary"
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
        <div className="ui-modal-footer justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Nuvem segura · Supabase
          </span>
          <button
            onClick={onClose}
            className="ui-btn ui-btn-secondary"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
