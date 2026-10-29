/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewTab, Transaction, Category, Account, Goal } from './types/finance';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  DEFAULT_GOALS,
  getSampleTransactions,
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { GoalsView } from './components/GoalsView';
import { TransactionModal } from './components/TransactionModal';
import { BackupModal } from './components/BackupModal';
import { ImportSpreadsheetModal } from './components/ImportSpreadsheetModal';
import { ScanInvoiceModal } from './components/ScanInvoiceModal';
import { ShareHouseholdModal } from './components/ShareHouseholdModal';
import { AuthGateScreen } from './components/AuthGateScreen';
import { WalletCards, CheckCircle2, X, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  User,
  HouseholdDoc,
  CloudSyncPayload,
  CloudAuthError,
  fetchMe,
  fetchSync,
  joinHouseholdWithCode,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  deleteAllTransactionsFromCloud,
  saveCategoryToCloud,
  saveAccountToCloud,
  saveGoalToCloud,
  signOutFromCloud,
} from './services/cloudSyncService';

const PENDING_TX_KEY = 'finanflow_pending_txs';

/**
 * Ids de lançamentos ainda não confirmados na nuvem.
 *
 * O snapshot do Firestore é a fonte de verdade: o que já está lá substitui o
 * estado local (edições e exclusões feitas pelo outro membro propagam). Estes
 * ids ficam na tela por cima do snapshot até a escrita ser confirmada — sem
 * isso, um lançamento novo sumiria do aparelho até a nuvem respondê-lo.
 */
function loadPendingTxIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_TX_KEY);
    if (raw !== null) return new Set<string>(JSON.parse(raw));
    // Migração: em versões antigas nada chegava à nuvem. Marca tudo o que já
    // existe localmente como pendente para o AutoSync reenviar sem perder histórico.
    const local = localStorage.getItem('finanflow_transactions');
    const ids: string[] = local ? (JSON.parse(local) as Transaction[]).map((t) => t.id) : [];
    localStorage.setItem(PENDING_TX_KEY, JSON.stringify(ids));
    return new Set(ids);
  } catch (e) {
    console.error(e);
    return new Set();
  }
}

