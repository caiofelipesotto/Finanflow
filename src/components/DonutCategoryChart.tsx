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
      <div className="ui-card p-5">
        <h3 className="text-sm font-bold text-white mb-1">Distribuição de Despesas</h3>
        <p className="text-xs text-zinc-400 mb-6">{monthLabel}</p>
        <div className="py-12 text-center text-xs text-zinc-500">
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
    <div className="ui-card p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Onde foi o Dinheiro?
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{monthLabel}</p>
          </div>
          <span className="text-xs font-semibold text-zinc-300 font-mono tabular-nums">
            {formatCurrency(totalExpense)}
          </span>
        </div>

        {/* Donut SVG and Center Display */}
        <div className="relative flex items-center justify-center py-2">
          <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#26262a"
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

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[120px]">
              {displayItem?.name || 'Total'}
            </span>
            <span className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
              {formatCurrency(displayItem?.amount || totalExpense)}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono tabular-nums font-semibold">
              {displayItem ? `${displayItem.percentage.toFixed(1)}%` : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Ranked Category List */}
      <div className="space-y-2.5 mt-4 pt-3 border-t border-zinc-800/80 max-h-56 overflow-y-auto pr-1">
        {items.map((cat) => {
          const isHovered = hoveredItem?.id === cat.id;
          return (
            <div
              key={cat.id}
              className={`flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-colors ${
                isHovered ? 'bg-[#26262a]' : 'hover:bg-zinc-800/40'
              }`}
              onMouseEnter={() => setHoveredItem(cat)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-zinc-300 truncate font-medium">
                  {cat.name}
                </span>
              </div>

              <div className="text-right shrink-0 font-mono tabular-nums text-xs">
                <span className="font-bold text-white">{formatCurrency(cat.amount)}</span>
                <span className="text-[10px] text-zinc-400 ml-2">
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
