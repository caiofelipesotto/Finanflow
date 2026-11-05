# Investimentos (dinheiro guardado) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o aporte deixar de ser despesa, expor o dinheiro guardado como 4ª métrica do hero e como nova aba, e melhorar os gráficos com horizonte de até 60 meses.

**Architecture:** A regra de aporte/resgate vira um helper puro (`src/utils/aportes.ts`), usado por todos os agregados. Uma segunda helper (`src/utils/monthlySeries.ts`) monta a série mensal com guardado acumulado, compartilhada pelo gráfico da Visão geral e pelo gráfico da aba. A nova aba (`InvestmentsView`) reusa transações, modal e tokens visuais existentes.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, lucide-react, Supabase, testes com `node:test` via `tsx` (sem dependência nova).

**Spec:** `docs/superpowers/specs/2026-11-05-investimentos-design.md`

## Global Constraints

- Copy em pt-BR; rótulos exatos: "Guardado", "Resgatado", "Novo aporte", "Novo resgate".
- Nenhuma dependência nova: testes usam `node:test` + `tsx` (já instalado).
- Aporte = `category === 'cat_investimentos_saida'` **ou** `paymentMethod === 'investment'`.
- Resgate = `type === 'income'` com a mesma regra; nunca entra em "Entrou".
- `Entrou = Despesas + Guardado + Sobrou` em qualquer mês.
- Cloud é fonte de verdade; modo visitante usa `localStorage` com a mesma regra.
- Layout funciona em mobile (≥360px) e desktop; manter tokens CSS existentes.
- Comandos: `npm test`, `npm run lint`, `npm run build`.

## Review Focus

- **Resgate no mês** (receita na categoria Aportes): não pode inflar "Entrou" e precisa reduzir "Guardado". Teste em Task 1.
- **Conta de internet** ("Internet Pg *nio Fibra"): não pode ser classificada como aporte. Testes em Task 1 e Task 3.
- **Mês sem aporte**: "Guardado" tem que ser R$ 0,00, sem quebrar o "Sobrou". Teste em Task 1 e verificação manual em Task 10.
- **Início da janela do gráfico**: o acumulado precisa carregar o histórico anterior, para o último ponto bater com "Total guardado". Teste em Task 2.
- **Aporte recorrente na simulação**: não pode aparecer em "Despesas projetadas". Verificação manual em Task 9/10.

---

### Task 1: Helper de aportes e resgates

**Files:**
- Create: `src/utils/aportes.ts`
- Create: `tests/aportes.test.ts`
- Modify: `package.json` (script `test`)
- Modify: `tsconfig.json` (`types` ganha `"node"`)

**Interfaces:**
- Produces: `APORTE_CATEGORY_ID: string`; `isAporte(tx)`; `isResgate(tx)`; `aporteNet(tx): number`; `sumAportes(txs): number`; `interface MonthTotals { income; expense; aportes; resgates; saved; balance }`; `summarizeTransactions(txs): MonthTotals`.
- `isAporte`/`isResgate` aceitam `Pick<Transaction, 'type' | 'category' | 'paymentMethod'>`; `aporteNet` acrescenta `'amount'`.

- [ ] **Step 1: Configure o runner**

Em `package.json`, adicione `"test": "tsx --test \"tests/**/*.test.ts\""`. Em `tsconfig.json`, use `"types": ["vite/client", "node"]`.

- [ ] **Step 2: Escreva os testes que falham**

`tests/aportes.test.ts`:

```ts
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
```

- [ ] **Step 3: Rode e confirme que falha**

Run: `npm test` — Expected: FAIL "Cannot find module '../src/utils/aportes'".

- [ ] **Step 4: Implemente `src/utils/aportes.ts`**

`matchesAporteRule(tx) = tx.category === APORTE_CATEGORY_ID || tx.paymentMethod === 'investment'`. `isAporte` exige `type === 'expense'`; `isResgate`, `type === 'income'`. `aporteNet` devolve `+amount` para aporte, `-amount` para resgate, `0` caso contrário.

