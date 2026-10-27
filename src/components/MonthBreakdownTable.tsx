import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, Circle, CreditCard, Repeat, Trash2, Edit2, Plus, Calendar, DollarSign, Filter } from 'lucide-react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

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

  return (
    <div className="bg-[#141416] border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            Movimentações Detalhadas do Mês
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {filteredList.length} {filteredList.length === 1 ? 'item' : 'itens'}
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Lançamentos de {monthLabel} com controle de pagamento e parcelamento
          </p>
        </div>

        <button
          onClick={onOpenNewTransaction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-zinc-500 rounded-xl transition-colors shadow-xs self-start sm:self-auto whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Lançamento</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por descrição, cartão ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs text-white bg-[#1d1d20] border border-zinc-700/80 rounded-xl outline-hidden focus:border-orange-500 placeholder:text-zinc-500"
          />
        </div>

        {/* Quick Type Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#1d1d20] rounded-xl border border-neutral-800 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              typeFilter === 'expense'
                ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Despesas
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('income')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              typeFilter === 'income'
                ? 'bg-orange-950 text-orange-300 font-bold border border-orange-800'
                : 'text-orange-400 hover:text-white'
            }`}
          >
            Receitas
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('installment')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              typeFilter === 'installment'
                ? 'bg-[#1d1d20] text-zinc-300 font-bold border border-zinc-800'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Parcelados</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('recurrent')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
              typeFilter === 'recurrent'
                ? 'bg-[#1d1d20] text-zinc-300 font-bold border border-zinc-800'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>Fixos</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {filteredList.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-neutral-800 rounded-xl bg-[#101012]/60">
          <Calendar className="w-8 h-8 text-zinc-500 mx-auto mb-2 opacity-50" />
          <h4 className="text-xs font-bold text-zinc-200">
            {transactions.length === 0
              ? 'Nenhum lançamento cadastrado neste mês'
              : 'Nenhum item corresponde ao filtro selecionado'}
          </h4>
          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            {transactions.length === 0
              ? 'Adicione suas despesas fixas, compras no cartão ou salários para organizar suas contas.'
              : 'Tente alterar os termos da busca ou os filtros aplicados.'}
          </p>
          <button
            onClick={onOpenNewTransaction}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-zinc-500 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Primeiro Lançamento</span>
          </button>
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1d1d20] text-[10px] uppercase text-zinc-400 border-b border-neutral-800 font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">Status</th>
                  <th className="py-3 px-3.5">Descrição</th>
                  <th className="py-3 px-3.5">Categoria</th>
                  <th className="py-3 px-3.5">Conta / Cartão</th>
                  <th className="py-3 px-3.5 text-center">Data</th>
                  <th className="py-3 px-3.5 text-right">Valor</th>
                  <th className="py-3 px-3.5 text-right w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredList.map((tx) => {
                  const cat = categoriesMap[tx.category];
                  const acc = accountsMap[tx.account];
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* Status / Paid checkmark */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onTogglePaid(tx.id)}
                          title={tx.isPaid ? 'Marcado como pago' : 'Marcar como pago'}
                          className={`p-1 rounded-lg transition-colors ${
                            tx.isPaid
                              ? 'text-zinc-400 hover:text-zinc-300'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {tx.isPaid ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Description + Badges */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${tx.isPaid ? 'text-zinc-200' : 'text-white'}`}>
                            {tx.description}
                          </span>

                          {/* Installment Badge */}
                          {tx.installment && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                              <CreditCard className="w-2.5 h-2.5" />
                              {tx.installment.current}/{tx.installment.total}
                            </span>
                          )}

                          {/* Recurrent Badge */}
                          {tx.recurrence === 'monthly' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                              <Repeat className="w-2.5 h-2.5" />
                              Fixo
                            </span>
                          )}
                        </div>

                        {tx.notes && (
                          <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-xs">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                          {cat && (
                            <CategoryIcon
                              name={cat.icon}
                              color={cat.color}
                              className="w-3.5 h-3.5"
                            />
                          )}
                          <span className="truncate">{cat?.name || 'Geral'}</span>
                        </div>
                      </td>

                      {/* Account / Card */}
                      <td className="py-3 px-3.5">
                        <span className="text-zinc-400 text-xs truncate block">
                          {acc?.name || 'Conta Padrão'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 text-center font-mono text-xs text-zinc-400 whitespace-nowrap">
                        {formatDateShort(tx.date)}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                        <span className={isIncome ? 'text-orange-400' : 'text-orange-200'}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            title="Editar Lançamento"
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Excluir Lançamento"
                            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
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

          {/* Footer Subtotals */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#1d1d20] border-t border-neutral-800 text-xs font-mono">
            <span className="text-zinc-400 text-[11px]">
              Subtotal do Filtro: {filteredList.length} itens
            </span>
            <div className="flex items-center gap-4 text-xs">
              {filteredIncome > 0 && (
                <div className="text-zinc-400">
                  <span className="text-orange-400 mr-1.5 font-sans">Entradas:</span>
                  +{formatCurrency(filteredIncome)}
                </div>
              )}
              {filteredExpense > 0 && (
                <div className="text-rose-400">
                  <span className="text-zinc-400 mr-1.5 font-sans">Saídas:</span>
                  -{formatCurrency(filteredExpense)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
