import React, { useMemo } from 'react';
import { CreditCard, Calendar, ArrowRight, ShieldCheck, Plus, Layers, Camera } from 'lucide-react';
import { Transaction, Account } from '../types/finance';
import { formatCurrency, formatMonthShort } from '../utils/formatters';

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
    <div className="ui-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Gestão de Cartões de Crédito & Compras Parceladas
            </h3>
            <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-950/80 border border-zinc-800/80 px-2 py-0.5 rounded-md">
              Faturas do Mês
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acompanhe a fatura fechada deste mês e as parcelas futuras já programadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenScanInvoice && (
            <button
              type="button"
              onClick={onOpenScanInvoice}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-950/70 hover:bg-zinc-900/80 border border-zinc-700/60 rounded-lg transition-all shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              <span>Escanear Print do Cartão</span>
            </button>
          )}

          <div className="flex items-center gap-2 font-mono bg-[#09090b] px-3 py-1.5 rounded-lg border border-neutral-800">
            <span className="text-xs text-zinc-400">Total Faturas:</span>
            <span className="text-sm font-bold text-zinc-300">
              {formatCurrency(totalCardsInvoice)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Credit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {cardStats.map((item) => (
          <div
            key={item.account.id}
            className="p-4 rounded-xl border border-neutral-800 bg-[#1d1d20]/80 flex flex-col justify-between hover:border-zinc-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.account.color }}
                  />
                  {item.account.name}
                </span>

                {item.account.cardDueDay && (
                  <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded-md">
                    Vence dia {item.account.cardDueDay}
                  </span>
                )}
              </div>

              {/* Invoice Value */}
              <div className="mt-1">
                <span className="text-[11px] text-zinc-400 block">Fatura deste mês:</span>
                <div className="text-xl font-black text-white font-mono tabular-nums">
                  {formatCurrency(item.invoiceTotal)}
                </div>
              </div>

              {/* Active Installments on this card for this month */}
              {item.activeThisMonth.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-zinc-700/60 space-y-2">
                  <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider block">
                    Parcelas ativas neste mês ({item.activeThisMonth.length})
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {item.activeThisMonth.map((inst, idx) => (
                      <div
                        key={idx}
                        className="ui-panel p-2 text-xs flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <span className="text-white font-medium truncate block">
                            {inst.desc}
                          </span>
                          <span className="text-[10px] text-zinc-300/90 font-mono">
                            Parcela {inst.current} de {inst.total}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-zinc-200 shrink-0">
                          {formatCurrency(inst.singleAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-zinc-700/60 text-[11px] text-zinc-500">
                  Nenhuma compra parcelada caindo neste mês.
                </div>
              )}
            </div>

            {/* Quick action */}
            <div className="mt-4 pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <span>+ Parcelar neste cartão</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
