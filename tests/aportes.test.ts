import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isAporte, isResgate, aporteNet, sumAportes, summarizeTransactions } from '../src/utils/aportes';
import type { Transaction } from '../src/types/finance';

const base = { id: 'x', description: 'x', account: 'acc_corrente', date: '2026-11-01', isPaid: true, recurrence: 'single' as const };

test('aporte por categoria ou metodo', () => {
  assert.equal(isAporte({ ...base, amount: 300, type: 'expense', category: 'cat_investimentos_saida', paymentMethod: 'pix' }), true);
  assert.equal(isAporte({ ...base, amount: 300, type: 'expense', category: 'cat_outros', paymentMethod: 'investment' }), true);
});

test('conta de internet nao e aporte', () => {
  assert.equal(isAporte({ ...base, amount: 95, type: 'expense', category: 'cat_assinaturas', paymentMethod: 'pix' }), false);
});

test('resgate e receita na regra de aporte', () => {
  assert.equal(isResgate({ ...base, amount: 200, type: 'income', category: 'cat_investimentos_saida', paymentMethod: 'investment' }), true);
});

test('aporteNet e sumAportes usam o liquido', () => {
  const aporte = { ...base, amount: 300, type: 'expense' as const, category: 'cat_investimentos_saida', paymentMethod: 'pix' as const };
  const resgate = { ...base, amount: 200, type: 'income' as const, category: 'cat_investimentos_saida', paymentMethod: 'investment' as const };
  const despesa = { ...base, amount: 500, type: 'expense' as const, category: 'cat_alimentacao', paymentMethod: 'pix' as const };
  assert.equal(aporteNet(aporte), 300);
  assert.equal(aporteNet(resgate), -200);
  assert.equal(aporteNet(despesa), 0);
  assert.equal(sumAportes([aporte, resgate] as Transaction[]), 100);
});

test('summarizeTransactions fecha Entrou = Despesas + Guardado + Sobrou', () => {
  const txs = [
    { ...base, amount: 1000, type: 'income', category: 'cat_salario', paymentMethod: 'pix' },
    { ...base, amount: 200, type: 'income', category: 'cat_investimentos_saida', paymentMethod: 'investment' },
    { ...base, amount: 500, type: 'expense', category: 'cat_alimentacao', paymentMethod: 'pix' },
    { ...base, amount: 95, type: 'expense', category: 'cat_assinaturas', paymentMethod: 'pix' },
    { ...base, amount: 300, type: 'expense', category: 'cat_investimentos_saida', paymentMethod: 'pix' },
  ] as Transaction[];
  assert.deepEqual(summarizeTransactions(txs), { income: 1000, expense: 595, aportes: 300, resgates: 200, saved: 100, balance: 305 });
});
