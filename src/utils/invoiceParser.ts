/**
 * Parser puro (sem DOM, sem rede) para extrair compras e parcelas a partir do
 * texto bruto devolvido pelo OCR local (Tesseract.js).
 *
 * Cobre os padrões mais comuns de prints brasileiros:
 *  - "5x de R$ 89,90", "10x R$ 125,00", "parcela 3/5 de R$ 100,00"
 *  - "Total R$ 449,50", "Valor total: 1.234,56"
 *  - datas "10/11", "10/11/2026"
 *  - confusões clássicas de OCR (O→0, l→1, S→5) dentro de números
 */

export interface InvoiceItemDraft {
  description: string;
  totalAmount: number;
  installmentsCount: number;
  installmentAmount: number;
  currentInstallment: number;
  date: string;
  type: 'expense' | 'income';
  suggestedCategoryId: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'transfer';
}

export interface InvoiceParseOptions {
  /** Confiança média do OCR (0-100), quando disponível. */
  confidence?: number | null;
}

export interface InvoiceParseResult {
  detectedInstitution: string | null;
  summary: string;
  items: InvoiceItemDraft[];
  lowConfidence: boolean;
  /** Texto bruto lido pelo OCR (para diagnóstico). */
  rawText: string;
}

/* ------------------------------------------------------------------ */
/* Normalização básica                                                 */
/* ------------------------------------------------------------------ */

const OCR_LOOKALIKES: Record<string, string> = {
  O: '0',
  o: '0',
  l: '1',
  I: '1',
  S: '5',
  Z: '2',
  B: '8',
  g: '9',
};

/** Troca letras por dígitos apenas quando encostadas em números (ex.: "89,9O"). */
function fixOcrDigits(line: string): string {
  return line.replace(
    /[\d.,][OolISZBg]|[OolISZBg][\d.,]/g,
    (chunk) => chunk.replace(/[OolISZBg]/g, (c) => OCR_LOOKALIKES[c] ?? c),
  );
}

