/**
 * Sincronização do FinanFlow com o Supabase (banco Postgres + login Google).
 *
 * Mesmas funções que a versão antiga (que falava com um Worker/D1), só que
 * agora falando direto com o Supabase. A segurança fica por conta da RLS:
 * cada usuário só enxerga as linhas do "espaço" (household) do qual participa.
 */

import { supabase, SUPABASE_URL } from '../utils/supabaseClient';
import type { Transaction, Category, Account, Goal } from '../types/finance';

export interface User {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface HouseholdDoc {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
}

export interface HouseholdMember {
  uid: string;
  name?: string;
  joinedAt: string;
}

export interface CloudSyncPayload {
  household: HouseholdDoc;
  members: HouseholdMember[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
}

/** Sessão ausente/expirada: o App usa isso para voltar para a tela de login. */
export class CloudAuthError extends Error {}

// ============ Sessão ============

async function currentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session?.user ?? null;
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new CloudAuthError('Sessão expirada. Faça login novamente.');
  return user;
}

function toAppUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}): User {
  const meta = user.user_metadata || {};
  return {
    sub: user.id,
    name: meta.full_name || meta.name || undefined,
    email: user.email || undefined,
    picture: meta.avatar_url || meta.picture || undefined,
  };
}

// ============ Espaço compartilhado ============

let cachedHouseholdId: string | null = null;

function toHousehold(row: any): HouseholdDoc {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_uid,
    inviteCode: row.invite_code,
  };
}

/**
 * Garante o espaço do usuário (a função no banco cria no primeiro acesso) e
 * guarda o id em memória para as escritas seguintes.
 */
async function resolveHousehold(): Promise<{ id: string; doc: HouseholdDoc }> {
  const { data, error } = await supabase.rpc('get_or_create_household');
  if (error) {
    if (/not authenticated|jwt/i.test(error.message)) throw new CloudAuthError(error.message);
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  cachedHouseholdId = row.id;
  return { id: row.id, doc: toHousehold(row) };
}

async function householdId(): Promise<string> {
  if (cachedHouseholdId) return cachedHouseholdId;
  const { id } = await resolveHousehold();
  return id;
}

// ============ Mapeamento banco <-> app ============

function txRow(householdId: string, uid: string, tx: Transaction) {
  return {
    id: String(tx.id),
    household_id: householdId,
    creator_uid: uid,
    description: String(tx.description || 'Sem descrição').slice(0, 300),
    amount: Number(tx.amount) || 0,
    type: tx.type === 'income' ? 'income' : 'expense',
    category: String(tx.category || '').slice(0, 128),
    date: tx.date || new Date().toISOString().slice(0, 10),
    account: String(tx.account || 'default').slice(0, 128),
    payment_method: String(tx.paymentMethod || 'cash').slice(0, 64),
    is_paid: !!tx.isPaid,
    notes: tx.notes ? String(tx.notes).slice(0, 2000) : null,
    recurrence: tx.recurrence ? String(tx.recurrence) : null,
    installment: tx.installment ?? null,
    installment_group_id: tx.installment?.installmentGroupId ?? null,
    recurrence_group_id: tx.recurrenceGroupId ?? null,
  };
}

function rowToTransaction(r: any): Transaction {
  return {
    id: r.id,
    description: r.description || '',
    amount: Number(r.amount) || 0,
    type: r.type === 'income' ? 'income' : 'expense',
    category: r.category || '',
    date: r.date || '',
    account: r.account || '',
    paymentMethod: r.payment_method || 'cash',
    isPaid: !!r.is_paid,
    notes: r.notes || undefined,
    recurrence: r.recurrence || undefined,
    installment: r.installment || undefined,
    recurrenceGroupId: r.recurrence_group_id || undefined,
  };
}

function rowToCategory(r: any): Category {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon || '',
    color: r.color || '',
    type: r.type,
    budget: Number(r.budget) || 0,
  };
}

function rowToAccount(r: any): Account {
  const out: Account = {
    id: r.id,
    name: r.name,
    type: r.type,
    initialBalance: Number(r.initial_balance) || 0,
    color: r.color || '',
  };
  if (r.card_limit !== null && r.card_limit !== undefined) out.cardLimit = Number(r.card_limit);
  if (r.card_due_day !== null && r.card_due_day !== undefined) out.cardDueDay = Number(r.card_due_day);
  return out;
}

