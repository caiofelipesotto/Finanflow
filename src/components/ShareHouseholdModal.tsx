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
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="ui-modal-header">
          <span className="ui-icon ui-icon-accent !w-9 !h-9">
            <Users className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="ui-modal-title">Espaço financeiro na nuvem</h2>
            <p className="ui-modal-sub">Sincronização em tempo real entre membros e aparelhos</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 -mt-1 -mr-1 rounded-[var(--r-control)] text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="ui-modal-body space-y-5">
          {/* Auth State */}
          {!user ? (
            <div className="ui-tile p-5 text-center space-y-4">
              <div className="ui-icon ui-icon-accent !w-11 !h-11 mx-auto">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="ui-section-title">Entrar com o Google</h3>
                <p className="ui-sub max-w-xs mx-auto leading-relaxed">
                  Acesse em qualquer celular ou computador sem perder dados e compartilhe em tempo real com outra pessoa.
                </p>
              </div>

              <a href={signInUrl('/')} className="btn-google ui-btn w-full !py-3">
                <GoogleIcon className="w-4 h-4" />
                <span className="text-sm font-bold">Entrar com Google</span>
              </a>
            </div>
          ) : (
            <div className="ui-tile p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'Avatar'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] border border-[color-mix(in_srgb,var(--accent-text)_35%,transparent)] flex items-center justify-center text-[var(--accent-text)] font-bold">
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-1)] flex items-center gap-1.5">
                    <span className="truncate">{user.name || 'Usuário'}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" />
                  </div>
                  <div className="text-[11px] text-[var(--text-4)] truncate max-w-[200px]">
                    {user.email}
                  </div>
                </div>
              </div>

              <button onClick={handleLogout} className="ui-btn ui-btn-danger shrink-0">
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}

          {/* Household Connection details */}
          {user && household && (
            <div className="space-y-4">
              <div className="ui-tile p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-label !mb-0 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Espaço compartilhado ativo
                  </span>
                  <span className="ui-badge ui-badge-success">Conectado</span>
                </div>

                <div className="text-sm font-bold text-[var(--text-1)]">
                  {household.name}
                </div>

                <div className="pt-3 border-t border-[var(--border-1)] flex flex-col gap-2">
                  <div className="ui-label !mb-0">Código de convite</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2 px-3 bg-[var(--surface-1)] border border-[var(--border-2)] rounded-[var(--r-control)] text-center text-base font-bold tracking-[0.2em] text-[var(--text-2)] tabular-nums select-all">
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

                  <button onClick={handleCopyLink} className="ui-btn ui-btn-secondary w-full mt-1">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>
                      {copiedLink ? 'Link copiado para o WhatsApp' : 'Copiar link do convite'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Quem participa do espaço */}
              <div className="ui-tile p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-label !mb-0 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Quem compartilha
                  </span>
                  <span className="ui-badge">
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
                        className="flex items-center gap-2.5 p-2 rounded-[var(--r-control)] bg-[var(--surface-1)] border border-[var(--border-1)]"
                      >
                        {picture ? (
                          <img
                            src={picture}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] border border-[color-mix(in_srgb,var(--accent-text)_35%,transparent)] flex items-center justify-center text-[var(--accent-text)] text-[11px] font-bold shrink-0">
                            {displayName[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-[var(--text-1)] truncate">
                              {displayName}
                            </span>
                            {isMe && <span className="ui-badge ui-badge-accent">Você</span>}
                            {isOwner && <span className="ui-badge">Criou o espaço</span>}
                          </div>
                          <div className="text-[11px] text-[var(--text-4)] truncate">
                            {isMe && user.email ? user.email : `Entrou em ${m.joinedAt?.slice(0, 10).split('-').reverse().join('/')}`}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {members.length < 2 && (
                  <p className="text-[11px] text-[var(--text-4)] leading-relaxed">
                    Ninguém entrou ainda. Envie o link acima para a pessoa aceitar o convite: ela entra com a conta Google dela e já aparece aqui.
                  </p>
                )}
              </div>

              {/* Só aparece quando existe algo realmente fora da nuvem */}
              {pendingUploadCount > 0 ? (
                <div className="ui-tile p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="ui-icon ui-icon-accent">
                      <UploadCloud className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-1)]">
                        {pendingUploadCount} lançamento(s) fora da nuvem
                      </div>
                      <div className="text-[11px] text-[var(--text-4)]">
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
                <div className="ui-tile p-3.5 flex items-center gap-2.5 !border-[color-mix(in_srgb,var(--success-text)_30%,transparent)] !bg-[var(--success-soft)]">
                  <Check className="w-4 h-4 text-[var(--success-text)] shrink-0" />
                  <div className="text-[11px] text-[var(--text-2)]">
                    {sentCount} lançamento(s) enviados. Agora tudo está na nuvem.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--text-4)]">
                  <Check className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" />
                  Tudo o que está aqui já foi salvo na nuvem.
                </div>
              )}

              {/* Entrar com código de outro espaço */}
              <div className="pt-3 border-t border-[var(--border-1)] space-y-2">
                <div className="ui-label !mb-0">Ou já tem o código de outro espaço?</div>
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
                  <p className="text-[11px] text-[var(--danger-text)] font-medium">{joinError}</p>
                )}
                {joinSuccess && (
                  <p className="text-[11px] text-[var(--success-text)] font-medium">{joinSuccess}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ui-modal-footer justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-text)]" />
            Nuvem segura · Supabase
          </span>
          <button onClick={onClose} className="ui-btn ui-btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
