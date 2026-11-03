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
 */

import fs from 'fs';
import path from 'path';

const csvPath = path.resolve(
  'C:/Users/Caio/Desktop/Projecao_Financeira_Caio_Lubia - Dashboard & Projeção.csv'
);

const rawCsv = fs.readFileSync(csvPath, 'utf8');

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

      transactionsList.push({
        date: mc.date,
        description: rawDesc,
        amount,
        type: txType,
        group: rawGroup,
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

const categories = []; // não usado neste teste
const accounts = [];   // não usado neste teste

const transactions = parseProjectionFormat(
  dataLines,
  headerInfo.delimiter,
  headerInfo.rawHeaders,
  categories,
  accounts
);

console.log(`=== RESULTADO: ${transactions.length} transações geradas ===\n`);

// Agrupa por mês para resumo
const byMonth = {};
transactions.forEach((t) => {
  const monthKey = t.date.slice(0, 7); // YYYY-MM
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

console.log('\n--- Exemplos de transações geradas ---');
transactions.slice(0, 10).forEach((t, i) => {
  console.log(`${i + 1}. [${t.type.toUpperCase()}] ${t.description} | ${t.date} | R$ ${t.amount.toFixed(2)} | Grupo: ${t.group}`);
});

console.log(`\n... e mais ${transactions.length - 10} transações.`);

// Validações esperadas
console.log('\n=== VALIDAÇÕES ===');
const salarioCaio = transactions.filter(t => t.description.includes('Salário Líquido (Caio)'));
console.log(`1. Salário Caio: ${salarioCaio.length} lançamentos (esperado: 23, um por mês Set/26 a Ago/28)`);
const set26 = salarioCaio.find(t => t.date === '2026-09-01');
console.log(`   Set/26: R$ ${set26?.amount.toFixed(2)} (esperado: 5.322,00)`);
const out26 = salarioCaio.find(t => t.date === '2026-10-01');
console.log(`   Out/26: R$ ${out26?.amount.toFixed(2)} (esperado: 5.272,00)`);

const decimo = transactions.filter(t => t.description.includes('13º Salário'));
console.log(`2. 13º Salário: ${decimo.length} lançamentos (esperado: 2, Dez/26 e Dez/27)`);
decimo.forEach(t => console.log(`   ${t.date}: R$ ${t.amount.toFixed(2)}`));

const financiamento = transactions.filter(t => t.description.includes('Financiamento Virtus Santander'));
console.log(`3. Financiamento Santander: ${financiamento.length} lançamentos (esperado: 23)`);
console.log(`   Valor médio: R$ ${(financiamento.reduce((s, t) => s + t.amount, 0) / financiamento.length).toFixed(2)}`);

const receitas = transactions.filter(t => t.type === 'income').length;
const despesas = transactions.filter(t => t.type === 'expense').length;
console.log(`4. Total receitas: ${receitas} | Total despesas: ${despesas}`);

console.log('\n✅ Teste concluído!');