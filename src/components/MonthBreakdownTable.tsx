import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, Circle, CreditCard, Repeat, Trash2, Edit2, Plus, Calendar } from 'lucide-react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { TransactionMobileList } from './TransactionMobileList';

interface MonthBreakdownTableProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  monthLabel: string;
  onTogglePaid: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenNewTransaction: () => void;
}

export const MonthBreakdownTable: React.FC<MonthBreakdownTableProps> = ({
  transactions,
  categories,
  accounts,
  monthLabel,
  onTogglePaid,
  onEditTransaction,
  onDeleteTransaction,
  onOpenNewTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'installment' | 'recurrent'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categoriesMap = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [categories]);

  const accountsMap = useMemo(() => {
    return accounts.reduce<Record<string, Account>>((acc, a) => {
      acc[a.id] = a;
      return acc;
    }, {});
  }, [accounts]);

  // Filter transactions
  const filteredList = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter === 'expense' && tx.type !== 'expense') return false;
      if (typeFilter === 'income' && tx.type !== 'income') return false;
      if (typeFilter === 'installment' && tx.recurrence !== 'installment') return false;
      if (typeFilter === 'recurrent' && tx.recurrence !== 'monthly') return false;

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(q);
        const catName = categoriesMap[tx.category]?.name.toLowerCase() || '';
        const accName = accountsMap[tx.account]?.name.toLowerCase() || '';
        const notesMatch = tx.notes?.toLowerCase().includes(q) || false;
        return descMatch || catName.includes(q) || accName.includes(q) || notesMatch;
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, searchTerm, categoriesMap, accountsMap]);

  // Totals for filtered list
  const filteredIncome = useMemo(() => {
    return filteredList.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  }, [filteredList]);

  const filteredExpense = useMemo(() => {
    return filteredList.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }, [filteredList]);

  const filterTabs: { id: typeof typeFilter; label: string; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'expense', label: 'Despesas' },
    { id: 'income', label: 'Receitas' },
    { id: 'installment', label: 'Parcelados', icon: <CreditCard className="w-3 h-3" /> },
    { id: 'recurrent', label: 'Fixos', icon: <Repeat className="w-3 h-3" /> },
  ];

  return (
    <section className="ui-card p-4 sm:p-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-1)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="ui-section-title">Movimentações do mês</h3>
            <span className="ui-badge">
              {filteredList.length} {filteredList.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <p className="ui-sub">Lançamentos de {monthLabel} com controle de pagamento e parcelamento</p>
        </div>

        <button onClick={onOpenNewTransaction} className="ui-btn ui-btn-primary self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" />
          <span>Novo lançamento</span>
        </button>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[var(--text-4)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por descrição, cartão ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ui-input !pl-9"
          />
        </div>

        <div className="ui-segmented flex-wrap w-full sm:w-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`ui-seg-item ${typeFilter === tab.id ? 'ui-seg-item-active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {filteredList.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-[var(--border-2)] rounded-[var(--r-panel)]">
          <Calendar className="w-8 h-8 text-[var(--text-4)] mx-auto mb-2" />
          <h4 className="text-xs font-bold text-[var(--text-1)]">
            {transactions.length === 0
              ? 'Nenhum lançamento cadastrado neste mês'
              : 'Nenhum item corresponde ao filtro selecionado'}
          </h4>
          <p className="text-[11px] text-[var(--text-3)] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            {transactions.length === 0
              ? 'Adicione suas despesas fixas, compras no cartão ou salários para organizar suas contas.'
              : 'Tente alterar os termos da busca ou os filtros aplicados.'}
          </p>
          <button onClick={onOpenNewTransaction} className="ui-btn ui-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar primeiro lançamento</span>
          </button>
        </div>
      ) : (
        <div className="border border-[var(--border-1)] rounded-[var(--r-panel)] overflow-hidden">
          <div className="md:hidden px-3 py-1">
            <TransactionMobileList
              transactions={filteredList}
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
                  <th>Descrição</th>
                  <th className="hidden sm:table-cell">Categoria</th>
                  <th className="hidden md:table-cell">Conta / Cartão</th>
                  <th className="hidden md:table-cell text-center">Data</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right w-16">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((tx) => {
                  const cat = categoriesMap[tx.category];
                  const acc = accountsMap[tx.account];
                  const isIncome = tx.type === 'income';

                  return (
                    <tr key={tx.id} className="group">
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => onTogglePaid(tx.id)}
                          title={tx.isPaid ? 'Marcado como pago' : 'Marcar como pago'}
                          className={`p-1 rounded-[var(--r-control)] transition-colors ${
                            tx.isPaid
                              ? 'text-[var(--accent-text)] hover:text-[var(--text-1)]'
                              : 'text-[var(--text-4)] hover:text-[var(--text-2)]'
                          }`}
                        >
                          {tx.isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                      </td>

                      <td>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold max-w-[9rem] sm:max-w-none truncate ${
                              tx.isPaid ? 'text-[var(--text-2)]' : 'text-[var(--text-1)]'
                            }`}
                          >
                            {tx.description}
                          </span>

                          {tx.installment && (
                            <span className="ui-badge">
                              <CreditCard className="w-2.5 h-2.5" />
                              {tx.installment.current}/{tx.installment.total}
                            </span>
                          )}

                          {tx.recurrence === 'monthly' && (
                            <span className="ui-badge">
                              <Repeat className="w-2.5 h-2.5" />
                              Fixo
                            </span>
                          )}
                        </div>

                        {tx.notes && (
                          <div className="text-[10px] text-[var(--text-4)] mt-0.5 truncate max-w-[9rem] sm:max-w-xs">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      <td className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-[var(--text-2)] text-xs">
                          {cat && (
                            <CategoryIcon name={cat.icon} color={cat.color} className="w-3.5 h-3.5" />
                          )}
                          <span className="truncate">{cat?.name || 'Geral'}</span>
                        </div>
                      </td>

                      <td className="hidden md:table-cell">
                        <span className="text-[var(--text-3)] text-xs truncate block">
                          {acc?.name || 'Conta padrão'}
                        </span>
                      </td>

                      <td className="hidden md:table-cell text-center text-xs text-[var(--text-4)] whitespace-nowrap tabular-nums">
                        {formatDateShort(tx.date)}
                      </td>

                      <td className="text-right font-bold whitespace-nowrap tabular-nums">
                        <span className={isIncome ? 'text-[var(--accent-text)]' : 'text-[var(--text-1)]'}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-70 md:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            title="Editar lançamento"
                            className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] rounded-[var(--r-control)] transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Excluir lançamento"
                            className="p-1 text-[var(--text-3)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-[var(--r-control)] transition-colors"
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

          {/* Subtotais */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[var(--surface-2)] border-t border-[var(--border-1)] text-xs tabular-nums">
            <span className="text-[var(--text-4)] text-[11px]">
              Subtotal do filtro: {filteredList.length} itens
            </span>
            <div className="flex items-center gap-4">
              {filteredIncome > 0 && (
                <div className="text-[var(--text-3)]">
                  <span className="mr-1.5">Entradas:</span>
                  <strong className="text-[var(--accent-text)]">+{formatCurrency(filteredIncome)}</strong>
                </div>
              )}
              {filteredExpense > 0 && (
                <div className="text-[var(--text-3)]">
                  <span className="mr-1.5">Saídas:</span>
                  <strong className="text-[var(--danger-text)]">-{formatCurrency(filteredExpense)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
