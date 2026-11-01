import { supabase } from '../utils/supabaseClient';
import { RecurrenceRule } from '../types/finance';

export const recurrenceService = {
  /** Listar todas as regras de recorrência do usuário logado */
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

  /** Criar uma nova regra de recorrência */
  async createRule(rule: Omit<RecurrenceRule, 'id' | 'created_at' | 'updated_at'>): Promise<RecurrenceRule> {
    const { data, error } = await supabase
      .from('recurrence_rules')
      .insert(rule)
      .select()
      .single();

    if (error) throw error;
    return data as RecurrenceRule;
  },

  /** Atualizar uma regra existente */
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

  /** Desativar uma regra (soft delete) */
  async deactivateRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurrence_rules')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  /** Excluir uma regra completamente */
  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurrence_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
