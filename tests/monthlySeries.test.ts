import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildMonthSeries, cumulativeSavedThrough } from '../src/utils/monthlySeries';
import type { Transaction } from '../src/types/finance';

const base = { id: 'x', description: 'x', account: 'acc_corrente', isPaid: true, recurrence: 'single' as const };
const txs = [
  { ...base, amount: 1000, type: 'expense', category: 'cat_investimentos_saida', paymentMethod: 'pix', date: '2026-09-10' },
  { ...base, amount: 500, type: 'expense', category: 'cat_investimentos_saida', paymentMethod: 'pix', date: '2026-11-10' },
  { ...base, amount: 200, type: 'income', category: 'cat_investimentos_saida', paymentMethod: 'investment', date: '2026-12-05' },
  { ...base, amount: 800, type: 'income', category: 'cat_salario', paymentMethod: 'pix', date: '2026-11-05' },
] as Transaction[];

test('acumulado carrega o historico anterior a janela', () => {
  const points = buildMonthSeries(txs, 2026, 10, 3);
  assert.deepEqual(points.map((p) => p.key), ['2026-11', '2026-12', '2027-01']);
  assert.equal(points[0].cumulativeSaved, 1500);
  assert.equal(points[1].cumulativeSaved, 1300);
  assert.equal(points[2].cumulativeSaved, 1300);
});

test('totais do mes seguem a regra de aporte', () => {
  const p = buildMonthSeries(txs, 2026, 10, 1)[0];
  assert.deepEqual({ income: p.income, expense: p.expense, saved: p.saved, balance: p.balance }, { income: 800, expense: 0, saved: 500, balance: 300 });
});

test('janela atravessa a virada do ano', () => {
  assert.deepEqual(buildMonthSeries(txs, 2026, 11, 3).map((p) => p.key), ['2026-12', '2027-01', '2027-02']);
});

test('cumulativeSavedThrough inclui o mes final', () => {
  assert.equal(cumulativeSavedThrough(txs, 2026, 8), 1000);
  assert.equal(cumulativeSavedThrough(txs, 2026, 10), 1500);
  assert.equal(cumulativeSavedThrough(txs, 2026, 11), 1300);
});
