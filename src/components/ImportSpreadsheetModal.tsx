import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, Check, AlertCircle, ArrowRight, Table, Sparkles } from 'lucide-react';
import { Transaction, Category, Account, TransactionType } from '../types/finance';
import { formatCurrency, getTodayString } from '../utils/formatters';

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: Account[];
  onImportTransactions: (transactions: Transaction[], mode: 'append' | 'replace') => void;
}

export const ImportSpreadsheetModal: React.FC<ImportSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onImportTransactions,
}) => {
  const [pastedText, setPastedText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [parsedRows, setParsedRows] = useState<Omit<Transaction, 'id'>[]>([]);
  const [errorsList, setErrorsList] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<'flat' | 'projection' | null>(null);

  if (!isOpen) return null;

  const parseAmount = (val: string): { amount: number; detectedType?: TransactionType } => {
    if (!val) return { amount: 0 };
    let cleaned = val.replace(/R\$/g, '').trim();
    let detectedType: TransactionType | undefined = undefined;

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
    return {
      amount: isNaN(num) ? 0 : Math.abs(num),
      detectedType,
    };
  };

  const parseDate = (val: string): string => {
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

  const matchCategory = (catName: string, type: TransactionType): string => {
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

  const parseMonthLabel = (label: string): string | null => {
    const ptMonths: Record<string, number> = {
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

  const detectFormat = (headers: string[]): 'flat' | 'projection' | null => {
    const hasMonthCols = headers.slice(2).some((h) => parseMonthLabel(h));
    if (hasMonthCols) return 'projection';

    const hasDateCol = headers.some((h) => /data|date/i.test(h));
    const hasAmountCol = headers.some((h) => /valor|amount|preço|preco/i.test(h));
    const hasDescCol = headers.some((h) => /desc|hist|título|titulo/i.test(h));
    if (hasDateCol && hasAmountCol && hasDescCol) return 'flat';

    return null;
  };

  const handleProcessText = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setErrorsList([]);

    const lines = pastedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setErrorsList(['Texto vazio.']);
      setIsProcessing(false);
      return;
    }

    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().toLowerCase());
    const format = detectFormat(rawHeaders);
    setDetectedFormat(format);

    if (!format) {
      setErrorsList([
        'Não consegui identificar o formato. Use uma das opções:\n'
        + '1. Formato flat (uma linha = uma transação): Data, Descrição, Valor, Categoria, Tipo\n'
        + '2. Formato projeção (linhas = lançamentos, colunas = meses): Categoria, Descrição, Nov/26, Dez/26...\n'
      ]);
      setIsProcessing(false);
      return;
    }

    let transactionsList: Omit<Transaction, 'id'>[] = [];

    if (format === 'flat') {
      transactionsList = parseFlatFormat(lines, delimiter, rawHeaders);
    } else {
      transactionsList = parseProjectionFormat(lines, delimiter, rawHeaders);
    }

    setIsProcessing(false);

    if (transactionsList.length === 0) {
      setErrorsList(['Não encontrei transações válidas.']);
      return;
    }

    setParsedRows(transactionsList);
    setStep('preview');
  };

  const parseFlatFormat = (
    lines: string[],
    delimiter: string,
    rawHeaders: string[]
  ): Omit<Transaction, 'id'>[] => {
    const isHeaderRow = rawHeaders.some(
      (h) =>
        h.includes('data') ||
        h.includes('date') ||
        h.includes('desc') ||
        h.includes('valor') ||
        h.includes('amount') ||
        h.includes('cat') ||
        h.includes('tipo')
    );

    let dateIdx = -1;
    let descIdx = -1;
    let amountIdx = -1;
    let categoryIdx = -1;
    let typeIdx = -1;
    let accountIdx = -1;

    if (isHeaderRow) {
      rawHeaders.forEach((h, idx) => {
        if (h.includes('data') || h.includes('date')) dateIdx = idx;
        else if (h.includes('desc') || h.includes('historico') || h.includes('histórico') || h.includes('titulo')) descIdx = idx;
        else if (h.includes('valor') || h.includes('amount') || h.includes('preco') || h.includes('preço')) amountIdx = idx;
        else if (h.includes('cat')) categoryIdx = idx;
        else if (h.includes('tipo') || h.includes('type')) typeIdx = idx;
        else if (h.includes('conta') || h.includes('banco') || h.includes('cartao') || h.includes('cartão')) accountIdx = idx;
      });
    }

    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = 1 < rawHeaders.length ? 1 : 0;
    if (amountIdx === -1) amountIdx = rawHeaders.length > 2 ? 2 : 1;

    const startIndex = isHeaderRow ? 1 : 0;
    const transactionsList: Omit<Transaction, 'id'>[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());

      const rawDate = cols[dateIdx] || '';
      const rawDesc = cols[descIdx] || 'Transação Importada';
      const rawAmount = cols[amountIdx] || '0';
      const rawCat = categoryIdx >= 0 ? cols[categoryIdx] : '';
      const rawType = typeIdx >= 0 ? cols[typeIdx]?.toLowerCase() : '';
      const rawAccount = accountIdx >= 0 ? cols[accountIdx] : '';

      const { amount, detectedType } = parseAmount(rawAmount);
      if (amount <= 0 && !rawDesc) continue;

      let txType: TransactionType = 'expense';
      if (rawType.includes('receita') || rawType.includes('income') || rawType.includes('entrada') || rawType.includes('salario') || rawType.includes('salário') || rawType.includes('crédito') && !rawType.includes('cartão')) {
        txType = 'income';
      } else if (detectedType) {
        txType = detectedType;
      }

      const categoryId = matchCategory(rawCat, txType);

      let accountId = accounts[0]?.id || 'acc_nubank';
      if (rawAccount) {
        const foundAcc = accounts.find((a) =>
          a.name.toLowerCase().includes(rawAccount.toLowerCase())
        );
        if (foundAcc) accountId = foundAcc.id;
      }

      transactionsList.push({
        date: parseDate(rawDate),
        description: rawDesc || 'Transação sem descrição',
        amount,
        type: txType,
        category: categoryId,
        account: accountId,
        paymentMethod: 'pix',
        isPaid: true,
        recurrence: 'single',
      });
    }

    return transactionsList;
  };

  const parseProjectionFormat = (
    lines: string[],
    delimiter: string,
    rawHeaders: string[]
  ): Omit<Transaction, 'id'>[] => {
    const monthCols: Array<{ idx: number; label: string; date: string }> = [];
    rawHeaders.forEach((h, idx) => {
      if (idx < 2) return;
      const date = parseMonthLabel(h);
      if (date) {
        monthCols.push({ idx, label: h, date });
      }
    });

    if (monthCols.length === 0) return [];

    const transactionsList: Omit<Transaction, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const rawCategory = cols[0] || '';
      const rawDesc = cols[1] || 'Lançamento Importado';

      if (!rawDesc) continue;

      let categoryId = categories[0]?.id || 'cat_outros_despesa';
      if (rawCategory) {
        const clean = rawCategory.toLowerCase().trim();
        const found = categories.find((c) => {
          const n = c.name.toLowerCase();
          return n.includes(clean) || clean.includes(n);
        });
        if (found) categoryId = found.id;
      }

      monthCols.forEach((mc) => {
        const rawVal = cols[mc.idx] || '';
        if (!rawVal || rawVal === '—' || rawVal === '0' || rawVal === '0,00' || rawVal === 'R$ 0,00') return;

        const { amount, detectedType } = parseAmount(rawVal);
        if (amount <= 0) return;

        let txType: TransactionType = 'expense';
        if (detectedType) {
          txType = detectedType;
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
          category: categoryId,
          account: accounts[0]?.id || 'acc_nubank',
          paymentMethod: 'pix',
          isPaid: false,
          recurrence: 'single',
        });
      });
    }

    return transactionsList;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setPastedText(text);
        setTimeout(() => handleProcessText(), 50);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    const fullTransactions: Transaction[] = parsedRows.map((r, index) => ({
      ...r,
      id: `imported_${Date.now()}_${index}`,
    }));

    onImportTransactions(fullTransactions, importMode);
    onClose();
    alert(`${fullTransactions.length} transações importadas com sucesso!`);
  };

  const categoriesMap = categories.reduce<Record<string, Category>>((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  return (
    <div className="ui-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
      <div className="ui-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <span className="ui-icon ui-icon-accent !w-9 !h-9">
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="import-modal-title" className="ui-modal-title">Importar planilha</h2>
            <p className="ui-modal-sub">Cole os dados (Excel, Google Sheets, CSV) — o app detecta o formato automaticamente</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 -mt-1 -mr-1 rounded-[var(--r-control)] text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="ui-modal-body space-y-4">
          {step === 'input' ? (
            <>
              <div className="space-y-3">
                <div className="ui-tile p-2.5 text-xs text-[var(--text-3)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                  <span>
                    <strong>Cole aqui</strong> (Ctrl+V) os dados da planilha. O app detecta se é formato <strong>flat</strong> (uma linha = uma transação) ou <strong>projeção</strong> (linhas = lançamentos, colunas = meses).
                  </span>
                </div>

                <div>
                  <label className="ui-label">Dados colados</label>
                  <div className="relative">
                    <textarea
                      rows={10}
                      placeholder={detectedFormat === 'projection'
                        ? 'Categoria\tDescrição\tNov/26\tDez/26\tJan/27\nSalário\tSalário Lúcia\t4508,00\t4508,00\t4508,00\nSalário\tSalário Caio\t5272,00\t5272,00\t5272,00\nAlimentação\tSupermercado\t1200,50\t1350,00\t1100,00'
                        : detectedFormat === 'flat'
                        ? 'Data\tDescrição\tValor\tCategoria\tTipo\n15/10/2026\tSupermercado\t250,50\tAlimentação\tDespesa\n16/10/2026\tSalário Mensal\t5000,00\tSalário\tReceita'
                        : 'Exemplo formato flat:\nData\tDescrição\tValor\tCategoria\tTipo\n15/10/2026\tSupermercado\t250,50\tAlimentação\tDespesa\n\nExemplo formato projeção:\nCategoria\tDescrição\tNov/26\tDez/26\nSalário\tSalário Lúcia\t4508,00\t4508,00'}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="ui-input !p-3 font-mono"
                      touch-action="manipulation"
                      aria-describedby="format-hint"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-[var(--r-control)]">
                        <div className="flex items-center gap-2 text-white px-4 py-2 bg-zinc-900 rounded-[var(--r-panel)]">
                          <div className="w-5 h-5 border-2 border-[var(--accent-text)] border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium">Analisando formato...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div id="format-hint" className="text-[11px] text-[var(--text-4)] mt-1">
                    {detectedFormat === 'projection' && (
                      <span className="flex items-center gap-1 text-[var(--accent-text)]">
                        <Sparkles className="w-3 h-3" /> Formato projeção detectado
                      </span>
                    )}
                    {detectedFormat === 'flat' && (
                      <span className="flex items-center gap-1 text-[var(--accent-text)]">
                        <Table className="w-3 h-3" /> Formato flat detectado
                      </span>
                    )}
                    {!detectedFormat && (
                      <span>Cole os dados acima — o app vai detectar o formato automaticamente</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText(`Categoria\tDescrição\tNov/26\tDez/26\tJan/27\tFev/27\nSalário\tSalário Lúcia\t4508,00\t4508,00\t4508,00\t4508,00\nSalário\tSalário Caio\t5272,00\t5272,00\t5272,00\t5272,00\nAlimentação\tSupermercado\t1200,50\t1350,00\t1100,00\t1250,00\nTransporte\tCombustível\t450,00\t400,00\t500,00\t450,00`);
                    }}
                    className="ui-btn ui-btn-secondary text-[11px] px-2 py-1.5"
                  >
                    Exemplo Projeção
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText(`Data\tDescrição\tValor\tCategoria\tTipo\n15/10/2026\tSupermercado\t250,50\tAlimentação\tDespesa\n16/10/2026\tSalário Mensal\t5000,00\tSalário\tReceita\n18/10/2026\tPosto Combustível\t120,00\tTransporte\tDespesa\n20/10/2026\tNetflix\t35,90\tAssinaturas\tDespesa`);
                    }}
                    className="ui-btn ui-btn-secondary text-[11px] px-2 py-1.5"
                  >
                    Exemplo Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedText('')}
                    className="ui-btn ui-btn-ghost text-[11px] px-2 py-1.5"
                  >
                    Limpar
                  </button>
                </div>

                <div className="border border-dashed border-[var(--border-2)] hover:border-[var(--accent-text)] rounded-[var(--r-card)] p-6 text-center transition-colors bg-[var(--surface-2)]">
                  <Upload className="w-6 h-6 text-[var(--text-4)] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[var(--text-1)]">Ou envie arquivo .CSV / .TSV</p>
                  <p className="text-[11px] text-[var(--text-4)] mt-1 mb-4">
                    No Google Sheets: Arquivo → Fazer download → Valores separados por vírgula (.csv)
                  </p>
                  <label className="ui-btn ui-btn-primary cursor-pointer">
                    <span>Selecionar arquivo</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={(e) => handleFileUpload(e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {errorsList.length > 0 && (
                <div className="ui-alert !border-[color-mix(in_srgb,var(--danger-text)_32%,transparent)] !bg-[var(--danger-soft)] text-[var(--danger-text)] items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    {errorsList.map((err, i) => (
                      <div key={i} className="whitespace-pre-wrap">{err}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-1)]">
                    Pré-visualização: {parsedRows.length} transações identificadas
                    <span className="ml-2 text-[10px] bg-[var(--accent-soft)] text-[var(--accent-text)] px-1.5 py-0.5 rounded">
                      {detectedFormat === 'projection' ? 'Projeção' : 'Flat'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-3)]">Revise os dados antes de adicionar ao FinanFlow.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="ui-label !mb-0">Modo</span>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                    className="ui-input !w-auto !py-1.5"
                  >
                    <option value="append">Somar às existentes</option>
                    <option value="replace">Substituir todas as atuais</option>
                  </select>
                </div>
              </div>

              <div className="border border-[var(--border-1)] rounded-[var(--r-panel)] overflow-hidden max-h-64 overflow-y-auto">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th className="text-right">Valor</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx}>
                        <td className="tabular-nums text-[var(--text-4)] whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="font-medium text-[var(--text-1)]">
                          {row.description}
                        </td>
                        <td className="text-[var(--text-3)]">
                          {categoriesMap[row.category]?.name || 'Outros'}
                        </td>
                        <td className="text-right tabular-nums font-bold whitespace-nowrap">
                          <span className={row.type === 'income' ? 'text-[var(--accent-text)]' : 'text-[var(--text-1)]'}>
                            {row.type === 'income' ? '+' : '-'} {formatCurrency(row.amount)}
                          </span>
                        </td>
                        <td className="text-[var(--text-3)] whitespace-nowrap">
                          {row.type === 'income' ? 'Receita' : 'Despesa'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <div className="text-[11px] text-[var(--text-4)] text-center">
                  + {parsedRows.length - 50} outras transações serão importadas...
                </div>
              )}
            </>
          )}
        </div>

        <div className="ui-modal-footer justify-between">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('input')}
              className="ui-btn ui-btn-ghost"
            >
              ← Voltar e editar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-ghost"
            >
              Cancelar
            </button>
          )}

          {step === 'input' ? (
            <button
              type="button"
              onClick={handleProcessText}
              disabled={!pastedText.trim() || isProcessing}
              className="ui-btn ui-btn-primary"
            >
              <span>Analisar e processar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="ui-btn ui-btn-primary"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar e Importar {parsedRows.length} itens</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