function rowToGoal(r: any): Goal {
  return {
    id: r.id,
    title: r.title,
    targetAmount: Number(r.target_amount) || 0,
    currentAmount: Number(r.current_amount) || 0,
    deadline: r.deadline || '',
    color: r.color || '',
    icon: r.icon || '',
    notes: r.notes || undefined,
  };
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

// ============ API usada pelo app ============

/** Quem está logado + espaço compartilhado (cria o espaço no primeiro acesso). */
export async function fetchMe(): Promise<{
  user: User;
  household: HouseholdDoc;
  members: HouseholdMember[];
} | null> {
  const user = await currentUser();
  if (!user) return null;

  const household = await resolveHousehold();
  const { data: members, error } = await supabase
    .from('household_members')
    .select('user_uid, user_name, joined_at')
    .eq('household_id', household.id);
  fail(error);

  return {
    user: toAppUser(user),
    household: household.doc,
    members: (members || []).map((m) => ({
      uid: m.user_uid,
      name: m.user_name || undefined,
      joinedAt: m.joined_at,
    })),
  };
}

/** Snapshot completo do espaço compartilhado (usado pelo polling). */
export async function fetchSync(): Promise<CloudSyncPayload> {
  const user = await requireUser();
  const household = await resolveHousehold();
  const hid = household.id;

  const [txs, cats, accs, goals, members] = await Promise.all([
    supabase.from('transactions').select('*').eq('household_id', hid).order('date', { ascending: false }),
    supabase.from('categories').select('*').eq('household_id', hid),
    supabase.from('accounts').select('*').eq('household_id', hid),
    supabase.from('goals').select('*').eq('household_id', hid),
    supabase.from('household_members').select('user_uid, user_name, joined_at').eq('household_id', hid),
  ]);

  fail(txs.error);
  fail(cats.error);
  fail(accs.error);
  fail(goals.error);
  fail(members.error);

  void user;

  return {
    household: household.doc,
    transactions: (txs.data || []).map(rowToTransaction),
    categories: (cats.data || []).map(rowToCategory),
    accounts: (accs.data || []).map(rowToAccount),
    goals: (goals.data || []).map(rowToGoal),
    members: (members.data || []).map((m) => ({
      uid: m.user_uid,
      name: m.user_name || undefined,
      joinedAt: m.joined_at,
    })),
  };
}

/** Entra em um espaço compartilhado pelo código de convite. */
export async function joinHouseholdWithCode(
  code: string
): Promise<{ ok: true; household: HouseholdDoc }> {
  const { data, error } = await supabase.rpc('join_household', { p_code: code.trim() });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  cachedHouseholdId = row.id;
  return { ok: true, household: toHousehold(row) };
}

export async function saveTransactionToCloud(tx: Transaction): Promise<{ ok: true }> {
  const user = await requireUser();
  const hid = await householdId();
  const { error } = await supabase.from('transactions').upsert(txRow(hid, user.id, tx));
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Envia vários lançamentos pendentes de uma vez (AutoSync). */
export async function saveTransactionsBulk(
  txs: Transaction[]
): Promise<{ ok: true; saved: number }> {
  if (txs.length === 0) return { ok: true, saved: 0 };
  const user = await requireUser();
  const hid = await householdId();
  const rows = txs.map((tx) => txRow(hid, user.id, tx));
  const { error } = await supabase.from('transactions').upsert(rows);
  if (error) throw new Error(error.message);
  return { ok: true, saved: rows.length };
}

export async function deleteTransactionFromCloud(txId: string): Promise<{ ok: true }> {
  await requireUser();
  const { error } = await supabase.from('transactions').delete().eq('id', String(txId));
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteAllTransactionsFromCloud(): Promise<{ ok: true }> {
  await requireUser();
  const hid = await householdId();
  const { error } = await supabase.from('transactions').delete().eq('household_id', hid);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveCategoryToCloud(category: Category): Promise<{ ok: true }> {
  const user = await requireUser();
  const hid = await householdId();
  const { error } = await supabase.from('categories').upsert({
    id: String(category.id),
    household_id: hid,
    creator_uid: user.id,
    name: category.name,
    icon: category.icon || '',
    color: category.color || '',
    type: category.type || 'expense',
    budget: Number(category.budget) || 0,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveAccountToCloud(account: Account): Promise<{ ok: true }> {
  const user = await requireUser();
  const hid = await householdId();
  const { error } = await supabase.from('accounts').upsert({
    id: String(account.id),
    household_id: hid,
    creator_uid: user.id,
    name: account.name,
    type: account.type || 'checking',
    initial_balance: Number(account.initialBalance) || 0,
    color: account.color || '',
    card_limit: account.cardLimit ?? null,
    card_due_day: account.cardDueDay ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveGoalToCloud(goal: Goal): Promise<{ ok: true }> {
  const user = await requireUser();
  const hid = await householdId();
  const { error } = await supabase.from('goals').upsert({
    id: String(goal.id),
    household_id: hid,
    creator_uid: user.id,
    title: goal.title,
    target_amount: Number(goal.targetAmount) || 0,
    current_amount: Number(goal.currentAmount) || 0,
    deadline: goal.deadline || null,
    color: goal.color || '',
    icon: goal.icon || '',
    notes: goal.notes || null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Encerra a sessão. */
export async function signOutFromCloud(): Promise<void> {
  cachedHouseholdId = null;
  await supabase.auth.signOut();
}

/**
 * Link de login com Google. Precisa ser usado em <a href> (redireciona para o
 * Google e volta para esta mesma página, preservando ?convite=...).
 */
export function signInUrl(_returnTo = '/'): string {
  const back = new URL(window.location.href);
  back.hash = '';
  return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    back.toString()
  )}`;
}
