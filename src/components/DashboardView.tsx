import React, { useMemo } from 'react';
import { Transaction, Category, Account, Goal, ViewTab } from '../types/finance';
import { MonthBalanceHero } from './MonthBalanceHero';
import { ProjectionChart } from './ProjectionChart';
import { DonutCategoryChart } from './DonutCategoryChart';
import { MonthBreakdownTable } from './MonthBreakdownTable';
import { CreditCardsWidget } from './CreditCardsWidget';
import { formatCurrency, getMonthName, formatMonthShort } from '../utils/formatters';
import { PlusCircle, CreditCard, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

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
}) => {
  const now = new Date();
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthLabel = `${getMonthName(selectedMonth)} de ${selectedYear}`;
  const shortLabel = formatMonthShort(selectedYear, selectedMonth);

  // Month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(monthPrefix));
  }, [transactions, monthPrefix]);

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

  return (
    <div className="space-y-5">
      {/* 1. Hero Balance for the selected month */}
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

      {/* 2. Credit Cards & Installments Hub */}
      <CreditCardsWidget
        transactions={transactions}
        accounts={accounts}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onOpenNewTransaction={onOpenNewTransaction}
        onOpenScanInvoice={onOpenScanInvoice}
      />

      {/* 3. Charts Section (Projection + Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

      {/* 4. Detailed Line Items Table for Active Month */}
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
  );
};
