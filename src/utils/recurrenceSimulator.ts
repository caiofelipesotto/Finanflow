import {
  RecurrenceRule,
  RecurrenceSimulation,
  RecurrenceException,
} from '../types/finance';

/**
 * Gera uma lista de datas para uma regra de recorrência entre startDate e endDate.
 * Por exemplo: dia 5 de cada mês, de 01/2026 até 12/2027.
 * Considera interval_months para regras não mensais (ex: a cada 2 meses).
 */
export function generateRecurringDates(
  rule: Pick<RecurrenceRule, 'day_of_month' | 'start_date' | 'end_date' | 'interval_months'>,
  from: string, // YYYY-MM
  to: string, // YYYY-MM
): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  const startDate = new Date(rule.start_date);
  const endDate = rule.end_date ? new Date(rule.end_date) : null;
  const interval = rule.interval_months || 1;

  const dates: string[] = [];

  let year = fromYear;
  let month = fromMonth;

  while (year < toYear || (year === toYear && month <= toMonth)) {
    const day = Math.min(rule.day_of_month, new Date(year, month, 0).getDate());
    const date = new Date(year, month - 1, day);

    // Não gera antes da data de início
    if (date < startDate) {
      month += interval;
      if (month > 12) {
        year += Math.floor((month - 1) / 12);
        month = ((month - 1) % 12) + 1;
      }
      continue;
    }

    // Não gera depois da data de fim
    if (endDate && date > endDate) break;

    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);

    month += interval;
    if (month > 12) {
      year += Math.floor((month - 1) / 12);
      month = ((month - 1) % 12) + 1;
    }
  }

  return dates;
}

/**
 * Busca o valor efetivo de uma regra para um mês específico,
 * considerando exceções se existirem.
 */
export function getEffectiveAmount(
  rule: RecurrenceRule,
  exceptions: RecurrenceException[],
  year: number,
  month: number,
): number {
  const exception = exceptions.find(
    (e) => e.rule_id === rule.id && e.year === year && e.month === month,
  );
  return exception ? exception.amount : rule.amount;
}

/**
 * Simula lançamentos futuros para uma ou mais regras de recorrência.
 * Retorna um array agrupado por mês, útil para visualizar o longo prazo.
 * `exceptions` é um mapa opcional de exceções por regra.
 */
export function simulateRecurrences(
  rules: RecurrenceRule[],
  from: string, // YYYY-MM
  to: string, // YYYY-MM
  exceptionsByRule?: Map<string, RecurrenceException[]>,
): RecurrenceSimulation[] {
  const simulations: RecurrenceSimulation[] = [];

  for (const rule of rules) {
    if (!rule.is_active) continue;

    const exceptions = exceptionsByRule?.get(rule.id) || [];

    const dates = generateRecurringDates(rule, from, to);

    for (const date of dates) {
      const [year, month] = date.split('-').map(Number);
      const amount = getEffectiveAmount(rule, exceptions, year, month);

      simulations.push({
        ruleId: rule.id,
        description: rule.description,
        amount,
        dayOfMonth: rule.day_of_month,
        date,
        month: date.slice(0, 7), // YYYY-MM
      });
    }
  }

  // Ordenar por data
  simulations.sort((a, b) => a.date.localeCompare(b.date));

  return simulations;
}

/**
 * Agrupa simulações por mês, para exibir em uma tabela de longo prazo.
 */
export function groupSimulationsByMonth(
  simulations: RecurrenceSimulation[],
): { month: string; items: RecurrenceSimulation[]; total: number }[] {
  const grouped = new Map<string, { items: RecurrenceSimulation[]; total: number }>();

  for (const sim of simulations) {
    if (!grouped.has(sim.month)) {
      grouped.set(sim.month, { items: [], total: 0 });
    }
    const group = grouped.get(sim.month)!;
    group.items.push(sim);
    group.total += sim.amount;
  }

  return Array.from(grouped.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
