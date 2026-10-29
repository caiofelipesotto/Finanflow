/**
 * Tema do app: escuro (padrão) ou claro.
 *
 * A escolha fica no localStorage e é aplicada em <html data-theme="...">, que
 * é lido pelos tokens de cor em index.css. O script em index.html aplica o
 * tema antes do primeiro paint, para não piscar branco ao abrir.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'finanflow_theme';

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    console.error(e);
  }
  return 'dark';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (document.documentElement.dataset.theme === theme) return;
  root.classList.add('theme-changing');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    console.error(e);
  }
  window.setTimeout(() => root.classList.remove('theme-changing'), 220);
}
