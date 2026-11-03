/**
 * Script de teste automatizado para validar o parser de importação de planilha
 * contra o CSV real do usuário.
 *
 * Replica a lógica do ImportSpreadsheetModal.tsx para verificar se:
 * 1. Linhas de título são puladas corretamente
 * 2. Cabeçalho de projeção é detectado
 * 3. Receitas vs despesas são classificadas pela coluna de grupo
 * 4. Valores zerados/vazios são ignorados
 * 5. Uma transação é criada por mês com valor não-zero
 * 6. Categorias são inferidas corretamente pela descrição
 * 7. Contas/cartões são inferidos corretamente pela descrição
 */

import fs from 'fs';
import path from 'path';

const csvPath = path.resolve(
  'C:/Users/Caio/Desktop/Projecao_Financeira_Caio_Lubia - Dashboard & Projeção.csv'
);

const rawCsv = fs.readFileSync(csvPath, 'utf8');

// --- Mock das categorias e contas do app ---
const mockCategories = [
  { id: 'cat_salario', name: 'Salário', type: 'income' },
  { id: 'cat_renda_extra', name: 'Renda extra', type: 'income' },
  { id: 'cat_rendimentos', name: 'Rendimentos', type: 'income' },
  { id: 'cat_moradia', name: 'Moradia', type: 'expense' },
  { id: 'cat_veiculo', name: 'Veículo', type: 'expense' },
  { id: 'cat_alimentacao', name: 'Alimentação', type: 'expense' },
  { id: 'cat_combustivel', name: 'Transporte', type: 'expense' },
  { id: 'cat_compras_cartao', name: 'Compras', type: 'expense' },
  { id: 'cat_saude', name: 'Saúde', type: 'expense' },
  { id: 'cat_lazer', name: 'Lazer', type: 'expense' },
  { id: 'cat_assinaturas', name: 'Assinaturas', type: 'expense' },
  { id: 'cat_investimentos_saida', name: 'Aportes', type: 'expense' },
  { id: 'cat_educacao', name: 'Educação', type: 'expense' },
  { id: 'cat_outros', name: 'Outros', type: 'expense' },
  { id: 'cat_aluguel', name: 'Aluguel', type: 'expense' },
  { id: 'cat_contas', name: 'Contas', type: 'expense' },
  { id: 'cat_outros_despesas', name: 'Outras Despesas', type: 'expense' },
];

const mockAccounts = [
  { id: 'acc_corrente', name: 'Conta Corrente Principal', type: 'checking' },
  { id: 'acc_picpay', name: 'Cartão principal', type: 'credit' },
  { id: 'acc_santander', name: 'Cartão secundário', type: 'credit' },
  { id: 'acc_riachuelo', name: 'Cartão de loja', type: 'credit' },
  { id: 'acc_cdb', name: 'Reserva e investimentos', type: 'investment' },
  { id: 'acc_carteira', name: 'Carteira', type: 'cash' },
  { id: 'acc_nubank', name: 'Nubank', type: 'credit' },
  { id: 'acc_inter', name: 'Inter', type: 'checking' },
  { id: 'acc_mercado_livre', name: 'Mercado Livre', type: 'credit' },
  { id: 'acc_itau', name: 'Itaú', type: 'credit' },
  { id: 'acc_shopee', name: 'Shopee', type: 'credit' },
];

// --- Replica as funções do componente ---

const getTodayString = () => new Date().toISOString().slice(0, 10);

