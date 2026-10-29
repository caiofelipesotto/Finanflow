import React, { useState } from 'react';
import { Edit3, AlertTriangle, CheckCircle2, SlidersHorizontal, Plus } from 'lucide-react';
import { Category, Transaction } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface BudgetsViewProps {
  categories: Category[];
  transactions: Transaction[];
  year: number;
  month: number;
  onUpdateBudget: (categoryId: string, newBudget: number) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  categories,
  transactions,
  year,
  month,
  onUpdateBudget,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetInputValue, setBudgetInputValue] = useState('');

  // Expenses for the selected month
  const monthlyExpenses = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    const parts = tx.date.split('-');
    if (parts.length === 3) {
      return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) - 1 === month;
    }
    return false;
  });

  // Calculate spent per category
  const spentPerCategory = monthlyExpenses.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});

  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' || c.type === 'both'
  );

  const totalBudgeted = expenseCategories.reduce(
    (sum, c) => sum + (c.budget || 0),
    0
  );
  const totalSpentInBudgeted = expenseCategories.reduce((sum, c) => {
    return sum + (spentPerCategory[c.id] || 0);
  }, 0);

  const totalRemaining = totalBudgeted - totalSpentInBudgeted;

  const handleStartEdit = (cat: Category) => {
    setEditingCategory(cat);
    setBudgetInputValue((cat.budget || 0).toString());
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const num = parseFloat(budgetInputValue.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      onUpdateBudget(editingCategory.id, Math.round(num * 100) / 100);
    }
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Limites de gasto
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Defina quanto pretende gastar em cada categoria e acompanhe o quanto já usou
          </p>
        </div>
      </div>

      {/* Overview Card */}
      <div className="bg-[#141416] border border-neutral-800 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">
              Total planejado no mês
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(totalBudgeted)}
            </div>
            <span className="text-xs text-zinc-500 mt-1 block">
              Soma dos limites de categorias
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">
              Total Gasto no Mês
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(totalSpentInBudgeted)}
            </div>
            <span className="text-xs text-zinc-500 mt-1 block font-mono tabular-nums">
              {totalBudgeted > 0
                ? `${((totalSpentInBudgeted / totalBudgeted) * 100).toFixed(1)}% do limite já usado`
                : 'Nenhum limite definido'}
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">
              Saldo Restante para Gastar
            </span>
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                totalRemaining >= 0 ? 'text-orange-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(totalRemaining)}
            </div>
            <span className="text-xs text-orange-500 mt-1 block">
              {totalRemaining >= 0
                ? 'Disponível dentro da sua meta'
                : 'Limite estourado neste mês'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenseCategories.map((cat) => {
          const spent = spentPerCategory[cat.id] || 0;
          const budget = Math.max(0, cat.budget || 0);
          const percentage = budget > 0 ? (spent / budget) * 100 : 0;
          const remaining = budget - spent;
          const isOver = budget > 0 && spent > budget;

          // Progress color status
          let progressBarColor = 'bg-zinc-500';
          if (isOver) {
            progressBarColor = 'bg-rose-500';
          } else if (percentage >= 80) {
            progressBarColor = 'bg-amber-500';
          }

          return (
            <div
              key={cat.id}
              className="bg-[#141416] border border-neutral-800 rounded-2xl p-5 shadow-xl hover:border-neutral-700 transition-colors relative group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                  >
                    <CategoryIcon name={cat.icon} color={cat.color} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {cat.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
                      {budget > 0 ? (
                        <>
                        <span>Meta: {formatCurrency(budget)}</span>
                          <span aria-hidden="true" className="text-neutral-700">·</span>
                          <span
                            className={
                              isOver
                                ? 'text-rose-400 font-semibold'
                                : percentage >= 80
                                ? 'text-amber-400 font-semibold'
                                : 'text-zinc-300'
                            }
                          >
                            {percentage.toFixed(0)}% usado
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-500">Sem limite definido</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartEdit(cat)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
                  title="Editar Limite"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Bar */}
              {budget > 0 ? (
                <div className="mt-4">
                  <div className="h-2 w-full bg-[#1d1d20] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${progressBarColor} transition-all duration-300 rounded-full`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2.5 font-mono tabular-nums">
                    <span className="text-zinc-400">
                      Gasto: <strong className="text-white">{formatCurrency(spent)}</strong>
                    </span>
                    <span
                      className={`font-semibold ${
                        isOver ? 'text-rose-400' : 'text-zinc-400'
                      }`}
                    >
                      {isOver
                        ? `Estourou por ${formatCurrency(Math.abs(remaining))}`
                        : `Resta ${formatCurrency(remaining)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Gasto no mês: <strong className="font-mono tabular-nums text-white">{formatCurrency(spent)}</strong>
                  </span>
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="text-zinc-400 hover:text-zinc-300 font-semibold"
                  >
                    + Definir limite
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Budget Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#141416] rounded-2xl shadow-2xl border border-neutral-800 w-full max-w-sm overflow-hidden p-6 animate-in fade-in duration-150">
            <h2 className="text-base font-bold text-white mb-1">
              Definir limite mensal
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Categoria: <strong className="text-zinc-200">{editingCategory.name}</strong>
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Limite Mensal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={budgetInputValue}
                    onChange={(e) => setBudgetInputValue(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-lg font-bold font-mono tabular-nums text-white bg-[#1d1d20] border border-neutral-700 rounded-xl outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    autoFocus
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Defina 0 para remover o limite desta categoria.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-black bg-orange-400 hover:bg-orange-300 rounded-xl transition-all shadow-md shadow-orange-500/10"
                >
                  Salvar Limite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
