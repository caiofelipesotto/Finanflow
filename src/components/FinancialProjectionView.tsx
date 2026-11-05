import React, { useMemo, useState } from 'react';
import { Transaction, Category, Account, RecurringTransactionDraft, RecurrenceRule } from '../types/finance';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { isAporte } from '../utils/aportes';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, AlertCircle, CreditCard } from 'lucide-react';

interface FinancialProjectionViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  recurringTransactions?: RecurringTransactionDraft[];
  recurrenceRules?: RecurrenceRule[];
}

export const FinancialProjectionView: React.FC<FinancialProjectionViewProps> = ({
  transactions,
  categories,
  accounts,
  recurringTransactions = [],
  recurrenceRules = [],
}) => {
  const [centerYear, setCenterYear] = useState(() => new Date().getFullYear());
  const [centerMonth, setCenterMonth] = useState(() => new Date().getMonth());
  const [viewMonths, setViewMonths] = useState(12);

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

  const parseLocalDate = (value: string): Date => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Gerar meses para exibição
  const months = useMemo(() => {
    const result: Array<{ year: number; month: number; label: string; key: string }> = [];
    let year = centerYear;
    let month = centerMonth;

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

  // Projetar regras de recorrência para os meses selecionados
  const projectionRows = useMemo(() => {
    if (recurrenceRules.length === 0) return [];

    return recurrenceRules.map((rule) => {
      const startDate = parseLocalDate(rule.start_date);
      const endDate = rule.end_date ? parseLocalDate(rule.end_date) : null;
      const interval = rule.interval_months || 1;
      const dayOfMonth = rule.day_of_month;

      const isIncome = rule.type === 'income';
      const amount = rule.amount;
      const category = categoriesMap[rule.category_id || ''];
      const account = accountsMap[rule.account_id || ''];

      const values = months.map((m) => {
        // Verifica se o mês está dentro do período da regra
        if (m.year < startDate.getFullYear() ||
            (m.year === startDate.getFullYear() && m.month < startDate.getMonth() + 1)) {
          return null;
        }
        if (endDate) {
          const endY = endDate.getFullYear();
          const endM = endDate.getMonth() + 1;
          if (m.year > endY || (m.year === endY && m.month > endM)) {
            return null;
          }
        }

        // Verifica intervalo de recorrência
        const monthsDiff = (m.year - startDate.getFullYear()) * 12 + (m.month - (startDate.getMonth() + 1));
        if (monthsDiff % interval !== 0) {
          return null;
        }

        const daysInMonth = new Date(m.year, m.month, 0).getDate();
        const projectedDay = Math.min(dayOfMonth, daysInMonth);

        // Verifica se há exceção para este mês
        const exceptionTx = transactions.find((t) =>
          t.recurrenceGroupId === rule.id && t.date.startsWith(`${m.year}-${String(m.month).padStart(2, '0')}`)
        );
        const finalAmount = exceptionTx ? exceptionTx.amount : amount;

        return isIncome ? finalAmount : -finalAmount;
      });

      const total = values.reduce((s: number, v: number | null) => s + (v || 0), 0);

      return {
        id: rule.id,
        name: rule.description || 'Lançamento',
        type: rule.type as 'income' | 'expense',
        amount,
        category,
        account,
        startDate,
        endDate,
        dayOfMonth,
        isInstallment: false,
        installment: undefined,
        isAporteRow: isAporte({ type: rule.type, category: rule.category_id || '', paymentMethod: rule.payment_method || '' } as Transaction),
        values,
        total,
      };
    });
  }, [recurrenceRules, months, categoriesMap, accountsMap, transactions]);

  // Também incluir transações parceladas (installment) das transações reais
  const installmentRows = useMemo(() => {
    const installmentTxs = transactions.filter(
      (t) => t.recurrence === 'installment' || t.installment
    );

    const grouped = new Map<
      string,
      { txs: Transaction[]; earliestDate: Date; latestDate: Date; categoryId: string; accountId: string }
    >();

    for (const tx of installmentTxs) {
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

      const values = months.map((m) => {
        const startY = data.earliestDate.getFullYear();
        const startM = data.earliestDate.getMonth() + 1;
        const endY = data.latestDate.getFullYear();
        const endM = data.latestDate.getMonth() + 1;

        if (m.year < startY || (m.year === startY && m.month < startM)) return null;
        if (m.year > endY || (m.year === endY && m.month > endM)) return null;

        const daysInMonth = new Date(m.year, m.month, 0).getDate();
        const projectedDay = Math.min(data.earliestDate.getDate(), daysInMonth);

        const startDate = new Date(startY, startM - 1, data.earliestDate.getDate());
        const targetDate = new Date(m.year, m.month - 1, projectedDay);
        const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());

        if (firstTx.installment) {
          const currentInstallment = (firstTx.installment.current || 1) + monthsDiff;
          if (currentInstallment > (firstTx.installment.total || 1)) return null;
        }

        return isIncome ? amount : -amount;
      });

      const total = values.reduce((s: number, v: number | null) => s + (v || 0), 0);

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
        isInstallment: true,
        installment: firstTx.installment,
        isAporteRow: isAporte(firstTx),
        values,
        total,
      };
    });
  }, [transactions, months, categoriesMap, accountsMap]);

  // Combinar linhas de recorrência + parceladas
  const allRows = [...projectionRows, ...installmentRows];

  // Totais por coluna (mês)
  const columnTotals = useMemo(() => {
    return months.map((_, colIndex) => {
      return allRows.reduce((s: number, row) => s + (row.values[colIndex] || 0), 0);
    });
  }, [allRows, months]);

  const totalIncome = allRows.reduce((sum, row) => {
    if (row.type !== 'income' || row.isAporteRow) return sum;
    return sum + row.values.reduce((s: number, v: number | null) => s + (v && v > 0 ? v : 0), 0);
  }, 0);

  const totalExpense = allRows.reduce((sum, row) => {
    if (row.type !== 'expense' || row.isAporteRow) return sum;
    return sum + row.values.reduce((s: number, v: number | null) => s + (v && v < 0 ? Math.abs(v) : 0), 0);
  }, 0);

  const totalSaved = allRows.reduce((sum, row) => {
    if (!row.isAporteRow) return sum;
    return sum + row.values.reduce((s: number, v: number | null) => s + (v ? Math.abs(v) : 0), 0);
  }, 0);

  const grandTotal = totalIncome - totalExpense - totalSaved;

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

  if (allRows.length === 0) {
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
            <option value={36}>36 meses</option>
            <option value={60}>60 meses</option>
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
            {allRows.map((row) => (
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
                        {row.isInstallment && row.installment && (
                          <span className="ui-badge !text-[9px] !px-1.5 !py-0.5 ui-badge-accent">
                            {row.installment.current}/{row.installment.total}
                          </span>
                        )}
                        {row.isAporteRow ? (
                          <span className="ui-badge !text-[9px] !px-1.5 !py-0.5"
                            style={{
                              backgroundColor: 'var(--accent-soft)',
                              color: 'var(--accent-text)',
                            }}
                          >
                            Aporte
                          </span>
                        ) : (
                          <span className="ui-badge !text-[9px] !px-1.5 !py-0.5"
                            style={{
                              backgroundColor: row.type === 'income' ? 'var(--success-soft)' : 'var(--danger-soft)',
                              color: row.type === 'income' ? 'var(--success-text)' : 'var(--danger-text)',
                            }}
                          >
                            {row.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <span className="ui-stat-label">Guardado no período</span>
          <div className="ui-stat-value !text-[var(--accent-text)]">{formatCurrency(totalSaved)}</div>
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

      {/* Insight rápido */}
      {totalIncome > 0 && totalIncome - totalExpense < 0 && (
        <div className="ui-alert !border-[color-mix(in_srgb,var(--danger-text)_32%,transparent)] !bg-[var(--danger-soft)]">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--danger-text)] shrink-0" />
            <div className="text-[var(--danger-text)]">
              <strong className="block font-semibold">Atenção: Déficit projetado</strong>
              <span className="text-[var(--text-2)] text-[11px] mt-1">
                No período de {viewMonths} meses, as despesas recorrentes superam as receitas em
                {formatCurrency(Math.abs(totalIncome - totalExpense))}. Revise fixos ou aumente receitas.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};