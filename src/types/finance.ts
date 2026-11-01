export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'credit' | 'debit' | 'pix' | 'cash' | 'transfer' | 'investment';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string; // Category id
  date: string; // YYYY-MM-DD
  account: string; // Account id
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  notes?: string;
  recurrence?: 'single' | 'monthly' | 'installment';
  installment?: {
    current: number;
    total: number;
    installmentGroupId?: string;
    totalPurchaseAmount?: number;
  };
  recurrenceGroupId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  budget?: number; // monthly limit in BRL
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'credit' | 'cash' | 'investment';
  initialBalance: number;
  color: string;
  cardLimit?: number;
  cardDueDay?: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  color: string;
  icon: string;
  notes?: string;
}

export type ViewTab = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'recurrence';

export interface RecurrenceRule {
  id: string;
  user_id: string;
  household_id: string;
  description: string;
  amount: number;
  day_of_month: number;
  category_id?: string;
  account_id?: string;
  payment_method?: PaymentMethod;
  type: TransactionType;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurrenceSimulation {
  ruleId: string;
  description: string;
  amount: number;
  dayOfMonth: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
}
