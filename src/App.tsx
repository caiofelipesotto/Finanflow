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
import { auth, onAuthStateChanged, signOut, User } from './firebase';
import {
  HouseholdDoc,
  getOrCreateUserProfile,
  joinHouseholdWithCode,
  syncHouseholdMemberUids,
  subscribeHousehold,
  subscribeTransactions,
  subscribeCategories,
  subscribeAccounts,
  subscribeGoals,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  deleteAllTransactionsFromCloud,
  saveCategoryToCloud,
  saveAccountToCloud,
  saveGoalToCloud,
} from './services/firebaseSyncService';

export default function App() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');

  // Firebase Auth & Cloud Sync States
  const [authChecking, setAuthChecking] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [inviteCodeParam, setInviteCodeParam] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('convite') || params.get('invite') || null;
    }
    return null;
  });
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentHousehold, setCurrentHousehold] = useState<HouseholdDoc | null>(null);
  const [isShareHouseholdOpen, setIsShareHouseholdOpen] = useState(false);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'ok' | 'error' | null>(null);

  // Persistence with localStorage as offline fallback / initial state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      // Purge legacy caio-specific keys once and for all
      localStorage.removeItem('finanflow_caio_transactions');
      localStorage.removeItem('finanflow_caio_goals');
      localStorage.removeItem('finanflow_caio_categories');
      localStorage.removeItem('finanflow_caio_accounts');
      localStorage.removeItem('finanflow_v2_blank_state');

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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
      if (user) {
        try {
          // Check URL query parameters for household invite code
          const urlParams = new URLSearchParams(window.location.search);
          const inviteCode = urlParams.get('convite') || urlParams.get('invite') || inviteCodeParam;

          if (inviteCode) {
            const joined = await joinHouseholdWithCode(user, inviteCode);
            if (joined) {
              setCurrentHousehold(joined);
              setNotificationBanner(`🎉 Conectado com sucesso ao espaço "${joined.name}"!`);
              // Clean up invite query parameter from URL cleanly
              window.history.replaceState({}, document.title, window.location.pathname);
              setInviteCodeParam(null);
              setTimeout(() => setNotificationBanner(null), 6000);
              return;
            }
          }

          // Otherwise get or create user profile and household
          const { household } = await getOrCreateUserProfile(user);
          setCurrentHousehold(household);
        } catch (err) {
          console.error('Erro ao inicializar perfil de usuário no Firebase:', err);
        }
      } else {
        setCurrentHousehold(null);
      }
    });

    return () => unsubscribeAuth();
  }, [inviteCodeParam]);

  // Garante que documentos criados antes da entrada de um novo membro passem a
  // ser visíveis para ele (as regras do Firestore leem o memberUids gravado).
  const memberSyncKeyRef = useRef<string>('');
  useEffect(() => {
    if (!currentUser || !currentHousehold) return;
    const key = `${currentHousehold.id}:${[...currentHousehold.memberUids].sort().join(',')}`;
    if (memberSyncKeyRef.current === key) return;
    memberSyncKeyRef.current = key;

    syncHouseholdMemberUids(currentHousehold, currentUser.uid).catch((err) =>
      console.warn('Não foi possível sincronizar os membros dos documentos:', err)
    );
  }, [currentUser, currentHousehold]);

  // Set up real-time Firestore synchronization when authenticated
  useEffect(() => {
    if (!currentUser || !currentHousehold) return;

    // 1. Subscribe to household
    const unsubHousehold = subscribeHousehold(currentHousehold.id, (updated) => {
      setCurrentHousehold(updated);
    });

    // 2. Subscribe to transactions
    const unsubTx = subscribeTransactions(currentUser.uid, (cloudTxs) => {
      setTransactions(cloudTxs);
    });

    // 3. Subscribe to categories
    const unsubCat = subscribeCategories(currentUser.uid, (cloudCats) => {
      if (cloudCats.length > 0) setCategories(cloudCats);
    });

    // 4. Subscribe to accounts
    const unsubAcc = subscribeAccounts(currentUser.uid, (cloudAccs) => {
      if (cloudAccs.length > 0) setAccounts(cloudAccs);
    });

    // 5. Subscribe to goals
    const unsubGoals = subscribeGoals(currentUser.uid, (cloudGoals) => {
      if (cloudGoals.length > 0) setGoals(cloudGoals);
    });

    return () => {
      unsubHousehold();
      unsubTx();
      unsubCat();
      unsubAcc();
      unsubGoals();
    };
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

  // Transaction Handlers - Supporting single transactions and arrays of installments/recurrences
  const handleSaveTransaction = (
    txDataOrArray: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[],
    existingId?: string
  ) => {
    const { user, household } = syncContextRef.current;

    if (Array.isArray(txDataOrArray)) {
      const newItems: Transaction[] = txDataOrArray.map((txData, idx) => ({
        ...txData,
        id: `tx_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      }));
      setTransactions((prev) => [...newItems, ...prev]);

      if (user && household) {
        newItems.forEach((item) => {
          saveTransactionToCloud(item, household, user)
            .then(() => notifyCloudSave(true))
            .catch((err) => {
              console.error('Erro ao sincronizar transação na nuvem:', err);
              notifyCloudSave(false);
            });
        });
      }
    } else if (existingId) {
      const updatedTx: Transaction = { ...txDataOrArray, id: existingId };
      setTransactions((prev) =>
        prev.map((t) => (t.id === existingId ? updatedTx : t))
      );

      if (user && household) {
        saveTransactionToCloud(updatedTx, household, user)
          .then(() => notifyCloudSave(true))
          .catch((err) => {
            console.error('Erro ao atualizar transação na nuvem:', err);
            notifyCloudSave(false);
          });
      }
    } else {
      const newTx: Transaction = {
        ...txDataOrArray,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      setTransactions((prev) => [newTx, ...prev]);

      if (user && household) {
        saveTransactionToCloud(newTx, household, user)
          .then(() => notifyCloudSave(true))
          .catch((err) => {
            console.error('Erro ao salvar transação na nuvem:', err);
            notifyCloudSave(false);
          });
      }
    }
    setEditingTx(null);
  };

  const notifyCloudSave = (ok: boolean) => {
    setCloudSaveStatus(ok ? 'ok' : 'error');
    setTimeout(() => setCloudSaveStatus(null), 4000);
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
    const { user, household } = syncContextRef.current;
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, isPaid: !t.isPaid };
          if (user && household) {
            saveTransactionToCloud(updated, household, user).catch(console.error);
          }
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
            saveCategoryToCloud(updated, household, user).catch(console.error);
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
      saveGoalToCloud(newGoal, household, user).catch(console.error);
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
          saveGoalToCloud(updated, household, user).catch(console.error);
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
    setTransactions(imported.transactions);
    if (imported.categories) setCategories(imported.categories);
    if (imported.accounts) setAccounts(imported.accounts);
    if (imported.goals) setGoals(imported.goals);
  };

  const handleImportSpreadsheetTransactions = (
    newTxs: Transaction[],
    mode: 'append' | 'replace'
  ) => {
    const { user, household } = syncContextRef.current;
    if (mode === 'replace') {
      setTransactions(newTxs);
    } else {
      setTransactions((prev) => [...newTxs, ...prev]);
    }
    if (user && household) {
      newTxs.forEach((tx) => saveTransactionToCloud(tx, household, user).catch(console.error));
    }
  };

  const handleResetToDemo = () => {
    setTransactions(getSampleTransactions());
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

      // 3. If authenticated in Cloud, wipe cloud transactions for this user
      if (currentUser) {
        await deleteAllTransactionsFromCloud(currentUser.uid);
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
        await saveTransactionToCloud(tx, currentHousehold, currentUser);
      }
      for (const cat of categories) {
        await saveCategoryToCloud(cat, currentHousehold, currentUser);
      }
      for (const acc of accounts) {
        await saveAccountToCloud(acc, currentHousehold, currentUser);
      }
      for (const g of goals) {
        await saveGoalToCloud(g, currentHousehold, currentUser);
      }
    } catch (e) {
      console.error('Erro na sincronização de dados locais para a nuvem:', e);
    }
  };    const handleLogout = async () => {
    if (confirm('Deseja realmente sair da sua conta Google?')) {
      await signOut(auth);
      // Limpa o cache local para não deixar dados órfãos entre sessões
      localStorage.removeItem('finanflow_transactions');
      localStorage.removeItem('finanflow_goals');
      localStorage.removeItem('finanflow_categories');
      localStorage.removeItem('finanflow_accounts');
      localStorage.removeItem('finanflow_caio_transactions');
      localStorage.removeItem('finanflow_caio_goals');
      localStorage.removeItem('finanflow_caio_categories');
      localStorage.removeItem('finanflow_caio_accounts');
      localStorage.removeItem('finanflow_v2_blank_state');
      setCurrentUser(null);
      setCurrentHousehold(null);
      setCloudSaveStatus(null);
      setIsGuestMode(false);
    }
  };


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

  // Authenticated but household still loading from Firestore:
  // block UI to avoid writes that skip Firestore (race condition on first login).
  if (currentUser && !currentHousehold && !isGuestMode) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-4 text-zinc-400">
        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-zinc-950 font-black shadow-xl shadow-orange-500/25 animate-pulse">
          <WalletCards className="w-7 h-7 stroke-[2.5]" />
        </div>
        <div className="text-sm font-semibold tracking-wide text-zinc-400 flex items-center gap-2">
          <span>Conectando sua conta na nuvem...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated and hasn't explicitly chosen guest mode, show the Google Auth Gate screen
  if (!currentUser && !isGuestMode) {
    return (
      <AuthGateScreen
        onLoginSuccess={async (usr) => {
          setCurrentUser(usr);
          const invite = inviteCodeParam;
          if (invite) {
            try {
              const joined = await joinHouseholdWithCode(usr, invite);
              if (joined) {
                setCurrentHousehold(joined);
                setNotificationBanner(`🎉 Conectado com sucesso ao espaço "${joined.name}"!`);
                window.history.replaceState({}, document.title, window.location.pathname);
                setInviteCodeParam(null);
                setTimeout(() => setNotificationBanner(null), 6000);
                return;
              }
            } catch (err) {
              console.error('Erro ao conectar via convite:', err);
            }
          }
          const { household } = await getOrCreateUserProfile(usr);
          setCurrentHousehold(household);
        }}
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
        onLoginSuccess={async (usr) => {
          const { household } = await getOrCreateUserProfile(usr);
          setCurrentHousehold(household);
        }}
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
