import { create } from 'zustand';
import type { AlertColor } from '@mui/material';

interface SnackbarOptions {
  message: string;
  severity: AlertColor;
  duration?: number;
  translationKey?: boolean; // true면 message를 i18n 키로 처리
}

interface SnackbarState {
  open: boolean;
  options: SnackbarOptions | null;

  // 액션
  show: (options: SnackbarOptions) => void;
  success: (message: string, translationKey?: boolean) => void;
  error: (message: string, translationKey?: boolean) => void;
  warning: (message: string, translationKey?: boolean) => void;
  info: (message: string, translationKey?: boolean) => void;
  close: () => void;
}

export const useSnackbarStore = create<SnackbarState>(set => ({
  open: false,
  options: null,

  show: (options: SnackbarOptions) => {
    set({
      open: true,
      options: {
        duration: 5000,
        translationKey: false,
        ...options,
      },
    });
  },

  success: (message: string, translationKey = false) => {
    set({
      open: true,
      options: {
        message,
        severity: 'success',
        duration: 5000,
        translationKey,
      },
    });
  },

  error: (message: string, translationKey = false) => {
    set({
      open: true,
      options: {
        message,
        severity: 'error',
        duration: 6000,
        translationKey,
      },
    });
  },

  warning: (message: string, translationKey = false) => {
    set({
      open: true,
      options: {
        message,
        severity: 'warning',
        duration: 5000,
        translationKey,
      },
    });
  },

  info: (message: string, translationKey = false) => {
    set({
      open: true,
      options: {
        message,
        severity: 'info',
        duration: 5000,
        translationKey,
      },
    });
  },

  close: () => {
    set({ open: false });
  },
}));

// 편의를 위한 헬퍼 함수 (컴포넌트 외부에서도 사용 가능)
export const snackbar = {
  show: (options: SnackbarOptions) => useSnackbarStore.getState().show(options),
  success: (message: string, translationKey?: boolean) => useSnackbarStore.getState().success(message, translationKey),
  error: (message: string, translationKey?: boolean) => useSnackbarStore.getState().error(message, translationKey),
  warning: (message: string, translationKey?: boolean) => useSnackbarStore.getState().warning(message, translationKey),
  info: (message: string, translationKey?: boolean) => useSnackbarStore.getState().info(message, translationKey),
  close: () => useSnackbarStore.getState().close(),
};
