import React, { useState } from 'react';
import { Plus, Target, Calendar, ArrowUpRight, ArrowDownLeft, Trash2, Edit2, ShieldCheck } from 'lucide-react';
import { Goal } from '../types/finance';
import { formatCurrency, formatDate } from '../utils/formatters';

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoalAmount: (goalId: string, deltaAmount: number) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoalAmount,
  onDeleteGoal,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustingGoal, setAdjustingGoal] = useState<{ goal: Goal; mode: 'deposit' | 'withdraw' } | null>(null);
  const [adjustAmountInput, setAdjustAmountInput] = useState('');

  // Form states for new goal
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#f97316');

  const totalSavedInGoals = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTargetInGoals = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount.replace(',', '.'));
    const initial = parseFloat(initialAmount.replace(',', '.') || '0');

    if (!title.trim() || isNaN(target) || target <= 0) return;

    onAddGoal({
      title: title.trim(),
      targetAmount: target,
      currentAmount: isNaN(initial) ? 0 : Math.max(0, initial),
      deadline: deadline || '2026-12-31',
      color,
      icon: 'ShieldCheck',
      notes: notes.trim() || undefined,
    });

    // Reset
    setTitle('');
    setTargetAmount('');
    setInitialAmount('');
    setDeadline('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingGoal) return;
    const amount = parseFloat(adjustAmountInput.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    const delta = adjustingGoal.mode === 'deposit' ? amount : -amount;
    onUpdateGoalAmount(adjustingGoal.goal.id, delta);
    setAdjustingGoal(null);
    setAdjustAmountInput('');
  };

  // Helper for estimated monthly savings needed
  const calculateMonthlyNeeded = (goal: Goal): number | null => {
    if (goal.currentAmount >= goal.targetAmount) return 0;
    const remaining = goal.targetAmount - goal.currentAmount;
    if (!goal.deadline) return null;

    const today = new Date();
    const [y, m, d] = goal.deadline.split('-').map(Number);
    const deadlineDate = new Date(y, m - 1, d);

    const diffMonths =
      (deadlineDate.getFullYear() - today.getFullYear()) * 12 +
      (deadlineDate.getMonth() - today.getMonth());

    if (diffMonths <= 0) return remaining;
    return remaining / diffMonths;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Metas & Patrimônio</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhe a evolução do CDB (120% CDI), investimentos em terreno e reservas familiares
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-black bg-orange-400 hover:bg-orange-300 rounded-xl transition-all shadow-md shadow-orange-500/10 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Aggregate Overview Card */}
      <div className="bg-[#141416] border border-neutral-800 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">
              Total Acumulado em Metas
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(totalSavedInGoals)}
            </div>
            <span className="text-xs text-zinc-500 mt-1 block">
              Em {goals.length} {goals.length === 1 ? 'meta ativa' : 'metas ativas'}
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">
              Objetivo Total das Metas
            </span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatCurrency(totalTargetInGoals)}
            </div>
            <span className="text-xs text-zinc-500 mt-1 block font-mono tabular-nums">
              {totalTargetInGoals > 0
                ? `${((totalSavedInGoals / totalTargetInGoals) * 100).toFixed(1)}% alcançado`
                : 'Nenhum objetivo definido'}
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-zinc-400 block mb-1">
              Restante para Concluir
            </span>
            <div className="text-2xl font-bold text-zinc-400 font-mono tabular-nums">
              {formatCurrency(Math.max(0, totalTargetInGoals - totalSavedInGoals))}
            </div>
            <span className="text-xs text-zinc-500 mt-1 block">
              Valor necessário para fechar todos os objetivos
            </span>
          </div>
        </div>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const monthlyNeeded = calculateMonthlyNeeded(goal);
          const isComplete = goal.currentAmount >= goal.targetAmount;

          return (
            <div
              key={goal.id}
              className="bg-[#141416] border border-neutral-800 rounded-2xl p-5 shadow-xl hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                    >
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {goal.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>Alvo: {formatDate(goal.deadline)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    title="Excluir meta"
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {goal.notes && (
                  <p className="text-xs text-zinc-400 mb-4 line-clamp-2">
                    {goal.notes}
                  </p>
                )}

                {/* Progress Metric */}
                <div className="my-4">
                  <div className="flex items-baseline justify-between mb-1.5 font-mono tabular-nums">
                    <span className="text-lg font-bold text-white">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      de {formatCurrency(goal.targetAmount)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>

                  <div className="h-2 w-full bg-[#1d1d20] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: goal.color || '#f97316',
                      }}
                    />
                  </div>
                </div>

                {/* Monthly projection */}
                {!isComplete && monthlyNeeded !== null && monthlyNeeded > 0 && (
                  <div className="text-[11px] text-zinc-400 bg-[#1d1d20] rounded-xl p-2.5 mb-4 border border-zinc-800">
                    Aporte sugerido:{' '}
                    <strong className="text-zinc-400 font-mono tabular-nums">
                      {formatCurrency(monthlyNeeded)}/mês
                    </strong>{' '}
                    para atingir a meta no prazo.
                  </div>
                )}

                {isComplete && (
                  <div className="text-xs text-zinc-300 bg-zinc-950/80 border border-zinc-800 font-medium rounded-xl p-2 mb-4 text-center">
                    Parabéns! Meta 100% concluída.
                  </div>
                )}
              </div>

              {/* Action Buttons: Guardar / Resgatar */}
              <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setAdjustingGoal({ goal, mode: 'deposit' })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 rounded-xl transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingGoal({ goal, mode: 'withdraw' })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-zinc-300 bg-[#1d1d20] hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition-colors"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Resgatar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Adjust Amount Modal (Deposit / Withdraw) */}
      {adjustingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-sm overflow-hidden p-6 animate-in fade-in duration-150">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              {adjustingGoal.mode === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Meta: <strong className="text-neutral-800">{adjustingGoal.goal.title}</strong>
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Valor a {adjustingGoal.mode === 'deposit' ? 'adicionar' : 'retirar'} (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400 font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={adjustAmountInput}
                    onChange={(e) => setAdjustAmountInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-lg font-bold font-mono tabular-nums text-neutral-900 border border-neutral-300 rounded-xl outline-hidden focus:border-zinc-800 focus:ring-2 focus:ring-orange-100"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingGoal(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-zinc-700 rounded-lg transition-colors shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Goal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-md overflow-hidden p-6 animate-in fade-in duration-150">
            <h2 className="text-base font-bold text-neutral-900 mb-1">Criar Nova Meta</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Defina o objetivo e acompanhe sua evolução mês a mês
            </p>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome da Meta / Caixinha
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reserva de Emergência, Viagem Europa..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-neutral-900 border border-neutral-300 rounded-lg outline-hidden focus:border-zinc-800 focus:ring-1 focus:ring-orange-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="10000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-neutral-900 border border-neutral-300 rounded-lg outline-hidden focus:border-zinc-800 focus:ring-1 focus:ring-orange-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Já guardado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-neutral-900 border border-neutral-300 rounded-lg outline-hidden focus:border-zinc-800 focus:ring-1 focus:ring-orange-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Data Limite
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-neutral-900 border border-neutral-300 rounded-lg outline-hidden focus:border-zinc-800 focus:ring-1 focus:ring-orange-600 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Cor de Destaque
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {['#fdba74', '#f97316', '#a1a1aa', '#f59e0b', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-neutral-400 ring-offset-2' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Notas / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Guardado no Nubank Caixinha 100% CDI"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-neutral-900 border border-neutral-300 rounded-lg outline-hidden focus:border-zinc-800 focus:ring-1 focus:ring-orange-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-zinc-700 rounded-lg transition-colors shadow-xs"
                >
                  Criar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
