import { Category, Account, Goal, Transaction } from '../types/finance';

export const SPREADSHEET_TITLE = 'FinanFlow · Gestão Financeira Inteligente';

export const DEFAULT_CATEGORIES: Category[] = [
  // Receitas
  {
    id: 'cat_salario',
    name: 'Salário',
    icon: 'Briefcase',
    color: '#f97316',
    type: 'income',
  },
  {
    id: 'cat_renda_extra',
    name: 'Renda extra',
    icon: 'Sparkles',
    color: '#fb923c',
    type: 'income',
  },
  {
    id: 'cat_rendimentos',
    name: 'Rendimentos',
    icon: 'TrendingUp',
    color: '#fbbf24',
    type: 'income',
  },
  {
    id: 'cat_receitas',
    name: 'Receitas',
    icon: 'TrendingUp',
    color: '#10b981',
    type: 'income',
    budget: 0,
  },
  {
    id: 'cat_receitas_adicionais',
    name: 'Receitas Adicionais',
    icon: 'Sparkles',
    color: '#fbbf24',
    type: 'income',
    budget: 0,
  },
  {
    id: 'cat_receita_avulsa',
    name: 'Receita Avulsa',
    icon: 'MoreHorizontal',
    color: '#64748b',
    type: 'income',
    budget: 0,
  },
  {
    id: 'cat_outros_receitas',
    name: 'Outras Receitas',
    icon: 'MoreHorizontal',
    color: '#64748b',
    type: 'income',
    budget: 0,
  },


  // Despesas Fixas & Moradia
  {
    id: 'cat_moradia',
    name: 'Moradia',
    icon: 'Home',
    color: '#f97316',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_veiculo',
    name: 'Veículo',
    icon: 'Car',
    color: '#f59e0b',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_educacao',
    name: 'Educação',
    icon: 'GraduationCap',
    color: '#a1a1aa',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_assinaturas',
    name: 'Assinaturas',
    icon: 'Tv',
    color: '#f43f5e',
    type: 'expense',
    budget: 0,
  },

  // Categorias de Despesas Fixas
  {
    id: 'cat_despesas_fixas',
    name: 'Despesas Fixas',
    icon: 'Bank',
    color: '#f97316',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_aluguel',
    name: 'Aluguel',
    icon: 'Home',
    color: '#f59e0b',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_contas',
    name: 'Contas',
    icon: 'Receipt',
    color: '#3b82f6',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_ip',
    name: 'Internet/TV',
    icon: 'Monitor',
    color: '#8b5cf6',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_outros_despesas',
    name: 'Outras Despesas',
    icon: 'MoreHorizontal',
    color: '#64748b',
    type: 'expense',
    budget: 0,
  },

  // Despesas Variáveis
  {
    id: 'cat_alimentacao',
    name: 'Alimentação',
    icon: 'Coffee',
    color: '#ec4899',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_combustivel',
    name: 'Transporte',
    icon: 'Zap',
    color: '#f97316',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_compras_cartao',
    name: 'Compras',
    icon: 'ShoppingBag',
    color: '#eab308',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_saude',
    name: 'Saúde',
    icon: 'ShieldCheck',
    color: '#f59e0b',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_lazer',
    name: 'Lazer',
    icon: 'Utensils',
    color: '#f43f5e',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_investimentos_saida',
    name: 'Aportes',
    icon: 'PiggyBank',
    color: '#f97316',
    type: 'expense',
    budget: 0,
  },
  {
    id: 'cat_outros',
    name: 'Outros',
    icon: 'MoreHorizontal',
    color: '#64748b',
    type: 'expense',
    budget: 0,
  },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc_corrente',
    name: 'Conta Corrente Principal',
    type: 'checking',
    initialBalance: 0,
    color: '#f97316',
  },
  {
    id: 'acc_picpay',
    name: 'Cartão principal',
    type: 'credit',
    initialBalance: 0,
    color: '#78716c',
    cardLimit: 5000,
    cardDueDay: 10,
  },
  {
    id: 'acc_santander',
    name: 'Cartão secundário',
    type: 'credit',
    initialBalance: 0,
    color: '#ef4444',
    cardLimit: 6000,
    cardDueDay: 15,
  },
  {
    id: 'acc_riachuelo',
    name: 'Cartão de loja',
    type: 'credit',
    initialBalance: 0,
    color: '#ec4899',
    cardLimit: 3000,
    cardDueDay: 20,
  },
  {
    id: 'acc_cdb',
    name: 'Reserva e investimentos',
    type: 'investment',
    initialBalance: 0,
    color: '#f97316',
  },
  {
    id: 'acc_carteira',
    name: 'Carteira',
    type: 'cash',
    initialBalance: 0,
    color: '#64748b',
  },
];

export const DEFAULT_GOALS: Goal[] = [];

// Clean blank slate: no pre-populated values as requested by user
export const getSampleTransactions = (): Transaction[] => {
  return [];
};
