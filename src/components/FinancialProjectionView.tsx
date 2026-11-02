import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency } from '../utils/formatters';

interface FinancialProjectionViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export const FinancialProjectionView: React.FC<FinancialProjectionViewProps> = ({
  transactions,
}) => {
  const [fromMonth, setFromMonth] = useState<string>('');
  const [toMonth, setToMonth] = useState<string>('');

  const now = new Date();
  const defaultFrom = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const defaultToYear = now.getFullYear() + 1;
  const defaultTo = defaultToYear + '-' + String(now.getMonth() + 1).padStart(2, '0');

  useEffect(() => {
    if (!fromMonth) setFromMonth(defaultFrom);
    if (!toMonth) setToMonth(defaultTo);
  }, []);

  const recurringTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.recurrence === 'monthly' || t.recurrence === 'installment' || Boolean(t.recurrenceGroupId)
    );
  }, [transactions]);

  const monthlyProjection = useMemo(() => {
    if (!fromMonth || !toMonth) return [];
    const [fromYear, fromMonthNum] = fromMonth.split('-').map(Number);
    const [toYear, toMonthNum] = toMonth.split('-').map(Number);
    const months: Array<{ label: string; income: number; expense: number; balance: number }> = [];
    let year = fromYear;
    let month = fromMonthNum;
    let runningBalance = 0;
    while (year < toYear || (year === toYear && month <= toMonthNum)) {
      const label = String(month).padStart(2, '0') + '/' + year;
      let monthIncome = 0;
      let monthExpense = 0;
      for (const tx of recurringTransactions) {
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1;
        const startedBeforeOrInTarget = txYear < year || (txYear === year && txMonth <= month);
        if (!startedBeforeOrInTarget) continue;
        const monthsDiff = (year - txYear) * 12 + (month - txMonth);
        if (monthsDiff % 1 !== 0) continue;
        const dayOfMonth = txDate.getDate();
        const daysInTargetMonth = new Date(year, month, 0).getDate();
        const projectedDay = Math.min(dayOfMonth, daysInTargetMonth);
        if (tx.type === 'income') monthIncome += tx.amount;
        else monthExpense += tx.amount;
      }
      runningBalance += monthIncome - monthExpense;
      months.push({ label: label, income: monthIncome, expense: monthExpense, balance: runningBalance });
      month++;
      if (month > 12) { month = 1; year++; }
    }
    return months;
  }, [transactions, recurringTransactions, fromMonth, toMonth]);

  const totals = useMemo(() => {
    const totalIncome = monthlyProjection.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyProjection.reduce((s, m) => s + m.expense, 0);
    const finalBalance = monthlyProjection.length > 0 ? monthlyProjection[monthlyProjection.length - 1].balance : 0;
    return { totalIncome: totalIncome, totalExpense: totalExpense, finalBalance: finalBalance };
  }, [monthlyProjection]);

  const avgMonthlyIncome = monthlyProjection.length > 0 ? totals.totalIncome / monthlyProjection.length : 0;
  const avgMonthlyExpense = monthlyProjection.length > 0 ? totals.totalExpense / monthlyProjection.length : 0;
  const isNetPositive = avgMonthlyIncome - avgMonthlyExpense >= 0;
  const balanceColor = isNetPositive ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Simulação de Longo Prazo</h2>
      <p className="text-sm text-zinc-500">Projeção do seu saldo com base em lançamentos recorrentes.</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">De</label>
          <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="ui-input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Até</label>
          <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} className="ui-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ui-card p-4">
          <span className="ui-stat-label">Receitas projetadas</span>
          <div className="ui-stat-value !text-[var(--accent-text)]">{formatCurrency(totals.totalIncome)}</div>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Despesas projetadas</span>
          <div className="ui-stat-value !text-[var(--danger-text)]">{formatCurrency(totals.totalExpense)}</div>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Saldo projetado</span>
          <div className={'ui-stat-value mt-0.5 ' + balanceColor}>{formatCurrency(totals.finalBalance)}</div>
        </div>
      </div>
    </div>
  );
};