import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  Check,
  Clock,
  Edit2,
  Trash2,
  FilterX,
  FileSpreadsheet,
  Camera,
} from 'lucide-react';
import { Transaction, Category, Account, TransactionType } from '../types/finance';
import {
  formatCurrency,
  formatDate,
  exportTransactionsToCsv,
} from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onOpenNewTransaction: () => void;
  onOpenScanInvoice?: () => void;
  onOpenImportSpreadsheet: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onTogglePaid: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  accounts,
  onOpenNewTransaction,
  onOpenScanInvoice,
  onOpenImportSpreadsheet,
  onEditTransaction,
  onDeleteTransaction,
  onTogglePaid,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | TransactionType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending'>('all');

  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {});
  }, [categories]);

  const accountsMap = useMemo(() => {
    return accounts.reduce<Record<string, Account>>((acc, accnt) => {
      acc[accnt.id] = accnt;
      return acc;
    }, {});
  }, [accounts]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const catName = categoriesMap[tx.category]?.name?.toLowerCase() || '';
        const accName = accountsMap[tx.account]?.name?.toLowerCase() || '';
        const desc = tx.description.toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        if (!desc.includes(query) && !catName.includes(query) && !accName.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      // Type
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      // Category
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
        return false;
      }

      // Account
      if (selectedAccount !== 'all' && tx.account !== selectedAccount) {
        return false;
      }

      // Status
      if (selectedStatus === 'paid' && !tx.isPaid) return false;
      if (selectedStatus === 'pending' && tx.isPaid) return false;

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, selectedType, selectedCategory, selectedAccount, selectedStatus, categoriesMap, accountsMap]);

  // Totals for filtered subset
  const filteredStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return {
      count: filteredTransactions.length,
      income,
      expense,
      net: income - expense,
    };
  }, [filteredTransactions]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedAccount !== 'all' ||
    selectedStatus !== 'all';

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="ui-h1">Transações</h1>
          <p className="ui-sub">
            Histórico completo e controle de todas as suas entradas e saídas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenScanInvoice && (
            <button
              onClick={onOpenScanInvoice}
              className="ui-btn ui-btn-secondary"
            >
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              <span>Escanear Print / Fatura</span>
            </button>
          )}

          <button
            onClick={onOpenImportSpreadsheet}
            className="ui-btn ui-btn-secondary"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={() => exportTransactionsToCsv(filteredTransactions, categoriesMap, accountsMap)}
            className="ui-btn ui-btn-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="ui-btn ui-btn-primary"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search and Filters */}
      <div className="bg-[#1d1d20] border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria ou conta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-white bg-[#1d1d20] border border-neutral-700/80 rounded-xl outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Interactive filter tabs (Segmented control) */}
          <div className="flex items-center gap-1 p-1 bg-[#1d1d20] rounded-xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedType === 'all'
                  ? 'bg-orange-600 text-white shadow-2xs font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedType('expense')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedType === 'expense'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setSelectedType('income')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedType === 'income'
                  ? 'bg-orange-600 text-white shadow-2xs font-bold'
                  : 'text-orange-400 hover:text-white'
              }`}
            >
              Receitas
            </button>
          </div>
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-800 text-xs text-zinc-300">
          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
            <span className="text-[11px] font-medium text-zinc-400 shrink-0">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-w-0 max-w-full ui-input py-1"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-0 max-w-full">
            <span className="text-[11px] font-medium text-zinc-400 shrink-0">Conta:</span>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="min-w-0 max-w-full ui-input py-1"
            >
              <option value="all">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'paid' | 'pending')}
              className="ui-input py-1"
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pago / Concluído</option>
              <option value="pending">Pendente</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-400 transition-colors ml-auto py-1 px-2"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary strip with unboxed typography */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white font-mono tabular-nums">
            {filteredStats.count}
          </span>
          <span>transações encontradas</span>
        </div>

        <div className="flex items-center gap-4 font-mono tabular-nums">
          <div>
            Entradas:{' '}
            <span className="text-orange-400 font-bold">
              {formatCurrency(filteredStats.income)}
            </span>
          </div>
          <span aria-hidden="true" className="text-neutral-700">·</span>
          <div>
            Saídas:{' '}
            <span className="text-rose-400 font-bold">
              {formatCurrency(filteredStats.expense)}
            </span>
          </div>
          <span aria-hidden="true" className="text-neutral-700">·</span>
          <div>
            Saldo:{' '}
            <span
              className={`font-bold ${
                filteredStats.net >= 0 ? 'text-orange-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(filteredStats.net)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-[#1d1d20] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-zinc-300">Nenhuma transação encontrada</p>
            <p className="text-xs text-zinc-500 mt-1">
              Tente alterar os filtros ou adicione uma nova movimentação.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
              >
                Remover filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1d1d20] border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="px-4 py-3 w-12 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Data
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Descrição
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Categoria
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Conta & Método
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Valor
                  </th>
                  <th scope="col" className="px-4 py-3 text-center w-24">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredTransactions.map((tx) => {
                  const cat = categoriesMap[tx.category] || {
                    name: 'Outros',
                    icon: 'Tag',
                    color: '#64748b',
                  };
                  const acc = accountsMap[tx.account];

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      {/* 1-click status checkbox */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => onTogglePaid(tx.id)}
                          title={tx.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                          className={`w-5 h-5 rounded-md inline-flex items-center justify-center border transition-all ${
                            tx.isPaid
                              ? 'bg-orange-600 border-orange-500 text-white'
                              : 'border-neutral-700 text-transparent hover:border-orange-500'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap font-mono tabular-nums">
                        {formatDate(tx.date)}
                      </td>

                      {/* Description & Notes */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{tx.description}</span>
                          {tx.installment && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                              {tx.installment.current}/{tx.installment.total}
                            </span>
                          )}
                          {tx.recurrence === 'monthly' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                              Fixo
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                          >
                            <CategoryIcon name={cat.icon} color={cat.color} className="w-3 h-3" />
                          </div>
                          <span className="text-zinc-300 font-medium">{cat.name}</span>
                        </div>
                      </td>

                      {/* Account & Payment Method */}
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        <div className="font-medium text-zinc-200">
                          {acc ? acc.name : 'Geral'}
                        </div>
                        <div className="text-[10px] text-zinc-500 capitalize">
                          {tx.paymentMethod}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            tx.type === 'income' ? 'text-orange-400' : 'text-zinc-100'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                        {!tx.isPaid && (
                          <span className="block text-[10px] text-amber-400 font-medium mt-0.5">
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            title="Editar"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Excluir"
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
