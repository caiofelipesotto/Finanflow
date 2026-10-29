import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../utils/theme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}

/**
 * Alterna entre tema escuro e claro. Ícone = o que o clique vai fazer,
 * com rótulo acessível.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, className = '' }) => {
  const isDark = theme === 'dark';
  const label = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro';

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      className={`p-2 rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
