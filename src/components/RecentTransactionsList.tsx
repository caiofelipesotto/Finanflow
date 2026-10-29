import React from 'react';
import { Check, Clock, Edit2, Trash2 } from 'lucide-react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onTogglePaid: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onViewAll?: () => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  categories,
  accounts,
  onTogglePaid,
  onEdit,
  onDelete,
  onViewAll,
}) => {
  const categoriesMap = categories.reduce<Record<string, Category>>((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {});

  const accountsMap = accounts.reduce<Record<string, Account>>((acc, accnt) => {
    acc[accnt.id] = accnt;
    return acc;
  }, {});

  if (transactions.length === 0) {
    return (
      <div className="ui-card p-5">
        <h3 className="text-sm font-bold text-neutral-900 mb-1">Últimas Transações</h3>
        <p className="text-xs text-neutral-500 mb-6">Suas movimentações mais recentes</p>
        <div className="py-10 text-center text-xs text-neutral-400">
          Nenhuma transação encontrada no período.
        </div>
      </div>
    );
  }

  return (
    <div className="ui-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Últimas Transações</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Lançamentos mais recentes no mês selecionado
          </p>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-zinc-700 hover:text-zinc-800 transition-colors"
          >
            Ver todas →
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-100">
        {transactions.map((tx) => {
          const category = categoriesMap[tx.category] || {
            name: 'Outros',
            icon: 'Tag',
            color: '#64748b',
          };
          const account = accountsMap[tx.account];

          return (
            <div
              key={tx.id}
              className="py-3 flex items-center justify-between gap-3 group hover:bg-neutral-50/80 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* 1-Click Status Toggle Button */}
                <button
                  type="button"
                  onClick={() => onTogglePaid(tx.id)}
                  title={tx.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                    tx.isPaid
                      ? 'bg-orange-600 border-zinc-800 text-white'
                      : 'border-neutral-300 text-transparent hover:border-orange-500 hover:text-zinc-500'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

                {/* Category Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${category.color}15`, color: category.color }}
                >
                  <CategoryIcon name={category.icon} color={category.color} className="w-4 h-4" />
                </div>

                {/* Details with Unboxed Metadata */}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-900 truncate">
                    {tx.description}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5 truncate">
                    <span>{category.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{account ? account.name : 'Geral'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatDateShort(tx.date)}</span>
                    {!tx.isPaid && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-600 font-medium flex items-center gap-0.5">
                          <Clock className="w-3 h-3 inline" /> Pendente
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount and Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-bold font-mono tabular-nums whitespace-nowrap ${
                    tx.type === 'income' ? 'text-orange-700' : 'text-neutral-900'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                </span>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={() => onEdit(tx)}
                    title="Editar"
                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(tx.id)}
                    title="Excluir"
                    className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
