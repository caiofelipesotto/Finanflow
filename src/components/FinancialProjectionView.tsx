import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { Calendar } from 'lucide-react';

interface FinancialProjectionViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export const FinancialProjectionView: React.FC<FinancialProjectionViewProps> = ({
  transactions,
  categories,
  accounts,
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

  const monthlyRows = monthlyProjection.map((m) => {
    const balColor = m.balance >= 0 ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]';
    const sign = m.balance >= 0 ? '+' : '';
    return (
      <tr key={m.label} className="hover:bg-zinc-800/30">
        <td className="p-3 font-mono text-zinc-200">{m.label}</td>
        <td className="text-right p-3 font-mono text-[var(--accent-text)]">+{formatCurrency(m.income)}</td>
        <td className="text-right p-3 font-mono text-[var(--danger-text)]">-{formatCurrency(m.expense)}</td>
        <td className="text-right p-3 font-mono font-bold whitespace-nowrap tabular-nums">
          <span className={balColor}>{sign}{formatCurrency(m.balance)}</span>
        </td>
      </tr>
    );
  });

  const totalRowBalanceColor = totals.finalBalance >= 0 ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Simulação de Longo Prazo</h2>
          <p className="text-sm text-zinc-500">Projeção do seu saldo com base em lançamentos recorrentes.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">De</label>
          <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="ui-input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Até</label>
          <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} className="ui-input" />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs text-zinc-400">&nbsp;</label>
          <button className="ui-btn ui-btn-primary w-full sm:w-auto">Atualizar simulação</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ui-card p-4">
          <span className="ui-stat-label">Receitas projetadas</span>
          <div className="ui-stat-value !text-[var(--accent-text)]">{formatCurrency(totals.totalIncome)}</div>
          <span className="ui-stat-note">média {formatCurrency(avgMonthlyIncome)}/mês</span>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Despesas projetadas</span>
          <div className="ui-stat-value !text-[var(--danger-text)]">{formatCurrency(totals.totalExpense)}</div>
          <span className="ui-stat-note">média {formatCurrency(avgMonthlyExpense)}/mês</span>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Saldo projetado (final)</span>
          <div className={'ui-stat-value mt-0.5 ' + balanceColor}>{formatCurrency(totals.finalBalance)}</div>
          <span className="ui-stat-note">{isNetPositive ? 'Saldo crescente' : 'Saldo decrescente'}</span>
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Projeção de saldo</h3>
        </div>
        <div className="flex items-end justify-center h-[200px] w-full" style={{ position: 'relative' }}>
          <svg width={400} height={200} style={{ position: 'absolute', top: 0, left: 0 }}>
            <line x1={0} y1={100} x2={400} y2={100} stroke="#34343d" strokeWidth="1" strokeDasharray="4" />
          </svg>
          <div className="flex justify-between w-full mt-2 pt-2">
            {monthlyProjection
              .filter((_, i) => i % Math.max(1, Math.floor(monthlyProjection.length / 6)) === 0 || i === monthlyProjection.length - 1)
              .map((point, index) => (
                <div key={index} className="flex flex-col items-center">
                  <span className="text-[10px] text-[var(--text-4)] block">{point.label}</span>
                  <span className="text-[10px] font-mono text-[var(--text-2)] block">{formatCurrency(point.balance)}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="mt-3 text-[11px] text-[var(--text-3)]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#f97316]" />
            Saldo projetado
          </span>
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Detalhe por mês</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="text-left p-3 text-zinc-400 text-xs">Mês</th>
                <th className="text-right p-3 text-zinc-400 text-xs text-right">Receitas</th>
                <th className="text-right p-3 text-zinc-400 text-xs text-right">Despesas</th>
                <th className="text-right p-3 text-zinc-400 text-xs text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">{monthlyRows}</tbody>
            <tfoot className="bg-zinc-900/50">
              <tr>
                <td className="p-3 text-zinc-400 text-xs font-semibold">Total</td>
                <td className="text-right p-3 font-mono text-[var(--accent-text)]">+{formatCurrency(totals.totalIncome)}</td>
                <td className="text-right p-3 font-mono text-[var(--danger-text)]">-{formatCurrency(totals.totalExpense)}</td>
                <td className="text-right p-3 font-mono font-bold whitespace-nowrap tabular-nums">
                  <span className={totalRowBalanceColor}>{formatCurrency(totals.finalBalance)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {monthlyProjection.length === 0 && (
        <div className="py-12 text-center text-zinc-500">
          Nenhum lançamento recorrente encontrado.
          <p className="text-[11px] mt-2">Crie lançamentos com recorrência mensal em "Novo lançamento" para aparecer aqui.</p>
        </div>
      )}

      {recurringTransactions.length === 0 && (
        <div className="ui-alert flex-col !border-[color-mix(in_srgb,var(--accent-text)_32%,transparent)] !bg-[var(--accent-soft)]">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
            <div className="text-[var(--accent-text)]">
              <strong className="block font-semibold">Nenhum lançamento recorrente encontrado</strong>
              <span className="text-[var(--text-2)] text-[11px] mt-1">Vá em "Novo lançamento" e crie lançamentos com recorrência mensal para aparecer aqui.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};