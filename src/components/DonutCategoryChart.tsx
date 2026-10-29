import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatters';

interface DonutCategoryItem {
  id: string;
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface DonutCategoryChartProps {
  items: DonutCategoryItem[];
  totalExpense: number;
  monthLabel: string;
}

export const DonutCategoryChart: React.FC<DonutCategoryChartProps> = ({
  items,
  totalExpense,
  monthLabel,
}) => {
  const [hoveredItem, setHoveredItem] = useState<DonutCategoryItem | null>(null);

  if (items.length === 0 || totalExpense === 0) {
    return (
      <div className="ui-card p-4 sm:p-5">
        <h3 className="ui-section-title">Onde foi o dinheiro?</h3>
        <p className="ui-sub">{monthLabel}</p>
        <div className="py-12 text-center text-xs text-[var(--text-4)]">
          Nenhuma despesa registrada para este mês.
        </div>
      </div>
    );
  }

  // Calculate SVG stroke dashes for donut
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  const displayItem = hoveredItem || items[0];

  return (
    <div className="ui-card p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="ui-section-title">Onde foi o dinheiro?</h3>
            <p className="ui-sub">{monthLabel}</p>
          </div>
          <span className="ui-badge tabular-nums">{formatCurrency(totalExpense)}</span>
        </div>

        {/* Rosca e valor central */}
        <div className="relative flex items-center justify-center py-3">
          <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="var(--chart-track)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {items.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePercent / 100) * circumference);
              cumulativePercent += item.percentage;

              const isHovered = hoveredItem?.id === item.id;

              return (
                <circle
                  key={item.id}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  fill="transparent"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            <span className="text-[10px] text-[var(--text-4)] font-semibold truncate max-w-[110px]">
              {displayItem?.name || 'Total'}
            </span>
            <span className="text-sm font-bold text-[var(--text-1)] tabular-nums mt-0.5">
              {formatCurrency(displayItem?.amount || totalExpense)}
            </span>
            <span className="text-[10px] text-[var(--text-4)] tabular-nums font-semibold">
              {displayItem ? `${displayItem.percentage.toFixed(1)}%` : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de categorias */}
      <div className="space-y-1 mt-3 pt-3 border-t border-[var(--border-1)] max-h-56 overflow-y-auto pr-1">
        {items.map((cat) => {
          const isHovered = hoveredItem?.id === cat.id;
          return (
            <div
              key={cat.id}
              className={`flex items-center justify-between gap-2 py-1.5 px-2 rounded-[var(--r-control)] cursor-pointer transition-colors ${
                isHovered ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-2)]'
              }`}
              onMouseEnter={() => setHoveredItem(cat)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[11px] text-[var(--text-2)] truncate font-medium">
                  {cat.name}
                </span>
              </div>

              <div className="text-right shrink-0 tabular-nums text-[11px]">
                <span className="font-bold text-[var(--text-1)]">{formatCurrency(cat.amount)}</span>
                <span className="text-[10px] text-[var(--text-4)] ml-2">
                  {cat.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
