import React, { useState } from 'react';
import { X, FileSpreadsheet, Upload, Check, AlertCircle, ArrowRight, Table } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'link' | 'paste' | 'file'>('link');
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1Gnz7jctYUKb4yNTsdg5vHSgOv2BzIrZLg3BYCG1mNDQ/edit?usp=drivesdk');
  const [pastedText, setPastedText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [parsedRows, setParsedRows] = useState<Omit<Transaction, 'id'>[]>([]);
  const [errorsList, setErrorsList] = useState<string[]>([]);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helper to parse BRL or standard currency numbers
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

    // Check for Brazilian format 1.234,56
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
        // 1.250,50 -> remove dots, replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // 1,250.50 -> remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // 1250,50 -> 1250.50
      cleaned = cleaned.replace(',', '.');
    }

    const num = parseFloat(cleaned);
    return {
      amount: isNaN(num) ? 0 : Math.abs(num),
      detectedType,
    };
  };

  // Helper to normalize dates (DD/MM/YYYY or YYYY-MM-DD)
  const parseDate = (val: string): string => {
    if (!val) return getTodayString();
    const trimmed = val.trim();
    
    // DD/MM/YYYY or DD-MM-YYYY
    const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (brMatch) {
      let day = brMatch[1].padStart(2, '0');
      let month = brMatch[2].padStart(2, '0');
      let year = brMatch[3];
      if (year.length === 2) year = `20${year}`;
      return `${year}-${month}-${day}`;
    }

    // YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    return getTodayString();
  };

  // Find best matching category by name
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

  const handleProcessText = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    // Detect delimiter: tab (\t), semicolon (;), or comma (,)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(';')) {
      delimiter = ';';
    } else if (firstLine.includes(',')) {
      delimiter = ',';
    }

    // Split headers
    const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().toLowerCase());
    
    // Check if first line is a header row
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

    // Fallbacks if not auto-detected by name
    if (dateIdx === -1) dateIdx = 0;
    if (descIdx === -1) descIdx = 1 < rawHeaders.length ? 1 : 0;
    if (amountIdx === -1) amountIdx = rawHeaders.length > 2 ? 2 : 1;

    const startIndex = isHeaderRow ? 1 : 0;
    const transactionsList: Omit<Transaction, 'id'>[] = [];
    const errors: string[] = [];

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

      if (amount <= 0 && !rawDesc) {
        continue; // skip blank rows
      }

      let txType: TransactionType = 'expense';
      if (rawType.includes('receita') || rawType.includes('income') || rawType.includes('entrada') || rawType.includes('salario') || rawType.includes('salário') || rawType.includes('crédito') && !rawType.includes('cartão')) {
        txType = 'income';
      } else if (detectedType) {
        txType = detectedType;
      }

      const categoryId = matchCategory(rawCat, txType);

      // Match account
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

    if (transactionsList.length === 0) {
      errors.push('Não conseguimos identificar transações válidas nas linhas coladas.');
      setErrorsList(errors);
      return;
    }

    setParsedRows(transactionsList);
    setErrorsList([]);
    setStep('preview');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setPastedText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleFetchGoogleSheet = async () => {
    setLinkError(null);
    if (!sheetUrl.trim()) {
      setLinkError('Por favor informe o link da planilha.');
      return;
    }

    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      setLinkError('Link do Google Sheets inválido. Certifique-se de copiar o link completo.');
      return;
    }

    const sheetId = match[1];
    setIsLoadingLink(true);

    try {
      // Try direct CSV export endpoint
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const res = await fetch(exportUrl);
      const text = await res.text();

      // Check if it returned Google login HTML page
      if (text.includes('accounts.google.com') || text.includes('Sign in to your Google Account') || text.includes('document-root loading')) {
        setLinkError(
          'A planilha está com acesso Restrito no Google Drive. Para liberar o link: no Google Sheets, clique em "Compartilhar" (no canto superior direito) e mude o Acesso Geral para "Qualquer pessoa com o link" (como Leitor).'
        );
        setIsLoadingLink(false);
        return;
      }

      if (text.length < 10) {
        setLinkError('A planilha retornou vazia ou inacessível.');
        setIsLoadingLink(false);
        return;
      }

      setPastedText(text);
      setIsLoadingLink(false);
      // Auto-trigger parse
      setTimeout(() => {
        handleProcessTextFromValue(text);
      }, 50);
    } catch (err) {
      setLinkError(
        'Não foi possível conectar ao Google Sheets diretamente (bloqueio de acesso ou CORS). Se a planilha for privada, você pode simplesmente abrir sua planilha, selecionar as células, dar Ctrl+C e colar na aba "Colar Dados" abaixo!'
      );
      setIsLoadingLink(false);
    }
  };

  const handleProcessTextFromValue = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';

    const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().toLowerCase());
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
      if (rawType.includes('receita') || rawType.includes('income') || rawType.includes('entrada') || rawType.includes('salario') || rawType.includes('salário')) {
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

    if (transactionsList.length > 0) {
      setParsedRows(transactionsList);
      setErrorsList([]);
      setStep('preview');
    }
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
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="ui-modal-header">
          <span className="ui-icon ui-icon-accent !w-9 !h-9">
            <FileSpreadsheet className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="ui-modal-title">Importar planilha</h2>
            <p className="ui-modal-sub">Excel, Google Sheets ou CSV: cole as linhas ou envie o arquivo</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 -mt-1 -mr-1 rounded-[var(--r-control)] text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="ui-modal-body space-y-4">
          {step === 'input' ? (
            <>
              {/* Mode Tabs */}
              <div className="ui-segmented w-full">
                {([
                  { id: 'link', label: 'Link do Sheets' },
                  { id: 'paste', label: 'Colar células' },
                  { id: 'file', label: 'Arquivo .CSV' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`ui-seg-item flex-1 !py-1.5 ${activeTab === tab.id ? 'ui-seg-item-active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Google Sheets Link */}
              {activeTab === 'link' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="ui-label">Link da planilha do Google Sheets</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        className="ui-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleFetchGoogleSheet}
                        disabled={isLoadingLink}
                        className="ui-btn ui-btn-primary shrink-0"
                      >
                        {isLoadingLink ? 'Carregando...' : 'Carregar planilha'}
                      </button>
                    </div>
                  </div>

                  {linkError && (
                    <div className="ui-alert flex-col !border-[color-mix(in_srgb,var(--warning-text)_32%,transparent)] !bg-[var(--warning-soft)]">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-[var(--warning-text)] shrink-0 mt-0.5" />
                        <div className="text-[var(--warning-text)]">
                          <strong className="block font-semibold mb-1">Acesso restrito no Google Drive</strong>
                          <span className="text-[var(--text-2)]">{linkError}</span>
                        </div>
                      </div>

                      <div className="w-full pt-2 border-t border-[color-mix(in_srgb,var(--warning-text)_28%,transparent)] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--text-3)]">
                          Prefere copiar e colar?
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('paste')}
                          className="ui-btn ui-btn-secondary shrink-0"
                        >
                          Colar células
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="ui-tile p-3 text-xs text-[var(--text-3)] space-y-1.5">
                    <span className="font-semibold text-[var(--text-1)] block">
                      Como permitir leitura por link no Google Sheets
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--text-4)] text-[11px]">
                      <li>No Google Sheets, clique no botão azul <strong>Compartilhar</strong> (canto superior direito).</li>
                      <li>Em <strong>Acesso geral</strong>, mude de <em>Restrito</em> para <strong>Qualquer pessoa com o link</strong> (Leitor).</li>
                      <li>Pronto! Clique em <strong>Carregar Planilha</strong> acima.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 2: Paste Rows */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <div className="ui-tile p-2.5 text-xs text-[var(--text-3)]">
                    Basta abrir sua planilha no Google Sheets ou Excel, selecionar os dados (ou apertar <strong>Ctrl+A</strong>), copiar com <strong>Ctrl+C</strong> e colar no campo abaixo.
                  </div>

                  <div>
                    <label className="ui-label">Linhas coladas</label>
                    <textarea
                      rows={7}
                      placeholder={`Data	Descrição	Categoria	Valor	Tipo
15/10/2026	Supermercado	Alimentação	250,50	Despesa
16/10/2026	Salário Mensal	Salário	5000,00	Receita
18/10/2026	Posto Combustível	Transporte	120,00	Despesa`}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="ui-input !p-3 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: CSV File Upload */}
              {activeTab === 'file' && (
                <div className="space-y-4 py-2">
                  <div className="border border-dashed border-[var(--border-2)] hover:border-[var(--accent-text)] rounded-[var(--r-card)] p-8 text-center transition-colors bg-[var(--surface-2)]">
                    <Upload className="w-7 h-7 text-[var(--text-4)] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-[var(--text-1)]">
                      Escolha seu arquivo de planilha (.csv ou .tsv)
                    </p>
                    <p className="text-[11px] text-[var(--text-4)] mt-1 mb-4">
                      No Google Sheets: Arquivo → Fazer download → Valores separados por vírgula (.csv)
                    </p>
                    <label className="ui-btn ui-btn-primary cursor-pointer">
                      <span>Selecionar arquivo .CSV</span>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={(e) => {
                          handleFileUpload(e);
                          setActiveTab('paste');
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {errorsList.length > 0 && (
                <div className="ui-alert !border-[color-mix(in_srgb,var(--danger-text)_32%,transparent)] !bg-[var(--danger-soft)] text-[var(--danger-text)] items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    {errorsList.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-1)]">
                    Pré-visualização: {parsedRows.length} transações identificadas
                  </h3>
                  <p className="text-[11px] text-[var(--text-3)]">
                    Revise os dados antes de adicionar ao FinanFlow.
                  </p>
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

        {/* Footer */}
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
              disabled={!pastedText.trim()}
              className="ui-btn ui-btn-primary"
            >
              <span>Processar Planilha</span>
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
