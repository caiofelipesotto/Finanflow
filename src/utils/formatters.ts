import { Transaction, Category, Account } from '../types/finance';

export const formatCurrency = (val: number): string => {
  if (isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const formatCompactCurrency = (val: number): string => {
  if (Math.abs(val) >= 1000000) {
    return `R$ ${(val / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1000) {
    return `R$ ${(val / 1000).toFixed(1)}k`;
  }
  return formatCurrency(val);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

export const getMonthName = (month: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month] || '';
};

export const formatMonthYear = (year: number, month: number): string => {
  return `${getMonthName(month)} de ${year}`;
};

export const getTodayString = (): string => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getShortMonthName = (month: number): string => {
  const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return shortMonths[month] || '';
};

export const formatMonthShort = (year: number, month: number): string => {
  const shortYr = String(year).slice(-2);
  return `${getShortMonthName(month)}/${shortYr}`;
};

export const addMonthsToDate = (dateStr: string, monthsToAdd: number): string => {
  if (!dateStr) dateStr = getTodayString();
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1 + monthsToAdd, d);
  
  // Guard against days overflowing (e.g. 31st into a 30-day or 28-day month)
  // If targetDate month got pushed further due to day overflow:
  const targetMonth = (m - 1 + monthsToAdd) % 12;
  const normalizedTargetMonth = targetMonth < 0 ? targetMonth + 12 : targetMonth;
  if (targetDate.getMonth() !== normalizedTargetMonth) {
    targetDate.setDate(0); // Set to last day of previous month
  }

  const outY = targetDate.getFullYear();
  const outM = String(targetDate.getMonth() + 1).padStart(2, '0');
  const outD = String(targetDate.getDate()).padStart(2, '0');
  return `${outY}-${outM}-${outD}`;
};

export const exportTransactionsToCsv = (
  transactions: Transaction[],
  categoriesMap: Record<string, Category>,
  accountsMap: Record<string, Account>
) => {
  const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Método', 'Valor (R$)', 'Status', 'Recorrência'];
  const rows = transactions.map((t) => [
    t.date,
    t.type === 'income' ? 'Receita' : 'Despesa',
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${categoriesMap[t.category]?.name || t.category}"`,
    `"${accountsMap[t.account]?.name || t.account}"`,
    t.paymentMethod,
    t.amount.toFixed(2).replace('.', ','),
    t.isPaid ? 'Pago' : 'Pendente',
    t.recurrence || 'single'
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `finanflow-transacoes-${getTodayString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportBackupJson = (data: unknown) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `finanflow-backup-${getTodayString()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
