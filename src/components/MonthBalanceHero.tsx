import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, ChevronLeft, ChevronRight, PlusCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MonthBalanceHeroProps {
  monthLabel: string;
  shortLabel: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  paidCount: number;
  totalCount: number;
  creditCardTotal: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  isCurrentMonth: boolean;
  onOpenNewTransaction: () => void;
}

export const MonthBalanceHero: React.FC<MonthBalanceHeroProps> = ({
  monthLabel,
  shortLabel,
  totalIncome,
  totalExpense,
  balance,
  paidCount,
  totalCount,
  creditCardTotal,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  isCurrentMonth,
  onOpenNewTransaction,
}) => {
  const isPositive = balance >= 0;
  const hasData = totalIncome > 0 || totalExpense > 0;

  return (
    <div className="bg-[#161618] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background subtle orange glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: Month Navigator and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
              Controle Financeiro Mensal
            </span>
            <span aria-hidden="true" className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-400">Visão Geral</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {monthLabel}
            </h2>
            {isCurrentMonth ? (
              <span className="px-2.5 py-0.5 text-[11px] font-bold text-zinc-400 bg-zinc-950/70 border border-zinc-800/60 rounded-md">
                Mês Atual
              </span>
            ) : (
              <button
                onClick={onCurrentMonth}
                className="px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors cursor-pointer"
              >
                Ir para Mês Atual
              </button>
            )}
          </div>
        </div>

        {/* Month Navigation & New Transaction Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-800/80 border border-zinc-700 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={onPrevMonth}
              title="Mês Anterior"
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-zinc-200 select-none min-w-[64px] text-center">
              {shortLabel}
            </span>

            <button
              onClick={onNextMonth}
              title="Próximo Mês"
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-zinc-950 bg-zinc-500 hover:bg-orange-400 rounded-xl transition-all shadow-md shadow-orange-500/20 whitespace-nowrap cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Lançamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Main 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Entradas */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4.5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Total que Entrou</span>
            <div className="w-6 h-6 rounded-md bg-zinc-950/80 border border-zinc-800/60 flex items-center justify-center text-zinc-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {formatCurrency(totalIncome)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {totalIncome > 0 ? 'Receitas cadastradas no mês' : 'Nenhuma receita cadastrada'}
          </div>
        </div>

        {/* 2. Total Saídas */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4.5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Total Saídas & Contas</span>
            <div className="w-6 h-6 rounded-md bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-300 font-mono tabular-nums">
            {formatCurrency(totalExpense)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {totalCount > 0 ? `${paidCount} de ${totalCount} contas já pagas` : 'Nenhuma despesa cadastrada'}
          </div>
        </div>

        {/* 3. SOBROU NO BOLSO (HERO) */}
        <div
          className={`border rounded-xl p-4.5 transition-colors relative overflow-hidden ${
            !hasData
              ? 'bg-zinc-900/90 border-zinc-800'
              : isPositive
              ? 'bg-gradient-to-br from-orange-950/50 via-zinc-900 to-zinc-900 border-orange-500/60 shadow-lg shadow-orange-950/25'
              : 'bg-rose-950/40 border-rose-600/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className={!hasData ? 'text-zinc-300' : isPositive ? 'text-orange-400' : 'text-rose-300'}>
              SOBROU NO BOLSO (Livre)
            </span>
            <div className="w-6 h-6 rounded-md bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-3xl font-black font-mono tabular-nums tracking-tight ${
            !hasData ? 'text-white' : isPositive ? 'text-orange-200' : 'text-rose-300'
          }`}>
            {formatCurrency(balance)}
          </div>
          <div className="mt-2 text-[11px] font-medium flex items-center gap-1">
            {!hasData ? (
              <span className="text-zinc-400">Valores calculados em tempo real</span>
            ) : isPositive ? (
              <span className="text-orange-300/90 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline text-orange-400" />
                Caixa livre para poupar ou investir
              </span>
            ) : (
              <span className="text-rose-400">
                Atenção: saídas superam as entradas
              </span>
            )}
          </div>
        </div>

        {/* 4. Cartão de Crédito e Parcelas */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4.5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Fatura Cartão & Parcelas</span>
            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-100 font-mono tabular-nums">
            {formatCurrency(creditCardTotal)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {creditCardTotal > 0 ? 'Compras à vista + parcelas deste mês' : 'Sem faturas para este mês'}
          </div>
        </div>
      </div>

      {/* Explanatory footer strip */}
      <div className="mt-5 pt-4 border-t border-zinc-800 text-xs text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {hasData ? (
          <p>
            Em <strong className="text-zinc-200">{monthLabel}</strong>: você tem{' '}
            <strong className="text-orange-400 font-mono tabular-nums">{formatCurrency(totalIncome)}</strong> de entradas,{' '}
            <strong className="text-rose-400 font-mono tabular-nums">{formatCurrency(totalExpense)}</strong> em despesas totais, e{' '}
            <strong className={isPositive ? 'text-orange-300 font-mono tabular-nums' : 'text-rose-300 font-mono tabular-nums'}>
              {isPositive ? 'sobram' : 'faltam'} {formatCurrency(Math.abs(balance))}
            </strong>.
          </p>
        ) : (
          <p className="text-zinc-400">
            💡 <strong>Dica:</strong> Comece cadastrando sua renda mensal, contas fixas ou compras parceladas no cartão para visualizar os cálculos automáticos.
          </p>
        )}
      </div>
    </div>
  );
};
