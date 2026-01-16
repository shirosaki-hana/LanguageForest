import { create } from 'zustand';
import type { TranslationConfig, GeminiModelInfo, UpdateTranslationConfigRequest } from '@shared/types';

// 번역 설정 props
export interface TranslationSettingsProps {
  config: TranslationConfig | null;
  models: GeminiModelInfo[];
  modelsLoading: boolean;
  onSave: (data: UpdateTranslationConfigRequest) => Promise<void>;
  onLoadModels: () => Promise<void>;
}

interface SettingsState {
  isOpen: boolean;
  initialTab: number; // 0: 앱 설정, 1: 번역 설정
  translationProps: TranslationSettingsProps | null;
  openSettings: (tab?: number, translationProps?: TranslationSettingsProps) => void;
  closeSettings: () => void;
  setTranslationProps: (props: TranslationSettingsProps | null) => void;
}

export const useSettingsStore = create<SettingsState>()(set => ({
  isOpen: false,
  initialTab: 0,
  translationProps: null,
  openSettings: (tab = 0, translationProps) =>
    set({
      isOpen: true,
      initialTab: tab,
      translationProps: translationProps ?? null,
    }),
  closeSettings: () => set({ isOpen: false }),
  setTranslationProps: translationProps => set({ translationProps }),
}));
