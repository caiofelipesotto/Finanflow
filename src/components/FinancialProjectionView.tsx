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

  // Lista de meses no intervalo
  const months = useMemo(() => {
    if (!fromMonth || !toMonth) return [];
    const [fromYear, fromMonthNum] = fromMonth.split('-').map(Number);
    const [toYear, toMonthNum] = toMonth.split('-').map(Number);
    const result: Array<{ year: number; month: number; label: string }> = [];
    let year = fromYear;
    let month = fromMonthNum;
    while (year < toYear || (year === toYear && month <= toMonthNum)) {
      result.push({
        year,
        month,
        label: String(month).padStart(2, '0') + '/' + year,
      });
      month++;
      if (month > 12) { month = 1; year++; }
    }
    return result;
  }, [fromMonth, toMonth]);

  // Para cada lançamento recorrente, calcular valor em cada mês
  const launchMonths = useMemo(() => {
    return recurringTransactions.map((tx) => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1;
      const dayOfMonth = txDate.getDate();
      const isIncome = tx.type === 'income';

      const values: Array<number | null> = months.map((m) => {
        // Só aparece a partir do mês de criação
        if (m.year < txYear || (m.year === txYear && m.month < txMonth)) return null;
        const monthsDiff = (m.year - txYear) * 12 + (m.month - txMonth);
        if (monthsDiff % 1 !== 0) return null;
        const daysInTargetMonth = new Date(m.year, m.month, 0).getDate();
        const projectedDay = Math.min(dayOfMonth, daysInTargetMonth);
        return isIncome ? tx.amount : -tx.amount;
      });

      const rowTotal = values.reduce((s: number, v: number | null) => s + (v || 0), 0);

      return {
        id: tx.id,
        name: tx.description || 'Lançamento',
        type: tx.type,
        values,
        rowTotal,
      };
    });
  }, [recurringTransactions, months]);

  // Totais por coluna (mês)
  const columnTotals = useMemo(() => {
    return months.map((_, colIndex) => {
      return launchMonths.reduce((s: number, lm) => s + (lm.values[colIndex] || 0), 0);
    });
  }, [launchMonths, months]);

  const grandTotal = columnTotals.reduce((s: number, v: number) => s + v, 0);

  const totalIncome = columnTotals.reduce((s: number, v: number) => s + (v > 0 ? v : 0), 0);
  const totalExpense = columnTotals.reduce((s: number, v: number) => s + (v < 0 ? Math.abs(v) : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Simulação de Longo Prazo</h2>
          <p className="text-sm text-zinc-500">
            Projeção de lançamentos recorrentes por mês — formato planilha.
          </p>
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

      <div className="overflow-x-auto">
        <table className="ui-table min-w-full">
          <thead>
            <tr>
              <th className="text-left p-3 text-zinc-400 text-xs font-semibold">Lançamento</th>
              {months.map((m) => (
                <th key={m.label} className="text-right p-3 text-zinc-400 text-xs font-semibold">
                  {m.label}
                </th>
              ))}
              <th className="text-right p-3 text-zinc-400 text-xs font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {launchMonths.map((lm) => (
              <tr key={lm.id} className="hover:bg-zinc-800/30">
                <td className="p-3 font-mono text-zinc-200">{lm.name}</td>
                {lm.values.map((v, colIndex) => (
                  <td
                    key={colIndex}
                    className={`text-right p-3 font-mono tabular-nums ${v !== null ? (v >= 0 ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]') : 'text-zinc-600'}`}
                  >
                    {v === null ? '—' : (v >= 0 ? '+' : '') + formatCurrency(Math.abs(v || 0))}
                  </td>
                ))}
                <td className="text-right p-3 font-mono font-bold text-[var(--text-1)] tabular-nums">
                  {lm.rowTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(lm.rowTotal))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-zinc-900/50 border-t border-zinc-800">
            <tr>
              <td className="p-3 text-zinc-400 text-xs font-semibold">Total</td>
              {columnTotals.map((ct, colIndex) => (
                <td
                  key={colIndex}
                  className="text-right p-3 font-mono font-bold tabular-nums"
                >
                  {ct >= 0 ? '+' : ''}{formatCurrency(Math.abs(ct))}
                </td>
              ))}
              <td className="text-right p-3 font-mono font-bold text-[var(--text-1)] tabular-nums">
                {grandTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(grandTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ui-card p-4">
          <span className="ui-stat-label">Receitas projetadas</span>
          <div className="ui-stat-value !text-[var(--accent-text)]">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Despesas projetadas</span>
          <div className="ui-stat-value !text-[var(--danger-text)]">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Saldo total projetado</span>
          <div className={`ui-stat-value mt-0.5 ${grandTotal >= 0 ? '!text-[var(--accent-text)]' : '!text-[var(--danger-text)]'}`}>
            {grandTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(grandTotal))}
          </div>
        </div>
      </div>

      {launchMonths.length === 0 && (
        <div className="py-12 text-center text-zinc-500">
          Nenhum lançamento recorrente encontrado no período selecionado.
          <p className="text-[11px] mt-2">Crie lançamentos com recorrência mensal em "Novo lançamento" para aparecer aqui.</p>
        </div>
      )}
    </div>
  );
};
