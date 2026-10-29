import React from 'react';

interface LogoMarkProps {
  className?: string;
  /** Usa um id único por instância para o gradiente não colidir na página. */
  title?: string;
}

let logoInstance = 0;

/**
 * Marca do FinanFlow (o "ícone" do app): tile laranja com uma linha de
 * crescimento. É vetor, então fica nítido do favicon ao cabeçalho.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({ className = 'w-8 h-8', title = 'FinanFlow' }) => {
  const id = React.useMemo(() => `ff-logo-${++logoInstance}`, []);
  return (
    <svg className={className} viewBox="0 0 512 512" role="img" aria-label={title}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="55%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" ry="120" fill={`url(#${id})`} />
      <g fill="#1c1206">
        <rect x="124" y="296" width="62" height="112" rx="31" />
        <rect x="225" y="232" width="62" height="176" rx="31" />
        <rect x="326" y="152" width="62" height="256" rx="31" />
      </g>
    </svg>
  );
};