`summarizeTransactions` percorre uma vez: aporte soma em `aportes`; resgate em `resgates`; receita normal em `income`; despesa normal em `expense`. Retorna `saved = aportes - resgates` e `balance = income - expense - saved`.

- [ ] **Step 5: Rode e confirme que passa**

Run: `npm test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json src/utils/aportes.ts tests/aportes.test.ts
git commit -m "feat(aportes): helper de aporte, resgate e totais do mes"
```

---

### Task 2: Série mensal com guardado acumulado

**Files:**
- Create: `src/utils/monthlySeries.ts`
- Create: `tests/monthlySeries.test.ts`

**Interfaces:**
- Consumes: `aporteNet`, `summarizeTransactions` (Task 1).
- Produces: `interface MonthPoint { key; label; year; month; income; expense; aportes; resgates; saved; balance; cumulativeSaved }`; `buildMonthSeries(transactions, startYear, startMonth, count): MonthPoint[]` (`startMonth` 0-11, aceita negativo); `cumulativeSavedThrough(transactions, endYear, endMonth): number`.

- [ ] **Step 1: Escreva os testes que falham**

`tests/monthlySeries.test.ts`:

```ts
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
```

- [ ] **Step 2: Rode e confirme que falha**

Run: `npm test` — Expected: FAIL "Cannot find module '../src/utils/monthlySeries'".

- [ ] **Step 3: Implemente `src/utils/monthlySeries.ts`**

`shiftMonth(year, month)` converte para índice absoluto `year * 12 + month`, divide com `Math.floor` e normaliza o mês com `((total % 12) + 12) % 12`.

`cumulativeSavedThrough` monta `endKey = YYYY-MM`, filtra `tx.date.slice(0, 7) <= endKey` e soma `aporteNet`.

`buildMonthSeries` começa com `previous = shiftMonth(startYear, startMonth - 1)` e `cumulativeSaved = cumulativeSavedThrough(...previous)`. Para cada mês: `key`, `label = formatMonthShort(year, month)`, `totals = summarizeTransactions(txs filtradas por key)`, `cumulativeSaved += totals.saved`, e empurra `{ key, label, year, month, ...totals, cumulativeSaved }`.

- [ ] **Step 4: Rode e confirme que passa**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/monthlySeries.ts tests/monthlySeries.test.ts
git commit -m "feat(graficos): serie mensal com guardado acumulado"
```

---

### Task 3: Inferência de categoria por palavra inteira

**Files:**
- Create: `src/utils/categoryInference.ts`
- Create: `tests/categoryInference.test.ts`
- Modify: `src/components/ImportSpreadsheetModal.tsx` (remove o mapa e a função locais; importa o helper)

**Interfaces:**
- Produces: `CATEGORY_KEYWORDS: Record<string, string[]>`; `inferCategoryFromDescription(description, type, categories: Pick<Category, 'id' | 'type'>[]): string | null`.

- [ ] **Step 1: Escreva os testes que falham**

`tests/categoryInference.test.ts`:

```ts
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
```

- [ ] **Step 2: Rode e confirme que falha**

Run: `npm test` — Expected: FAIL "Cannot find module '../src/utils/categoryInference'".

- [ ] **Step 3: Crie `src/utils/categoryInference.ts`**

Mova `CATEGORY_KEYWORDS` do importador para cá com estes ajustes: remova `'inter'` de `cat_investimentos_saida`; acrescente `'internet'`, `'fibra'`, `'banda larga'`, `'telecom'` a `cat_assinaturas`; remova `'internet fixa'` e `'net'` de `cat_moradia`, mantendo `'fibra'` e `'banda larga'` como fallback.

Normalização: `toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')`. Tokenização: `split(/[^a-z0-9]+/).filter(Boolean)`.

`inferCategoryFromDescription` achata o mapa em `{ catId, keyword }`, descarta categorias ausentes ou com `type` incompatível, ordena por `keyword.length` decrescente e devolve o primeiro `catId` cujo keyword aparece como sequência de tokens inteiros na descrição. Sem match, `null`.

