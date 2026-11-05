import { Transaction } from '../types/finance';
import { aporteNet, summarizeTransactions } from './aportes';
import { formatMonthShort } from './formatters';

export interface MonthPoint {
  key: string;
  label: string;
  year: number;
  month: number;
  income: number;
  expense: number;
  aportes: number;
  resgates: number;
  saved: number;
  balance: number;
  cumulativeSaved: number;
}

const shiftMonth = (year: number, month: number) => {
  const total = year * 12 + month;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

export const cumulativeSavedThrough = (
  transactions: Transaction[],
  endYear: number,
  endMonth: number
): number => {
  const endKey = `${endYear}-${String(endMonth + 1).padStart(2, '0')}`;
  return transactions
    .filter((tx) => tx.date.slice(0, 7) <= endKey)
    .reduce((sum, tx) => sum + aporteNet(tx), 0);
};

export const buildMonthSeries = (
  transactions: Transaction[],
  startYear: number,
  startMonth: number,
  count: number
): MonthPoint[] => {
  const points: MonthPoint[] = [];
  const previous = shiftMonth(startYear, startMonth - 1);
  let cumulativeSaved = cumulativeSavedThrough(transactions, previous.year, previous.month);

  for (let i = 0; i < count; i++) {
    const { year, month } = shiftMonth(startYear, startMonth + i);
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const totals = summarizeTransactions(transactions.filter((tx) => tx.date.startsWith(key)));
    cumulativeSaved += totals.saved;

    points.push({
      key,
      label: formatMonthShort(year, month),
      year,
      month,
      ...totals,
      cumulativeSaved,
    });
  }

  return points;
};
