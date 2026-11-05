import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { inferCategoryFromDescription } from '../src/utils/categoryInference';

const categories = [
  { id: 'cat_assinaturas', type: 'expense' as const },
  { id: 'cat_moradia', type: 'expense' as const },
  { id: 'cat_investimentos_saida', type: 'expense' as const },
  { id: 'cat_alimentacao', type: 'expense' as const },
  { id: 'cat_veiculo', type: 'expense' as const },
  { id: 'cat_salario', type: 'income' as const },
];

test('internet nao vira aporte', () => {
  assert.equal(inferCategoryFromDescription('Internet Pg *nio Fibra (95,00)', 'expense', categories), 'cat_assinaturas');
});

test('streaming, mercado e financiamento seguem iguais', () => {
  assert.equal(inferCategoryFromDescription('Netflix.com', 'expense', categories), 'cat_assinaturas');
  assert.equal(inferCategoryFromDescription('Supermercado Guanabara', 'expense', categories), 'cat_alimentacao');
  assert.equal(inferCategoryFromDescription('Financiamento Virtus', 'expense', categories), 'cat_veiculo');
});

test('desconhecida retorna null e categoria ausente e ignorada', () => {
  assert.equal(inferCategoryFromDescription('Pagamento aleatorio', 'expense', categories), null);
  const semAssinaturas = categories.filter((c) => c.id !== 'cat_assinaturas');
  assert.equal(inferCategoryFromDescription('Internet fibra', 'expense', semAssinaturas), 'cat_moradia');
});
