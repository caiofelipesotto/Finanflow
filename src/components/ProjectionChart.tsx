import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/finance';
import { formatCurrency, getShortMonthName, formatMonthShort } from '../utils/formatters';
import { buildMonthSeries, MonthPoint } from '../utils/monthlySeries';
import { TrendingUp, BarChart3, CreditCard, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { SavingsChart } from './SavingsChart';

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
  const [horizon, setHorizon] = useState<12 | 24 | 36 | 60>(12);
  const [hoveredMonth, setHoveredMonth] = useState<MonthPoint | null>(null);

  // Build month series with cumulative saved using the shared helper.
  const monthsData = useMemo(
    () => buildMonthSeries(transactions, selectedYear, selectedMonth, horizon),
    [transactions, selectedYear, selectedMonth, horizon]
  );

  // Card totals by month for the "Faturas" mode.
  const cardTotalsByMonth = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      if (tx.paymentMethod !== 'credit' && tx.recurrence !== 'installment') continue;
      const key = tx.date.slice(0, 7);
      totals[key] = (totals[key] || 0) + tx.amount;
    }
    return totals;
  }, [transactions]);

  const hasAnyData = useMemo(
    () => monthsData.some((d) => d.income > 0 || d.expense > 0 || (cardTotalsByMonth[d.key] || 0) > 0),
    [monthsData, cardTotalsByMonth]
  );

  // Max value for scaling (bars)
  const maxVal = useMemo(() => {
    let max = 1000;
    monthsData.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
      const cardTotal = cardTotalsByMonth[d.key] || 0;
      if (cardTotal > max) max = cardTotal;
    });
    return max * 1.15;
  }, [monthsData, cardTotalsByMonth]);

  const chartHeight = 160;
  const colWidth = 48;
  const paddingBottom = 26;
  const paddingTop = 16;
  const availableHeight = chartHeight - paddingBottom - paddingTop;

  return (
    <div className="ui-card p-4 sm:p-5 relative overflow-hidden h-full flex flex-col">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 min-h-[72px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="ui-section-title">Projeção dos próximos {horizon} meses</h3>
            <span className="ui-badge">Tempo real</span>
          </div>
          <p className="ui-sub">
            Inclui compras parceladas e contas fixas projetadas no calendário
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full sm:w-auto shrink-0">
          {/* Seletor de horizonte */}
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

          {/* Alternância de visão */}
          <div className="ui-segmented w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setChartMode('cashflow')}
            className={`ui-seg-item flex-1 sm:flex-none ${chartMode === 'cashflow' ? 'ui-seg-item-active' : ''}`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>Entradas vs saídas</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('card')}
            className={`ui-seg-item flex-1 sm:flex-none ${chartMode === 'card' ? 'ui-seg-item-active' : ''}`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Faturas do cartão</span>
          </button>
        </div>
      </div>
      </div>

      {/* Floating Hover Card */}
      {hoveredMonth && (
        <div className="ui-tile mb-3 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--chart-income)' }}
            />
            <span className="font-bold text-[var(--text-1)] text-xs">{hoveredMonth.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] tabular-nums">
            {chartMode === 'cashflow' ? (
              <>
                <div>
                  <span className="ui-stat-label">Entradas</span>
                  <strong className="font-bold" style={{ color: 'var(--chart-income)' }}>
                    {formatCurrency(hoveredMonth.income)}
                  </strong>
                </div>
                <div className="border-l border-[var(--border-1)] pl-3">
                  <span className="ui-stat-label">Saídas</span>
                  <strong className="font-bold" style={{ color: 'var(--chart-expense)' }}>
                    {formatCurrency(hoveredMonth.expense)}
                  </strong>
                </div>
                <div className="border-l border-[var(--border-1)] pl-3">
                  <span className="ui-stat-label">Sobrou</span>
                  <strong
                    className="font-bold"
                    style={{
                      color:
                        hoveredMonth.balance >= 0
                          ? 'var(--chart-income)'
                          : 'var(--chart-expense)',
                    }}
                  >
                    {formatCurrency(hoveredMonth.balance)}
                  </strong>
                </div>
                <div className="border-l border-[var(--border-1)] pl-3">
                  <span className="ui-stat-label">Guardado</span>
                  <strong className="font-bold" style={{ color: 'var(--accent-text)' }}>
                    {formatCurrency(hoveredMonth.saved)}
                  </strong>
                </div>
                <div className="border-l border-[var(--border-1)] pl-3">
                  <span className="ui-stat-label">Acumulado</span>
                  <strong className="font-bold" style={{ color: 'var(--accent-text)' }}>
                    {formatCurrency(hoveredMonth.cumulativeSaved)}
                  </strong>
                </div>
              </>
            ) : (
              <div>
                <span className="ui-stat-label">Fatura e parcelas</span>
                <strong className="font-bold" style={{ color: 'var(--chart-card)' }}>
                  {formatCurrency(cardTotalsByMonth[hoveredMonth.key] || 0)}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Chart Container */}
      {!hasAnyData ? (
        <div className="py-12 px-4 text-center border border-dashed border-[var(--border-2)] rounded-[var(--r-panel)]">
          <Calendar className="w-8 h-8 text-[var(--text-4)] mx-auto mb-2" aria-hidden="true" />
          <h4 className="text-xs font-bold text-[var(--text-1)]">Nenhum lançamento no período</h4>
          <p className="text-[11px] text-[var(--text-3)] max-w-md mx-auto mt-1">
            Cadastre seus ganhos, contas ou compras parceladas no cartão. O gráfico calculará a projeção do seu saldo mês a mês.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto py-2 flex-1 flex items-center scrollbar-thin">
          <div className="min-w-[620px]">
            <svg
              viewBox={`0 0 ${monthsData.length * colWidth + 20} ${chartHeight}`}
              className="w-full h-52 sm:h-60 overflow-visible select-none"
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
                      stroke="var(--chart-grid-strong)"
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
                const cardTotal = cardTotalsByMonth[m.key] || 0;
                 const cardH = maxVal > 0 ? (cardTotal / maxVal) * availableHeight : 0;

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
                        fill="var(--chart-highlight)"
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
                          fill="var(--chart-income)" fillOpacity={isSelected ? 1 : 0.7}
                          rx="3"
                          className="transition-all duration-150 hover:brightness-125"
                        />

                        {/* Red/Rose Bar (Expense) */}
                        <rect
                          x={x + barWidth + 2}
                          y={expenseY}
                          width={barWidth}
                          height={Math.max(expenseH, 2)}
                          fill="var(--chart-expense)" fillOpacity={isSelected ? 1 : 0.7}
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
                        fill="var(--chart-card)" fillOpacity={isSelected ? 1 : 0.75}
                        rx="4"
                        className="transition-all duration-150 hover:brightness-125"
                      />
                    )}

                    {/* Month Label */}
                    <text
                      x={x + barWidth}
                      y={chartHeight - paddingBottom + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      fill={isSelected ? 'var(--chart-income)' : 'var(--chart-axis)'}
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

      {/* Painel de guardado acumulado */}
      <div className="mt-6 pt-4 border-t border-[var(--border-1)]">
        <div className="flex items-center justify-between mb-2">
          <span className="ui-stat-label">Guardado acumulado</span>
          <span className="text-xs font-bold text-[var(--accent-text)] tabular-nums">
            {formatCurrency(monthsData[monthsData.length - 1]?.cumulativeSaved ?? 0)}
          </span>
        </div>
        <SavingsChart points={monthsData} compact height={100} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-3 border-t border-[var(--border-1)] text-[11px] text-[var(--text-3)]">
        <div className="flex flex-wrap items-center gap-4">
          {chartMode === 'cashflow' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: 'var(--chart-income)' }}
                />
                <span>Entradas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: 'var(--chart-expense)' }}
                />
                <span>Saídas</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: 'var(--chart-card)' }} />
              <span>Fatura do cartão e parcelas</span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-[var(--text-4)]">
          Clique nas barras para carregar o mês
        </span>
      </div>
    </div>
  );
};
