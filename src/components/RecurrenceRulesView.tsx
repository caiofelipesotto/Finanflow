import React, { useState, useEffect } from 'react';
import { recurrenceService } from '../services/recurrenceService';
import { RecurrenceRule } from '../types/finance';
import { formatCurrency } from '../utils/formatters';

interface RecurrenceRulesViewProps {
  householdId: string;
  userId: string;
  onRuleCreated?: () => void;
}

export function RecurrenceRulesView({ householdId, userId, onRuleCreated }: RecurrenceRulesViewProps) {
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRule, setNewRule] = useState({
    description: '',
    amount: '',
    dayOfMonth: '5',
    categoryId: '',
    accountId: '',
    paymentMethod: 'credit' as const,
    type: 'expense' as const,
    startDate: '',
    endDate: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRules();
  }, [householdId]);

  async function loadRules() {
    try {
      const data = await recurrenceService.listRules(householdId);
      setRules(data);
    } catch (err) {
      console.error('Erro ao carregar regras:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await recurrenceService.createRule({
        user_id: userId,
        household_id: householdId,
        description: newRule.description,
        amount: parseFloat(newRule.amount.replace(',', '.')),
        day_of_month: parseInt(newRule.dayOfMonth, 10),
        category_id: newRule.categoryId || undefined,
        account_id: newRule.accountId || undefined,
        payment_method: newRule.paymentMethod,
        type: newRule.type,
        start_date: newRule.startDate,
        end_date: newRule.endDate || undefined,
        is_active: true,
      });
      setNewRule({
        description: '', amount: '', dayOfMonth: '5', categoryId: '', accountId: '',
        paymentMethod: 'credit', type: 'expense', startDate: '', endDate: '',
      });
      await loadRules();
      onRuleCreated?.();
    } catch (err) {
      console.error('Erro ao criar regra:', err);
      alert('Erro ao criar regra de recorrência.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Desativar esta regra de recorrência?')) return;
    try {
      await recurrenceService.deactivateRule(id);
      await loadRules();
    } catch (err) {
      console.error('Erro ao desativar:', err);
      alert('Erro ao desativar regra.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Regras de Recorrência</h2>
        <p className="text-sm text-zinc-500">
          Contas que se repetem todo mês (ex: seguro, fibra, assinaturas)
        </p>
      </div>

      {/* Formulário de nova regra */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nova regra</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Descrição</label>
            <input
              type="text"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              placeholder="Ex: Nio Fibra"
              className="ui-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Valor (R$)</label>
            <input
              type="text"
              value={newRule.amount}
              onChange={(e) => setNewRule({ ...newRule, amount: e.target.value })}
              placeholder="95,00"
              className="ui-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Dia do mês</label>
            <input
              type="number"
              min="1" max="31"
              value={newRule.dayOfMonth}
              onChange={(e) => setNewRule({ ...newRule, dayOfMonth: e.target.value })}
              className="ui-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Tipo</label>
            <select
              value={newRule.type}
              onChange={(e) => setNewRule({ ...newRule, type: e.target.value as any })}
              className="ui-input"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Data início</label>
            <input
              type="date"
              value={newRule.startDate}
              onChange={(e) => setNewRule({ ...newRule, startDate: e.target.value })}
              className="ui-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Data fim (opcional)</label>
            <input
              type="date"
              value={newRule.endDate}
              onChange={(e) => setNewRule({ ...newRule, endDate: e.target.value })}
              className="ui-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Método</label>
            <select
              value={newRule.paymentMethod}
              onChange={(e) => setNewRule({ ...newRule, paymentMethod: e.target.value as any })}
              className="ui-input"
            >
              <option value="credit">Cartão de crédito</option>
              <option value="debit">Débito</option>
              <option value="pix">Pix</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>
          <div className="col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={creating || !newRule.description || !newRule.amount || !newRule.startDate}
              className="ui-btn ui-btn-primary disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar regra'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de regras existentes */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/50">
            <tr>
              <th className="text-left p-3 text-zinc-400 text-xs">Descrição</th>
              <th className="text-right p-3 text-zinc-400 text-xs">Valor</th>
              <th className="text-center p-3 text-zinc-400 text-xs">Dia</th>
              <th className="text-center p-3 text-zinc-400 text-xs">Tipo</th>
              <th className="text-left p-3 text-zinc-400 text-xs">Início</th>
              <th className="text-left p-3 text-zinc-400 text-xs">Fim</th>
              <th className="text-right p-3 text-zinc-400 text-xs">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-zinc-800/30">
                <td className="p-3 text-zinc-200">{rule.description}</td>
                <td className="text-right p-3 font-mono text-zinc-300">
                  {formatCurrency(rule.amount)}
                </td>
                <td className="text-center p-3 text-zinc-400">
                  {String(rule.day_of_month)}
                </td>
                <td className="text-center p-3 text-xs">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    rule.type === 'expense' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {rule.type === 'expense' ? 'Despesa' : 'Receita'}
                  </span>
                </td>
                <td className="p-3 text-zinc-400">{rule.start_date}</td>
                <td className="p-3 text-zinc-400">{rule.end_date || '—'}</td>
                <td className="p-3">
                  <button
                    onClick={() => handleDeactivate(rule.id)}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Desativar
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-zinc-500">
                  Nenhuma regra de recorrência ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="text-center text-zinc-500 text-sm">Carregando...</div>
      )}
    </div>
  );
}
