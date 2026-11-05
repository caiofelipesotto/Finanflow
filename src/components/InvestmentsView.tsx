import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency, getMonthName, formatMonthShort } from '../utils/formatters';
import { summarizeTransactions, isAporte, isResgate, APORTE_CATEGORY_ID } from '../utils/aportes';
import { buildMonthSeries, cumulativeSavedThrough } from '../utils/monthlySeries';
import { SavingsChart } from './SavingsChart';

interface InvestmentsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  selectedYear: number;
  selectedMonth: number; // 0-11
  onSelectMonth: (year: number, month: number) => void;
  onOpenNewAporte: () => void;
  onOpenNewResgate: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  transactions,
  categories,
  accounts,
  selectedYear,
  selectedMonth,
  onSelectMonth,
  onOpenNewAporte,
  onOpenNewResgate,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [horizon, setHorizon] = useState<12 | 24 | 36 | 60>(12);
  const [visibleCount, setVisibleCount] = useState(40);

  const categoriesMap = useMemo(
    () => categories.reduce<Record<string, Category>>((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [categories]
  );
  const accountsMap = useMemo(
    () => accounts.reduce<Record<string, Account>>((acc, a) => { acc[a.id] = a; return acc; }, {}),
    [accounts]
  );

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthTotals = useMemo(
    () => summarizeTransactions(transactions.filter((tx) => tx.date.startsWith(monthKey))),
    [transactions, monthKey]
  );

  const initialSaved = useMemo(
    () => accounts.filter((a) => a.type === 'investment').reduce((sum, a) => sum + a.initialBalance, 0),
    [accounts]
  );

  const totalSaved = useMemo(
    () => initialSaved + cumulativeSavedThrough(transactions, selectedYear, selectedMonth),
    [initialSaved, transactions, selectedYear, selectedMonth]
  );

  const yearTotals = useMemo(() => {
    const yearPrefix = String(selectedYear);
    const through = monthKey;
    return summarizeTransactions(
      transactions.filter((tx) => tx.date.startsWith(yearPrefix) && tx.date.slice(0, 7) <= through)
    );
  }, [transactions, selectedYear, monthKey]);

  const average = useMemo(() => {
    const points = buildMonthSeries(transactions, selectedYear, selectedMonth - 11, 12);
    return points.length > 0 ? points.reduce((sum, p) => sum + p.saved, 0) / 12 : 0;
  }, [transactions, selectedYear, selectedMonth]);

  const chartPoints = useMemo(
    () => buildMonthSeries(transactions, selectedYear, selectedMonth - (horizon - 1), horizon),
    [transactions, selectedYear, selectedMonth, horizon]
  );

  const movements = useMemo(
    () =>
      transactions
        .filter((tx) => isAporte(tx) || isResgate(tx))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions]
  );

  const visibleMovements = movements.slice(0, visibleCount);

  // Agrupa movimentos por mês para exibição
  const groupedMovements = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const tx of visibleMovements) {
      const m = tx.date.slice(0, 7);
      if (!groups[m]) groups[m] = [];
      groups[m].push(tx);
    }
    return groups;
  }, [visibleMovements]);

  const monthLabels = Object.keys(groupedMovements).sort((a, b) => b.localeCompare(a));

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      onSelectMonth(selectedYear - 1, 11);
    } else {
      onSelectMonth(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      onSelectMonth(selectedYear + 1, 0);
    } else {
      onSelectMonth(selectedYear, selectedMonth + 1);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 40);
  };

  return (
    <section className="ui-card p-4 sm:p-5 space-y-4">
      {/* Header: mês/ano + ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="ui-segmented">
            <button
              onClick={handlePrevMonth}
              title="Mês anterior"
              aria-label="Mês anterior"
              className="ui-seg-item !px-1.5 hover:text-[var(--text-1)]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-sm font-bold text-[var(--text-1)] select-none min-w-[64px] text-center tabular-nums">
              {getMonthName(selectedMonth)} de {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              title="Próximo mês"
              aria-label="Próximo mês"
              className="ui-seg-item !px-1.5 hover:text-[var(--text-1)]"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onOpenNewAporte} className="ui-btn ui-btn-primary flex items-center gap-1.5">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Novo aporte
          </button>
          <button onClick={onOpenNewResgate} className="ui-btn ui-btn-secondary flex items-center gap-1.5">
            <Minus className="w-4 h-4" aria-hidden="true" />
            Novo resgate
          </button>
        </div>
      </div>

      {/* 4 Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total guardado */}
        <div className="ui-tile p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-stat-label">Total guardado</span>
            <span className="ui-icon ui-icon-accent"><PiggyBank className="w-4 h-4" aria-hidden="true" /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--accent-text)] tabular-nums mt-2 break-words">
            {formatCurrency(totalSaved)}
          </div>
          <span className="ui-stat-note">Inclui saldo inicial de contas de investimento</span>
        </div>

        {/* Aportes no mês */}
        <div className="ui-tile p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-stat-label">Aportes no mês</span>
            <span className="ui-icon ui-icon-accent"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--accent-text)] tabular-nums mt-2 break-words">
            {formatCurrency(monthTotals.aportes)}
          </div>
          <span className="ui-stat-note flex items-center gap-1">
            {monthTotals.resgates > 0 && (
              <>
                <span className="text-[var(--danger-text)]">− {formatCurrency(monthTotals.resgates)} em resgates</span>
              </>
            )}
            {monthTotals.resgates === 0 && <span>Bruto, sem descontar resgates</span>}
          </span>
        </div>

        {/* Aportes no ano */}
        <div className="ui-tile p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-stat-label">Aportes no ano</span>
            <span className="ui-icon ui-icon-accent"><ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--accent-text)] tabular-nums mt-2 break-words">
            {formatCurrency(yearTotals.aportes)}
          </div>
          <span className="ui-stat-note flex items-center gap-1">
            {yearTotals.resgates > 0 && (
              <>
                <span className="text-[var(--danger-text)]">− {formatCurrency(yearTotals.resgates)} em resgates</span>
              </>
            )}
            {yearTotals.resgates === 0 && <span>Bruto, sem descontar resgates</span>}
          </span>
        </div>

        {/* Média mensal */}
        <div className="ui-tile p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-stat-label">Média mensal</span>
            <span className="ui-icon ui-icon-accent"><TrendingUp className="w-4 h-4" aria-hidden="true" /></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--accent-text)] tabular-nums mt-2 break-words">
            {formatCurrency(average)}
          </div>
          <span className="ui-stat-note">Líquida (aportes − resgates) dos últimos 12 meses</span>
        </div>
      </div>

      {/* Gráfico de guardado acumulado */}
      <div className="ui-tile p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-semibold text-[var(--text-1)]">Guardado acumulado ({horizon} meses)</span>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value) as 12 | 24 | 36 | 60)}
            aria-label="Horizonte do gráfico"
            className="ui-input w-full sm:w-auto px-2 py-1 text-xs"
          >
            <option value={12}>12 meses</option>
            <option value={24}>24 meses</option>
            <option value={36}>36 meses</option>
            <option value={60}>60 meses</option>
          </select>
        </div>
        <SavingsChart points={chartPoints} />
      </div>

      {/* Lista de movimentos */}
      {movements.length === 0 ? (
        <div className="ui-tile py-12 text-center">
          <PiggyBank className="w-12 h-12 text-[var(--text-4)] mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--text-1)]">Nenhum aporte ou resgate registrado</p>
          <p className="text-xs text-[var(--text-3)] mt-1 max-w-sm mx-auto">
            Comece a guardar hoje mesmo. O primeiro aporte abre o caminho para o seu patrimônio.
          </p>
          <button onClick={onOpenNewAporte} className="ui-btn ui-btn-primary mt-4">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Registrar primeiro aporte
          </button>
        </div>
      ) : (
        <>
          {monthLabels.map((monthKeyGroup) => {
            const monthTxs = groupedMovements[monthKeyGroup];
            const [year, month] = monthKeyGroup.split('-').map(Number);
            return (
              <div key={monthKeyGroup} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide">
                    {getMonthName(month)} de {year}
                  </span>
                  <span className="text-xs text-[var(--text-3)] tabular-nums">
                    {monthTxs.length} movimento{monthTxs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {monthTxs.map((tx) => {
                  const isAporteTx = isAporte(tx);
                  const cat = categoriesMap[tx.category];
                  const acc = accountsMap[tx.account];
                  return (
                    <div
                      key={tx.id}
                      className="ui-tile p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isAporteTx ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
                          {isAporteTx ? <ArrowUpRight className="w-4 h-4" aria-hidden="true" /> : <ArrowDownRight className="w-4 h-4" aria-hidden="true" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--text-1)] truncate">
                            {tx.description}
                          </p>
                          <p className="text-[11px] text-[var(--text-3)] flex flex-wrap gap-2">
                            <span>{cat?.name || tx.category}</span>
                            <span>·</span>
                            <span>{acc?.name || tx.account}</span>
                            <span>·</span>
                            <span className="font-mono tabular-nums">{tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-bold tabular-nums ${isAporteTx ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]'}`}>
                          {isAporteTx ? '+' : '−'}{formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => onEditTransaction(tx)}
                          aria-label="Editar"
                          className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          aria-label="Excluir"
                          className="p-1.5 rounded hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)] text-[var(--text-4)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {visibleCount < movements.length && (
            <button onClick={handleLoadMore} className="ui-btn ui-btn-secondary w-full mt-3">
              Carregar mais ({movements.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}
    </section>
  );
};