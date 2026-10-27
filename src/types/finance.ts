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

export type ViewTab = 'dashboard' | 'transactions' | 'budgets' | 'goals';