const parseAmount = (val) => {
  if (!val) return { amount: 0 };
  let cleaned = val.replace(/R\$/g, '').trim();
  let detectedType = undefined;

  if (cleaned.startsWith('-') || cleaned.startsWith('(')) {
    detectedType = 'expense';
    cleaned = cleaned.replace(/[-()]/g, '').trim();
  } else if (cleaned.startsWith('+')) {
    detectedType = 'income';
    cleaned = cleaned.replace(/[+]/g, '').trim();
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return { amount: isNaN(num) ? 0 : Math.abs(num), detectedType };
};

const parseMonthLabel = (label) => {
  const ptMonths = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  };
  const m = label.trim().match(/^([a-z]{3})[\/\-](\d{2})$/i);
  if (!m) return null;
  const month = ptMonths[m[1].toLowerCase()];
  if (!month) return null;
  const year = 2000 + parseInt(m[2]);
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

const detectDelimiter = (line) => {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  if (line.includes(',')) return ',';
  return ',';
};

const parseCSVLine = (line, delimiter) => {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
};

const detectFormat = (headers) => {
  const hasMonthCols = headers.slice(2).some((h) => parseMonthLabel(h));
  if (hasMonthCols) return 'projection';

  const hasDateCol = headers.some((h) => /data|date/i.test(h));
  const hasAmountCol = headers.some((h) => /valor|amount|preço|preco/i.test(h));
  const hasDescCol = headers.some((h) => /desc|hist|título|titulo/i.test(h));
  if (hasDateCol && hasAmountCol && hasDescCol) return 'flat';

  return null;
};

const findHeaderLine = (lines) => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const delimiter = detectDelimiter(line);
    const parts = parseCSVLine(line, delimiter).map((h) => h.trim().toLowerCase());

    const hasCategoryOrDesc = parts.slice(0, 2).some(
      (h) => h.includes('categoria') || h.includes('descri') || h.includes('item')
    );
    const hasMonthCols = parts.slice(2).some((h) => parseMonthLabel(h));
    if (hasCategoryOrDesc && hasMonthCols) {
      return { headerIdx: i, delimiter, rawHeaders: parts };
    }

    const hasDateCol = parts.some((h) => /data|date/i.test(h));
    const hasAmountCol = parts.some((h) => /valor|amount|preço|preco/i.test(h));
    const hasDescCol = parts.some((h) => /desc|hist|título|titulo/i.test(h));
    if (hasDateCol && hasAmountCol && hasDescCol) {
      return { headerIdx: i, delimiter, rawHeaders: parts };
    }
  }
  return null;
};

const parseDate = (val) => {
  if (!val) return getTodayString();
  const trimmed = val.trim();
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brMatch) {
    let day = brMatch[1].padStart(2, '0');
    let month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  return getTodayString();
};

// --- Mapeamentos de palavras-chave (copiado do componente) ---

const CATEGORY_KEYWORDS = {
  cat_salario: ['salario', 'salário', 'vencimento', 'pagamento salario'],
  cat_renda_extra: ['renda extra', 'freelance', 'free lance', 'bico', 'extra'],
  cat_rendimentos: ['rendimento', 'juros', 'dividendo', 'dividendos', 'rentabilidade'],
  cat_aluguel: ['aluguel'],
  cat_veiculo: ['ipva', 'licenciamento', 'dpvat', 'financiamento', 'virtus', 'parcela carro', 'carro'],
  cat_combustivel: ['gasolina', 'etanol', 'diesel', 'posto', 'combustivel', 'combustível', 'abastecimento'],
  cat_alimentacao: ['supermercado', 'mercado', 'padaria', 'açougue', 'hortifruti', 'ifood', 'rappi', 'uber eats', 'zé delivery', 'japa', 'restaurante', 'lanche', 'almoço', 'jantar'],
  cat_saude: ['farmacia', 'farmácia', 'drogaria', 'medico', 'médico', 'hospital', 'clinica', 'clínica', 'exame', 'plano de saude', 'plano de saúde', 'seguro saude', 'seguro saúde', 'unimed', 'amil', 'sulamerica'],
  cat_assinaturas: ['netflix', 'spotify', 'prime', 'youtube', 'google one', 'amazonprime', 'amazon prime', 'apple', 'disney', 'hbo', 'paramount', 'globoplay', 'premiere', 'telecine', 'microsoft', 'office 365', 'adobe'],
  cat_lazer: ['cinema', 'teatro', 'show', 'viagem', 'uber', '99', 'uber eats', 'airbnb', 'booking', 'hotel', 'pousada', 'passagem', 'ingresso'],
  cat_educacao: ['escola', 'faculdade', 'universidade', 'curso', 'mensalidade', 'colegio', 'colégio', 'creche', 'material escolar'],
  cat_investimentos_saida: ['investimento', 'aporte', 'cdb', 'tesouro', 'acoes', 'ações', 'fundo', 'btg', 'xp', 'rico', 'clear', 'modal', 'inter', 'nubank invest'],
  cat_moradia: ['condominio', 'condomínio', 'iptu', 'agua', 'água', 'luz', 'energia', 'internet fixa', 'tv', 'telefone', 'celular', 'fixo', 'iptv', 'net', 'claro', 'oi', 'vivo', 'tim', 'fibra', 'banda larga'],
  cat_compras_cartao: ['riachuelo', 'renner', 'ceara', 'ceará', 'marisa', 'loja', 'e-commerce', 'ecommerce', 'magazine', 'magalu', 'casas bahia', 'ponto frio', 'fast shop', 'americanas', 'submarino', 'shoptime'],
  cat_outros: ['outros', 'diversos', 'variados'],
};

