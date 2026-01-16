import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  effectiveMode: 'light' | 'dark'; // 실제 적용되는 테마 (system 모드 시 OS 설정 반영)
  setMode: (mode: ThemeMode) => void;
  updateEffectiveMode: () => void;
}

// localStorage에서 저장된 테마 가져오기
const getSavedTheme = (): ThemeMode => {
  const saved = localStorage.getItem('theme') as ThemeMode;
  return saved || 'system';
};

// 시스템 다크모드 감지
const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// 실제 적용될 테마 계산
const calculateEffectiveMode = (mode: ThemeMode): 'light' | 'dark' => {
  return mode === 'system' ? getSystemTheme() : mode;
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const savedMode = getSavedTheme();

  // 시스템 테마 변경 감지
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentMode = get().mode;
    if (currentMode === 'system') {
      set({ effectiveMode: getSystemTheme() });
    }
  });

  return {
    mode: savedMode,
    effectiveMode: calculateEffectiveMode(savedMode),

    setMode: (mode: ThemeMode) => {
      localStorage.setItem('theme', mode);
      set({
        mode,
        effectiveMode: calculateEffectiveMode(mode),
      });
    },

    updateEffectiveMode: () => {
      const currentMode = get().mode;
      set({ effectiveMode: calculateEffectiveMode(currentMode) });
    },
  };
});
