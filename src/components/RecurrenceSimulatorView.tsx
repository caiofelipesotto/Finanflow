import React, { useState, useMemo, useEffect } from 'react';
import { recurrenceService } from '../services/recurrenceService';
import { RecurrenceRule } from '../types/finance';
import { formatCurrency } from '../utils/formatters';
import { simulateRecurrences, groupSimulationsByMonth } from '../utils/recurrenceSimulator';

interface RecurrenceSimulatorViewProps {
  householdId: string;
}

export function RecurrenceSimulatorView({ householdId }: RecurrenceSimulatorViewProps) {
  const [rules, setRules] = useState<RecurrenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromMonth, setFromMonth] = useState<string>('');
  const [toMonth, setToMonth] = useState<string>('');

  // Default: simular dos próximos 24 meses
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultToYear = now.getFullYear() + 2;
  const defaultTo = `${defaultToYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    setFromMonth(defaultFrom);
    setToMonth(defaultTo);
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

  const simulations = useMemo(() => {
    if (!fromMonth || !toMonth) return [];
    return simulateRecurrences(rules, fromMonth, toMonth);
  }, [rules, fromMonth, toMonth]);

  const grouped = useMemo(() => groupSimulationsByMonth(simulations), [simulations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Simulação de Longo Prazo</h2>
        <p className="text-sm text-zinc-500">
          Projeção de lançamentos automáticos para qualquer mês no futuro
        </p>
      </div>

      {/* Controles de período */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">De</label>
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="ui-input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Até</label>
          <input
            type="month"
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className="ui-input"
          />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs text-zinc-400">&nbsp;</label>
          <button className="ui-btn ui-btn-primary w-full sm:w-auto">
            Atualizar simulação
          </button>
        </div>
      </div>

      {/* Resultado da simulação */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/50 sticky top-0">
            <tr>
              <th className="text-left p-3 text-zinc-400 text-xs">Mês</th>
              <th className="text-right p-3 text-zinc-400 text-xs">Total</th>
              <th className="text-left p-3 text-zinc-400 text-xs">Lançamentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-zinc-500">
                  Nenhum lançamento recorrente neste período.
                  {rules.length === 0 && <br />}
                  {rules.length === 0 && <span className="text-xs mt-1 block">Cadastre regras primeiro.</span>}
                </td>
              </tr>
            ) : (
              grouped.map((group) => (
                <tr key={group.month} className="hover:bg-zinc-800/30">
                  <td className="p-3 font-mono text-zinc-300">
                    {group.month}
                  </td>
                  <td className="text-right p-3 font-mono text-zinc-200">
                    {formatCurrency(group.total)}
                  </td>
                  <td className="p-3 text-zinc-400">
                    {group.items.length} lançamento{group.items.length > 1 ? 's' : ''}
                    <details className="ml-2 mt-1 text-xs">
                      <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400">Ver detalhes</summary>
                      <ul className="mt-1 space-y-1 ml-2">
                        {group.items.map((item) => (
                          <li key={`${item.date}-${item.ruleId}`} className="text-zinc-500">
                            • {item.date.slice(8, 10)} - {item.description}: {formatCurrency(item.amount)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {grouped.length > 0 && (
            <tfoot className="bg-zinc-900/50">
              <tr>
                <td className="p-3 text-zinc-400 text-xs font-semibold">Total geral</td>
                <td className="text-right p-3 font-mono text-zinc-200 font-semibold">
                  {formatCurrency(grouped.reduce((acc, g) => acc + g.total, 0))}
                </td>
                <td className="p-3 text-zinc-400 text-xs">
                  {grouped.reduce((acc, g) => acc + g.items.length, 0)} lançamentos
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {loading && (
        <div className="text-center text-zinc-500 text-sm">Carregando regras...</div>
      )}
    </div>
  );
}