function normalizeLine(line: string): string {
  return fixOcrDigits(line.replace(/\u00a0/g, ' ')).replace(/\s+/g, ' ').trim();
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeForMatch(text: string): string {
  return stripAccents(text.toLowerCase()).replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Números no formato brasileiro                                       */
/* ------------------------------------------------------------------ */

function toNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Converte tokens como "1.234,56", "89,90", "89.90", "1000" em número. */
function parseNumberToken(raw: string): number | null {
  const token = raw.replace(/\s+/g, '');
  if (!/\d/.test(token)) return null;

  const lastComma = token.lastIndexOf(',');
  const lastDot = token.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep === -1) return toNumber(token);

  const sep = token[lastSep];
  const decimals = token.slice(lastSep + 1);
  const integerDigits = token.slice(0, lastSep).replace(/[.,]/g, '');

  // Separador com 1-2 dígitos depois é decimal (89,90 / 89.90)
  if (decimals.length >= 1 && decimals.length <= 2) {
    return toNumber(`${integerDigits}.${decimals}`);
  }
  // Separador com bloco de 3 dígitos é milhar (1.234 / 1,234 / 1.234.567)
  if (decimals.length === 3) {
    return toNumber(`${integerDigits}${decimals}`);
  }
  // Caso estranho: ignora separadores restantes
  return toNumber(`${integerDigits}${decimals}`);
}

interface AmountMatch {
  value: number;
  index: number;
  raw: string;
}

/**
 * Encontra valores monetários em uma linha.
 * Considera dinheiro quando o número tem decimal plausível ("89,90") ou quando
 * vem precedido de R$ / RS / $. Ignora datas ("10/11"), parcelas ("5x"),
 * anos e contas ("123.456.789/0001-90").
 */
function extractAmounts(line: string): AmountMatch[] {
  const out: AmountMatch[] = [];
  const re = /\d[\d.,]*\d|\d/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    const raw = m[0];
    const start = m.index;
    const before = line.slice(0, start);
    const after = line.slice(start + raw.length);

    // Seguido de "x", "/", "ª" não é dinheiro ("5x", "10/11", "2ª")
    if (/^\s*[x×/º°ª]/i.test(after)) continue;

    const hasCurrency = /(\bR\s*[\$.]?|\bRS\b|\$)\s*$/i.test(before);
    const hasDecimal = /[.,]\d{1,2}$/.test(raw);
    if (!hasCurrency && !hasDecimal) continue; // inteiros sem R$ (anos, telas...)

    const value = parseNumberToken(raw);
    if (value === null || value <= 0 || value > 1_000_000_000) continue;

    out.push({ value, index: start, raw });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Parcelas                                                            */
/* ------------------------------------------------------------------ */

interface InstallmentInfo {
  count?: number;
  installmentAmount?: number;
  current?: number;
}

function detectInstallments(line: string): InstallmentInfo {
  const info: InstallmentInfo = {};

  // "5x de R$ 89,90" | "5x R$ 89,90" | "em 5x de 89,90"
  const nx = line.match(
    /(\d{1,2})\s*[x×]\s*(?:de|em|por|\/|s\/|sem|com)?\s*(?:r\s*[\$.]?\s*)?(\d[\d.,]*\d|\d)(?!\s*[x×\/])/i,
  );
  if (nx) {
    const count = Number(nx[1]);
    if (count >= 2 && count <= 99) {
      info.count = count;
      const amount = parseNumberToken(nx[2]);
      if (amount && amount > 0) info.installmentAmount = amount;
    }
  }

  // "em até 10x" / "parcelado em 5x" (sem valor logo na sequência)
  // Recebe texto sem acentos (lineNorm), por isso "ate" sem til
  if (!info.count) {
    const em = line.match(
      /(?:em|ate|parcelado|dividido|dividida)\s*(?:em|ate)?\s*(\d{1,2})\s*[x×]/i,
    );
    if (em) {
      const count = Number(em[1]);
      if (count >= 2 && count <= 99) info.count = count;
    }
  }

  // "parcela 3/5" | "parcela 3 de 5 de R$ 100,00"
  const par = line.match(
    /parcel(?:a|as)\s*(?:n[ºo°.]?\s*)?(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})(?:\s*(?:de|no valor de|com valor de)\s*(?:r\s*[\$.]?\s*)?(\d[\d.,]*\d|\d))?/i,
  );
  if (par) {
    const current = Number(par[1]);
    const total = Number(par[2]);
    if (total >= 2 && total <= 99) {
      info.current = current >= 1 ? current : 1;
      info.count = total;
      if (par[3]) {
        const amount = parseNumberToken(par[3]);
        if (amount && amount > 0) info.installmentAmount = amount;
      }
    }
  }

  return info;
}

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Extrai "10/11", "10/11/2026", "10-11-26" de uma linha. */
function extractDate(line: string): { iso: string } | null {
  const m = line.match(/\b(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?\b/);
  if (!m) return null;

  // "parcela 3/5" não é data
  const before = line.slice(0, m.index);
  if (/parcel\w*\s*$/i.test(before)) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  let year: number;
  if (m[3]) {
    const raw = Number(m[3]);
    year = m[3].length === 2 ? 2000 + raw : raw;
    if (year < 2000 || year > 2100) return null;
  } else {
    const now = new Date();
    year = now.getFullYear();
    // Sem ano: data "longe no futuro" pertence ao ano anterior
    const candidate = new Date(year, month - 1, day);
    const limit = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    if (candidate > limit) year -= 1;
  }

  return { iso: `${year}-${pad(month)}-${pad(day)}` };
}

/* ------------------------------------------------------------------ */
/* Instituições                                                       */
/* ------------------------------------------------------------------ */

const INSTITUTIONS: { label: string; aliases: string[] }[] = [
  { label: 'Riachuelo', aliases: ['riachuelo'] },
  { label: 'PicPay', aliases: ['picpay', 'pic pay'] },
  { label: 'Santander', aliases: ['santander'] },
  { label: 'Nubank', aliases: ['nubank', 'nu bank'] },
  { label: 'Itaú', aliases: ['itau'] },
  { label: 'Banco Inter', aliases: ['banco inter', 'inter bank'] },
  { label: 'Caixa', aliases: ['caixa economica', 'cef'] },
  { label: 'Bradesco', aliases: ['bradesco'] },
  { label: 'Banco do Brasil', aliases: ['banco do brasil'] },
  { label: 'C6 Bank', aliases: ['c6 bank', 'c6bank'] },
  { label: 'Mercado Pago', aliases: ['mercado pago', 'mercadopago'] },
  { label: 'Mercado Livre', aliases: ['mercado livre', 'mercadolivre'] },
  { label: 'Carrefour', aliases: ['carrefour'] },
  { label: 'Magazine Luiza', aliases: ['magazine luiza', 'magalu', 'magazine luiz'] },
  { label: 'Americanas', aliases: ['americanas'] },
  { label: 'Renner', aliases: ['renner'] },
  { label: 'Zara', aliases: ['zara'] },
  { label: 'C&A', aliases: ['c&a'] },
  { label: 'Shopee', aliases: ['shopee'] },
  { label: 'iFood', aliases: ['ifood'] },
  { label: 'Uber', aliases: ['uber'] },
  { label: 'Amazon', aliases: ['amazon'] },
  { label: 'Assaí', aliases: ['assai'] },
  { label: 'Pão de Açúcar', aliases: ['pao de acucar'] },
  { label: 'Drogasil', aliases: ['drogasil'] },
  { label: 'Raia', aliases: ['droga raia', 'raia drogasil'] },
  { label: 'Panvel', aliases: ['panvel'] },
  { label: 'Shell', aliases: ['shell'] },
  { label: 'Ipiranga', aliases: ['ipiranga'] },
  { label: 'Subway', aliases: ['subway'] },
  { label: "McDonald's", aliases: ["mcdonald's", 'mcdonalds'] },
  { label: "Rio Verde", aliases: ["rio verde", "rioverde"] },
];

/** Distância de edição limitada a 1 (rápida, para erros de OCR em nomes). */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  if (la === lb) {
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i] && ++diffs > 1) return false;
    }
    return diffs <= 1;
  }
  const [short, long] = la < lb ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
    } else {
      if (++edits > 1) return false;
      j++;
    }
  }
  return true;
}

