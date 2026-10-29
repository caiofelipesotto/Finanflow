import React, { useState } from 'react';
import { Transaction } from '../types/finance';
import { formatCurrency } from '../utils/formatters';

interface FlowChartProps {
  transactions: Transaction[];
  year: number;
  month: number;
}

export const FlowChart: React.FC<FlowChartProps> = ({ transactions, year, month }) => {
  const [hoveredDay, setHoveredDay] = useState<{
    day: number;
    expense: number;
    income: number;
    x: number;
    y: number;
  } | null>(null);

  // Total days in selected month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Aggregate by day
  const dailyData: { day: number; expense: number; income: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dailyData.push({ day: d, expense: 0, income: 0 });
  }

  transactions.forEach((tx) => {
    const parts = tx.date.split('-');
    if (parts.length === 3) {
      const txYear = parseInt(parts[0], 10);
      const txMonth = parseInt(parts[1], 10) - 1;
      const txDay = parseInt(parts[2], 10);

      if (txYear === year && txMonth === month && txDay >= 1 && txDay <= daysInMonth) {
        if (tx.type === 'expense') {
          dailyData[txDay - 1].expense += tx.amount;
        } else {
          dailyData[txDay - 1].income += tx.amount;
        }
      }
    }
  });

  const maxDaily = Math.max(
    ...dailyData.map((d) => Math.max(d.expense, d.income)),
    100
  );

  const chartHeight = 160;
  const paddingX = 16;
  const paddingY = 20;

  return (
    <div className="ui-card p-5 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Fluxo Diário do Mês</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Despesas e entradas registradas por dia
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-bar)' }} />
            <span>Despesas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: 'var(--chart-income)' }}
            />
            <span>Receitas</span>
          </div>
        </div>
      </div>

      <div className="relative h-44 w-full">
        {hoveredDay && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -top-2 bg-neutral-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg transition-transform duration-75"
            style={{
              left: `${(hoveredDay.day / daysInMonth) * 94 + 3}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold text-neutral-200 mb-1">
              Dia {hoveredDay.day.toString().padStart(2, '0')}
            </div>
            {hoveredDay.expense > 0 && (
              <div className="text-rose-300 font-mono tabular-nums">
                Despesas: {formatCurrency(hoveredDay.expense)}
              </div>
            )}
            {hoveredDay.income > 0 && (
              <div className="text-zinc-300 font-mono tabular-nums">
                Receitas: {formatCurrency(hoveredDay.income)}
              </div>
            )}
            {hoveredDay.expense === 0 && hoveredDay.income === 0 && (
              <div className="text-neutral-400">Sem lançamentos</div>
            )}
          </div>
        )}

        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${daysInMonth * 16} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          {/* Subtle horizontal grid lines */}
          <line
            x1="0"
            y1={chartHeight - paddingY}
            x2={daysInMonth * 16}
            y2={chartHeight - paddingY}
            stroke="var(--chart-grid-strong)"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1={(chartHeight - paddingY) / 2}
            x2={daysInMonth * 16}
            y2={(chartHeight - paddingY) / 2}
            stroke="var(--chart-grid)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {dailyData.map((d, idx) => {
            const barWidth = 8;
            const x = idx * 16 + 4;
            const expenseHeight = (d.expense / maxDaily) * (chartHeight - paddingY - 10);
            const incomeHeight = (d.income / maxDaily) * (chartHeight - paddingY - 10);

            return (
              <g
                key={d.day}
                className="chart-group cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredDay({
                    day: d.day,
                    expense: d.expense,
                    income: d.income,
                    x: rect.x,
                    y: rect.y,
                  });
                }}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Invisible hover capture area */}
                <rect
                  x={x - 4}
                  y="0"
                  width="16"
                  height={chartHeight}
                  fill="transparent"
                  className="chart-hover-area"
                />

                {/* Expense bar */}
                {d.expense > 0 ? (
                  <rect
                    x={x}
                    y={chartHeight - paddingY - expenseHeight}
                    width={barWidth}
                    height={Math.max(expenseHeight, 3)}
                    rx="2"
                    className="chart-bar"
                  />
                ) : (
                  <rect
                    x={x + 3}
                    y={chartHeight - paddingY - 2}
                    width="2"
                    height="2"
                    rx="1"
                    fill="var(--chart-grid-strong)"
                  />
                )}

                {/* Income indicator pip if income occurred on same day */}
                {d.income > 0 && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={chartHeight - paddingY - Math.max(incomeHeight, 8) - 4}
                    r="3.5"
                    fill="var(--chart-income)"
                    stroke="var(--chart-dot-ring)"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* X axis labels (sample days 1, 5, 10, 15, 20, 25, end) */}
        <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono mt-1 px-1">
          <span>Dia 1</span>
          <span>Dia 10</span>
          <span>Dia 20</span>
          <span>Dia {daysInMonth}</span>
        </div>
      </div>
    </div>
  );
};