- [ ] **Step 4: Use o helper no importador**

Remova o mapa e a função locais de `ImportSpreadsheetModal.tsx` e importe `inferCategoryFromDescription` de `../utils/categoryInference`. A chamada passa a ser `inferCategoryFromDescription(description, type, categories)`.

- [ ] **Step 5: Rode testes, typecheck e build**

Run: `npm test` — PASS. Run: `npm run lint` — sem erros. Run: `npm run build` — ok.

- [ ] **Step 6: Commit**

```bash
git add src/utils/categoryInference.ts tests/categoryInference.test.ts src/components/ImportSpreadsheetModal.tsx
git commit -m "fix(importacao): infere categoria por palavra inteira"
```

---

### Task 4: Reclassificar os 24 lançamentos de internet

**Files:** nenhum (dados no Supabase, projeto `agffyfubikxdvrmmcjia`).

- [ ] **Step 1: Registre o estado**

```sql
select category, count(*), sum(amount) from transactions
where description ilike '%Internet Pg%' group by category;
```

Expected: `cat_investimentos_saida | 24 | 2280.00`.

- [ ] **Step 2: Reclassifique**

```sql
update transactions set category = 'cat_assinaturas'
where description ilike '%Internet Pg%' and category = 'cat_investimentos_saida';
```

- [ ] **Step 3: Verifique**

```sql
select count(*) from transactions where category = 'cat_investimentos_saida';
select count(*) from transactions where date >= '2026-11-01' and date < '2026-12-01';
```

Expected: `0` e `46`.

---

### Task 5: Hero com 4 números e Visão geral sem aportes nas despesas

**Files:**
- Modify: `src/components/MonthBalanceHero.tsx`
- Modify: `src/components/DashboardView.tsx`

**Interfaces:**
- Consumes: `summarizeTransactions`, `isAporte` (Task 1); `cumulativeSavedThrough` (Task 2).
- Produces: `MonthBalanceHero` exige `saved: number` e `totalSaved: number`.

- [ ] **Step 1: Hero**

Adicione `saved` e `totalSaved` às props. Troque o grid para `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4`. Insira um card entre Despesas e Sobrou:

- rótulo `saved >= 0 ? 'Guardado' : 'Resgatado'`, ícone `PiggyBank`;
- valor `formatCurrency(Math.abs(saved))` em `--accent-text`;
- nota `totalSaved > 0 ? `${formatCurrency(totalSaved)} acumulado` : 'Comece a guardar este mês'`.

Na frase-resumo, inclua "foram guardados Z" (`saved > 0`) ou "foram resgatados Z" (`saved < 0`).

- [ ] **Step 2: DashboardView**

Importe os helpers. Substitua os `useMemo` de `totalIncome`, `totalExpense` e `balance` por:

```ts
const monthTotals = useMemo(() => summarizeTransactions(monthTransactions), [monthTransactions]);
const initialSaved = useMemo(
  () => accounts.filter((a) => a.type === 'investment').reduce((sum, a) => sum + a.initialBalance, 0),
  [accounts]
);
const totalSaved = useMemo(
  () => initialSaved + cumulativeSavedThrough(transactions, selectedYear, selectedMonth),
  [initialSaved, transactions, selectedYear, selectedMonth]
);
```

Passe `saved={monthTotals.saved}` e `totalSaved={totalSaved}` ao hero; use `monthTotals.income`, `monthTotals.expense` e `monthTotals.balance` onde os antigos valores eram usados.

- [ ] **Step 3: Exclua aportes do donut e das contagens**

Em `donutItems`, filtre `t.type === 'expense' && !isAporte(t)`. Em `paidCount`, `totalCount` e `creditCardTotal`, adicione `!isAporte(t)`.

- [ ] **Step 4: Verifique**

