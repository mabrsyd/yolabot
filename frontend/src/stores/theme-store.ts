import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('yolabot_theme') as Theme) || 'system',
  setTheme: (theme: Theme) => {
    localStorage.setItem('yolabot_theme', theme);
    set({ theme });
    get().applyTheme();
  },
  applyTheme: () => {
    const { theme } = get();
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  },
}));

