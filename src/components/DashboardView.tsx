import React, { useMemo, useState } from 'react';
import {
  Transaction,
  Category,
  Account,
  Goal,
  ViewTab,
  RecurringTransactionDraft,
} from '../types/finance';
import { MonthBalanceHero } from './MonthBalanceHero';
import { ProjectionChart } from './ProjectionChart';
import { DonutCategoryChart } from './DonutCategoryChart';
import { MonthBreakdownTable } from './MonthBreakdownTable';
import { CreditCardsWidget } from './CreditCardsWidget';
import { formatCurrency, getMonthName, formatMonthShort } from '../utils/formatters';
import { PlusCircle, CreditCard, Sparkles, AlertCircle, ArrowRight, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
  selectedYear: number;
  selectedMonth: number; // 0-11
  onSelectYear: (year: number) => void;
  onSelectMonth: (month: number) => void;
  onSelectTab: (tab: ViewTab) => void;
  onOpenNewTransaction: () => void;
  onOpenScanInvoice: () => void;
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
  onSelectTab,
  onOpenNewTransaction,
  onOpenScanInvoice,
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

    // Converter lançamentos recorrentes para formato compatível com Transaction
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

  const handleSelectMonthFromChart = (year: number, month: number) => {
    onSelectYear(year);
    onSelectMonth(month);
  };

  // UI state for collapsible sections
  const [showTable, setShowTable] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  return (
    <div className="space-y-4">
      {/* 1. Hero Balance — sempre visível, comando central */}
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

      {/* 2. Cartões de Crédito — MÓDULO PRINCIPAL com transações do mês */}
      <CreditCardsWidget
        transactions={transactions}
        accounts={accounts}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onOpenNewTransaction={onOpenNewTransaction}
        onOpenScanInvoice={onOpenScanInvoice}
      />

      {/* 3. Gráficos de apoio (colapsáveis) */}
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
            <span className="ui-badge">opcional</span>
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

      {/* 4. Tabela detalhada (colapsável — só abre quando precisa) */}
      <section className="ui-card p-4">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="flex items-center justify-between w-full pb-3 border-b border-[var(--border-1)] mb-3"
          aria-expanded={showTable}
        >
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true">📋</span>
            <h3 className="ui-section-title">Lançamentos do mês ({monthTransactions.length})</h3>
          </div>
          {showTable ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-3)]" aria-hidden="true" />
          )}
        </button>

        {showTable && (
          <div className="animate-in fade-in-50 duration-200">
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
          </div>
        )}

        {!showTable && (
          <p className="text-center py-4 text-[var(--text-4)] text-[11px]">
            Clique para expandir a tabela completa de lançamentos.
          </p>
        )}
      </section>
    </div>
  );
};
