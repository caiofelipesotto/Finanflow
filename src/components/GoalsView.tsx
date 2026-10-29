import React, { useState } from 'react';
import { Plus, Target, Calendar, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="ui-label mb-0">Planejamento</span>
          <h1 className="ui-h1 mt-1">Metas</h1>
          <p className="ui-sub">
            Acompanhe o progresso dos seus objetivos: reserva de emergência, viagens, investimentos e projetos
          </p>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="ui-btn ui-btn-primary self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" />
          <span>Nova meta</span>
        </button>
      </header>

      {/* Resumo */}
      <section className="ui-card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="ui-stat-label">Total acumulado</span>
            <div className="ui-stat-value mt-0.5">{formatCurrency(totalSavedInGoals)}</div>
            <span className="ui-stat-note">
              Em {goals.length} {goals.length === 1 ? 'meta ativa' : 'metas ativas'}
            </span>
          </div>

          <div>
            <span className="ui-stat-label">Objetivo total</span>
            <div className="ui-stat-value mt-0.5">{formatCurrency(totalTargetInGoals)}</div>
            <span className="ui-stat-note tabular-nums">
              {totalTargetInGoals > 0
                ? `${((totalSavedInGoals / totalTargetInGoals) * 100).toFixed(1)}% alcançado`
                : 'Nenhum objetivo definido'}
            </span>
          </div>

          <div>
            <span className="ui-stat-label">Restante para concluir</span>
            <div className="ui-stat-value mt-0.5 !text-[var(--text-3)]">
              {formatCurrency(Math.max(0, totalTargetInGoals - totalSavedInGoals))}
            </div>
            <span className="ui-stat-note">Valor necessário para fechar todos os objetivos</span>
          </div>
        </div>
      </section>

      {/* Estado vazio */}
      {goals.length === 0 && (
        <section className="ui-card p-8 text-center">
          <div className="ui-icon ui-icon-accent w-12 h-12 mx-auto mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="ui-section-title">Nenhuma meta por aqui ainda</h3>
          <p className="ui-sub max-w-sm mx-auto leading-relaxed">
            Crie uma meta para acompanhar quanto já guardou e quanto falta por mês — reserva de
            emergência, viagem, troca de carro, o que você quiser.
          </p>
          <button onClick={() => setIsAddModalOpen(true)} className="ui-btn ui-btn-primary mt-4">
            <Plus className="w-3.5 h-3.5" />
            Criar primeira meta
          </button>
        </section>
      )}

      {/* Cartões de meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {goals.map((goal) => {
          const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const monthlyNeeded = calculateMonthlyNeeded(goal);
          const isComplete = goal.currentAmount >= goal.targetAmount;

          return (
            <article key={goal.id} className="ui-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-[var(--r-control)] flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${goal.color || '#f97316'}1f`,
                        borderColor: `${goal.color || '#f97316'}40`,
                        color: goal.color || '#f97316',
                      }}
                    >
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[var(--text-1)] leading-snug truncate">
                        {goal.title}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-4)] mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Até {formatDate(goal.deadline)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    title="Excluir meta"
                    className="p-1.5 text-[var(--text-4)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-[var(--r-control)] transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {goal.notes && (
                  <p className="text-[11px] text-[var(--text-3)] mt-2.5 line-clamp-2 leading-relaxed">
                    {goal.notes}
                  </p>
                )}

                <div className="mt-3.5">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5 tabular-nums">
                    <span className="text-sm font-bold text-[var(--text-1)]">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-[11px] text-[var(--text-3)]">
                      de {formatCurrency(goal.targetAmount)} · {percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="ui-progress">
                    <div
                      className="ui-progress-bar"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: goal.color || '#f97316',
                      }}
                    />
                  </div>
                </div>

                {isComplete ? (
                  <div className="ui-badge ui-badge-success mt-3 w-full justify-center !py-1">
                    Meta 100% concluída
                  </div>
                ) : (
                  monthlyNeeded !== null &&
                  monthlyNeeded > 0 && (
                    <div className="ui-alert !py-2 mt-3 items-center tabular-nums">
                      <span className="text-[11px] leading-snug">
                        Aporte sugerido:{' '}
                        <strong className="text-[var(--text-2)]">
                          {formatCurrency(monthlyNeeded)}/mês
                        </strong>{' '}
                        para chegar no prazo.
                      </span>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-1)]">
                <button
                  type="button"
                  onClick={() => setAdjustingGoal({ goal, mode: 'deposit' })}
                  className="ui-btn ui-btn-secondary flex-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingGoal({ goal, mode: 'withdraw' })}
                  className="ui-btn ui-btn-ghost flex-1"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Resgatar</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal guardar/resgatar */}
      {adjustingGoal && (
        <div className="ui-modal-overlay" onClick={() => setAdjustingGoal(null)}>
          <div className="ui-modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="ui-modal-header">
              <div className="min-w-0 flex-1">
                <h2 className="ui-modal-title">
                  {adjustingGoal.mode === 'deposit' ? 'Guardar dinheiro' : 'Resgatar dinheiro'}
                </h2>
                <p className="ui-modal-sub">
                  Meta: <strong className="text-[var(--text-2)]">{adjustingGoal.goal.title}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="ui-modal-body space-y-4">
              <div>
                <label className="ui-label">
                  Valor a {adjustingGoal.mode === 'deposit' ? 'adicionar' : 'retirar'} (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-4)]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={adjustAmountInput}
                    onChange={(e) => setAdjustAmountInput(e.target.value)}
                    className="ui-input !pl-10 font-bold tabular-nums"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setAdjustingGoal(null)} className="ui-btn ui-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="ui-btn ui-btn-primary">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nova meta */}
      {isAddModalOpen && (
        <div className="ui-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="ui-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ui-modal-header">
              <div className="min-w-0 flex-1">
                <h2 className="ui-modal-title">Criar nova meta</h2>
                <p className="ui-modal-sub">Defina o objetivo e acompanhe sua evolução mês a mês</p>
              </div>
            </div>

            <form onSubmit={handleCreateGoal} className="ui-modal-body space-y-3.5">
              <div>
                <label className="ui-label">Nome da meta</label>
                <input
                  type="text"
                  placeholder="Ex: Reserva de emergência, viagem..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="ui-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label">Valor alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="10000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="ui-input tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="ui-label">Já guardado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="ui-input tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ui-label">Data limite</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="ui-input tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="ui-label">Cor de destaque</label>
                  <div className="flex items-center gap-2 h-[38px]">
                    {['#fdba74', '#f97316', '#a1a1aa', '#f59e0b', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Cor ${c}`}
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform border border-[var(--border-2)] ${
                          color === c ? 'scale-110 ring-2 ring-[var(--accent-text)] ring-offset-1 ring-offset-[var(--surface-1)]' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="ui-label">Notas / observações</label>
                <input
                  type="text"
                  placeholder="Ex: reserva de emergência, viagem, entrada do carro..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="ui-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="ui-btn ui-btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="ui-btn ui-btn-primary">
                  Criar meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
