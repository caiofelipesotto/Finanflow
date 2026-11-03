import React, { useMemo, useState } from 'react';
import { CreditCard, ArrowRight, Plus, Camera, ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import { Transaction, Account } from '../types/finance';
import { formatCurrency } from '../utils/formatters';

interface CreditCardsWidgetProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedYear: number;
  selectedMonth: number; // 0-11
  onOpenNewTransaction: () => void;
  onOpenScanInvoice?: () => void;
}

export const CreditCardsWidget: React.FC<CreditCardsWidgetProps> = ({
  transactions,
  accounts,
  selectedYear,
  selectedMonth,
  onOpenNewTransaction,
  onOpenScanInvoice,
}) => {
  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Compute stats + full month transactions per card
  const cardStats = useMemo(() => {
    return creditAccounts.map((acc) => {
      const monthTxs = transactions
        .filter((t) => t.account === acc.id && t.date.startsWith(monthPrefix))
        .sort((a, b) => a.date.localeCompare(b.date));

      const invoiceTotal = monthTxs.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0);

      // Active installments across all time on this card
      const installmentGroups: Record<
        string,
        {
          desc: string;
          current: number;
          total: number;
          singleAmount: number;
          totalPurchase: number;
          currentMonthTx?: Transaction;
        }
      > = {};

      transactions
        .filter((t) => t.account === acc.id && t.installment)
        .forEach((t) => {
          const groupId = t.installment?.installmentGroupId || t.description;
          if (!installmentGroups[groupId]) {
            installmentGroups[groupId] = {
              desc: t.description.replace(/\s\(\d+\/\d+\)$/, ''),
              current: t.installment!.current,
              total: t.installment!.total,
              singleAmount: t.amount,
              totalPurchase: t.installment!.totalPurchaseAmount || t.amount * t.installment!.total,
            };
          }
          if (t.date.startsWith(monthPrefix)) {
            installmentGroups[groupId].current = t.installment!.current;
            installmentGroups[groupId].currentMonthTx = t;
          }
        });

      const activeThisMonth = Object.values(installmentGroups).filter((g) => g.currentMonthTx);

      const limit = acc.cardLimit || 5000;
      const usagePercent = Math.min(100, limit > 0 ? Math.round((Math.abs(invoiceTotal) / limit) * 100) : 0);

      return {
        account: acc,
        monthTxs,
        invoiceTotal,
        activeThisMonth,
        limit,
        usagePercent,
        count: monthTxs.length,
      };
    });
  }, [creditAccounts, transactions, monthPrefix]);

  const totalCardsInvoice = cardStats.reduce((s, c) => s + c.invoiceTotal, 0);

  if (creditAccounts.length === 0) return null;

  const toggleCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'var(--danger-text)';
    if (pct >= 70) return 'var(--warning-text)';
    return 'var(--accent-text)';
  };

  return (
    <section className="ui-card p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[var(--border-1)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="ui-section-title">Cartões de crédito</h3>
            <span className="ui-badge">{cardStats.length} cartão{cardStats.length !== 1 ? 'ões' : ''}</span>
          </div>
          <p className="ui-sub">Fatura do mês + lançamentos por cartão</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenScanInvoice && (
            <button type="button" onClick={onOpenScanInvoice} className="ui-btn ui-btn-secondary">
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Escanear fatura</span>
            </button>
          )}

          <div className="ui-tile px-3 py-1.5 flex items-baseline gap-2">
            <span className="ui-stat-label !inline">Total faturas</span>
            <span className="text-sm font-bold text-[var(--text-1)] tabular-nums">
              {formatCurrency(totalCardsInvoice)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de cartões — cada um é um módulo expansível */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {cardStats.map((item) => {
          const isExpanded = expandedCardId === item.account.id;
          const hasExpenseTxs = item.monthTxs.some((t) => t.type === 'expense');
          const expenseTxs = item.monthTxs.filter((t) => t.type === 'expense');
          const incomeTxs = item.monthTxs.filter((t) => t.type === 'income');

          return (
            <div key={item.account.id} className="ui-tile p-3.5 flex flex-col">
              {/* Header do cartão */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.account.color }}
                  />
                  <span className="truncate">{item.account.name}</span>
                </span>

                <button
                  type="button"
                  onClick={() => toggleCard(item.account.id)}
                  className="p-1 rounded-[var(--r-control)] text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Fatura + limite */}
              <div className="mt-2.5">
                <span className="ui-stat-label">Fatura deste mês</span>
                <div className="ui-stat-value mt-0.5">{formatCurrency(item.invoiceTotal)}</div>

                {item.limit > 0 && (
                  <div className="mt-2">
                    <div className="ui-progress">
                      <div
                        className="ui-progress-bar"
                        style={{
                          width: `${item.usagePercent}%`,
                          backgroundColor: getUsageColor(item.usagePercent),
                        }}
                      />
                    </div>
                    <span className="ui-stat-note">
                      {item.usagePercent}% do limite de {formatCurrency(item.limit)}
                    </span>
                  </div>
                )}
              </div>

              {/* Parcelas ativas (resumo) */}
              {item.activeThisMonth.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border-1)]">
                  <span className="ui-label !mb-1.5">Parcelas ativas ({item.activeThisMonth.length})</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {item.activeThisMonth.slice(0, 3).map((inst, idx) => (
                      <div key={idx} className="ui-tile !bg-[var(--surface-1)] p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-[var(--text-1)] truncate block">
                            {inst.desc}
                          </span>
                          <span className="text-[10px] text-[var(--text-4)] tabular-nums">
                            Parcela {inst.current} de {inst.total}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[var(--text-2)] tabular-nums shrink-0">
                          {formatCurrency(inst.singleAmount)}
                        </span>
                      </div>
                    ))}
                    {item.activeThisMonth.length > 3 && (
                      <span className="text-[10px] text-[var(--text-4)] block text-center mt-1">
                        + {item.activeThisMonth.length - 3} mais...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Lista de transações do mês (expandível) */}
              {hasExpenseTxs && (
                <div
                  className={`mt-3 pt-3 border-t border-[var(--border-1)] transition-all duration-200 overflow-hidden ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  role="region"
                  aria-label={`Transações de ${item.account.name}`}
                >
                  <div className="space-y-1.5">
                    {expenseTxs.map((tx, idx) => (
                      <div
                        key={tx.id || idx}
                        className="ui-tile !bg-[var(--surface-1)] p-2.5 flex items-center justify-between gap-2 group"
                        onClick={() => {}}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-[var(--text-1)] truncate block">
                            {tx.description}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-[var(--text-4)] tabular-nums">
                              {new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span
                              className={`ui-badge !text-[10px] !px-1.5 !py-0.5 ${tx.isPaid ? 'ui-badge-success' : 'ui-badge-danger'}`}
                            >
                              {tx.isPaid ? 'Pago' : 'Aberto'}
                            </span>
                            {tx.installment && (
                              <span className="ui-badge !text-[10px] !px-1.5 !py-0.5 ui-badge-accent">
                                {tx.installment.current}/{tx.installment.total}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[var(--danger-text)] tabular-nums shrink-0">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                    {incomeTxs.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-1)]">
                        <span className="ui-label !mb-1.5">Receitas no cartão</span>
                        <div className="space-y-1">
                          {incomeTxs.map((tx, idx) => (
                            <div key={tx.id || idx} className="ui-tile !bg-[var(--surface-1)] p-2 flex items-center justify-between gap-2">
                              <span className="text-xs text-[var(--text-2)] truncate">{tx.description}</span>
                              <span className="text-xs font-bold text-[var(--accent-text)] tabular-nums shrink-0">
                                + {formatCurrency(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!hasExpenseTxs && !item.activeThisMonth.length && (
                <p className="mt-3 pt-3 border-t border-[var(--border-1)] text-[11px] text-[var(--text-4)] text-center">
                  Nenhum lançamento neste cartão este mês.
                </p>
              )}

              {/* Ação */}
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="mt-3 pt-2.5 border-t border-[var(--border-1)] text-[11px] font-semibold text-[var(--text-3)] hover:text-[var(--accent-text)] flex items-center gap-1 transition-colors min-h-[44px]"
                touch-action="manipulation"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
                <span>Lançar neste cartão</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Resumo total */}
      <div className="mt-4 pt-4 border-t border-[var(--border-1)] ui-tile p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="ui-stat-label">Total em faturas (mês)</span>
          <span className="ui-stat-value text-[var(--danger-text)]">{formatCurrency(totalCardsInvoice)}</span>
        </div>
        <p className="text-[11px] text-[var(--text-4)] mt-1">
          Clique na seta do cartão para ver os lançamentos do mês.
        </p>
      </div>
    </section>
  );
};