import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface KPICardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'neutral' | 'orange' | 'amber' | 'blue';
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  trend,
  variant = 'neutral',
}) => {
  const iconColor = {
    neutral: 'text-neutral-500 bg-neutral-100',
    orange: 'text-orange-700 bg-orange-50',
    amber: 'text-amber-700 bg-amber-50',
    blue: 'text-zinc-700 bg-zinc-50',
  }[variant];

  return (
    <div className="ui-card p-5 transition-shadow hover:shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-medium text-neutral-500 tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="text-2xl font-bold tracking-tight text-neutral-900 font-mono tabular-nums">
        {formatCurrency(value)}
      </div>

      {(subtext || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          {trend && (
            <>
              <span
                className={`font-semibold font-mono tabular-nums ${
                  trend.isPositive ? 'text-orange-700' : 'text-neutral-700'
                }`}
              >
                {trend.value}
              </span>
              {trend.label && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{trend.label}</span>
                </>
              )}
            </>
          )}

          {subtext && !trend && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
