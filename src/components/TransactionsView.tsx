import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  Check,
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
import { TransactionMobileList } from './TransactionMobileList';

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
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="ui-label mb-0">Histórico</span>
          <h1 className="ui-h1 mt-1">Transações</h1>
          <p className="ui-sub">Histórico completo e controle de todas as suas entradas e saídas</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenScanInvoice && (
            <button onClick={onOpenScanInvoice} className="ui-btn ui-btn-secondary">
              <Camera className="w-3.5 h-3.5" />
              <span>Escanear fatura</span>
            </button>
          )}

          <button onClick={onOpenImportSpreadsheet} className="ui-btn ui-btn-secondary">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar planilha</span>
          </button>

          <button
            onClick={() => exportTransactionsToCsv(filteredTransactions, categoriesMap, accountsMap)}
            className="ui-btn ui-btn-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button onClick={onOpenNewTransaction} className="ui-btn ui-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Nova transação</span>
          </button>
        </div>
      </header>

      {/* Busca e filtros */}
      <section className="ui-card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[var(--text-4)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria ou conta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ui-input !pl-9"
            />
          </div>

          <div className="ui-segmented shrink-0 self-start lg:self-auto">
            {([
              { id: 'all', label: 'Todas' },
              { id: 'expense', label: 'Despesas' },
              { id: 'income', label: 'Receitas' },
            ] as { id: 'all' | TransactionType; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`ui-seg-item ${selectedType === tab.id ? 'ui-seg-item-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-[var(--border-1)]">
          <div className="min-w-0 flex-1 sm:flex-none sm:w-48">
            <label className="ui-label">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="ui-input !py-1.5"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-1 sm:flex-none sm:w-44">
            <label className="ui-label">Conta</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="ui-input !py-1.5"
            >
              <option value="all">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-1 sm:flex-none sm:w-40">
            <label className="ui-label">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'paid' | 'pending')}
              className="ui-input !py-1.5"
            >
              <option value="all">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-3)] hover:text-[var(--danger-text)] transition-colors py-2"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </section>

      {/* Resumo do filtro */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-[var(--text-3)]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[var(--text-1)] tabular-nums text-xs">{filteredStats.count}</span>
          <span>transações encontradas</span>
        </div>

        <div className="flex items-center gap-3 tabular-nums">
          <div>
            Entradas:{' '}
            <strong className="text-[var(--accent-text)] font-semibold">{formatCurrency(filteredStats.income)}</strong>
          </div>
          <span aria-hidden="true" className="text-[var(--border-2)]">·</span>
          <div>
            Saídas:{' '}
            <strong className="text-[var(--danger-text)] font-semibold">{formatCurrency(filteredStats.expense)}</strong>
          </div>
          <span aria-hidden="true" className="text-[var(--border-2)]">·</span>
          <div>
            Saldo:{' '}
            <strong
              className={`font-semibold ${
                filteredStats.net >= 0 ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]'
              }`}
            >
              {formatCurrency(filteredStats.net)}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <section className="ui-card overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center px-4">
            <p className="text-sm font-semibold text-[var(--text-1)]">Nenhuma transação encontrada</p>
            <p className="text-xs text-[var(--text-3)] mt-1">
              Tente alterar os filtros ou adicione uma nova movimentação.
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="ui-btn ui-btn-secondary mt-3">
                Remover filtros
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="md:hidden px-3 py-1">
            <TransactionMobileList
              transactions={filteredTransactions}
              categoriesMap={categoriesMap}
              accountsMap={accountsMap}
              onTogglePaid={onTogglePaid}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
            />
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="w-10 text-center">Status</th>
                  <th className="hidden md:table-cell">Data</th>
                  <th>Descrição</th>
                  <th className="hidden sm:table-cell">Categoria</th>
                  <th className="hidden md:table-cell">Conta e método</th>
                  <th className="text-right">Valor</th>
                  <th className="text-center w-16">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const cat = categoriesMap[tx.category] || {
                    name: 'Outros',
                    icon: 'Tag',
                    color: '#64748b',
                  };
                  const acc = accountsMap[tx.account];

                  return (
                    <tr key={tx.id} className="group">
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => onTogglePaid(tx.id)}
                          title={tx.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
                          className={`w-5 h-5 rounded-[var(--r-control)] inline-flex items-center justify-center border transition-colors ${
                            tx.isPaid
                              ? 'bg-[var(--accent-soft)] border-[color-mix(in_srgb,var(--accent-text)_45%,transparent)] text-[var(--accent-text)]'
                              : 'border-[var(--border-2)] text-transparent hover:border-[var(--accent-text)]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      <td className="hidden md:table-cell text-[var(--text-3)] whitespace-nowrap tabular-nums">
                        {formatDate(tx.date)}
                      </td>

                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--text-1)] max-w-[9rem] sm:max-w-none truncate">
                            {tx.description}
                          </span>
                          {tx.installment && (
                            <span className="ui-badge">
                              {tx.installment.current}/{tx.installment.total}
                            </span>
                          )}
                          {tx.recurrence === 'monthly' && <span className="ui-badge">Fixo</span>}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-[var(--text-4)] truncate max-w-[9rem] sm:max-w-xs mt-0.5">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      <td className="hidden sm:table-cell whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-[var(--r-control)] flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${cat.color}1f`,
                              borderColor: `${cat.color}40`,
                              color: cat.color,
                            }}
                          >
                            <CategoryIcon name={cat.icon} color={cat.color} className="w-3 h-3" />
                          </div>
                          <span className="text-[var(--text-2)] font-medium">{cat.name}</span>
                        </div>
                      </td>

                      <td className="hidden md:table-cell whitespace-nowrap">
                        <div className="font-medium text-[var(--text-2)]">{acc ? acc.name : 'Geral'}</div>
                        <div className="text-[10px] text-[var(--text-4)] capitalize">{tx.paymentMethod}</div>
                      </td>

                      <td className="text-right whitespace-nowrap tabular-nums">
                        <span
                          className={`font-bold ${
                            tx.type === 'income' ? 'text-[var(--accent-text)]' : 'text-[var(--text-1)]'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                        {!tx.isPaid && (
                          <span className="block text-[10px] text-[var(--text-4)] font-medium mt-0.5">
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            title="Editar"
                            className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] rounded-[var(--r-control)] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Excluir"
                            className="p-1.5 text-[var(--text-3)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-[var(--r-control)] transition-colors"
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
          </>
        )}
      </section>
    </div>
  );
};
