import React from 'react';
import { Check, Circle, CreditCard, Repeat, Edit2, Trash2 } from 'lucide-react';
import { Transaction, Category, Account } from '../types/finance';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionMobileListProps {
  transactions: Transaction[];
  categoriesMap: Record<string, Category>;
  accountsMap: Record<string, Account>;
  onTogglePaid: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

/**
 * No celular a tabela de 7 colunas não cabe sem rolagem lateral.
 * Esta lista mostra o essencial em duas linhas, com as mesmas ações.
 */
export const TransactionMobileList: React.FC<TransactionMobileListProps> = ({
  transactions,
  categoriesMap,
  accountsMap,
  onTogglePaid,
  onEdit,
  onDelete,
}) => {
  return (
    <ul className="divide-y divide-[var(--border-1)]">
      {transactions.map((tx) => {
        const cat = categoriesMap[tx.category];
        const acc = accountsMap[tx.account];
        const isIncome = tx.type === 'income';

        return (
          <li key={tx.id} className="py-2.5 flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => onTogglePaid(tx.id)}
              title={tx.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
              className={`mt-0.5 w-5 h-5 rounded-full border inline-flex items-center justify-center shrink-0 transition-colors ${
                tx.isPaid
                  ? 'bg-[var(--accent-soft)] border-[color-mix(in_srgb,var(--accent-text)_45%,transparent)] text-[var(--accent-text)]'
                  : 'border-[var(--border-2)] text-[var(--text-4)]'
              }`}
            >
              {tx.isPaid ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-1)] truncate">
                  {tx.description}
                </span>
                <span
                  className={`text-xs font-bold tabular-nums whitespace-nowrap shrink-0 ${
                    isIncome ? 'text-[var(--accent-text)]' : 'text-[var(--text-1)]'
                  }`}
                >
                  {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)] min-w-0">
                  {cat && <CategoryIcon name={cat.icon} color={cat.color} className="w-3 h-3 shrink-0" />}
                  <span className="truncate">
                    {cat?.name || 'Geral'} · {acc?.name || 'Conta padrão'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-[var(--text-4)] tabular-nums whitespace-nowrap">
                    {formatDateShort(tx.date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(tx)}
                    title="Editar lançamento"
                    className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] rounded-[var(--r-control)] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    title="Excluir lançamento"
                    className="p-1.5 text-[var(--text-3)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-[var(--r-control)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {(tx.installment || tx.recurrence === 'monthly' || !tx.isPaid) && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
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
                  {!tx.isPaid && <span className="ui-badge">Pendente</span>}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
