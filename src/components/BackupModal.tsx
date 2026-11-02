import React, { useRef, useState } from 'react';
import { X, Download, Upload, RefreshCw, Trash2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { Transaction, Category, Account, Goal } from '../types/finance';
import { exportBackupJson, exportTransactionsToCsv } from '../utils/formatters';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
  onImportData: (data: {
    transactions: Transaction[];
    categories: Category[];
    accounts: Account[];
    goals: Goal[];
  }) => void;
  onOpenImportSpreadsheet: () => void;
  onResetToDemo: () => void;
  onClearAll: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  accounts,
  goals,
  onImportData,
  onOpenImportSpreadsheet,
  onResetToDemo,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    exportBackupJson({
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      accounts,
      goals,
    });
  };

  const handleExportCsv = () => {
    const catMap = categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
    const accMap = accounts.reduce<Record<string, Account>>((acc, a) => {
      acc[a.id] = a;
      return acc;
    }, {});
    exportTransactionsToCsv(transactions, catMap, accMap);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions && Array.isArray(json.transactions)) {
          onImportData({
            transactions: json.transactions,
            categories: json.categories || categories,
            accounts: json.accounts || accounts,
            goals: json.goals || goals,
          });
          setImportMessage('Dados importados com sucesso!');
          setTimeout(() => setImportMessage(null), 5000);
          onClose();
        } else {
          setImportMessage('Arquivo de backup inválido.');
          setTimeout(() => setImportMessage(null), 5000);
        }
      } catch (err) {
        setImportMessage('Erro ao ler arquivo de backup.');
        setTimeout(() => setImportMessage(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal max-w-md" role="dialog" aria-modal="true" aria-labelledby="backup-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <span className="ui-icon">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="backup-modal-title" className="ui-modal-title">Privacidade e dados</h2>
            <p className="ui-modal-sub">Backup, importação e limpeza dos seus registros</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 -mt-1 -mr-1 rounded-[var(--r-control)] text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="ui-modal-body space-y-5">
          {importMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-[var(--r-control)] bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border-1)] text-[11px] font-medium"
            >
              {importMessage}
            </div>
          )}
          <div className="ui-tile p-3 text-[11px] leading-relaxed text-[var(--text-3)]">
            <strong className="text-[var(--text-1)] block mb-0.5">Seus dados são 100% seus</strong>
            Seus lançamentos ficam na sua conta na nuvem e também neste navegador, como cópia offline.
            Baixe um backup quando quiser.
          </div>

          <div className="space-y-2">
            <span className="ui-label">Exportação e backup</span>

            <button onClick={handleExportCsv} className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)]">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-[var(--text-4)]" aria-hidden="true" />
                <span>Exportar planilha (CSV / Excel)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[var(--text-4)]" aria-hidden="true" />
            </button>

            <button onClick={handleExportJson} className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)]">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-[var(--text-4)]" aria-hidden="true" />
                <span>Baixar backup completo (JSON)</span>
              </div>
              <span className="ui-badge tabular-nums">{transactions.length} transações</span>
            </button>

            <label
              htmlFor="backup-file-input"
              className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-[var(--text-4)]" aria-hidden="true" />
                <span>Restaurar backup (JSON)</span>
              </div>
            </label>
            <input
              id="backup-file-input"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => {
                onClose();
                onOpenImportSpreadsheet();
              }}
              className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)]"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-[var(--text-4)]" aria-hidden="true" />
                <span>Importar planilha (Excel / Sheets / CSV)</span>
              </div>
              <span className="ui-badge ui-badge-accent">Novo</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[var(--border-1)] space-y-2">
            <span className="ui-label">Gerenciar estado</span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (confirm('Deseja recarregar os dados de exemplo padrão?')) {
                    onResetToDemo();
                    onClose();
                  }
                }}
                className="ui-btn ui-btn-secondary flex-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Dados de teste</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Atenção: deseja realmente zerar todas as transações e começar do zero?')) {
                    onClearAll();
                    onClose();
                  }
                }}
                className="ui-btn ui-btn-danger flex-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar tudo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
