import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/finance';
import { formatCurrency, getShortMonthName, formatMonthShort } from '../utils/formatters';
import { TrendingUp, BarChart3, CreditCard, Calendar } from 'lucide-react';

interface MonthData {
  year: number;
  month: number; // 0-11
  key: string; // e.g. "2026-10"
  label: string; // e.g. "Out/26"
  fullLabel: string; // e.g. "Outubro de 2026"
  income: number;
  expense: number;
  balance: number;
  cardTotal: number;
}

interface ProjectionChartProps {
  transactions: Transaction[];
  selectedYear: number;
  selectedMonth: number;
  onSelectMonth: (year: number, month: number) => void;
}

export const ProjectionChart: React.FC<ProjectionChartProps> = ({
  transactions,
  selectedYear,
  selectedMonth,
  onSelectMonth,
}) => {
  const [chartMode, setChartMode] = useState<'cashflow' | 'card'>('cashflow');
  const [hoveredMonth, setHoveredMonth] = useState<MonthData | null>(null);

  // Generate 12 months horizon (from current date or selected view)
  const monthsData = useMemo<MonthData[]>(() => {
    const list: MonthData[] = [];
    const baseDate = new Date();
    const startYear = baseDate.getFullYear();
    const startMonth = baseDate.getMonth();

    for (let i = 0; i < 12; i++) {
      const d = new Date(startYear, startMonth + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
      const label = formatMonthShort(y, m);
      const fullLabel = `${getShortMonthName(m)}/${y}`;

      let income = 0;
      let expense = 0;
      let cardTotal = 0;

      transactions.forEach((tx) => {
        if (tx.date.startsWith(monthPrefix)) {
          if (tx.type === 'income') {
            income += tx.amount;
          } else {
            expense += tx.amount;
            if (tx.paymentMethod === 'credit' || tx.recurrence === 'installment') {
              cardTotal += tx.amount;
            }
          }
        }
      });

      list.push({
        year: y,
        month: m,
        key: monthPrefix,
        label,
        fullLabel,
        income,
        expense,
        balance: income - expense,
        cardTotal,
      });
    }

    return list;
  }, [transactions]);

  const hasAnyData = transactions.length > 0;

  // Max value for scaling
  const maxVal = useMemo(() => {
    let max = 1000;
    monthsData.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
      if (d.cardTotal > max) max = d.cardTotal;
    });
    return max * 1.15;
  }, [monthsData]);

  const chartHeight = 160;
  const colWidth = 48;
  const paddingBottom = 26;
  const paddingTop = 16;
  const availableHeight = chartHeight - paddingBottom - paddingTop;

  return (
    <div className="bg-[#141416] border border-zinc-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              Projeção Mensal dos Próximos 12 Meses
            </h3>
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-950/80 border border-zinc-800/60 px-2 py-0.5 rounded-md">
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Inclui compras parceladas e contas fixas projetadas no calendário
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#1d1d20] rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setChartMode('cashflow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              chartMode === 'cashflow'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Entradas vs Saídas</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('card')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              chartMode === 'card'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Faturas do Cartão</span>
          </button>
        </div>
      </div>

      {/* Floating Hover Card */}
      {hoveredMonth && (
        <div className="mb-3 p-3 bg-[#1d1d20] border border-neutral-700 rounded-xl text-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span className="font-bold text-white text-sm">{hoveredMonth.fullLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
            {chartMode === 'cashflow' ? (
              <>
                <div>
                  <span className="text-orange-400 text-[11px] block">Entradas:</span>
                  <strong className="text-orange-400 font-bold">
                    {formatCurrency(hoveredMonth.income)}
                  </strong>
                </div>
                <div className="border-l border-neutral-700 pl-3">
                  <span className="text-zinc-400 text-[11px] block">Saídas Totais:</span>
                  <strong className="text-rose-400 font-bold">
                    {formatCurrency(hoveredMonth.expense)}
                  </strong>
                </div>
                <div className="border-l border-neutral-700 pl-3">
                  <span className="text-orange-400 text-[11px] block">Sobrou:</span>
                  <strong
                    className={hoveredMonth.balance >= 0 ? 'text-orange-300 font-bold' : 'text-rose-300 font-bold'}
                  >
                    {formatCurrency(hoveredMonth.balance)}
                  </strong>
                </div>
              </>
            ) : (
              <div>
                <span className="text-zinc-400 text-[11px] block">Fatura Cartão & Parcelas:</span>
                <strong className="text-zinc-300 font-bold">
                  {formatCurrency(hoveredMonth.cardTotal)}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Chart Container */}
      {!hasAnyData ? (
        <div className="py-12 px-4 text-center border border-dashed border-zinc-800 rounded-xl bg-[#101012]/60">
          <Calendar className="w-8 h-8 text-zinc-500 mx-auto mb-2 opacity-50" />
          <h4 className="text-xs font-bold text-zinc-200">Nenhum lançamento no período</h4>
          <p className="text-[11px] text-zinc-400 max-w-md mx-auto mt-1">
            Cadastre seus ganhos, contas ou compras parceladas no cartão. O gráfico calculará a projeção do seu saldo mês a mês.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="min-w-[620px]">
            <svg
              viewBox={`0 0 ${monthsData.length * colWidth + 20} ${chartHeight}`}
              className="w-full h-44 overflow-visible select-none"
            >
              {/* Horizontal Reference Lines */}
              {[0, 0.5, 1].map((pct, idx) => {
                const y = paddingTop + availableHeight * (1 - pct);
                return (
                  <g key={idx}>
                    <line
                      x1="10"
                      y1={y}
                      x2={monthsData.length * colWidth + 10}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="2 3"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Bars per Month */}
              {monthsData.map((m, idx) => {
                const x = 16 + idx * colWidth;
                const isSelected = m.year === selectedYear && m.month === selectedMonth;
                const barWidth = 14;

                // Cashflow mode heights
                const incomeH = maxVal > 0 ? (m.income / maxVal) * availableHeight : 0;
                const expenseH = maxVal > 0 ? (m.expense / maxVal) * availableHeight : 0;
                const cardH = maxVal > 0 ? (m.cardTotal / maxVal) * availableHeight : 0;

                const incomeY = paddingTop + availableHeight - incomeH;
                const expenseY = paddingTop + availableHeight - expenseH;
                const cardY = paddingTop + availableHeight - cardH;

                return (
                  <g
                    key={m.key}
                    className="cursor-pointer group"
                    onClick={() => onSelectMonth(m.year, m.month)}
                    onMouseEnter={() => setHoveredMonth(m)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Active Month Column Background Highlight */}
                    {isSelected && (
                      <rect
                        x={x - 4}
                        y={paddingTop - 6}
                        width={colWidth - 8}
                        height={availableHeight + paddingBottom + 6}
                        fill="#f97316"
                        fillOpacity="0.1"
                        rx="6"
                      />
                    )}

                    {chartMode === 'cashflow' ? (
                      <>
                        {/* Green Bar (Income) */}
                        <rect
                          x={x}
                          y={incomeY}
                          width={barWidth}
                          height={Math.max(incomeH, 2)}
                          fill={isSelected ? '#f97316' : '#ea580c'}
                          rx="3"
                          className="transition-all duration-150 hover:brightness-125"
                        />

                        {/* Red/Rose Bar (Expense) */}
                        <rect
                          x={x + barWidth + 2}
                          y={expenseY}
                          width={barWidth}
                          height={Math.max(expenseH, 2)}
                          fill={isSelected ? '#f43f5e' : '#e11d48'}
                          rx="3"
                          className="transition-all duration-150 hover:brightness-125"
                        />
                      </>
                    ) : (
                      /* Purple Bar (Credit Card & Installments) */
                      <rect
                        x={x + 4}
                        y={cardY}
                        width={barWidth * 1.5}
                        height={Math.max(cardH, 2)}
                        fill={isSelected ? '#fb923c' : '#f97316'}
                        rx="4"
                        className="transition-all duration-150 hover:brightness-125"
                      />
                    )}

                    {/* Month Label */}
                    <text
                      x={x + barWidth}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fill={isSelected ? '#fb923c' : '#64748b'}
                      className="font-mono"
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400">
        <div className="flex items-center gap-4">
          {chartMode === 'cashflow' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-zinc-500" />
                <span>Entradas (Receitas)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                <span>Saídas (Despesas)</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-zinc-500" />
              <span>Fatura do Cartão & Parcelas a Vencer</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-500">
          Clique nas barras para carregar o mês correspondente
        </span>
      </div>
    </div>
  );
};
