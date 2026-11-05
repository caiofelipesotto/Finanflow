import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  CheckCircle2,
  TriangleAlert,
  PiggyBank,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MonthBalanceHeroProps {
  monthLabel: string;
  shortLabel: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  saved: number;
  totalSaved: number;
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
  saved,
  totalSaved,
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
  const isSaving = saved >= 0;
  const hasData = totalIncome > 0 || totalExpense > 0;

  return (
    <section className="ui-card p-4 sm:p-5">
      {/* Cabeçalho: contexto, mês e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-1)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="ui-h1 text-xl sm:text-2xl">{monthLabel}</h2>
            {isCurrentMonth ? (
              <span className="ui-badge ui-badge-accent">Mês atual</span>
            ) : (
              <button onClick={onCurrentMonth} className="ui-btn ui-btn-ghost !py-1 !px-2">
                Ir para o mês atual
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--text-4)] mt-1">
            O que entrou, o que saiu e o que sobrou neste mês.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="ui-segmented">
            <button
              onClick={onPrevMonth}
              title="Mês anterior"
              aria-label="Mês anterior"
              className="ui-seg-item !px-1.5 hover:text-[var(--text-1)]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
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
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <button onClick={onOpenNewTransaction} className="ui-btn ui-btn-primary">
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Novo lançamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Os quatro números que importam */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
        {/* Entrou */}
        <div className="ui-tile p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-stat-label">Dinheiro que entrou</span>
            <span className="ui-icon ui-icon-success">
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--success-text)] tabular-nums mt-2 break-words">
            {formatCurrency(totalIncome)}
          </div>
          <span className="ui-stat-note">
            {totalIncome > 0 ? 'Receitas do mês' : 'Nenhuma receita cadastrada'}
          </span>
        </div>

        {/* Saiu */}
        <div className="ui-tile p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="ui-stat-label">Despesas</span>
            <span className="ui-icon ui-icon-danger">
              <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--danger-text)] tabular-nums mt-2 break-words">
            {formatCurrency(totalExpense)}
          </div>
          <span className="ui-stat-note">
            {totalCount > 0 ? `${paidCount} de ${totalCount} contas já pagas` : 'Nenhuma despesa cadastrada'}
          </span>
        </div>

        {/* Guardado / Resgatado */}
        <div
          className={`ui-tile p-4 sm:p-5 ${
            hasData
              ? isSaving
                ? '!border-[color-mix(in_srgb,var(--accent-text)_38%,transparent)]'
                : '!border-[color-mix(in_srgb,var(--danger-text)_38%,transparent)]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`ui-stat-label ${saved !== 0 ? '!text-[var(--accent-text)]' : ''}`}>
              {isSaving ? 'Guardado' : 'Resgatado'}
            </span>
            <span className="ui-icon ui-icon-accent">
              <PiggyBank className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--accent-text)] tabular-nums mt-2 break-words">
            {formatCurrency(Math.abs(saved))}
          </div>
          <span className="ui-stat-note">
            {totalSaved > 0 ? `${formatCurrency(totalSaved)} acumulado` : 'Comece a guardar este mês'}
          </span>
        </div>

        {/* Sobrou */}
        <div
          className={`ui-tile p-4 sm:p-5 ${
            hasData
              ? isPositive
                ? '!border-[color-mix(in_srgb,var(--accent-text)_38%,transparent)]'
                : '!border-[color-mix(in_srgb,var(--danger-text)_38%,transparent)]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`ui-stat-label ${hasData ? (isPositive ? '!text-[var(--accent-text)]' : '!text-[var(--danger-text)]') : ''}`}>
              {isPositive ? 'Sobrou' : 'Faltou'}
            </span>
            <span className={`ui-icon ${hasData && isPositive ? 'ui-icon-accent' : hasData ? 'ui-icon-danger' : ''}`}>
              <Wallet className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums mt-2 break-words ${
              hasData ? (isPositive ? 'text-[var(--accent-text)]' : 'text-[var(--danger-text)]') : 'text-[var(--text-1)]'
            }`}
          >
            {formatCurrency(balance)}
          </div>
          <span className="ui-stat-note flex items-center gap-1">
            {!hasData ? (
              'Calculado em tempo real'
            ) : isPositive ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-[var(--accent-text)] shrink-0" aria-hidden="true" />
                Livre depois das contas do mês
              </>
            ) : (
              <>
                <TriangleAlert className="w-3 h-3 text-[var(--danger-text)] shrink-0" aria-hidden="true" />
                As saídas superam as entradas
              </>
            )}
          </span>
        </div>
      </div>

      {/* Leitura rápida do mês */}
      <div className="mt-4 pt-3 border-t border-[var(--border-1)] text-xs text-[var(--text-3)]">
        {hasData ? (
          <p className="leading-relaxed">
            Em <strong className="text-[var(--text-2)] font-semibold">{monthLabel}</strong> entraram{' '}
            <strong className="text-[var(--success-text)] font-semibold tabular-nums">{formatCurrency(totalIncome)}</strong>, saíram{' '}
            <strong className="text-[var(--danger-text)] font-semibold tabular-nums">{formatCurrency(totalExpense)}</strong> e{' '}
            <strong className={isPositive ? 'text-[var(--accent-text)] font-semibold tabular-nums' : 'text-[var(--danger-text)] font-semibold tabular-nums'}>
              {isPositive ? 'sobraram' : 'faltaram'} {formatCurrency(Math.abs(balance))}
            </strong>
            {saved > 0 ? (
              <span> e foram guardados{' '}
                <strong className="text-[var(--accent-text)] font-semibold tabular-nums">{formatCurrency(saved)}</strong>
              </span>
            ) : saved < 0 ? (
              <span> e foram resgatados{' '}
                <strong className="text-[var(--danger-text)] font-semibold tabular-nums">{formatCurrency(Math.abs(saved))}</strong>
              </span>
            ) : null}
            {creditCardTotal > 0 ? (
              <> — sendo <strong className="text-[var(--text-2)] font-semibold tabular-nums">{formatCurrency(creditCardTotal)}</strong> em cartão.</>
            ) : (
              '.'
            )}
          </p>
        ) : (
          <p className="leading-relaxed">
            Cadastre sua renda e suas contas do mês para ver automaticamente quanto entrou, quanto saiu e quanto sobrou.
          </p>
        )}
      </div>
    </section>
  );
};