Run: `npm run lint` — sem erros. Run: `npm run build` — ok. Manual: hero com 4 cards; mês sem aporte mostra R$ 0,00; donut sem "Aportes".

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthBalanceHero.tsx src/components/DashboardView.tsx
git commit -m "feat(visao-geral): guardado vira metrica e aporte sai das despesas"
```

---

### Task 6: Estatísticas da aba Transações

**Files:**
- Modify: `src/components/TransactionsView.tsx` (cálculo de `filteredStats` e bloco de resumo)

**Interfaces:**
- Consumes: `summarizeTransactions` (Task 1).

- [ ] **Step 1: Troque o cálculo**

`const filteredStats = useMemo(() => summarizeTransactions(filteredTransactions), [filteredTransactions]);`

- [ ] **Step 2: Mostre Guardado**

No resumo Entradas/Saídas/Saldo, insira "Guardado: `formatCurrency(filteredStats.saved)`" antes de Saldo. Troque `filteredStats.net` por `filteredStats.balance`.

- [ ] **Step 3: Verifique e commit**

Run: `npm run lint` — sem erros.

```bash
git add src/components/TransactionsView.tsx
git commit -m "feat(transacoes): resumo com guardado e despesas sem aportes"
```

---

### Task 7: Gráfico de evolução com horizonte e guardado acumulado

**Files:**
- Create: `src/components/SavingsChart.tsx`
- Modify: `src/components/ProjectionChart.tsx`

**Interfaces:**
- Consumes: `buildMonthSeries`, `MonthPoint` (Task 2).
- Produces: `SavingsChart({ points, height?, compact? })`, com `points: Array<Pick<MonthPoint, 'key' | 'label' | 'cumulativeSaved'>>`.

- [ ] **Step 1: Crie `SavingsChart`**

SVG com `viewBox` de largura `Math.max(points.length * 48, 320)` e altura `height ?? 140` (90 quando `compact`). Escala própria entre `Math.min(0, ...valores)` e `Math.max(0, ...valores)`. Desenhe área (`path`) e linha (`polyline`) em `var(--accent-text)`, rótulos do primeiro e último mês, e o valor final com `formatCurrency`. Estado `hovered` mostra `label` e valor. `compact` esconde o valor final.

- [ ] **Step 2: Troque a fonte de dados do ProjectionChart**

Adicione `const [horizon, setHorizon] = useState<12 | 24 | 36 | 60>(12);` e:

```ts
const monthsData = useMemo(
  () => buildMonthSeries(transactions, selectedYear, selectedMonth, horizon),
  [transactions, selectedYear, selectedMonth, horizon]
);
```

Remova a interface `MonthData` e use `MonthPoint`. Troque `useState<MonthData | null>` por `useState<MonthPoint | null>`. Ajuste `maxVal` para considerar `cardTotalsByMonth[d.key]` e adicione:

```ts
const cardTotalsByMonth = useMemo(() => {
  const totals: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.paymentMethod !== 'credit' && tx.recurrence !== 'installment') continue;
    const key = tx.date.slice(0, 7);
    totals[key] = (totals[key] || 0) + tx.amount;
  }
  return totals;
}, [transactions]);
```

No `map` do SVG: `const cardTotal = cardTotalsByMonth[m.key] || 0;`.

- [ ] **Step 3: Seletor de horizonte**

Ao lado do seletor Entradas/Saídas, adicione um `<select aria-label="Horizonte do gráfico">` com 12/24/36/60, controlado por `horizon`.

- [ ] **Step 4: Painel de guardado acumulado**

Abaixo do SVG das barras, no mesmo card: rótulo "Guardado acumulado", valor `formatCurrency(monthsData[monthsData.length - 1]?.cumulativeSaved ?? 0)` e `<SavingsChart points={monthsData} compact />`.

- [ ] **Step 5: Tooltip**

Acrescente "Guardado" (`hoveredMonth.saved`) e "Acumulado" (`hoveredMonth.cumulativeSaved`) ao card flutuante.

- [ ] **Step 6: Verifique e commit**

Run: `npm run lint` — sem erros. Run: `npm run build` — ok.

```bash
git add src/components/SavingsChart.tsx src/components/ProjectionChart.tsx
git commit -m "feat(graficos): horizonte de 60 meses e guardado acumulado"
```

---

### Task 8: Aba Investimentos, navbar e preset do modal

**Files:**
- Create: `src/components/InvestmentsView.tsx`
- Modify: `src/components/Navbar.tsx` (navItems e grid mobile)
- Modify: `src/types/finance.ts` (`ViewTab`)
- Modify: `src/components/TransactionModal.tsx` (prop `preset`)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Tasks 1, 2 e 7.
- Produces: `ViewTab` inclui `'investments'`; `TransactionModal` ganha `preset?: Partial<Pick<Transaction, 'type' | 'category' | 'account' | 'paymentMethod' | 'description' | 'isPaid'>> | null`; `InvestmentsView` recebe `{ transactions, categories, accounts, selectedYear, selectedMonth, onSelectMonth, onOpenNewAporte, onOpenNewResgate, onEditTransaction, onDeleteTransaction }`.

- [ ] **Step 1: `ViewTab`**

`export type ViewTab = 'dashboard' | 'transactions' | 'investments' | 'budgets' | 'goals' | 'simulation';`

- [ ] **Step 2: Preset no modal**

No `else` do `useEffect` de reset (sem `initialData`), use `preset` como base: `type`, `category`, `account`, `paymentMethod`, `description` e `isPaid` vêm de `preset` quando existirem; o resto mantém os defaults atuais (entryMode `single`, amount vazio, data de hoje). Adicione `preset` às dependências do efeito.

- [ ] **Step 3: `InvestmentsView`**

Estado: `horizon` (12/24/36/60) e `visibleCount` (40).

Cálculos:

```ts
const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
const monthTotals = summarizeTransactions(transactions.filter((tx) => tx.date.startsWith(monthKey)));
const initialSaved = accounts.filter((a) => a.type === 'investment').reduce((s, a) => s + a.initialBalance, 0);
const totalSaved = initialSaved + cumulativeSavedThrough(transactions, selectedYear, selectedMonth);
const yearTotals = summarizeTransactions(
  transactions.filter((tx) => tx.date.startsWith(String(selectedYear)) && tx.date.slice(0, 7) <= monthKey)
);
const average = buildMonthSeries(transactions, selectedYear, selectedMonth - 11, 12)
  .reduce((sum, p) => sum + p.saved, 0) / 12;
