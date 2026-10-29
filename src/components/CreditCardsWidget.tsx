import React, { useMemo } from 'react';
import { CreditCard, ArrowRight, Plus, Camera } from 'lucide-react';
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

  // Compute stats per card for this month
  const cardStats = useMemo(() => {
    return creditAccounts.map((acc) => {
      // Invoices for this month
      const monthTxs = transactions.filter(
        (t) => t.account === acc.id && t.date.startsWith(monthPrefix)
      );
      const invoiceTotal = monthTxs.reduce((sum, t) => sum + t.amount, 0);

      // Active installments across all time on this card that have installments still pending
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

      // Filter only groups that have a payment due in the selected month
      const activeThisMonth = Object.values(installmentGroups).filter((g) => g.currentMonthTx);

      const limit = acc.cardLimit || 5000;
      const usagePercent = Math.min(100, Math.round((invoiceTotal / limit) * 100));

      return {
        account: acc,
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

  return (
    <section className="ui-card p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[var(--border-1)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="ui-section-title">Cartões de crédito e parcelas</h3>
            <span className="ui-badge">Faturas do mês</span>
          </div>
          <p className="ui-sub">Fatura fechada deste mês e parcelas futuras já programadas</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenScanInvoice && (
            <button type="button" onClick={onOpenScanInvoice} className="ui-btn ui-btn-secondary">
              <Camera className="w-3.5 h-3.5" />
              <span>Escanear fatura</span>
            </button>
          )}

          <div className="ui-tile px-3 py-1.5 flex items-baseline gap-2">
            <span className="ui-stat-label !inline">Total das faturas</span>
            <span className="text-sm font-bold text-[var(--text-1)] tabular-nums">
              {formatCurrency(totalCardsInvoice)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de cartões */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {cardStats.map((item) => (
          <div key={item.account.id} className="ui-tile ui-tile-hover p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.account.color }}
                  />
                  <span className="truncate">{item.account.name}</span>
                </span>

                {item.account.cardDueDay && (
                  <span className="ui-badge shrink-0">Vence dia {item.account.cardDueDay}</span>
                )}
              </div>

              <div className="mt-2.5">
                <span className="ui-stat-label">Fatura deste mês</span>
                <div className="ui-stat-value mt-0.5">{formatCurrency(item.invoiceTotal)}</div>
              </div>

              {item.limit > 0 && (
                <div className="mt-2">
                  <div className="ui-progress">
                    <div
                      className="ui-progress-bar"
                      style={{
                        width: `${item.usagePercent}%`,
                        backgroundColor:
                          item.usagePercent >= 90 ? 'var(--danger-text)' : 'var(--accent-text)',
                      }}
                    />
                  </div>
                  <span className="ui-stat-note">
                    {item.usagePercent}% do limite de {formatCurrency(item.limit)}
                  </span>
                </div>
              )}

              {item.activeThisMonth.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-[var(--border-1)]">
                  <span className="ui-label !mb-1.5">
                    Parcelas ativas ({item.activeThisMonth.length})
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {item.activeThisMonth.map((inst, idx) => (
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
                  </div>
                </div>
              ) : (
                <p className="mt-3 pt-3 border-t border-[var(--border-1)] text-[11px] text-[var(--text-4)]">
                  Nenhuma compra parcelada caindo neste mês.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="mt-3 pt-2.5 border-t border-[var(--border-1)] text-[11px] font-semibold text-[var(--text-3)] hover:text-[var(--accent-text)] flex items-center gap-1 transition-colors self-end"
            >
              <Plus className="w-3 h-3" />
              <span>Parcelar neste cartão</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
