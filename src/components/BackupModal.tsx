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
    <div className="ui-modal-overlay">
      <div className="ui-modal max-w-md">
        <div className="ui-modal-header justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-600" />
            <h2 className="ui-section-title">Privacidade & Dados</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ui-modal-body space-y-5">
          <div className="ui-panel p-3 text-xs leading-relaxed text-zinc-400">
            <strong className="text-neutral-800 block mb-0.5">Seus dados são 100% seus</strong>
            Seus lançamentos ficam na sua conta na nuvem e também neste navegador, como cópia offline. Baixe um backup quando quiser.
          </div>

          <div className="space-y-2.5">
            <span className="ui-label">
              Exportação e Backup
            </span>

            <button
              onClick={handleExportCsv}
              className="ui-panel w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-zinc-600" />
                <span>Exportar Planilha (CSV / Excel)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <button
              onClick={handleExportJson}
              className="ui-panel w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-neutral-600" />
                <span>Baixar Backup Completo (JSON)</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {transactions.length} transações
              </span>
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
              className="ui-panel w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-zinc-600" />
                <span>Importar Planilha (Excel / Sheets / CSV)</span>
              </div>
              <span className="text-[11px] text-zinc-700 font-semibold">Novo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="ui-panel w-full flex items-center justify-between p-3 text-xs font-medium text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-neutral-600" />
                <span>Restaurar / Importar Backup (JSON)</span>
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <span className="ui-label">
              Gerenciar Estado
            </span>

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
                <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                <span>Dados de Teste</span>
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
                <span>Zerar Tudo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
