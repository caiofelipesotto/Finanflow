import React, { useMemo, useState } from 'react';
import {
  Transaction,
  Category,
  Account,
  Goal,
  RecurringTransactionDraft,
} from '../types/finance';
import { MonthBalanceHero } from './MonthBalanceHero';
import { CreditCardsWidget } from './CreditCardsWidget';
import { MonthBreakdownTable } from './MonthBreakdownTable';
import { DonutCategoryChart } from './DonutCategoryChart';
import { ProjectionChart } from './ProjectionChart';
import { formatCurrency, getMonthName, formatMonthShort } from '../utils/formatters';
import {
  PlusCircle,
  CreditCard,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Target,
  PiggyBank,
  Calendar,
  TrendingUp,
  TrendingDown,
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
  recurringTransactions?: RecurringTransactionDraft[];
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
  recurringTransactions,
}) => {
  const now = new Date();
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthLabel = `${getMonthName(selectedMonth)} de ${selectedYear}`;
  const shortLabel = formatMonthShort(selectedYear, selectedMonth);

  // Month transactions (recorrentes + normais)
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

  // Aggregate sums
  const totalIncome = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const totalExpense = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const balance = totalIncome - totalExpense;

  const paidCount = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'expense' && t.isPaid).length;
  }, [monthTransactions]);

  const totalCount = useMemo(() => {
    return monthTransactions.filter((t) => t.type === 'expense').length;
  }, [monthTransactions]);

  const creditCardTotal = useMemo(() => {
    return monthTransactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          (t.paymentMethod === 'credit' || t.recurrence === 'installment')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  // Donut category items
  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [categories]);

  const donutItems = useMemo(() => {
    const catAmounts: Record<string, number> = {};

    monthTransactions
      .filter((t) => t.type === 'expense')
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

  // Navigation handlers
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

  // UI state for collapsible sections
  const [showCharts, setShowCharts] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [showGoals, setShowGoals] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

  const handleSelectMonthFromChart = (year: number, month: number) => {
    onSelectYear(year);
    onSelectMonth(month);
  };

  return (
    <div className="space-y-5">
      {/* ============================================================
         1. HERO — Saldo do mês (sempre visível, centro de comando)
         ============================================================ */}
      <MonthBalanceHero
        monthLabel={monthLabel}
        shortLabel={shortLabel}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={balance}
        paidCount={paidCount}
        totalCount={totalCount}
        creditCardTotal={creditCardTotal}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onCurrentMonth={handleCurrentMonth}
        isCurrentMonth={isCurrentMonth}
        onOpenNewTransaction={onOpenNewTransaction}
      />

      {/* ============================================================
         2. CARTÕES — módulos com transações do mês (sempre visível)
         ============================================================ */}
      <CreditCardsWidget
        transactions={transactions}
        accounts={accounts}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onOpenNewTransaction={onOpenNewTransaction}
        onOpenScanInvoice={onOpenScanInvoice}
      />

      {/* ============================================================
         3. GRÁFICOS — projeção + donut (colapsável)
         ============================================================ */}
      <section className="ui-card p-4">
        <button
          type="button"
          onClick={() => setShowCharts(!showCharts)}
          className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
          aria-expanded={showCharts}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            <h3 className="ui-section-title">Visão gráfica do mês</h3>
          </div>
          {showCharts ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          )}
        </button>

        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in-50 duration-200">
            <div className="lg:col-span-2 min-w-0">
              <ProjectionChart
                transactions={transactions}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onSelectMonth={handleSelectMonthFromChart}
              />
            </div>

            <div className="lg:col-span-1">
              <DonutCategoryChart
                items={donutItems}
                totalExpense={totalExpense}
                monthLabel={monthLabel}
              />
            </div>
          </div>
        )}
      </section>

      {/* ============================================================
         4. LANÇAMENTOS DO MÊS — tabela (sempre visível, compacta)
         ============================================================ */}
      <section className="ui-card p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-1)] mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            <h3 className="ui-section-title">
              Lançamentos de {monthLabel} ({monthTransactions.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="ui-btn ui-btn-secondary text-xs"
              aria-label="Novo lançamento"
            >
              <PlusCircle className="w-3 h-3" aria-hidden="true" />
              <span>Novo</span>
            </button>
            <button
              type="button"
              onClick={onOpenImportSpreadsheet}
              className="ui-btn ui-btn-secondary text-xs"
              aria-label="Importar planilha"
            >
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              <span>Importar</span>
            </button>
          </div>
        </div>

        {monthTransactions.length > 0 ? (
          <MonthBreakdownTable
            transactions={monthTransactions.slice(0, 12)}
            categories={categories}
            accounts={accounts}
            monthLabel={monthLabel}
            onTogglePaid={onTogglePaid}
            onEditTransaction={onEditTransaction}
            onDeleteTransaction={onDeleteTransaction}
            onOpenNewTransaction={onOpenNewTransaction}
          />
        ) : (
          <div className="ui-alert flex-col !border-[color-mix(in_srgb,var(--accent-text)_32%,transparent)] !bg-[var(--accent-soft)] text-center py-6">
            <Sparkles className="w-6 h-6 text-[var(--accent-text)] mx-auto mb-2" aria-hidden="true" />
            <strong className="block text-[var(--accent-text)] font-semibold mb-1">
              Nenhum lançamento neste mês
            </strong>
            <span className="text-[var(--text-3)] text-[11px]">
              Clique em <strong>Novo</strong> para criar seu primeiro lançamento.
            </span>
          </div>
        )}
      </section>

      {/* ============================================================
         5. METAS — seção colapsável
         ============================================================ */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in-50 duration-200">
              {goals.map((goal) => {
                const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                return (
                  <div key={goal.id} className="ui-tile p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--text-1)] truncate">
                        {goal.title}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--accent-text)] tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="ui-progress mb-2">
                      <div
                        className="ui-progress-bar"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: 'var(--accent-text)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--text-4)]">
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

      {/* ============================================================
         6. ORÇAMENTOS — seção colapsável
         ============================================================ */}
      <section className="ui-card p-4">
        <button
          type="button"
          onClick={() => setShowBudgets(!showBudgets)}
          className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
          aria-expanded={showBudgets}
        >
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
            <h3 className="ui-section-title">Limites por categoria</h3>
          </div>
          {showBudgets ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          )}
        </button>

        {showBudgets && (
          <div className="space-y-2 animate-in fade-in-50 duration-200">
            {categories
              .filter((c) => c.type === 'expense' && (c.budget || 0) > 0)
              .map((cat) => {
                const spent = monthTransactions
                  .filter((t) => t.type === 'expense' && t.category === cat.id)
                  .reduce((s, t) => s + t.amount, 0);
                const pct = cat.budget! > 0 ? Math.min(100, Math.round((spent / cat.budget!) * 100)) : 0;
                const over = spent > (cat.budget || 0);

                return (
                  <div key={cat.id} className="ui-tile p-2.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-[var(--text-1)] truncate block">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="ui-progress h-[6px]">
                          <div
                            className="ui-progress-bar"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: over ? 'var(--danger-text)' : 'var(--accent-text)',
                            }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums">
                          {over ? 'Excedido' : `${pct}%`}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums shrink-0">
                      {formatCurrency(spent)} / {formatCurrency(cat.budget || 0)}
                    </span>
                  </div>
                );
              })}
            {categories.filter((c) => c.type === 'expense' && (c.budget || 0) > 0).length === 0 && (
              <p className="text-center py-3 text-[var(--text-4)] text-[11px]">
                Nenhum limite definido. Vá em <strong>Limites</strong> para definir.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ============================================================
         7. SIMULAÇÃO RÁPIDA — seção colapsável
         ============================================================ */}
      {recurringTransactions && recurringTransactions.length > 0 && (
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

          {showSimulation && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in-50 duration-200">
              <div className="ui-card p-4">
                <span className="ui-stat-label">Lançamentos recorrentes</span>
                <div className="ui-stat-value text-[var(--text-1)]">
                  {recurringTransactions.length}
                </div>
              </div>
              <div className="ui-card p-4">
                <span className="ui-stat-label">Próximo mês projetado</span>
                <div className="ui-stat-value text-[var(--danger-text)]">
                  {formatCurrency(
                    recurringTransactions
                      .filter((r) => r.type === 'expense')
                      .reduce((s, r) => s + r.amount, 0)
                  )}
                </div>
              </div>
              <div className="ui-card p-4">
                <span className="ui-stat-label">Ver detalhes</span>
                <button
                  type="button"
                  onClick={() => {
                    // Navega para a seção de gráficos se colapsada
                    if (!showCharts) setShowCharts(true);
                  }}
                  className="ui-btn ui-btn-secondary text-xs w-full"
                >
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  <span>Abrir simulação completa</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================
         8. TABELA COMPLETA — colapsável (detalhe total)
         ============================================================ */}
      {showTable && monthTransactions.length > 12 && (
        <section className="ui-card p-4 mt-4">
          <button
            type="button"
            onClick={() => setShowTable(false)}
            className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
          >
            <div className="flex items-center gap-2">
              <h3 className="ui-section-title">Todos os lançamentos do mês</h3>
            </div>
            <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          </button>

          <MonthBreakdownTable
            transactions={monthTransactions}
            categories={categories}
            accounts={accounts}
            monthLabel={monthLabel}
            onTogglePaid={onTogglePaid}
            onEditTransaction={onEditTransaction}
            onDeleteTransaction={onDeleteTransaction}
            onOpenNewTransaction={onOpenNewTransaction}
          />
        </section>
      )}
    </div>
  );
};