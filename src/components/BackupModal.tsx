import React, { useRef } from 'react';
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
          alert('Dados importados com sucesso!');
          onClose();
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-header">
          <span className="ui-icon">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="ui-modal-title">Privacidade e dados</h2>
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
          <div className="ui-tile p-3 text-[11px] leading-relaxed text-[var(--text-3)]">
            <strong className="text-[var(--text-1)] block mb-0.5">Seus dados são 100% seus</strong>
            Seus lançamentos ficam na sua conta na nuvem e também neste navegador, como cópia offline.
            Baixe um backup quando quiser.
          </div>

          <div className="space-y-2">
            <span className="ui-label">Exportação e backup</span>

            <button onClick={handleExportCsv} className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)]">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-[var(--text-4)]" />
                <span>Exportar planilha (CSV / Excel)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-[var(--text-4)]" />
            </button>

            <button onClick={handleExportJson} className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)]">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-[var(--text-4)]" />
                <span>Baixar backup completo (JSON)</span>
              </div>
              <span className="ui-badge tabular-nums">{transactions.length} transações</span>
            </button>

            <input
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
                <FileSpreadsheet className="w-4 h-4 text-[var(--text-4)]" />
                <span>Importar planilha (Excel / Sheets / CSV)</span>
              </div>
              <span className="ui-badge ui-badge-accent">Novo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="ui-tile ui-tile-hover w-full flex items-center justify-between p-3 text-xs font-medium text-[var(--text-2)]"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-[var(--text-4)]" />
                <span>Restaurar backup (JSON)</span>
              </div>
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