const ACCOUNT_KEYWORDS = {
  acc_picpay: ['picpay', 'pic pay', 'claro flex', 'amazonprime', 'amazon prime', 'google one', 'youtube', 'netflix', 'amazon br', 'netshoes', 'dermo ervas', 'paypal', 'lojafastop', 'shopee', 'mercado pago', 'mercadopago', 'internet pg', 'internet p g', 'fibra', 'banda larga'],
  acc_santander: ['santander', 'jim.com', 'panvel'],
  acc_riachuelo: ['riachuelo'],
  acc_mercado_livre: ['mercado livre', 'mercadolivre', 'compra diversa', 'secadora'],
  acc_itau: ['itau', 'itáu', 'fatura itau', 'fatura itáu', 'itau unibanco'],
  acc_shopee: ['shopee'],
  acc_nubank: ['nubank', 'nu bank', 'roxinho'],
  acc_inter: ['inter', 'banco inter'],
  acc_c6: ['c6', 'c6 bank'],
  acc_bb: ['banco do brasil', 'bb '],
  acc_caixa: ['caixa', 'caixa economica', 'caixa econômica'],
  acc_original: ['original', 'banco original'],
  acc_next: ['next', 'banco next'],
};

const inferCategoryFromDescription = (description, type, categories) => {
  const desc = description.toLowerCase();
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => desc.includes(k))) {
      const cat = categories.find((c) => c.id === catId);
      if (cat && (cat.type === type || cat.type === 'both')) return catId;
    }
  }
  return null;
};

const inferAccountFromDescription = (description, accounts) => {
  const desc = description.toLowerCase();
  for (const [accId, keywords] of Object.entries(ACCOUNT_KEYWORDS)) {
    if (keywords.some((k) => desc.includes(k))) {
      const acc = accounts.find((a) => a.id === accId);
      if (acc) return accId;
    }
  }
  return null;
};

const matchCategory = (catName, type, categories) => {
  if (!catName) {
    const fallback = categories.find((c) => c.type === type || c.type === 'both');
    return fallback?.id || categories[0]?.id || 'cat_outros_despesa';
  }
  const clean = catName.toLowerCase().trim();
  const found = categories.find((c) => {
    const n = c.name.toLowerCase();
    return n.includes(clean) || clean.includes(n);
  });
  if (found) return found.id;
  const fallback = categories.find((c) => c.type === type || c.type === 'both');
  return fallback?.id || categories[0]?.id || 'cat_outros_despesa';
};

