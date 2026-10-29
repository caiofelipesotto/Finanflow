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
          <h1 className="ui-h1">Metas</h1>
          <p className="ui-sub">
            Acompanhe o progresso dos seus objetivos: reserva de emergência, viagens, investimentos e projetos
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="ui-btn ui-btn-primary"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* Aggregate Overview Card */}
      <div className="ui-card p-5">
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

      {/* Estado vazio: sem metas ainda */}
      {goals.length === 0 && (
        <div className="ui-card p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 flex items-center justify-center mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Nenhuma meta por aqui ainda</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Crie uma meta para acompanhar quanto já guardou e quanto falta por mês — reserva de
            emergência, viagem, troca de carro, o que você quiser.
          </p>
          <button onClick={() => setIsAddModalOpen(true)} className="ui-btn ui-btn-primary mt-4">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Criar primeira meta
          </button>
        </div>
      )}

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((goal) => {
          const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const monthlyNeeded = calculateMonthlyNeeded(goal);
          const isComplete = goal.currentAmount >= goal.targetAmount;

          return (
            <div
              key={goal.id}
              className="ui-card p-5 hover:border-zinc-700 transition-all flex flex-col justify-between"
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
                      <div className="flex items-center gap-1.5 ui-sub">
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
        <div className="ui-modal-overlay">
          <div className="ui-modal p-5 overflow-y-auto">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              {adjustingGoal.mode === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Meta: <strong className="text-neutral-800">{adjustingGoal.goal.title}</strong>
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="ui-label">
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
                    className="ui-input pl-11 text-lg font-bold font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingGoal(null)}
                  className="ui-btn ui-btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
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
        <div className="ui-modal-overlay">
          <div className="ui-modal p-5 overflow-y-auto">
            <h2 className="text-base font-bold text-neutral-900 mb-1">Criar Nova Meta</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Defina o objetivo e acompanhe sua evolução mês a mês
            </p>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="ui-label">
                  Nome da meta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reserva de Emergência, Viagem Europa..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="ui-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="10000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="ui-input font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="ui-label">
                    Já guardado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="ui-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label">
                    Data Limite
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="ui-input font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="ui-label">
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
                <label className="ui-label">
                  Notas / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: reserva de emergência, viagem, entrada do carro..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="ui-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="ui-btn ui-btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
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
