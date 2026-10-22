import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getInitialTheme, saveTheme } from '../theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => { saveTheme(theme); }, [theme]);
  return <button type="button" className="icon-btn theme-toggle" aria-label="Modo escuro" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>
    {theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}
  </button>;
}
