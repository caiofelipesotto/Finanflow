import React from 'react';
import { Category, Transaction } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface CategoryBreakdownChartProps {
  transactions: Transaction[];
  categories: Category[];
  year: number;
  month: number;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  transactions,
  categories,
  year,
  month,
}) => {
  const categoriesMap = categories.reduce<Record<string, Category>>((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});

  // Filter expenses for this month
  const monthlyExpenses = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    const parts = tx.date.split('-');
    if (parts.length === 3) {
      return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) - 1 === month;
    }
    return false;
  });

  const totalExpense = monthlyExpenses.reduce((sum, tx) => sum + tx.amount, 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  monthlyExpenses.forEach((tx) => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([catId, amount]) => ({
      category: categoriesMap[catId] || {
        id: catId,
        name: 'Outros',
        icon: 'Tag',
        color: '#64748b',
        type: 'expense' as const,
      },
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (sortedCategories.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-neutral-900 mb-1">Despesas por Categoria</h3>
        <p className="text-xs text-neutral-500 mb-6">Distribuição dos seus gastos no mês</p>
        <div className="py-8 text-center text-xs text-neutral-400">
          Nenhuma despesa registrada para este mês.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Despesas por Categoria</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Onde seu dinheiro está concentrado neste mês
          </p>
        </div>
        <span className="text-xs font-semibold text-neutral-700 font-mono tabular-nums">
          {sortedCategories.length} {sortedCategories.length === 1 ? 'categoria' : 'categorias'}
        </span>
      </div>

      {/* Segmented proportional bar */}
      <div className="h-3 w-full rounded-md overflow-hidden flex bg-neutral-100 mb-5 shadow-inner">
        {sortedCategories.map(({ category, percentage }) => (
          <div
            key={category.id}
            title={`${category.name}: ${percentage.toFixed(1)}%`}
            style={{
              width: `${percentage}%`,
              backgroundColor: category.color,
            }}
            className="h-full transition-all duration-300 first:rounded-l-md last:rounded-r-md"
          />
        ))}
      </div>

      {/* Ranked list of top categories */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {sortedCategories.map(({ category, amount, percentage }) => (
          <div
            key={category.id}
            className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-b-0"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${category.color}18`, color: category.color }}
              >
                <CategoryIcon name={category.icon} color={category.color} className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <span className="text-xs font-medium text-neutral-800 truncate block">
                  {category.name}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                  {percentage.toFixed(1)}% do total
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-neutral-900 font-mono tabular-nums">
                {formatCurrency(amount)}
              </span>
              {category.budget && (
                <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                  de {formatCurrency(category.budget)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
