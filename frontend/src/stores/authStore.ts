import { create } from 'zustand';
import { checkAuthStatus, setupPassword, login as apiLogin, logout as apiLogout } from '../api/auth';
import type { SetupPasswordRequest, LoginRequest } from '@templateforest/types';
import { snackbar } from './snackbarStore';

interface AuthState {
  // 상태
  isSetup: boolean; // 비밀번호가 설정되었는지
  isAuthenticated: boolean; // 로그인 되었는지
  isLoading: boolean; // 로딩 중인지

  // 액션
  checkStatus: () => Promise<void>;
  setup: (data: SetupPasswordRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // 초기 상태
  isSetup: false,
  isAuthenticated: false,
  isLoading: true, // 초기값을 true로 설정하여 인증 상태 확인 전까지 로딩 표시

  // 인증 상태 확인
  checkStatus: async () => {
    set({ isLoading: true });
    try {
      const status = await checkAuthStatus();
      set({
        isSetup: status.isSetup,
        isAuthenticated: status.isAuthenticated,
        isLoading: false,
      });
    } catch {
      snackbar.error('errors.statusCheckFailed', true);
      set({ isLoading: false });
    }
  },

  // 비밀번호 설정
  setup: async (data: SetupPasswordRequest) => {
    set({ isLoading: true });
    try {
      await setupPassword(data);
      // 설정 후 상태 재확인
      await get().checkStatus();
    } catch {
      snackbar.error('errors.setupFailed', true);
      set({ isLoading: false });
      throw new Error('errors.setupFailed');
    }
  },

  // 로그인
  login: async (data: LoginRequest) => {
    set({ isLoading: true });
    try {
      await apiLogin(data);
      // 로그인 후 상태 재확인
      await get().checkStatus();
    } catch {
      snackbar.error('errors.loginFailed', true);
      set({ isLoading: false });
      throw new Error('errors.loginFailed');
    }
  },

  // 로그아웃
  logout: async () => {
    set({ isLoading: true });
    try {
      await apiLogout();
      set({
        isAuthenticated: false,
        isLoading: false,
      });
    } catch {
      snackbar.error('errors.logoutFailed', true);
      set({ isLoading: false });
    }
  },
}));
