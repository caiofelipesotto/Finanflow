import { Transaction } from '../types/finance';

export const APORTE_CATEGORY_ID = 'cat_investimentos_saida';

type AporteShape = Pick<Transaction, 'type' | 'category' | 'paymentMethod'>;
type AporteAmount = AporteShape & Pick<Transaction, 'amount'>;

const matchesAporteRule = (tx: AporteShape): boolean =>
  tx.category === APORTE_CATEGORY_ID || tx.paymentMethod === 'investment';

export const isAporte = (tx: AporteShape): boolean => tx.type === 'expense' && matchesAporteRule(tx);

export const isResgate = (tx: AporteShape): boolean => tx.type === 'income' && matchesAporteRule(tx);

export const aporteNet = (tx: AporteAmount): number => {
  if (isAporte(tx)) return tx.amount;
  if (isResgate(tx)) return -tx.amount;
  return 0;
};

export const sumAportes = (txs: Transaction[]): number =>
  txs.reduce((sum, tx) => sum + aporteNet(tx), 0);

export interface MonthTotals {
  income: number;
  expense: number;
  aportes: number;
  resgates: number;
  saved: number;
  balance: number;
}

export const summarizeTransactions = (txs: Transaction[]): MonthTotals => {
  let income = 0;
  let expense = 0;
  let aportes = 0;
  let resgates = 0;

  for (const tx of txs) {
    if (isAporte(tx)) aportes += tx.amount;
    else if (isResgate(tx)) resgates += tx.amount;
    else if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
  }

  const saved = aportes - resgates;
  return { income, expense, aportes, resgates, saved, balance: income - expense - saved };
};
