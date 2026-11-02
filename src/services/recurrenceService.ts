import { supabase } from '../utils/supabaseClient';
import {
  RecurrenceRule,
  RecurrenceException,
  RecurringTransactionDraft,
} from '../types/finance';

export const recurrenceService = {
  /* ------------------------------------------------------------------ */
  /* Regras de recorrência                                              */
  /* ------------------------------------------------------------------ */

  async listRules(householdId: string): Promise<RecurrenceRule[]> {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as RecurrenceRule[];
  },

  async createRule(rule: Omit<RecurrenceRule, 'id' | 'created_at' | 'updated_at'>): Promise<RecurrenceRule> {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .insert(rule)
      .select()
      .single();

    if (error) throw error;
    return data as RecurrenceRule;
  },

  async updateRule(id: string, updates: Partial<RecurrenceRule>): Promise<RecurrenceRule> {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RecurrenceRule;
  },

  async deactivateRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurrence_rules')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurrence_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /* ------------------------------------------------------------------ */
  /* Exceções de valor por mês                                          */
  /* ------------------------------------------------------------------ */

  async listExceptions(ruleId: string): Promise<RecurrenceException[]> {
    const { data, error } = await supabase
      .from('recurrence_exceptions')
      .select('*')
      .eq('rule_id', ruleId)
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) throw error;
    return data as RecurrenceException[];
  },

  async setException(
    ruleId: string,
    year: number,
    month: number,
    amount: number,
  ): Promise<RecurrenceException> {
    // Upsert: insere ou atualiza se já existir
    const { data, error } = await supabase
      .from('recurrence_exceptions')
      .upsert(
        { rule_id: ruleId, year, month, amount },
        { onConflict: 'rule_id, year, month' },
      )
      .select()
      .single();

    if (error) throw error;
    return data as RecurrenceException;
  },

  async deleteException(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurrence_exceptions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /* ------------------------------------------------------------------ */
  /* Geração de lançamentos para um mês específico                      */
  /* ------------------------------------------------------------------ */

  /**
   * Gera os lançamentos recorrentes que devem aparecer num determinado mês.
   * Considera: data de início, data de fim, dia do mês, e exceções de valor.
   */
  async generateMonthLaunchments(
    householdId: string,
    year: number,
    month: number,
  ): Promise<RecurringTransactionDraft[]> {
    const rules = await this.listRules(householdId);
    const drafts: RecurringTransactionDraft[] = [];

    for (const rule of rules) {
      const startDate = new Date(rule.start_date);
      const endDate = rule.end_date ? new Date(rule.end_date) : null;
      const interval = rule.interval_months || 1;

      // Verifica se o mês solicitado está dentro do período da regra
      const ruleStartYear = startDate.getFullYear();
      const ruleStartMonth = startDate.getMonth() + 1;
      const ruleStartDay = startDate.getDate();

      const targetDate = new Date(year, month - 1, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;

      // Se a regra começa depois do mês solicitado, pula
      if (
        ruleStartYear > targetYear ||
        (ruleStartYear === targetYear && ruleStartMonth > targetMonth)
      ) {
        continue;
      }

      // Se a regra terminou antes do mês solicitado, pula
      if (endDate) {
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;
        if (endYear < targetYear || (endYear === targetYear && endMonth < targetMonth)) {
          continue;
        }
      }

      // Verifica se o mês alvo está dentro do intervalo de recorrência
      // (ex: regra bimestral começando em jan só aparece em jan, mar, mai, jul, set, nov)
      const monthsDiff =
        (targetYear - ruleStartYear) * 12 + (targetMonth - ruleStartMonth);
      if (monthsDiff % interval !== 0) {
        continue;
      }

      // Dia do mês (ajusta se o mês não tiver esse dia, ex: 31 em fevereiro)
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayOfMonth = Math.min(rule.day_of_month, daysInMonth);

      const date = new Date(year, month - 1, dayOfMonth);
      const dateStr = date.toISOString().slice(0, 10);

      // Verifica se há exceção de valor para este mês
      const exceptions = await this.listExceptions(rule.id);
      const exception = exceptions.find(
        (e) => e.year === year && e.month === month,
      );

      const amount = exception ? exception.amount : rule.amount;

      drafts.push({
        id: `recurring_${rule.id}_${year}_${month}`,
        description: rule.description,
        amount,
        dayOfMonth,
        date: dateStr,
        month: `${year}-${String(month).padStart(2, '0')}`,
        type: rule.type,
        categoryId: rule.category_id,
        accountId: rule.account_id,
        paymentMethod: rule.payment_method,
        isException: !!exception,
        intervalMonths: interval,
      });
    }

    // Ordenar por data
    drafts.sort((a, b) => a.date.localeCompare(b.date));

    return drafts;
  },
};