const parseProjectionFormat = (lines, delimiter, rawHeaders, categories, accounts) => {
  const monthCols = [];
  rawHeaders.forEach((h, idx) => {
    if (idx < 2) return;
    const date = parseMonthLabel(h);
    if (date) monthCols.push({ idx, label: h, date });
  });

  if (monthCols.length === 0) return [];

  const transactionsList = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
    const rawGroup = cols[0] || '';
    const rawDesc = cols[1] || 'Lançamento Importado';

    if (!rawDesc) continue;

    const groupLower = rawGroup.toLowerCase();
    const isIncomeByGroup = groupLower.includes('receita');
    const isExpenseByGroup = groupLower.includes('despesa') || groupLower.includes('investimento');

    monthCols.forEach((mc) => {
      const rawVal = cols[mc.idx] || '';
      if (!rawVal || rawVal === '—' || rawVal === '0' || rawVal === '0,00' || rawVal === 'R$ 0,00') return;

      const { amount, detectedType } = parseAmount(rawVal);
      if (amount <= 0) return;

      let txType = 'expense';
      if (detectedType) {
        txType = detectedType;
      } else if (isIncomeByGroup) {
        txType = 'income';
      } else if (isExpenseByGroup) {
        txType = 'expense';
      } else {
        const d = rawDesc.toLowerCase();
        if (d.includes('salario') || d.includes('salário') || d.includes('venda') || d.includes('receita') || d.includes('bonus')) {
          txType = 'income';
        }
      }

      let categoryId;
      const inferredCat = inferCategoryFromDescription(rawDesc, txType, categories);
      if (inferredCat) {
        categoryId = inferredCat;
      } else if (rawGroup) {
        const clean = rawGroup.toLowerCase().trim();
        const found = categories.find((c) => {
          const n = c.name.toLowerCase();
          return n.includes(clean) || clean.includes(n);
        });
        categoryId = found?.id || matchCategory('', txType, categories);
      } else {
        categoryId = matchCategory('', txType, categories);
      }

      let accountId = accounts[0]?.id || 'acc_nubank';
      const inferredAcc = inferAccountFromDescription(rawDesc, accounts);
      if (inferredAcc) accountId = inferredAcc;

      transactionsList.push({
        date: mc.date,
        description: rawDesc,
        amount,
        type: txType,
        category: categoryId,
        account: accountId,
        paymentMethod: 'pix',
        isPaid: false,
        recurrence: 'single',
      });
    });
  }

  return transactionsList;
};

// --- Executa o teste ---

const lines = rawCsv
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

console.log(`Total de linhas não-vazias no CSV: ${lines.length}\n`);

const headerInfo = findHeaderLine(lines);
if (!headerInfo) {
  console.error('ERRO: Não foi possível encontrar o cabeçalho!');
  process.exit(1);
}

console.log(`Cabeçalho encontrado na linha ${headerInfo.headerIdx + 1}`);
console.log(`Delimitador: '${headerInfo.delimiter}'`);
console.log(`Colunas: ${headerInfo.rawHeaders.join(', ')}\n`);

const format = detectFormat(headerInfo.rawHeaders);
console.log(`Formato detectado: ${format}\n`);

const dataLines = lines.slice(headerInfo.headerIdx + 1);
console.log(`Linhas de dados a processar: ${dataLines.length}\n`);

const transactions = parseProjectionFormat(
  dataLines,
  headerInfo.delimiter,
  headerInfo.rawHeaders,
  mockCategories,
  mockAccounts
);

console.log(`=== RESULTADO: ${transactions.length} transações geradas ===\n`);

// Agrupa por mês para resumo
const byMonth = {};
transactions.forEach((t) => {
  const monthKey = t.date.slice(0, 7);
  if (!byMonth[monthKey]) byMonth[monthKey] = { income: 0, expense: 0, count: 0 };
  if (t.type === 'income') byMonth[monthKey].income += t.amount;
  else byMonth[monthKey].expense += t.amount;
  byMonth[monthKey].count += 1;
});

const months = Object.keys(byMonth).sort();
months.forEach((m) => {
  const { income, expense, count } = byMonth[m];
  console.log(`${m}: ${count} lançamentos | Receitas: R$ ${income.toFixed(2)} | Despesas: R$ ${expense.toFixed(2)} | Saldo: R$ ${(income - expense).toFixed(2)}`);
});

