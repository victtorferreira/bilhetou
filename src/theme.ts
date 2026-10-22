export type Theme = 'light' | 'dark';

const storageKey = 'dia-de-sorte-theme';

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // The theme remains available when browser storage is blocked.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Keep the selected theme for this session if storage is unavailable.
  }
}