const chartPoints = buildMonthSeries(transactions, selectedYear, selectedMonth - (horizon - 1), horizon);
const movements = transactions
  .filter((tx) => isAporte(tx) || isResgate(tx))
  .sort((a, b) => b.date.localeCompare(a.date));
```

Renderize, nesta ordem:

1. Cabeçalho com mês/ano, setas `onSelectMonth` e botões "Novo aporte" (primário) e "Novo resgate" (secundário).
2. Quatro cards: Total guardado (`totalSaved`), Aportes no mês (`monthTotals.aportes`), Aportes no ano (`yearTotals.aportes`), Média mensal (`average`). Se `monthTotals.resgates > 0`, nota `− {formatCurrency(...)} em resgates` no card do mês; o do ano usa `yearTotals.resgates`.
3. `<SavingsChart points={chartPoints} />` com `<select aria-label="Horizonte">` 12/24/36/60.
4. Lista dos `movements.slice(0, visibleCount)` agrupada por `date.slice(0, 7)`, aporte com `+` e resgate com `−`, nome da categoria/conta, botões editar/excluir.
5. "Carregar mais" enquanto `visibleCount < movements.length`.
6. Estado vazio com "Registrar primeiro aporte".

Use `ui-card`, `ui-tile`, `ui-stat-*`, `ui-btn`, `ui-badge`; ícones `PiggyBank`, `ArrowUpRight`, `ArrowDownRight`, `ChevronLeft`, `ChevronRight`, `Pencil`, `Trash2`.

- [ ] **Step 4: Navbar**

Adicione `{ id: 'investments', label: 'Investimentos', short: 'Investir' }` após Transações. No grid mobile, troque `grid-cols-2` por `grid-cols-3`.

- [ ] **Step 5: App**

Adicione `const [txPreset, setTxPreset] = useState<Partial<Transaction> | null>(null);` e:

```ts
const openAporteModal = (kind: 'aporte' | 'resgate') => {
  setEditingTx(null);
  setTxPreset({
    type: kind === 'aporte' ? 'expense' : 'income',
    category: APORTE_CATEGORY_ID,
    paymentMethod: 'investment',
    description: kind === 'aporte' ? 'Aporte' : 'Resgate',
  });
  setIsTxModalOpen(true);
};
```

Passe `preset={txPreset}` ao `TransactionModal` e limpe `setTxPreset(null)` no `onClose` e ao abrir o modal normal. Renderize `InvestmentsView` quando `currentTab === 'investments'`, passando `onSelectMonth={(year, month) => { setSelectedYear(year); setSelectedMonth(month); }}`.

- [ ] **Step 6: Verifique**

Run: `npm run lint` — sem erros. Run: `npm run build` — ok. Manual: aba aparece; "Novo aporte" abre com Aportes + Investimento e salva; Total guardado sobe; resgate reduz; editar/excluir funcionam; mobile com 3 abas.

- [ ] **Step 7: Commit**

```bash
git add src/types/finance.ts src/components/TransactionModal.tsx src/components/InvestmentsView.tsx src/components/Navbar.tsx src/App.tsx
git commit -m "feat(investimentos): nova aba, metricas e preset de aporte"
```

---

### Task 9: Simulação de longo prazo sem aportes nas despesas

**Files:**
- Modify: `src/components/FinancialProjectionView.tsx`

**Interfaces:**
- Consumes: `isAporte` (Task 1).

- [ ] **Step 1: Marque as linhas**

No retorno de `recurringGroups`, adicione `isAporteRow: isAporte(firstTx)`.

- [ ] **Step 2: Separe despesas de aportes**

`totalIncome` soma apenas linhas de receita com `!isAporteRow`; `totalExpense` soma apenas despesas com `!isAporteRow` (valores negativos em módulo); `totalSaved` soma os módulos das linhas com `isAporteRow`. `grandTotal = totalIncome - totalExpense - totalSaved`.

- [ ] **Step 3: Badge e card**

Linhas com `isAporteRow` mostram badge "Aporte" (`--accent-soft` / `--accent-text`). Adicione o 4º card "Guardado no período" (`totalSaved`) e troque o grid para `sm:grid-cols-2 lg:grid-cols-4`.

- [ ] **Step 4: Horizonte e alerta**

Adicione opções 36 e 60 meses. O alerta de déficit aparece quando `totalIncome > 0 && totalIncome - totalExpense < 0`, com `Math.abs(totalIncome - totalExpense)` na mensagem.

- [ ] **Step 5: Verifique e commit**

Run: `npm run lint` — sem erros. Run: `npm run build` — ok.

```bash
git add src/components/FinancialProjectionView.tsx
git commit -m "feat(simulacao): aportes fora das despesas e horizonte de 60 meses"
```

---

### Task 10: Verificação final e publicação

**Files:** nenhum.

- [ ] **Step 1: Suíte completa**

Run: `npm test` — PASS. Run: `npm run lint` — sem erros. Run: `npm run build` — ok.

- [ ] **Step 2: Cenários manuais (modo visitante, `localStorage.finanflow_transactions`)**

- Salário 5.000 + despesas 2.000 + aporte 1.000 → Entrou 5.000, Despesas 2.000, Guardado 1.000, Sobrou 2.000.
- Mesmo mês com resgate 300 → Guardado 700, Sobrou 2.300, Entrou 5.000.
- Mês sem aporte → Guardado R$ 0,00.
- Aba Investimentos: cards, gráfico e lista batem com os lançamentos.
- Horizonte 60 meses nos dois gráficos.
- Simulação: aporte com badge "Aporte", fora de "Despesas projetadas", somando em "Guardado no período".

- [ ] **Step 3: Banco**

```sql
select count(*) from transactions where category = 'cat_investimentos_saida';
```

Expected: `0`.

- [ ] **Step 4: Push**

```bash
git push origin main
```
