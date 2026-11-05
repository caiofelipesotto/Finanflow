import React, { useMemo, useState } from 'react';
import {
  Transaction,
  Category,
  Account,
  Goal,
  RecurringTransactionDraft,
  RecurrenceRule,
} from '../types/finance';
import { MonthBalanceHero } from './MonthBalanceHero';
import { CreditCardsWidget } from './CreditCardsWidget';
import { DonutCategoryChart } from './DonutCategoryChart';
import { ProjectionChart } from './ProjectionChart';
import { FinancialProjectionView } from './FinancialProjectionView';
import { formatCurrency, getMonthName, formatMonthShort } from '../utils/formatters';
import { summarizeTransactions, isAporte } from '../utils/aportes';
import { cumulativeSavedThrough } from '../utils/monthlySeries';
import {
  ChevronDown,
  ChevronUp,
  Target,
  PiggyBank,
  TrendingUp,
  Calendar,
  BarChart2,
  ArrowRight,
} from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
  selectedYear: number;
  selectedMonth: number; // 0-11
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
  onOpenNewTransaction: () => void;
  onOpenScanInvoice: () => void;
  onOpenImportSpreadsheet: () => void;
  onTogglePaid: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenTransactions: () => void;
  recurringTransactions?: RecurringTransactionDraft[];
  recurrenceRules?: RecurrenceRule[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  accounts,
  goals,
  selectedYear,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  onOpenNewTransaction,
  onOpenScanInvoice,
  onOpenImportSpreadsheet,
  onTogglePaid,
  onEditTransaction,
  onDeleteTransaction,
  onOpenTransactions,
  recurringTransactions,
}) => {
  const now = new Date();
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthLabel = `${getMonthName(selectedMonth)} de ${selectedYear}`;
  const shortLabel = formatMonthShort(selectedYear, selectedMonth);

  // Lançamentos do mês (recorrentes + normais)
  const monthTransactions = useMemo(() => {
    const normal = transactions.filter((t) => t.date.startsWith(monthPrefix));

    const recurringAsTx = (recurringTransactions || [])
      .filter((r) => r.date.startsWith(monthPrefix))
      .map((r) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        category: r.categoryId || '',
        date: r.date,
        account: r.accountId || '',
        paymentMethod: r.paymentMethod || 'credit',
        isPaid: false,
        notes: r.isException
          ? `Recorrência (exceção): ${r.description}`
          : `Recorrência: ${r.description}`,
        recurrence: 'monthly',
        installment: undefined,
        recurrenceGroupId: undefined,
      } as Transaction));

    return [...normal, ...recurringAsTx].sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, recurringTransactions, monthPrefix]);

  const monthTotals = useMemo(() => summarizeTransactions(monthTransactions), [monthTransactions]);
  const initialSaved = useMemo(
    () => accounts.filter((a) => a.type === 'investment').reduce((sum, a) => sum + a.initialBalance, 0),
    [accounts]
  );
  const totalSaved = useMemo(
    () => initialSaved + cumulativeSavedThrough(transactions, selectedYear, selectedMonth),
    [initialSaved, transactions, selectedYear, selectedMonth]
  );

  const paidCount = useMemo(
    () => monthTransactions.filter((t) => t.type === 'expense' && !isAporte(t) && t.isPaid).length,
    [monthTransactions]
  );

  const totalCount = useMemo(
    () => monthTransactions.filter((t) => t.type === 'expense' && !isAporte(t)).length,
    [monthTransactions]
  );

  const creditCardTotal = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'expense' && !isAporte(t) && (t.paymentMethod === 'credit' || t.recurrence === 'installment'))
        .reduce((sum, t) => sum + t.amount, 0),
    [monthTransactions]
  );

  const categoriesMap = useMemo(
    () =>
      categories.reduce<Record<string, Category>>((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {}),
    [categories]
  );

  const donutItems = useMemo(() => {
    const catAmounts: Record<string, number> = {};

    monthTransactions
      .filter((t) => t.type === 'expense' && !isAporte(t))
      .forEach((t) => {
        catAmounts[t.category] = (catAmounts[t.category] || 0) + t.amount;
      });

    const total = Object.values(catAmounts).reduce((a, b) => a + b, 0);

    return Object.entries(catAmounts)
      .map(([catId, amount]) => {
        const cat = categoriesMap[catId];
        return {
          id: catId,
          name: cat?.name || 'Outras Despesas',
          amount,
          color: cat?.color || '#f97316',
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, categoriesMap]);

  // Navegação de mês
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onSelectYear(selectedYear - 1);
      onSelectMonth(11);
    } else {
      onSelectMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onSelectYear(selectedYear + 1);
      onSelectMonth(0);
    } else {
      onSelectMonth(selectedMonth + 1);
    }
  };

  const handleCurrentMonth = () => {
    onSelectYear(now.getFullYear());
    onSelectMonth(now.getMonth());
  };

  const handleSelectMonthFromChart = (year: number, month: number) => {
    onSelectYear(year);
    onSelectMonth(month);
  };

  // Evolução e simulação abertas por padrão: são o conteúdo principal desses blocos.
  const [showCharts, setShowCharts] = useState(true);
  const [showGoals, setShowGoals] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [showSimulation, setShowSimulation] = useState(true);

  const budgetCategories = categories.filter((c) => c.type === 'expense' && (c.budget || 0) > 0);

  return (
    <div className="space-y-4">
      {/* 1. O essencial: entrou, saiu, sobrou */}
      <MonthBalanceHero
        monthLabel={monthLabel}
        shortLabel={shortLabel}
        totalIncome={monthTotals.income}
        totalExpense={monthTotals.expense}
        balance={monthTotals.balance}
        saved={monthTotals.saved}
        totalSaved={totalSaved}
        paidCount={paidCount}
        totalCount={totalCount}
        creditCardTotal={creditCardTotal}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onCurrentMonth={handleCurrentMonth}
        isCurrentMonth={isCurrentMonth}
        onOpenNewTransaction={onOpenNewTransaction}
      />

      {/* 2. Cartões: fatura e lançamentos do mês, cartão por cartão */}
      <CreditCardsWidget
        transactions={transactions}
        accounts={accounts}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onOpenNewTransaction={onOpenNewTransaction}
        onOpenScanInvoice={onOpenScanInvoice}
      />

      {/* 3. Atalho para a aba Transações (a lista completa vive lá) */}
      <button
        type="button"
        onClick={onOpenTransactions}
        className="ui-card ui-tile-hover p-4 w-full flex items-center justify-between gap-3 text-left group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="ui-icon ui-icon-accent">
            <Calendar className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--text-1)] truncate">
              Lançamentos de {monthLabel}
            </span>
            <span className="ui-stat-note">
              {monthTransactions.length > 0
                ? `${monthTransactions.length} transaç${monthTransactions.length === 1 ? 'ão' : 'ões'} neste mês — ver na aba Transações`
                : 'Nenhum lançamento neste mês — abrir aba Transações'}
            </span>
          </div>
        </div>

        <span className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-[var(--accent-text)] group-hover:underline">
          <span className="hidden sm:inline">Ver transações</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </span>
      </button>

      {/* 4. Para onde foi a grana */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 min-w-0">
          <DonutCategoryChart items={donutItems} totalExpense={monthTotals.expense} monthLabel={monthLabel} />
        </div>

        <div className="lg:col-span-2 min-w-0">
          <section className="ui-card p-4 h-full">
            <button
              type="button"
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
              aria-expanded={showCharts}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
                <h3 className="ui-section-title">Evolução mês a mês</h3>
              </div>
              {showCharts ? (
                <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
              )}
            </button>

            {showCharts ? (
              <ProjectionChart
                transactions={transactions}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonthFromChart}
              />
            ) : (
              <p className="text-center py-10 text-xs text-[var(--text-4)]">
                Clique para ver entradas, saídas e saldo dos próximos meses.
              </p>
            )}
          </section>
        </div>
      </section>

      {/* 5. Metas */}
      {goals.length > 0 && (
        <section className="ui-card p-4">
          <button
            type="button"
            onClick={() => setShowGoals(!showGoals)}
            className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
            aria-expanded={showGoals}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
              <h3 className="ui-section-title">Metas ({goals.length})</h3>
            </div>
            {showGoals ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            )}
          </button>

          {showGoals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {goals.map((goal) => {
                const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div key={goal.id} className="ui-tile p-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-xs font-medium text-[var(--text-1)] truncate">
                        {goal.title}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--accent-text)] tabular-nums shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="ui-progress mb-2">
                      <div
                        className="ui-progress-bar"
                        style={{ width: `${pct}%`, backgroundColor: goal.color || 'var(--accent-text)' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--text-4)] tabular-nums">
                      <span>{formatCurrency(goal.currentAmount)}</span>
                      <span>/ {formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 6. Limites por categoria */}
      {budgetCategories.length > 0 && (
        <section className="ui-card p-4">
          <button
            type="button"
            onClick={() => setShowBudgets(!showBudgets)}
            className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
            aria-expanded={showBudgets}
          >
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
              <h3 className="ui-section-title">Limites por categoria ({budgetCategories.length})</h3>
            </div>
            {showBudgets ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            )}
          </button>

          {showBudgets && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {budgetCategories.map((cat) => {
                const spent = monthTransactions
                  .filter((t) => t.type === 'expense' && t.category === cat.id)
                  .reduce((s, t) => s + t.amount, 0);
                const pct = cat.budget! > 0 ? Math.min(100, Math.round((spent / cat.budget!) * 100)) : 0;
                const over = spent > (cat.budget || 0);

                return (
                  <div key={cat.id} className="ui-tile p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-[var(--text-1)] truncate">
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums shrink-0">
                        {formatCurrency(spent)} / {formatCurrency(cat.budget || 0)}
                      </span>
                    </div>
                    <div className="ui-progress">
                      <div
                        className="ui-progress-bar"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: over ? 'var(--danger-text)' : 'var(--accent-text)',
                        }}
                      />
                    </div>
                    <span className="ui-stat-note">
                      {over ? 'Limite excedido' : `${pct}% do limite usado`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 7. Simulação de longo prazo */}
      <section className="ui-card p-4">
        <button
          type="button"
          onClick={() => setShowSimulation(!showSimulation)}
          className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
          aria-expanded={showSimulation}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            <h3 className="ui-section-title">Simulação de longo prazo</h3>
          </div>
          {showSimulation ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          )}
        </button>

        {showSimulation ? (
          <FinancialProjectionView
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            recurringTransactions={recurringTransactions}
          />
        ) : (
          <p className="text-center py-4 text-xs text-[var(--text-4)]">
            Clique para projetar recorrências e parcelas dos próximos meses.
          </p>
        )}
      </section>
    </div>
  );
};
