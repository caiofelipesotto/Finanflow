import React, { useState } from 'react';
import { Edit3, AlertTriangle, SlidersHorizontal, Plus } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header>
        <span className="ui-label mb-0">Planejamento</span>
        <h1 className="ui-h1 mt-1">Limites de gasto</h1>
        <p className="ui-sub">
          Defina quanto pretende gastar em cada categoria e acompanhe o quanto já usou
        </p>
      </header>

      {/* Resumo */}
      <section className="ui-card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="ui-stat-label">Total planejado no mês</span>
            <div className="ui-stat-value mt-0.5">{formatCurrency(totalBudgeted)}</div>
            <span className="ui-stat-note">Soma dos limites de categorias</span>
          </div>

          <div>
            <span className="ui-stat-label">Total gasto no mês</span>
            <div className="ui-stat-value mt-0.5">{formatCurrency(totalSpentInBudgeted)}</div>
            <span className="ui-stat-note tabular-nums">
              {totalBudgeted > 0
                ? `${((totalSpentInBudgeted / totalBudgeted) * 100).toFixed(1)}% do limite já usado`
                : 'Nenhum limite definido'}
            </span>
          </div>

          <div>
            <span className="ui-stat-label">Saldo restante para gastar</span>
            <div
              className={`ui-stat-value mt-0.5 ${
                totalRemaining >= 0 ? '!text-[var(--accent-text)]' : '!text-[var(--danger-text)]'
              }`}
            >
              {formatCurrency(totalRemaining)}
            </div>
            <span className="ui-stat-note">
              {totalRemaining >= 0
                ? 'Disponível dentro do planejado'
                : 'Limite estourado neste mês'}
            </span>
          </div>
        </div>
      </section>

      {/* Categorias */}
      {expenseCategories.length === 0 ? (
        <section className="ui-card p-8 text-center">
          <div className="ui-icon ui-icon-accent w-12 h-12 mx-auto mb-3">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h3 className="ui-section-title">Nenhuma categoria de despesa</h3>
          <p className="ui-sub max-w-sm mx-auto">
            Cadastre uma categoria de despesa para poder definir um limite mensal.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {expenseCategories.map((cat) => {
            const spent = spentPerCategory[cat.id] || 0;
            const budget = Math.max(0, cat.budget || 0);
            const percentage = budget > 0 ? (spent / budget) * 100 : 0;
            const remaining = budget - spent;
            const isOver = budget > 0 && spent > budget;

            const barColor = isOver
              ? 'var(--danger-text)'
              : percentage >= 80
              ? '#d97706'
              : 'var(--accent-text)';

            return (
              <article key={cat.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-[var(--r-control)] flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${cat.color}1f`,
                        borderColor: `${cat.color}40`,
                        color: cat.color,
                      }}
                    >
                      <CategoryIcon name={cat.icon} color={cat.color} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[var(--text-1)] truncate">{cat.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)] tabular-nums">
                        {budget > 0 ? (
                          <>
                            <span>Limite: {formatCurrency(budget)}</span>
                            <span aria-hidden="true" className="text-[var(--text-4)]">·</span>
                            <span
                              className={`font-semibold ${
                                isOver
                                  ? 'text-[var(--danger-text)]'
                                  : percentage >= 80
                                  ? 'text-[#d97706]'
                                  : 'text-[var(--text-2)]'
                              }`}
                            >
                              {percentage.toFixed(0)}% usado
                            </span>
                          </>
                        ) : (
                          <span>Sem limite definido</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] rounded-[var(--r-control)] transition-colors shrink-0"
                    title="Editar limite"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {budget > 0 ? (
                  <div className="mt-3.5">
                    <div className="ui-progress">
                      <div
                        className="ui-progress-bar"
                        style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] mt-2 tabular-nums">
                      <span className="text-[var(--text-3)]">
                        Gasto: <strong className="text-[var(--text-1)]">{formatCurrency(spent)}</strong>
                      </span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          isOver ? 'text-[var(--danger-text)]' : 'text-[var(--text-3)]'
                        }`}
                      >
                        {isOver && <AlertTriangle className="w-3 h-3" />}
                        {isOver
                          ? `Estourou em ${formatCurrency(Math.abs(remaining))}`
                          : `Resta ${formatCurrency(remaining)}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-[var(--border-1)] flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[var(--text-3)]">
                      Gasto no mês:{' '}
                      <strong className="text-[var(--text-1)] tabular-nums">{formatCurrency(spent)}</strong>
                    </span>
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="text-[var(--accent-text)] hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Definir limite
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de limite */}
      {editingCategory && (
        <div className="ui-modal-overlay" onClick={() => setEditingCategory(null)}>
          <div className="ui-modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="ui-modal-header">
              <div className="min-w-0 flex-1">
                <h2 className="ui-modal-title">Definir limite mensal</h2>
                <p className="ui-modal-sub">
                  Categoria: <strong className="text-[var(--text-2)]">{editingCategory.name}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveBudget} className="ui-modal-body space-y-4">
              <div>
                <label className="ui-label">Limite mensal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-4)]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={budgetInputValue}
                    onChange={(e) => setBudgetInputValue(e.target.value)}
                    className="ui-input !pl-10 font-bold tabular-nums"
                    autoFocus
                  />
                </div>
                <span className="ui-stat-note">Defina 0 para remover o limite desta categoria.</span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setEditingCategory(null)} className="ui-btn ui-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="ui-btn ui-btn-primary">
                  Salvar limite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