console.log('\n--- Exemplos de transações com categoria e conta inferidas ---');
transactions.slice(0, 20).forEach((t, i) => {
  console.log(`${i + 1}. [${t.type.toUpperCase()}] ${t.description} | ${t.date} | R$ ${t.amount.toFixed(2)} | Cat: ${t.category} | Conta: ${t.account}`);
});

console.log(`\n... e mais ${transactions.length - 20} transações.`);

// Validações de categoria/conta
console.log('\n=== VALIDAÇÕES DE CATEGORIA E CONTA ===');

const catCounts = {};
const accCounts = {};
transactions.forEach(t => {
  catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  accCounts[t.account] = (accCounts[t.account] || 0) + 1;
});

console.log('\nDistribuição de categorias:');
Object.entries(catCounts).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
  const catName = mockCategories.find(c => c.id === cat)?.name || cat;
  console.log(`  ${catName} (${cat}): ${count}`);
});

console.log('\nDistribuição de contas:');
Object.entries(accCounts).sort((a,b) => b[1]-a[1]).forEach(([acc, count]) => {
  const accName = mockAccounts.find(a => a.id === acc)?.name || acc;
  console.log(`  ${accName} (${acc}): ${count}`);
});

// Validações específicas
console.log('\n--- Validações pontuais ---');

const salarioCaio = transactions.filter(t => t.description.includes('Salário Líquido (Caio)'));
console.log(`1. Salário Caio: ${salarioCaio.length} lançamentos, categoria: ${salarioCaio[0]?.category}, conta: ${salarioCaio[0]?.account}`);

const salarioLubia = transactions.filter(t => t.description.includes('Salário Líquido (Lúbia)'));
console.log(`2. Salário Lúbia: ${salarioLubia.length} lançamentos, categoria: ${salarioLubia[0]?.category}, conta: ${salarioLubia[0]?.account}`);

const financiamento = transactions.filter(t => t.description.includes('Financiamento Virtus Santander'));
console.log(`3. Financiamento Santander: ${financiamento.length} lançamentos, categoria: ${financiamento[0]?.category}, conta: ${financiamento[0]?.account}`);

const aluguel = transactions.filter(t => t.description === 'Aluguel');
console.log(`4. Aluguel: ${aluguel.length} lançamentos, categoria: ${aluguel[0]?.category}, conta: ${aluguel[0]?.account}`);

const picpayItems = transactions.filter(t => t.account === 'acc_picpay');
console.log(`5. Itens no PicPay: ${picpayItems.length} lançamentos`);
const picpayDesc = [...new Set(picpayItems.map(t => t.description))];
picpayDesc.slice(0, 10).forEach(d => console.log(`   - ${d}`));

const santanderItems = transactions.filter(t => t.account === 'acc_santander');
console.log(`6. Itens no Santander: ${santanderItems.length} lançamentos`);
const santanderDesc = [...new Set(santanderItems.map(t => t.description))];
santanderDesc.forEach(d => console.log(`   - ${d}`));

const riachueloItems = transactions.filter(t => t.account === 'acc_riachuelo');
console.log(`7. Itens no Riachuelo: ${riachueloItems.length} lançamentos`);
const riachueloDesc = [...new Set(riachueloItems.map(t => t.description))];
riachueloDesc.forEach(d => console.log(`   - ${d}`));

const mercadoLivreItems = transactions.filter(t => t.account === 'acc_mercado_livre');
console.log(`8. Itens no Mercado Livre: ${mercadoLivreItems.length} lançamentos`);
const mlDesc = [...new Set(mercadoLivreItems.map(t => t.description))];
mlDesc.forEach(d => console.log(`   - ${d}`));

const investimentoItems = transactions.filter(t => t.category === 'cat_investimentos_saida');
console.log(`9. Investimentos/Aportes: ${investimentoItems.length} lançamentos`);
const invDesc = [...new Set(investimentoItems.map(t => t.description))];
invDesc.forEach(d => console.log(`   - ${d} (conta: ${investimentoItems.find(t => t.description === d)?.account})`));

console.log('\n✅ Teste concluído!');