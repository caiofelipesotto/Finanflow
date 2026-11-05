import React, { useMemo, useState } from 'react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, AlertCircle, CreditCard } from 'lucide-react';

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
  const [centerYear, setCenterYear] = useState(() => new Date().getFullYear());
  const [centerMonth, setCenterMonth] = useState(() => new Date().getMonth());
  const [viewMonths, setViewMonths] = useState(12); // 6, 12, 24 meses

  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [categories]);

  const accountsMap = useMemo(() => {
    return accounts.reduce<Record<string, Account>>((acc, a) => {
      acc[a.id] = a;
      return acc;
    }, {});
  }, [accounts]);

  // Converte "YYYY-MM-DD" em data local (new Date("YYYY-MM-DD") usa UTC e
  // desloca o dia/mês em fusos negativos, como o do Brasil).
  const parseLocalDate = (value: string): Date => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Agrupar lançamentos recorrentes por descrição + categoria
  const recurringGroups = useMemo(() => {
    const recurring = transactions.filter(
      (t) =>
        t.recurrence === 'monthly' ||
        t.recurrence === 'installment' ||
        Boolean(t.recurrenceGroupId)
    );

    const grouped = new Map<
      string,
      { txs: Transaction[]; earliestDate: Date; latestDate: Date; categoryId: string; accountId: string }
    >();

    for (const tx of recurring) {
      const key = `${tx.category || 'sem-cat'}|${tx.description || 'Lançamento'}|${tx.account || 'sem-conta'}`;
      const txDate = parseLocalDate(tx.date);
      if (!isNaN(txDate.getTime())) {
        if (grouped.has(key)) {
          const existing = grouped.get(key)!;
          existing.txs.push(tx);
          if (txDate < existing.earliestDate) existing.earliestDate = txDate;
          if (txDate > existing.latestDate) existing.latestDate = txDate;
        } else {
          grouped.set(key, {
            txs: [tx],
            earliestDate: txDate,
            latestDate: txDate,
            categoryId: tx.category || '',
            accountId: tx.account || '',
          });
        }
      }
    }

    return Array.from(grouped.entries()).map(([key, data]) => {
      const firstTx = data.txs[0];
      const isIncome = firstTx.type === 'income';
      const amount = firstTx.amount;
      const category = categoriesMap[data.categoryId];
      const account = accountsMap[data.accountId];

      return {
        id: key,
        name: firstTx.description || 'Lançamento',
        type: firstTx.type as 'income' | 'expense',
        amount,
        category,
        account,
        startDate: data.earliestDate,
        endDate: data.latestDate,
        dayOfMonth: data.earliestDate.getDate(),
        isInstallment: firstTx.recurrence === 'installment' || firstTx.installment,
        installmentInfo: firstTx.installment,
      };
    });
  }, [transactions, categoriesMap, accountsMap]);

  // Gerar meses para exibição: começa no mês central e vai para frente.
  const months = useMemo(() => {
    const result: Array<{ year: number; month: number; label: string; key: string }> = [];
    let year = centerYear;
    let month = centerMonth; // 0-11

    for (let i = 0; i < viewMonths; i++) {
      const monthNum = month + 1;
      result.push({
        year,
        month: monthNum,
        label: `${String(monthNum).padStart(2, '0')}/${year}`,
        key: `${year}-${String(monthNum).padStart(2, '0')}`,
      });
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    return result;
  }, [centerYear, centerMonth, viewMonths]);

  // Para cada lançamento recorrente, calcular valor em cada mês
  const projectionRows = useMemo(() => {
    return recurringGroups.map((item) => {
      const startY = item.startDate.getFullYear();
      const startM = item.startDate.getMonth() + 1;
      const endY = item.endDate.getFullYear();
      const endM = item.endDate.getMonth() + 1;
      const day = item.dayOfMonth;

      const values = months.map((m) => {
        // Só aparece entre o mês de início e o mês da última ocorrência real.
        if (m.year < startY || (m.year === startY && m.month < startM)) return null;
        if (m.year > endY || (m.year === endY && m.month > endM)) return null;

        const daysInMonth = new Date(m.year, m.month, 0).getDate();
        const projectedDay = Math.min(day, daysInMonth);

        // Para installments, só aparece enquanto tiver parcelas
        if (item.isInstallment && item.installmentInfo) {
          const startDate = new Date(startY, startM - 1, day);
          const targetDate = new Date(m.year, m.month - 1, projectedDay);
          const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());

          const currentInstallment = (item.installmentInfo.current || 1) + monthsDiff;
          if (currentInstallment > (item.installmentInfo.total || 1)) return null;
        }

        return item.type === 'income' ? item.amount : -item.amount;
      });

      const total = values.reduce((s: number, v: number | null) => s + (v || 0), 0);

      return {
        ...item,
        values,
        total,
      };
    });
  }, [recurringGroups, months]);

  // Totais por coluna (mês)
  const columnTotals = useMemo(() => {
    return months.map((_, colIndex) => {
      return projectionRows.reduce((s: number, row) => s + (row.values[colIndex] || 0), 0);
    });
  }, [projectionRows, months]);

  const grandTotal = columnTotals.reduce((s: number, v: number) => s + v, 0);
  const totalIncome = columnTotals.reduce((s: number, v: number) => s + (v > 0 ? v : 0), 0);
  const totalExpense = columnTotals.reduce((s: number, v: number) => s + (v < 0 ? Math.abs(v) : 0), 0);

  // Navegação
  const goPrev = () => {
    if (centerMonth === 0) {
      setCenterYear(centerYear - 1);
      setCenterMonth(11);
    } else {
      setCenterMonth(centerMonth - 1);
    }
  };

  const goNext = () => {
    if (centerMonth === 11) {
      setCenterYear(centerYear + 1);
      setCenterMonth(0);
    } else {
      setCenterMonth(centerMonth + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setCenterYear(now.getFullYear());
    setCenterMonth(now.getMonth());
  };

  const currentMonthLabel = `${getMonthName(centerMonth)} de ${centerYear}`;

  if (recurringGroups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Simulação de Longo Prazo</h2>
            <p className="text-sm text-[var(--text-3)]">
              Projeção de lançamentos recorrentes (mensais, parcelados, fixos).
            </p>
          </div>
        </div>

        <div className="ui-alert flex-col !border-[color-mix(in_srgb,var(--accent-text)_32%,transparent)] !bg-[var(--accent-soft)]">
          <div className="flex items-start gap-2">
            <Calendar className="w-5 h-5 text-[var(--accent-text)] shrink-0" />
            <div className="text-[var(--accent-text)]">
              <strong className="block font-semibold">Nenhum lançamento recorrente encontrado</strong>
              <span className="text-[var(--text-2)] text-[11px] mt-1">
                Crie lançamentos com recorrência mensal ou parcelados em "Novo lançamento" para aparecer aqui.
                A simulação projeta automaticamente parcelas futuras e fixos mensais.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Simulação de Longo Prazo</h2>
          <p className="text-sm text-[var(--text-3)]">
            Timeline de recorrências — veja para onde vai a grana nos próximos meses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={viewMonths}
            onChange={(e) => setViewMonths(Number(e.target.value))}
            className="ui-input !w-auto !py-1.5 text-sm"
            aria-label="Meses de projeção"
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
          </select>

          <button onClick={goPrev} className="ui-btn ui-btn-ghost" aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="px-3 font-mono text-sm text-[var(--text-1)] tabular-nums">{currentMonthLabel}</span>
          <button onClick={goNext} className="ui-btn ui-btn-ghost" aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button onClick={goToday} className="ui-btn ui-btn-secondary text-xs">
            Hoje
          </button>
        </div>
      </div>

      {/* Timeline Table */}
      <div className="overflow-x-auto">
        <table className="ui-table min-w-full" role="grid">
          <thead>
            <tr>
              <th className="text-left p-3 text-[var(--text-4)] text-xs font-semibold w-48">Lançamento</th>
              {months.map((m) => (
                <th key={m.key} className="text-right p-3 text-[var(--text-4)] text-xs font-semibold w-24">
                  {m.label}
                </th>
              ))}
              <th className="text-right p-3 text-[var(--text-4)] text-xs font-semibold w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-1)]">
            {projectionRows.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--surface-2)] transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {row.category && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.category.color }}
                        title={row.category.name}
                      />
                    )}
                    {row.account && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-[var(--border-2)]"
                        style={{ backgroundColor: row.account.color }}
                        title={row.account.name}
                      />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-[var(--text-1)] truncate block">
                        {row.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {row.isInstallment && row.installmentInfo && (
                          <span className="ui-badge !text-[9px] !px-1.5 !py-0.5 ui-badge-accent">
                            {row.installmentInfo.current}/{row.installmentInfo.total}
                          </span>
                        )}
                        <span className="ui-badge !text-[9px] !px-1.5 !py-0.5"
                          style={{
                            backgroundColor: row.type === 'income' ? 'var(--success-soft)' : 'var(--danger-soft)',
                            color: row.type === 'income' ? 'var(--success-text)' : 'var(--danger-text)',
                          }}
                        >
                          {row.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                {row.values.map((v, colIndex) => (
                  <td key={colIndex} className="text-right p-3 font-mono tabular-nums text-sm">
                    {v === null ? (
                      <span className="text-[var(--text-4)]">—</span>
                    ) : (
                      <span
                        className={
                          v > 0
                            ? 'text-[var(--accent-text)]'
                            : v < 0
                            ? 'text-[var(--danger-text)]'
                            : 'text-[var(--text-4)]'
                        }
                      >
                        {v > 0 ? '+' : ''}{formatCurrency(Math.abs(v))}
                      </span>
                    )}
                  </td>
                ))}
                <td className="text-right p-3 font-mono font-bold text-[var(--text-1)] tabular-nums text-sm">
                  {row.total >= 0 ? '+' : ''}{formatCurrency(Math.abs(row.total))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[var(--surface-2)] border-t border-[var(--border-1)]">
            <tr>
              <td className="p-3 text-[var(--text-4)] text-xs font-semibold">Total do mês</td>
              {columnTotals.map((ct, colIndex) => (
                <td key={colIndex} className="text-right p-3 font-mono font-bold tabular-nums text-sm">
                  {ct >= 0 ? '+' : ''}{formatCurrency(Math.abs(ct))}
                </td>
              ))}
              <td className="text-right p-3 font-mono font-bold text-[var(--text-1)] tabular-nums text-sm">
                {grandTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(grandTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Resumo cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ui-card p-4">
          <span className="ui-stat-label">Receitas projetadas</span>
          <div className="ui-stat-value !text-[var(--accent-text)]">{formatCurrency(totalIncome)}</div>
          <span className="ui-stat-note">
            {totalIncome > 0
              ? `${viewMonths} meses`
              : 'Nenhuma receita recorrente cadastrada'}
          </span>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Despesas projetadas</span>
          <div className="ui-stat-value !text-[var(--danger-text)]">{formatCurrency(totalExpense)}</div>
          <span className="ui-stat-note">{viewMonths} meses</span>
        </div>
        <div className="ui-card p-4">
          <span className="ui-stat-label">Saldo total projetado</span>
          <div className={`ui-stat-value mt-0.5 ${grandTotal >= 0 ? '!text-[var(--accent-text)]' : '!text-[var(--danger-text)]'}`}>
            {grandTotal >= 0 ? '+' : ''}{formatCurrency(Math.abs(grandTotal))}
          </div>
          <span className="ui-stat-note">
            {totalIncome === 0
              ? 'Só despesas recorrentes'
              : grandTotal >= 0
              ? 'Superávit no período'
              : 'Déficit no período'}
          </span>
        </div>
      </div>

      {/* Insight rápido — só faz sentido comparar quando há receita recorrente */}
      {grandTotal < 0 && totalIncome > 0 && (
        <div className="ui-alert !border-[color-mix(in_srgb,var(--danger-text)_32%,transparent)] !bg-[var(--danger-soft)]">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--danger-text)] shrink-0" />
            <div className="text-[var(--danger-text)]">
              <strong className="block font-semibold">Atenção: Déficit projetado</strong>
              <span className="text-[var(--text-2)] text-[11px] mt-1">
                No período de {viewMonths} meses, as despesas recorrentes superam as receitas em
                {formatCurrency(Math.abs(grandTotal))}. Revise fixos ou aumente receitas.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};