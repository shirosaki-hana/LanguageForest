import { create } from 'zustand';

type DialogType = 'alert' | 'confirm' | 'error';

interface DialogOptions {
  type: DialogType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  open: boolean;
  options: DialogOptions | null;
  resolve: ((value: boolean) => void) | null;

  // 액션
  showAlert: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  close: (result: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,

  showAlert: (message: string, title?: string) => {
    return new Promise<void>(resolve => {
      set({
        open: true,
        options: {
          type: 'alert',
          title,
          message,
        },
        resolve: () => resolve(),
      });
    });
  },

  showError: (message: string, title?: string) => {
    return new Promise<void>(resolve => {
      set({
        open: true,
        options: {
          type: 'error',
          title,
          message,
        },
        resolve: () => resolve(),
      });
    });
  },

  showConfirm: (message: string, title?: string) => {
    return new Promise<boolean>(resolve => {
      set({
        open: true,
        options: {
          type: 'confirm',
          title,
          message,
        },
        resolve,
      });
    });
  },

  close: (result: boolean) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({ open: false, options: null, resolve: null });
  },
}));

// 편의를 위한 헬퍼 함수 (컴포넌트 외부에서도 사용 가능)
export const dialog = {
  alert: (message: string, title?: string) => useDialogStore.getState().showAlert(message, title),
  error: (message: string, title?: string) => useDialogStore.getState().showError(message, title),
  confirm: (message: string, title?: string) => useDialogStore.getState().showConfirm(message, title),
};