function detectInstitution(rawText: string): string | null {
  const text = normalizeForMatch(rawText);
  if (!text) return null;
  const words = text.split(/[^a-z0-9&]+/).filter(Boolean);

  for (const { label, aliases } of INSTITUTIONS) {
    for (const alias of aliases) {
      const normAlias = normalizeForMatch(alias);
      const escaped = normAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`).test(text)) return label;

      const aliasWords = normAlias.split(/\s+/).filter(Boolean);

      // Nome de uma palavra com erro de OCR (ex.: "RiachueIo", "RioWerde")
      if (aliasWords.length === 1) {
        const a = aliasWords[0];
        if (a.length >= 5 && words.some((w) => withinOneEdit(w, a))) return label;
        continue;
      }

      // Nome com duas+ palavras: o OCR junta, separa ou erra letras
      // ("RioWerde", "Rie Verde", "RioVerde") — compara janela deslizante
      const joinedAlias = aliasWords.join('');
      if (words.some((w) => withinOneEdit(w, joinedAlias))) return label;
      for (let i = 0; i + aliasWords.length <= words.length; i++) {
        const win = words.slice(i, i + aliasWords.length);
        if (win.every((w, j) => withinOneEdit(w, aliasWords[j]))) return label;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Categorias                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_RULES: { id: string; keywords: string[] }[] = [
  {
    id: 'cat_alimentacao',
    keywords: [
      'supermercado', 'mercado', 'ifood', 'restaurante', 'padaria', 'acougue',
      'atacadao', 'carrefour', 'pao de acucar', 'hortifruti', 'lanchonete',
      'pizzaria', 'hamburguer', 'mcdonalds', 'starbucks', 'acai', 'mercadinho',
    ],
  },
  {
    id: 'cat_saude',
    keywords: [
      'farmacia', 'drogaria', 'drogasil', 'hospital', 'clinica', 'laboratorio',
      'dentista', 'exame', 'remedio', 'unimed', 'sulamerica', 'consulta',
    ],
  },
  {
    id: 'cat_combustivel',
    keywords: [
      'posto', 'gasolina', 'combustivel', 'etanol', 'diesel', 'uber', '99app',
      'shell', 'ipiranga', 'petrobras',
    ],
  },
  {
    id: 'cat_moradia',
    keywords: [
      'aluguel', 'condominio', 'energia', 'enel', 'sabesp', 'copasa',
      'gas natural', 'internet', 'vivo fibra', 'oi fibra', 'conta de luz',
    ],
  },
  {
    id: 'cat_lazer',
    keywords: ['cinema', 'netflix', 'spotify', 'steam', 'playstation', 'xbox', 'ingresso', 'show'],
  },
  {
    id: 'cat_assinaturas',
    keywords: ['assinatura', 'prime video', 'disney', 'hbo', 'youtube premium', 'icloud'],
  },
  {
    id: 'cat_educacao',
    keywords: ['escola', 'faculdade', 'curso', 'livraria', 'mensalidade escolar'],
  },
  {
    id: 'cat_veiculo',
    keywords: ['oficina', 'mecanica', 'ipva', 'seguro auto', 'estacionamento', 'pedagio'],
  },
];

function suggestCategory(text: string): string {
  const norm = normalizeForMatch(text);
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => norm.includes(k))) return rule.id;
  }
  return 'cat_compras_cartao';
}

function suggestIncomeCategory(text: string): string {
  const norm = normalizeForMatch(text);
  if (/salario|holerite|folha de pagamento/.test(norm)) return 'cat_salario';
  if (/rendimento|juros|dividendo|renda extra|aplicacao/.test(norm)) return 'cat_rendimentos';
  return 'cat_renda_extra';
}

/* ------------------------------------------------------------------ */
/* Ruído / linhas descartáveis                                        */
/* ------------------------------------------------------------------ */

/* Ruído tolerante a erro de OCR: "Triv aprox", "Lei ral 12.741", "Sistemas
 * Ltda ... 1.91.53" são lixo comum de rodapé de cupom, não compras. */
const NOISE_LINE =
  /(saldo|limite|disponivel|\bpontos\b|cashback|beneficio|\bcnpj\b|\bcpf\b|www\.|http|@|endereco|telefone|whatsapp|instagram|facebook|agencia|autentique|privacidade|tributos|tri[bv]\s*a?p?r?o?x|lei federal|12[.,]?741|ibpt|fecomercio|fonte:|protocolo|\bpdv\b|\bserie\b|sistema|\bfed\b.*\best\b|\best\b.*\bmun\b)/i;

const TOTAL_LINE = /\b(total|subtotal|soma|montante|fatura|valor|a pagar)\b/i;

const INCOME_LINE = /(pix recebido|recebimento|recebido de|salario|estorno|credito de|credito em|deposito)/i;

const PAYMENT = {
  pix: /\bpix\b/i,
  debit: /\bd[ée]bito\b|pagou com|cart[ãa]o de d[ée]bito/i,
  credit: /\bcr[ée]dito\b|cart[ãa]o de cr[ée]dito|fatura/i,
};

const DESCRIPTION_STOPWORDS = new Set([
  'de', 'do', 'da', 'em', 'por', 'com', 'sem', 'no', 'na', 'e', 'o', 'a', 'aprox',
  'os', 'as', 'ao', 'à', 'valor', 'total', 'parcela', 'parcelas', 'compra',
  'compras', 'r', 'rs', 's', 'd', 'juros', 'cartao', 'credito', 'debito', 'fatura',
  'vencimento', 'pagamento', 'referente', 'cbr', 'ao', 'dia', 'mes',
]);

/**
 * Palavra com forma plausível. O OCR de logos estilizados e carimbos costuma
 * devolver lixo como "VV een" ou letras soltas — isso nunca deve virar nome de
 * lançamento. Regras: precisa de vogal e, com 3+ letras, de consoante; tokens
 * com dígitos ("600ml", "300g") passam livres.
 */
function isPlausibleWord(raw: string): boolean {
  const w = normalizeForMatch(raw).replace(/[^a-z0-9]/g, '');
  if (!w) return false;
  if (/\d/.test(w)) return w.length >= 2;
  if (w.length < 2) return false; // letra solta: "d", "s"
  if (!/[aeiou]/.test(w)) return false; // só consoantes: "vv", "cbr"
  return true;
}

function lettersCount(text: string): number {
  return text.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
}

/**
 * Mantém só as palavras que fazem sentido e devolve string vazia quando sobra
 * texto curto demais para ser nome de compra — "VV een", "Cbr", "aprox" nunca
 * chegam ao lançamento.
 */
function meaningfulWords(text: string): string {
  const words = text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(
      (w) =>
        w.length > 0 &&
        !DESCRIPTION_STOPWORDS.has(normalizeForMatch(w)) &&
        isPlausibleWord(w),
    );
  const joined = words.join(' ');
  return lettersCount(joined) >= 4 ? joined : '';
}

function lineDescription(line: string, amounts: AmountMatch[]): string {
  let desc = line;
  for (const a of amounts) {
    desc = desc.replace(a.raw, ' ');
  }
  desc = desc
    .replace(/\b\d{1,2}\s*[/\-.]\s*\d{1,2}(?:\s*[/\-.]\s*\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}\s*[x×]\b/gi, ' ')
    .replace(/\bR\s*\$/gi, ' ')
    .replace(/[^\p{L}\d%&@./-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return meaningfulWords(desc);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizedDesc(text: string): string {
  return normalizeForMatch(text).replace(/[^a-z0-9]+/g, ' ').trim();
}

function similarDescription(a: string, b: string): boolean {
  const na = normalizedDesc(a);
  const nb = normalizedDesc(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 5 && nb.length >= 5 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Parser principal                                                    */
/* ------------------------------------------------------------------ */

interface Candidate {
  description: string;
  totalAmount: number;
  installmentsCount: number;
  installmentAmount: number;
  currentInstallment: number;
  date: string | null;
  source: 'installment' | 'single' | 'total-fallback';
  type: 'expense' | 'income';
  suggestedCategoryId: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'transfer';
}

export function parseInvoiceText(
  rawText: string,
  options: InvoiceParseOptions = {},
): InvoiceParseResult {
  const text = (rawText || '').replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map(normalizeLine)
    .filter((l) => l.length > 0);

  const detectedInstitution = detectInstitution(text);
  const confidence = options.confidence;

  const strong: Candidate[] = [];
  const weak: Candidate[] = [];
  const totalAmounts: number[] = [];
  const documentDates: string[] = [];
  const labelLines: string[] = [];
  const lastNoDateCounts = new Map<number, number>();
  const nonLastValues = new Set<number>();
  let lastLabel: string | null = null;
  let firstDate: string | null = null;

  for (const line of lines) {
    const lineNorm = stripAccents(line.toLowerCase());
    const date = extractDate(lineNorm);
    if (date && !firstDate) firstDate = date.iso;
    if (date && /(venc|vence|emiss|pagam|data)/.test(lineNorm)) documentDates.push(date.iso);

    if (NOISE_LINE.test(lineNorm)) continue;

    const amounts = extractAmounts(lineNorm);
    const info = detectInstallments(lineNorm);
    const isTotal = TOTAL_LINE.test(lineNorm);
    const hasIncome = INCOME_LINE.test(lineNorm);

    if (isTotal && amounts.length > 0) {
      totalAmounts.push(Math.max(...amounts.map((a) => a.value)));
    }

    // Valor que aparece repetido no FIM de linhas sem data é provável total do
    // documento (cupons imprimem subtotal/total/pago com o mesmo número);
    // valores no meio da linha são preço unitário ou códigos.
    if (amounts.length > 0 && !date) {
      const lastVal = round2(amounts[amounts.length - 1].value);
      lastNoDateCounts.set(lastVal, (lastNoDateCounts.get(lastVal) ?? 0) + 1);
      for (let i = 0; i < amounts.length - 1; i++) {
        nonLastValues.add(round2(amounts[i].value));
      }
    }

    // Linha só de texto (ex.: "Supermercado Carrefour") serve de rótulo para
    // valores que aparecem em outra linha (layouts em coluna)
    const lineLetters = lettersCount(line);
    const lineHasWord = meaningfulWords(line).length > 0;
    if (
      amounts.length === 0 &&
      !info.count &&
      !isTotal &&
      lineLetters >= 3 &&
      lineHasWord &&
      !/(venc|vence|emiss|pagam|data)/.test(lineNorm)
    ) {
      labelLines.push(line);
      lastLabel = line;
    }

    const payment: Candidate['paymentMethod'] = PAYMENT.pix.test(lineNorm)
      ? 'pix'
      : PAYMENT.debit.test(lineNorm) && !PAYMENT.credit.test(lineNorm)
        ? 'debit'
        : PAYMENT.credit.test(lineNorm)
          ? 'credit'
          : 'credit';

    /* --- Linha com parcelamento identificado --- */
    if (info.count && info.count > 1 && amounts.length > 0) {
      const maxAmount = Math.max(...amounts.map((a) => a.value));
      let totalAmount: number;
      let installmentAmount: number;

      if (info.installmentAmount && info.installmentAmount > 0) {
        installmentAmount = info.installmentAmount;
        const bigEnough = isTotal && maxAmount > installmentAmount * 1.5;
        totalAmount = bigEnough ? maxAmount : round2(installmentAmount * info.count);
      } else {
        // Valor na linha é o total ("Total 449,50 em 5x" / "Compra em 5x — R$ 449,50")
        totalAmount = maxAmount;
        installmentAmount = round2(totalAmount / info.count);
      }

      strong.push({
        description: lineDescription(line, amounts) || detectedInstitution || 'Compra parcelada',
        totalAmount: round2(totalAmount),
        installmentsCount: info.count,
        installmentAmount: round2(installmentAmount),
        currentInstallment: info.current ?? 1,
        date: date?.iso ?? null,
        source: 'installment',
        type: hasIncome ? 'income' : 'expense',
        suggestedCategoryId: suggestCategory(line),
        paymentMethod: payment,
      });
      continue;
    }

    /* --- Parcelamento sem valor legível (item em branco p/ revisão) --- */
    if (info.count && info.count > 1 && amounts.length === 0 && !/\bate\b|juros/.test(lineNorm)) {
      strong.push({
        description: lineDescription(line, amounts) || detectedInstitution || 'Compra parcelada',
        totalAmount: 0,
        installmentsCount: info.count,
        installmentAmount: 0,
        currentInstallment: info.current ?? 1,
        date: date?.iso ?? null,
        source: 'installment',
        type: 'expense',
        suggestedCategoryId: suggestCategory(line),
        paymentMethod: 'credit',
      });
      continue;
    }

    /* --- Linha comum com valor --- */
    if (amounts.length > 0 && !isTotal) {
      const best = amounts[amounts.length - 1];
      const desc = lineDescription(line, amounts);
      const descHasText = desc.replace(/[^a-zA-ZÀ-ÿ]/g, '').length >= 3;
      const description = descHasText ? desc : lastLabel;

      if (description) {
        const labelContext = stripAccents(labelLines.join(' ').toLowerCase());
        const incomeLabel = labelLines.some((l) =>
          INCOME_LINE.test(stripAccents(l.toLowerCase())),
        );
        const isIncome = hasIncome || incomeLabel;
        weak.push({
          description,
          totalAmount: best.value,
          installmentsCount: 1,
          installmentAmount: best.value,
          currentInstallment: 1,
          date: date?.iso ?? null,
          source: 'single',
          type: isIncome ? 'income' : 'expense',
          suggestedCategoryId: isIncome
            ? suggestIncomeCategory(description)
            : suggestCategory(`${description} ${line}`),
          paymentMethod:
            PAYMENT.pix.test(lineNorm) || /\bpix\b/.test(labelContext)
              ? 'pix'
              : PAYMENT.debit.test(lineNorm)
                ? 'debit'
                : PAYMENT.credit.test(lineNorm) || PAYMENT.credit.test(labelContext)
                  ? 'credit'
                  : 'debit',
        });
      } else {
        // Só valores, sem texto útil (ex.: "R$ 449,50") — serve de fallback
        totalAmounts.push(Math.max(...amounts.map((a) => a.value)));
      }
    }
  }

  /* Montagem final ------------------------------------------------- */

  // Total do documento: palavras-chave ("total", "subtotal", "valor pago") ou,
  // com OCR garbled, o valor que se repete no fim de várias linhas sem data.
  let repeatedTotal = 0;
  for (const [v, c] of lastNoDateCounts) {
    if (c >= 2 && !nonLastValues.has(v) && v > repeatedTotal) repeatedTotal = v;
  }
  const documentTotal =
    totalAmounts.length > 0 ? Math.max(...totalAmounts) : repeatedTotal;

  const chosen: Candidate[] = [];
  const usedAmounts: number[] = [];

  for (const c of strong) {
    chosen.push(c);
    if (c.totalAmount > 0) usedAmounts.push(round2(c.totalAmount));
    if (c.installmentAmount > 0) usedAmounts.push(round2(c.installmentAmount));
  }

  if (chosen.length === 0) {
    if (documentTotal > 0) {
      // SEMPRE o total do documento — nunca valores soltos (tributos, códigos,
      // itens de cupom). Valores linha a linha só entram se não houver total.
      const fallback = documentTotal;
      const anyIncome = lines.some((l) =>
        INCOME_LINE.test(stripAccents(l.toLowerCase())),
      );
      const anyPix = lines.some((l) => /\bpix\b/.test(stripAccents(l.toLowerCase())));
      const anyCredit = lines.some((l) =>
        PAYMENT.credit.test(stripAccents(l.toLowerCase())),
      );
      const HEADER_LABEL =
        /^(pix recebido|fatura|cartao|comprovante|extrato|vencimento|total|valor|conta|compra aprovada)/;
      const bestLabel =
        labelLines.find((l) => !HEADER_LABEL.test(normalizeForMatch(l))) ??
        labelLines[0] ??
        null;
      // Nome do estabelecimento vale mais que rótulo genérico ("SUPERMERCADOS").
      // Rótulo que já cita o nome (mesmo com erro de OCR) ou que traz outro nome
      // próprio ("Padaria Pao Doce") é mantido como está.
      const GENERIC_LABEL = /^(supermercados?|mercado\w*|loja( \d+)?|nota fiscal|cupom\w*|comprovante|documento.*)$/;
      const labelNorm = bestLabel ? normalizeForMatch(bestLabel) : '';
      const labelHasInstitution =
        bestLabel != null && detectInstitution(bestLabel) === detectedInstitution;
      const fallbackLabel =
        detectedInstitution &&
        !labelHasInstitution &&
        GENERIC_LABEL.test(labelNorm)
          ? detectedInstitution
          : bestLabel;

      chosen.push({
        description:
          fallbackLabel ||
          (detectedInstitution ? `Fatura ${detectedInstitution}` : 'Fatura / Compra detectada'),
        totalAmount: round2(fallback),
        installmentsCount: 1,
        installmentAmount: round2(fallback),
        currentInstallment: 1,
        date: null,
        source: 'total-fallback',
        type: anyIncome ? 'income' : 'expense',
        suggestedCategoryId: anyIncome
          ? suggestIncomeCategory(fallbackLabel || '')
          : suggestCategory(labelLines.join(' ') || fallbackLabel || ''),
        paymentMethod: anyPix ? 'pix' : anyCredit ? 'credit' : 'debit',
      });
    } else {
      // Documento sem total visível (extratos): usa os valores linha a linha.
      for (const c of weak) {
        const v = round2(c.totalAmount);
        if (usedAmounts.includes(v)) continue;
        if (chosen.some((ch) => similarDescription(ch.description, c.description))) continue;
        usedAmounts.push(v);
        chosen.push(c);
        if (chosen.length >= 10) break;
      }
    }
  }

  const defaultDate =
    documentDates[0] || firstDate || new Date().toISOString().slice(0, 10);

  const items: InvoiceItemDraft[] = chosen.map((c) => ({
    description: c.description.slice(0, 80),
    totalAmount: c.totalAmount,
    installmentsCount: c.installmentsCount,
    installmentAmount: c.installmentAmount,
    currentInstallment: c.currentInstallment,
    date: c.date || defaultDate,
    type: c.type,
    suggestedCategoryId: c.suggestedCategoryId,
    paymentMethod: c.paymentMethod,
  }));

  /* Resumo ---------------------------------------------------------- */

  const hasMissingValues = items.some((it) => it.totalAmount <= 0);
  const lowConfidence =
    items.length === 0 ||
    hasMissingValues ||
    (typeof confidence === 'number' && confidence > 0 && confidence < 60);

  const instLabel = detectedInstitution ? ` em ${detectedInstitution}` : '';
  let summary: string;

  if (items.length === 0) {
    summary =
      text.trim().length > 20
        ? 'Li o texto da imagem, mas não consegui identificar valores de compra. Você pode tentar outra foto, usar um exemplo pronto ou lançar manualmente.'
        : 'Não consegui ler texto nesta imagem. Tente um print mais nítido ou use um exemplo pronto abaixo.';
  } else if (hasMissingValues) {
    summary = `Identifiquei${instLabel} ${
      items.length
    } lançamento(s) com parcelas, mas não consegui ler todos os valores. Preencha os campos zerados antes de salvar.`;
  } else if (items.length === 1) {
    const it = items[0];
    if (it.installmentsCount > 1 && it.installmentAmount > 0) {
      summary = `Detectada compra${instLabel}: ${it.installmentsCount}x de ${formatBRL(
        it.installmentAmount,
      )} (total ${formatBRL(it.totalAmount)}). Leitura feita no seu aparelho — revise antes de salvar.`;
    } else {
      summary = `Detectado 1 lançamento${instLabel} de ${formatBRL(
        it.totalAmount,
      )}. Leitura feita no seu aparelho — revise antes de salvar.`;
    }
  } else {
    const sum = items.reduce((acc, it) => acc + it.totalAmount, 0);
    summary = `Foram identificados ${items.length} lançamentos${instLabel}, somando ${formatBRL(
      sum,
    )}. Leitura feita no seu aparelho — revise antes de salvar.`;
  }

  if (lowConfidence && items.length > 0 && !hasMissingValues) {
    summary += ' Atenção: a leitura automática ficou com baixa confiança, confira cada valor.';
  }

  return {
    detectedInstitution,
    summary,
    items,
    lowConfidence: lowConfidence && items.length > 0,
    rawText: text,
  };
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
