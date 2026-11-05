import React, { useState } from 'react';
import { MonthPoint } from '../utils/monthlySeries';
import { formatCurrency } from '../utils/formatters';

interface SavingsChartProps {
  points: Array<Pick<MonthPoint, 'key' | 'label' | 'cumulativeSaved'>>;
  height?: number;
  compact?: boolean;
}

export const SavingsChart: React.FC<SavingsChartProps> = ({ points, height = 140, compact = false }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (points.length === 0) return null;

  const values = points.map((p) => p.cumulativeSaved);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(0, ...values);
  const span = maxVal - minVal || 1;

  const chartHeight = compact ? 90 : height;
  const paddingTop = compact ? 8 : 16;
  const paddingBottom = compact ? 8 : 16;
  const availableHeight = chartHeight - paddingTop - paddingBottom;
  const colWidth = 48;
  const totalWidth = Math.max(points.length * colWidth, 320);

  const getY = (value: number) => paddingTop + availableHeight * (1 - (value - minVal) / span);
  const getX = (idx: number) => idx * colWidth + colWidth / 2 + 10;

  const areaPath = points.map((_, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(points[idx].cumulativeSaved)}`).join(' ') +
    points.map((_, idx) => `${idx === points.length - 1 ? 'L' : 'L'} ${getX(points.length - 1 - idx)} ${getY(minVal)}`).join(' ') + ' Z';

  const linePath = points.map((_, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(points[idx].cumulativeSaved)}`).join(' ');

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return (
    <div className="w-full h-full">
      <svg
        viewBox={`0 0 ${totalWidth + 20} ${chartHeight}`}
        className="w-full h-full overflow-visible select-none"
        onMouseMove={(e) => {
          if (compact) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left - 10;
          const idx = Math.round(x / colWidth);
          if (idx >= 0 && idx < points.length) setHovered(idx);
          else setHovered(null);
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Zero baseline */}
        {minVal < 0 && maxVal > 0 && (
          <line
            x1="10"
            y1={getY(0)}
            x2={points.length * colWidth + 10}
            y2={getY(0)}
            stroke="var(--chart-grid)"
            strokeWidth="1"
          />
        )}

        {/* Area */}
        <path
          d={areaPath}
          fill="var(--accent-soft)"
          fillOpacity={0.25}
        />

        {/* Line */}
        <path
          d={linePath}
          stroke="var(--accent-text)"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, idx) => (
          <circle
            key={p.key}
            cx={getX(idx)}
            cy={getY(p.cumulativeSaved)}
            r={hovered === idx ? 5 : compact ? 0 : 3}
            fill="var(--accent-text)"
            stroke="var(--bg-primary)"
            strokeWidth={2}
            className={hovered === idx ? 'scale-150' : ''}
            style={{ transition: 'r 0.15s' }}
          />
        ))}

        {/* Month labels */}
        <text
          x={getX(0)}
          y={chartHeight - 2}
          textAnchor="middle"
          fontSize={compact ? 8 : 10}
          fontWeight="normal"
          fill="var(--chart-axis)"
          className="font-mono"
        >
          {firstPoint.label}
        </text>
        <text
          x={getX(points.length - 1)}
          y={chartHeight - 2}
          textAnchor="middle"
          fontSize={compact ? 8 : 10}
          fontWeight={!compact ? 'bold' : 'normal'}
          fill={!compact ? 'var(--accent-text)' : 'var(--chart-axis)'}
          className="font-mono"
        >
          {lastPoint.label}
        </text>

        {/* Last value label (non-compact) */}
        {!compact && (
          <text
            x={getX(points.length - 1) + 4}
            y={getY(lastPoint.cumulativeSaved) - 6}
            fontSize="10"
            fontWeight="bold"
            fill="var(--accent-text)"
            className="font-mono tabular-nums"
            textAnchor="start"
          >
            {formatCurrency(lastPoint.cumulativeSaved)}
          </text>
        )}
      </svg>

      {/* Hover tooltip (non-compact) */}
      {!compact && hovered !== null && (
        <div className="ui-tile p-2 mt-2 flex items-center gap-3 text-[11px] tabular-nums">
          <span className="font-bold text-[var(--text-1)]">{points[hovered].label}</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="border-l border-[var(--border-1)] pl-3">
              <span className="ui-stat-label">Acumulado</span>
              <strong className="font-bold text-[var(--accent-text)]">{formatCurrency(points[hovered].cumulativeSaved)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};