export default function App() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');

  // Firebase Auth & Cloud Sync States
  const [authChecking, setAuthChecking] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [inviteCodeParam, setInviteCodeParam] = useState<string | null>(() => {
    // Tenta verificar se já existe um token de autenticação no cookie.
    const token = typeof document !== 'undefined' ? document.cookie.match(/ff_token=([^;]+)/)?.[1] : null;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const inviteCodeFromUrl = params?.get('convite') || params?.get('invite') || null;

    // Se houver um token, o usuário já está logado. Vamos obter o inviteCode da URL
    // para uso posterior (caso precise aceitar convite), mas não devemos iniciar
    // a tela de login com base nele se já estiver logado.
    if (token) {
      // Se o token existe, pode ser que já estejamos logados, então não precisamos
      // necessariamente forçar a tela de login. O inviteCode da URL será usado
      // quando necessário (e.g., ao tentar acessar uma rota protegida).
      return inviteCodeFromUrl; // Retorna o código da URL para ser usado no useEffect
    } else {
      // Se não há token, então inicializa com o inviteCode da URL, se houver.
      return inviteCodeFromUrl;
    }
  });
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<HouseholdDoc | null>(null);
  const [isShareHouseholdOpen, setIsShareHouseholdOpen] = useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'ok' | 'error' | null>(null);
  const [cloudTimeout, setCloudTimeout] = useState(false);

  // Persistence with localStorage as offline fallback / initial state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('finanflow_transactions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('finanflow_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CATEGORIES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem('finanflow_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ACCOUNTS;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('finanflow_goals');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_GOALS;
  });

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isImportSpreadsheetOpen, setIsImportSpreadsheetOpen] = useState(false);
  const [isScanInvoiceOpen, setIsScanInvoiceOpen] = useState(false);

  // Ref to hold user/household without triggering re-subscribes
  const syncContextRef = useRef<{ user: User | null; household: HouseholdDoc | null }>({
    user: null,
    household: null,
  });
  syncContextRef.current = { user: currentUser, household: currentHousehold };

  // Rastreio de lançamentos pendentes de confirmação na nuvem (ver loadPendingTxIds)
  const pendingTxRef = useRef<Set<string> | null>(null);
  if (pendingTxRef.current === null) pendingTxRef.current = loadPendingTxIds();
  const persistPendingTx = () => {
    try {
      localStorage.setItem(PENDING_TX_KEY, JSON.stringify([...pendingTxRef.current!]));
    } catch (e) {
      console.error(e);
    }
  };
  const markTxPending = (id: string) => {
    pendingTxRef.current!.add(id);
    persistPendingTx();
  };
  const markTxSynced = (id: string) => {
    if (pendingTxRef.current!.delete(id)) persistPendingTx();
  };

  // Sessão: consulta /api/me ao montar. O backend cria o espaço compartilhado
  // no primeiro acesso; convite na URL entra antes de qualquer outra coisa.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me) {
          const urlParams = new URLSearchParams(window.location.search);
          const invite = urlParams.get('convite') || urlParams.get('invite') || inviteCodeParam;
          let household = me.household;
          if (invite) {
            try {
              const joined = await joinHouseholdWithCode(invite);
              household = joined.household;
              setNotificationBanner(`🎉 Conectado com sucesso ao espaço "${household.name}"!`);
              window.history.replaceState({}, document.title, window.location.pathname);
              setInviteCodeParam(null);
              setTimeout(() => setNotificationBanner(null), 6000);
            } catch (err: any) {
              console.error('Erro ao conectar via convite:', err);
            }
          }
          setCurrentUser(me.user);
          setCurrentHousehold(household);
        } else {
          setCurrentUser(null);
          setCurrentHousehold(null);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
        setCurrentUser(null);
        setCurrentHousehold(null);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Polling de sincronização: a nuvem é a fonte de verdade. Sessões expiradas
  // (401) voltam o usuário para a tela de login.
  useEffect(() => {
    if (!currentUser || isGuestMode) return;
    let stopped = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const data = await fetchSync();
        if (!stopped) applySyncPayload(data);
      } catch (err) {
        if (err instanceof CloudAuthError && !stopped) {
          setCurrentUser(null);
          setCurrentHousehold(null);
          setIsGuestMode(false);
        } else if (!stopped) {
          console.warn('[Sync] Falha no polling:', err);
        }
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isGuestMode]);

  // Sincronização por polling: a nuvem é a fonte de verdade para o que já foi
  // confirmado nela; só os pendentes ficam por conta local por cima.
  const applySyncPayload = (data: CloudSyncPayload) => {
    const cloudTxs = data.transactions;
    const pending = pendingTxRef.current!;
    const cloudIds = new Set(cloudTxs.map((t) => t.id));
    let pendingChanged = false;
    cloudTxs.forEach((t) => {
      if (pending.delete(t.id)) pendingChanged = true;
    });
    if (pendingChanged) persistPendingTx();

    setTransactions((prev) => {
      const merged = [...cloudTxs];
      prev.forEach((t) => {
        if (pending.has(t.id) && !cloudIds.has(t.id)) merged.push(t);
      });
      merged.sort((a, b) => (b.date > a.date ? 1 : -1));
      return merged;
    });

    if (data.categories.length > 0) {
      setCategories((prev) => {
        const merged = [...prev];
        data.categories.forEach((c) => {
          const i = merged.findIndex((x) => x.id === c.id);
          if (i >= 0) merged[i] = c;
          else merged.push(c);
        });
        return merged;
      });
    }

    if (data.accounts.length > 0) {
      setAccounts((prev) => {
        const merged = [...prev];
        data.accounts.forEach((a) => {
          const i = merged.findIndex((x) => x.id === a.id);
          if (i >= 0) merged[i] = a;
          else merged.push(a);
        });
        return merged;
      });
    }

    if (data.goals.length > 0) {
      setGoals((prev) => {
        const merged = [...prev];
        data.goals.forEach((g) => {
          const i = merged.findIndex((x) => x.id === g.id);
          if (i >= 0) merged[i] = g;
          else merged.push(g);
        });
        return merged;
      });
    }

    setCurrentHousehold(data.household);
  };

  // Auto-sync: reenvia para a nuvem apenas os lançamentos ainda pendentes
  // (novo, edição que falhou ou histórico de antes desta versão) assim que as
  // assinaturas conectam.
  useEffect(() => {
    if (!currentUser || !currentHousehold) return;

    const syncTimer = setTimeout(() => {
      let localTxs: Transaction[] = [];
      try {
        localTxs = JSON.parse(localStorage.getItem('finanflow_transactions') || '[]');
      } catch (e) {
        console.error('[AutoSync] Failed to parse local transactions:', e);
        return;
      }

      const pending = pendingTxRef.current!;
      const toPush = localTxs.filter((tx) => pending.has(tx.id));
      if (toPush.length === 0) return;

      console.log('[AutoSync] Pushing', toPush.length, 'pending transactions to cloud');
      toPush.forEach((tx) => pushTxToCloud(tx));
    }, 3000);

    return () => clearTimeout(syncTimer);
  }, [currentUser, currentHousehold?.id]);

  // Sync to local fallback storage
  useEffect(() => {
    try {
      localStorage.setItem('finanflow_transactions', JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('finanflow_categories', JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem('finanflow_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('finanflow_goals', JSON.stringify(goals));
    } catch (e) {
      console.error(e);
    }
  }, [goals]);

  const notifyCloudSave = (ok: boolean) => {
    setCloudSaveStatus(ok ? 'ok' : 'error');
    setTimeout(() => setCloudSaveStatus(null), 4000);
  };

  /**
   * Envia um lançamento para a nuvem marcando-o como pendente até a escrita
   * ser confirmada. Mesmo sem login ele fica pendente — o AutoSync envia assim
   * que a conta conectar — então nada local some por causa do snapshot.
   */
  const pushTxToCloud = (tx: Transaction) => {
    markTxPending(tx.id);
    const { user, household } = syncContextRef.current;
    if (!user || !household) {
      console.warn('[Sync] Cloud save SKIPPED - missing context:', { hasUser: !!user, hasHousehold: !!household });
      return;
    }
    console.log('[Sync] Saving transaction to cloud:', tx.id, 'household:', household.id);
    saveTransactionToCloud(tx)
      .then(() => {
        console.log('[Sync] Cloud save success:', tx.id);
        markTxSynced(tx.id);
        notifyCloudSave(true);
      })
      .catch((err) => {
        console.error('[Sync] Cloud save FAILED:', tx.id, err);
        markTxPending(tx.id);
        notifyCloudSave(false);
      });
  };

  // Transaction Handlers - Supporting single transactions and arrays of installments/recurrences
  const handleSaveTransaction = (
    txDataOrArray: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[],
    existingId?: string
  ) => {
    if (Array.isArray(txDataOrArray)) {
      const newItems: Transaction[] = txDataOrArray.map((txData, idx) => ({
        ...txData,
        id: `tx_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      }));
      setTransactions((prev) => {
        const updated = [...newItems, ...prev];
        // Write to localStorage synchronously
        try {
          localStorage.setItem('finanflow_transactions', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        return updated;
      });

      newItems.forEach((item) => pushTxToCloud(item));
    } else if (existingId) {
      const updatedTx: Transaction = { ...txDataOrArray, id: existingId };
      setTransactions((prev) =>
        prev.map((t) => (t.id === existingId ? updatedTx : t))
      );

      pushTxToCloud(updatedTx);
    } else {
      const newTx: Transaction = {
        ...txDataOrArray,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      // Add to state first
      setTransactions((prev) => {
        const updated = [newTx, ...prev];
        // Write to localStorage synchronously to prevent data loss on reload
        try {
          localStorage.setItem('finanflow_transactions', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        return updated;
      });

      pushTxToCloud(newTx);
    }
    setEditingTx(null);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;
    const { user, household } = syncContextRef.current;

    // Smart deletion for installments
    if (target.installment?.installmentGroupId) {
      const confirmAll = confirm(
        `Esta transação faz parte de uma compra parcelada em ${target.installment.total}x (${target.description}).\n\n` +
          `• Clique em [OK] para excluir TODAS as parcelas desta compra.\n` +
          `• Clique em [Cancelar] para não excluir.`
      );
      if (confirmAll) {
        const toDelete = transactions.filter(
          (t) =>
            t.installment?.installmentGroupId === target.installment?.installmentGroupId
        );
        setTransactions((prev) =>
          prev.filter(
            (t) =>
              t.installment?.installmentGroupId !== target.installment?.installmentGroupId
          )
        );
        if (user && household) {
          toDelete.forEach((t) => deleteTransactionFromCloud(t.id).catch(console.error));
        }
      }
      return;
    }

    // Smart deletion for recurrences
    if (target.recurrenceGroupId) {
      const confirmAll = confirm(
        `Esta transação faz parte de um lançamento fixo/recorrente (${target.description}).\n\n` +
          `• Clique em [OK] para excluir TODAS as ocorrências deste lançamento fixo.\n` +
          `• Clique em [Cancelar] para não excluir.`
      );
      if (confirmAll) {
        const toDelete = transactions.filter(
          (t) => t.recurrenceGroupId === target.recurrenceGroupId
        );
        setTransactions((prev) =>
          prev.filter((t) => t.recurrenceGroupId !== target.recurrenceGroupId)
        );
        if (user && household) {
          toDelete.forEach((t) => deleteTransactionFromCloud(t.id).catch(console.error));
        }
      }
      return;
    }

    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (user && household) {
        deleteTransactionFromCloud(id).catch(console.error);
      }
    }
  };

  const handleTogglePaid = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, isPaid: !t.isPaid };
          pushTxToCloud(updated);
          return updated;
        }
        return t;
      })
    );
  };

  // Budget Handlers
  const handleUpdateBudget = (categoryId: string, newBudget: number) => {
    const { user, household } = syncContextRef.current;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === categoryId) {
          const updated = { ...c, budget: newBudget };
          if (user && household) {
            saveCategoryToCloud(updated).catch(console.error);
          }
          return updated;
        }
        return c;
      })
    );
  };

  // Goal Handlers
  const handleAddGoal = (goalData: Omit<Goal, 'id'>) => {
    const { user, household } = syncContextRef.current;
    const newGoal: Goal = {
      ...goalData,
      id: `goal_${Date.now()}`,
    };
    setGoals((prev) => [...prev, newGoal]);

    if (user && household) {
      saveGoalToCloud(newGoal).catch(console.error);
    }
  };

  const handleUpdateGoalAmount = (goalId: string, deltaAmount: number) => {
    const { user, household } = syncContextRef.current;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const updated = {
          ...g,
          currentAmount: Math.max(0, g.currentAmount + deltaAmount),
        };
        if (user && household) {
          saveGoalToCloud(updated).catch(console.error);
        }
        return updated;
      })
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    if (confirm('Deseja excluir esta meta?')) {
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    }
  };

  // Backup & Reset Handlers
  const handleImportData = (imported: {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    goals: Goal[];
  }) => {
    imported.transactions.forEach((t) => markTxPending(t.id));
    setTransactions(imported.transactions);
    if (imported.categories) setCategories(imported.categories);
    if (imported.accounts) setAccounts(imported.accounts);
    if (imported.goals) setGoals(imported.goals);
  };

  const handleImportSpreadsheetTransactions = (
    newTxs: Transaction[],
    mode: 'append' | 'replace'
  ) => {
    if (mode === 'replace') {
      setTransactions(newTxs);
    } else {
      setTransactions((prev) => [...newTxs, ...prev]);
    }
    newTxs.forEach((tx) => pushTxToCloud(tx));
  };

  const handleResetToDemo = () => {
    const sample = getSampleTransactions();
    sample.forEach((tx) => markTxPending(tx.id));
    setTransactions(sample);
    setCategories(DEFAULT_CATEGORIES);
    setAccounts(DEFAULT_ACCOUNTS);
    setGoals(DEFAULT_GOALS);
  };

  const handleClearAll = () => {
    setIsConfirmClearModalOpen(true);
  };

  const handleExecuteClearAll = async () => {
    try {
      setClearLoading(true);
      // 1. Wipe local state
      setTransactions([]);
      setGoals([]);
      setCategories((prev) => prev.map((c) => ({ ...c, budget: 0 })));

      // 2. Clear all local storage
      localStorage.removeItem('finanflow_transactions');
      localStorage.removeItem('finanflow_goals');
      localStorage.removeItem('finanflow_categories');
      localStorage.removeItem('finanflow_accounts');
      localStorage.removeItem('finanflow_caio_transactions');
      localStorage.removeItem('finanflow_caio_goals');
      localStorage.removeItem('finanflow_caio_categories');
      localStorage.removeItem('finanflow_caio_accounts');
      localStorage.removeItem('finanflow_v2_blank_state');
      pendingTxRef.current!.clear();
      localStorage.removeItem(PENDING_TX_KEY);

      // 3. If authenticated in Cloud, wipe cloud transactions for this user
      if (currentUser) {
        await deleteAllTransactionsFromCloud();
      }

      setNotificationBanner('✓ Todos os dados e lançamentos foram zerados com sucesso!');
      setTimeout(() => setNotificationBanner(null), 5000);
      setIsConfirmClearModalOpen(false);
    } catch (err) {
      console.error('Erro ao zerar dados:', err);
    } finally {
      setClearLoading(false);
    }
  };

  // Sync existing local records to cloud
  const handleSyncLocalToCloud = async () => {
    if (!currentUser || !currentHousehold) return;
    try {
      for (const tx of transactions) {
        markTxPending(tx.id);
        await saveTransactionToCloud(tx);
        markTxSynced(tx.id);
      }
      for (const cat of categories) {
        await saveCategoryToCloud(cat);
      }
      for (const acc of accounts) {
        await saveAccountToCloud(acc);
      }
      for (const g of goals) {
        await saveGoalToCloud(g);
      }
    } catch (e) {
      console.error('Erro na sincronização de dados locais para a nuvem:', e);
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair da sua conta?')) {
      try {
        await signOutFromCloud();
      } catch (err) {
        console.error('Erro ao sair:', err);
      } finally {
        // Recarrega: zera todo o estado e volta para a tela de login.
        window.location.reload();
      }
    }
  };

  // Authenticated but household still loading from Firestore:
  // block UI to avoid writes that skip Firestore (race condition on first login).
  // Timeout: if cloud doesn't respond within 10s, let user proceed offline.
  // ATENÇÃO: hook precisa ficar ANTES de qualquer return antecipado — depois de
  // um return o React falha com "Rendered fewer hooks than expected" (#310) e a
  // tela fica toda preta.
  useEffect(() => {
    if (!currentUser || currentHousehold || isGuestMode || cloudTimeout) return;
    const t = setTimeout(() => setCloudTimeout(true), 10000);
    return () => clearTimeout(t);
  }, [currentUser, currentHousehold, isGuestMode, cloudTimeout]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4 text-zinc-400">
        <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-zinc-950 font-black shadow-xl shadow-orange-500/25 animate-pulse">
          <WalletCards className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div className="text-sm font-semibold tracking-wide text-zinc-400 flex items-center gap-2">
          <span>Carregando FinanFlow...</span>
        </div>
      </div>
    );
  }

  if (currentUser && !currentHousehold && !isGuestMode) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4 text-zinc-400">
        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-zinc-950 font-black shadow-xl shadow-orange-500/25 animate-pulse">
          <WalletCards className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div className="text-sm font-semibold tracking-wide text-zinc-400 flex items-center gap-2">
          {cloudTimeout ? (
            <>
              <span>Nuvem indisponível — modo offline</span>
              <button
                onClick={() => setIsGuestMode(true)}
                className="mt-2 text-xs text-orange-400 underline hover:text-orange-300 cursor-pointer"
              >
                Continuar assim mesmo
              </button>
            </>
          ) : (
            <span>Conectando sua conta na nuvem...</span>
          )}
        </div>
      </div>
    );
  }

  // If user is not authenticated and hasn't explicitly chosen guest mode, show the sign-in gate screen
  if (!currentUser && !isGuestMode) {
    return (
      <AuthGateScreen
        onContinueAsGuest={() => setIsGuestMode(true)}
        inviteCode={inviteCodeParam}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* 3-Zone Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTransaction={() => {
          setEditingTx(null);
          setIsTxModalOpen(true);
        }}
        onOpenScanInvoice={() => setIsScanInvoiceOpen(true)}
        onOpenImportSpreadsheet={() => setIsImportSpreadsheetOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        user={currentUser}
        household={currentHousehold}
        onOpenShareHousehold={() => setIsShareHouseholdOpen(true)}
        onReturnToLogin={() => setIsGuestMode(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Celebration / Alert notification banner */}
        {notificationBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900 border border-orange-500/40 flex items-center justify-between text-sm text-zinc-300 shadow-xl shadow-orange-950/20 animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />
              <span className="font-semibold">{notificationBanner}</span>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Guest mode bar with fast actions */}
        {!currentUser && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-zinc-400 shadow-md">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0 animate-pulse" />
              <div>
                <p className="font-semibold text-white">
                  Você está navegando no <strong className="text-zinc-400">Modo Visitante (Offline)</strong>
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Seus dados ficam salvos apenas neste navegador. Para salvar na Nuvem e sincronizar entre aparelhos, faça login com sua Conta Google.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto md:shrink-0 max-w-full">
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                }`}
              >
                Aba Principal
              </button>
              <button
                onClick={() => setIsConfirmClearModalOpen(true)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-400 border border-zinc-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Limpar Tudo
              </button>
              <button
                onClick={() => setIsGuestMode(false)}
                className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
              >
                <span>Entrar com Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            goals={goals}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onSelectYear={setSelectedYear}
            onSelectMonth={setSelectedMonth}
            onSelectTab={setCurrentTab}
            onOpenNewTransaction={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            onOpenScanInvoice={() => setIsScanInvoiceOpen(true)}
            onTogglePaid={handleTogglePaid}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            onOpenNewTransaction={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            onOpenScanInvoice={() => setIsScanInvoiceOpen(true)}
            onOpenImportSpreadsheet={() => setIsImportSpreadsheetOpen(true)}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onTogglePaid={handleTogglePaid}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsView
            categories={categories}
            transactions={transactions}
            year={selectedYear}
            month={selectedMonth}
            onUpdateBudget={handleUpdateBudget}
          />
        )}

        {currentTab === 'goals' && (
          <GoalsView
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoalAmount={handleUpdateGoalAmount}
            onDeleteGoal={handleDeleteGoal}
          />
        )}
      </main>

      {/* Footer in Dark Zinc Theme */}
      <footer className="border-t border-zinc-800/50 bg-[#1d1d20] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400">FinanFlow</span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <span>Planejamento e Controle Financeiro Inteligente</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <button
              onClick={() => setIsShareHouseholdOpen(true)}
              className="text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{currentUser ? 'Nuvem Conectada' : 'Conectar na Nuvem Google'}</span>
            </button>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <button
              onClick={() => setIsConfirmClearModalOpen(true)}
              className="text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer font-medium"
            >
              Zerar Dados
            </button>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Exportar / Backup
            </button>
            {currentUser && (
              <>
                <span aria-hidden="true" className="text-zinc-700">·</span>
                {cloudSaveStatus === 'error' && (
                  <span className="text-xs text-rose-400 font-medium">Erro na nuvem</span>
                )}
                {cloudSaveStatus === 'ok' && (
                  <span className="text-xs text-orange-400 font-medium">Salvo na nuvem</span>
                )}
                {cloudSaveStatus && <span aria-hidden="true" className="text-zinc-700">·</span>}
                <button
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer"
                >
                  Sair da Conta
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Transaction Modal (New or Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTx}
        categories={categories}
        accounts={accounts}
      />

      {/* Share Household & Google Cloud Sync Modal */}
      <ShareHouseholdModal
        isOpen={isShareHouseholdOpen}
        onClose={() => setIsShareHouseholdOpen(false)}
        user={currentUser}
        household={currentHousehold}
        onJoinHouseholdSuccess={(h) => setCurrentHousehold(h)}
        onSyncLocalToCloud={handleSyncLocalToCloud}
        localTransactionsCount={transactions.length}
      />

      {/* Backup and Data Management Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        goals={goals}
        onImportData={handleImportData}
        onOpenImportSpreadsheet={() => setIsImportSpreadsheetOpen(true)}
        onResetToDemo={handleResetToDemo}
        onClearAll={handleClearAll}
      />

      {/* Import Spreadsheet Modal */}
      <ImportSpreadsheetModal
        isOpen={isImportSpreadsheetOpen}
        onClose={() => setIsImportSpreadsheetOpen(false)}
        categories={categories}
        accounts={accounts}
        onImportTransactions={handleImportSpreadsheetTransactions}
      />

      {/* Invoice and App Screenshot Scanner Modal (AI Powered) */}
      <ScanInvoiceModal
        isOpen={isScanInvoiceOpen}
        onClose={() => setIsScanInvoiceOpen(false)}
        onSaveTransactions={(txs) => handleSaveTransaction(txs)}
        categories={categories}
        accounts={accounts}
      />

      {/* In-App Confirmation Modal for Zerar Dados */}
      {isConfirmClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#161618] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Zerar Todos os Dados?</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Esta ação apagará todas as transações, despesas, receitas, metas e orçamentos cadastrados, deixando o aplicativo 100% zerado e novo.
                {currentUser
                  ? ' Como você está conectado na Nuvem, as transações salvas na nuvem também serão limpas.'
                  : ' Todos os registros locais deste navegador serão removidos.'}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsConfirmClearModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteClearAll}
                disabled={clearLoading}
                className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-zinc-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {clearLoading ? 'Limpando...' : 'Sim, Zerar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
