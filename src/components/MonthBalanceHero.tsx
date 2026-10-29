import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, ChevronLeft, ChevronRight, PlusCircle, CheckCircle2, TriangleAlert } from 'lucide-react';
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
    <section className="ui-card p-4 sm:p-5">
      {/* Cabeçalho: contexto, mês e ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border-1)]">
        <div className="min-w-0">
          <span className="ui-label mb-0">Visão geral do mês</span>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h2 className="ui-h1 text-2xl sm:text-3xl">{monthLabel}</h2>
            {isCurrentMonth ? (
              <span className="ui-badge ui-badge-accent">Mês atual</span>
            ) : (
              <button onClick={onCurrentMonth} className="ui-btn ui-btn-ghost !py-1 !px-2">
                Ir para o mês atual
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="ui-segmented">
            <button
              onClick={onPrevMonth}
              title="Mês anterior"
              aria-label="Mês anterior"
              className="ui-seg-item !px-1.5 hover:text-[var(--text-1)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 text-xs font-bold text-[var(--text-1)] select-none min-w-[64px] text-center tabular-nums">
              {shortLabel}
            </span>

            <button
              onClick={onNextMonth}
              title="Próximo mês"
              aria-label="Próximo mês"
              className="ui-seg-item !px-1.5 hover:text-[var(--text-1)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button onClick={onOpenNewTransaction} className="ui-btn ui-btn-primary">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Novo lançamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Quatro métricas do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="ui-tile ui-tile-hover p-3.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="ui-stat-label">Receitas do mês</span>
            <span className="ui-icon ui-icon-success">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="ui-stat-value">{formatCurrency(totalIncome)}</div>
          <span className="ui-stat-note">
            {totalIncome > 0 ? 'Receitas cadastradas no mês' : 'Nenhuma receita cadastrada'}
          </span>
        </div>

        <div className="ui-tile ui-tile-hover p-3.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="ui-stat-label">Despesas e contas</span>
            <span className="ui-icon ui-icon-danger">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="ui-stat-value">{formatCurrency(totalExpense)}</div>
          <span className="ui-stat-note">
            {totalCount > 0 ? `${paidCount} de ${totalCount} contas já pagas` : 'Nenhuma despesa cadastrada'}
          </span>
        </div>

        <div
          className={`ui-tile p-3.5 ${
            hasData
              ? isPositive
                ? '!border-[color-mix(in_srgb,var(--accent-text)_32%,transparent)]'
                : '!border-[color-mix(in_srgb,var(--danger-text)_32%,transparent)]'
              : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`ui-stat-label ${hasData && isPositive ? '!text-[var(--accent-text)]' : hasData ? '!text-[var(--danger-text)]' : ''}`}>
              Disponível para poupar
            </span>
            <span className="ui-icon ui-icon-accent">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div
            className={`ui-stat-value ${
              hasData ? (isPositive ? '!text-[var(--accent-text)]' : '!text-[var(--danger-text)]') : ''
            }`}
          >
            {formatCurrency(balance)}
          </div>
          <span className="ui-stat-note flex items-center gap-1">
            {!hasData ? (
              'Valores calculados em tempo real'
            ) : isPositive ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-[var(--accent-text)] shrink-0" />
                Livre depois das contas do mês
              </>
            ) : (
              <>
                <TriangleAlert className="w-3 h-3 text-[var(--danger-text)] shrink-0" />
                Saídas superam as entradas
              </>
            )}
          </span>
        </div>

        <div className="ui-tile ui-tile-hover p-3.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="ui-stat-label">Fatura e parcelas</span>
            <span className="ui-icon">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="ui-stat-value">{formatCurrency(creditCardTotal)}</div>
          <span className="ui-stat-note">
            {creditCardTotal > 0 ? 'Compras à vista + parcelas do mês' : 'Sem faturas para este mês'}
          </span>
        </div>
      </div>

      {/* Leitura rápida do mês */}
      <div className="mt-4 pt-3 border-t border-[var(--border-1)] text-xs text-[var(--text-3)]">
        {hasData ? (
          <p className="leading-relaxed">
            Em <strong className="text-[var(--text-2)] font-semibold">{monthLabel}</strong> você tem{' '}
            <strong className="text-[var(--accent-text)] font-semibold tabular-nums">{formatCurrency(totalIncome)}</strong> de entradas,{' '}
            <strong className="text-[var(--danger-text)] font-semibold tabular-nums">{formatCurrency(totalExpense)}</strong> em despesas e{' '}
            <strong className={isPositive ? 'text-[var(--accent-text)] font-semibold tabular-nums' : 'text-[var(--danger-text)] font-semibold tabular-nums'}>
              {isPositive ? 'sobram' : 'faltam'} {formatCurrency(Math.abs(balance))}
            </strong>.
          </p>
        ) : (
          <p className="leading-relaxed">
            Comece cadastrando sua renda mensal, contas fixas ou compras parceladas no cartão para ver os cálculos automáticos.
          </p>
        )}
      </div>
    </section>
  );
};
