import { create } from 'zustand';
import type { LogItem, LogLevel, LogCategory, LogSettings } from '@shared/types';
import { getLogs, getLogStats, deleteLogs, getLogSettings, updateLogSettings, cleanupLogs } from '../api/logs';
import { snackbar } from './snackbarStore';

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  last24h: number;
  last7d: number;
}

interface LogsState {
  // 로그 데이터
  logs: LogItem[];
  total: number;
  loading: boolean;

  // 필터
  search: string;
  levelFilter: LogLevel | '';
  categoryFilter: LogCategory | '';

  // 페이지네이션
  page: number;
  rowsPerPage: number;

  // 통계
  stats: LogStats | null;

  // 설정
  settings: LogSettings;
  settingsOpen: boolean;
  savingSettings: boolean;

  // 선택된 로그
  selectedLog: LogItem | null;

  // 액션
  loadLogs: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  cleanup: () => Promise<{ deletedCount: number }>;
  deleteAll: () => Promise<void>;

  // 필터 액션
  setSearch: (search: string) => void;
  setLevelFilter: (level: LogLevel | '') => void;
  setCategoryFilter: (category: LogCategory | '') => void;

  // 페이지네이션 액션
  setPage: (page: number) => void;
  setRowsPerPage: (rowsPerPage: number) => void;

  // 설정 액션
  setSettings: (settings: LogSettings) => void;
  setSettingsOpen: (open: boolean) => void;

  // 선택 액션
  setSelectedLog: (log: LogItem | null) => void;
}

export const useLogsStore = create<LogsState>((set, get) => ({
  // 초기 상태
  logs: [],
  total: 0,
  loading: false,

  search: '',
  levelFilter: '',
  categoryFilter: '',

  page: 0,
  rowsPerPage: 25,

  stats: null,

  settings: { retentionDays: 7, maxLogs: 10000 },
  settingsOpen: false,
  savingSettings: false,

  selectedLog: null,

  // 로그 로드
  loadLogs: async () => {
    const { page, rowsPerPage, search, levelFilter, categoryFilter } = get();
    set({ loading: true });

    try {
      const response = await getLogs({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        level: levelFilter || undefined,
        category: categoryFilter || undefined,
        sortOrder: 'desc',
      });
      set({ logs: response.logs, total: response.pagination.total, loading: false });
    } catch {
      snackbar.error('logs.errors.loadFailed', true);
      set({ loading: false });
    }
  },

  // 통계 로드
  loadStats: async () => {
    try {
      const response = await getLogStats();
      set({ stats: response.stats });
    } catch {
      // 통계 로드 실패는 무시
    }
  },

  // 설정 로드
  loadSettings: async () => {
    try {
      const response = await getLogSettings();
      set({ settings: response.settings });
    } catch {
      // 설정 로드 실패는 기본값 유지
    }
  },

  // 설정 저장
  saveSettings: async () => {
    const { settings } = get();
    set({ savingSettings: true });

    try {
      await updateLogSettings(settings);
      set({ settingsOpen: false, savingSettings: false });
    } catch {
      snackbar.error('logs.errors.settingsSaveFailed', true);
      set({ savingSettings: false });
      throw new Error('logs.errors.settingsSaveFailed');
    }
  },

  // 로그 정리
  cleanup: async () => {
    try {
      const response = await cleanupLogs();
      // 로드 갱신
      await get().loadLogs();
      await get().loadStats();
      return { deletedCount: response.deletedCount };
    } catch {
      snackbar.error('logs.errors.cleanupFailed', true);
      throw new Error('logs.errors.cleanupFailed');
    }
  },

  // 전체 삭제
  deleteAll: async () => {
    try {
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      await deleteLogs({ olderThan: oneYearLater.toISOString() });

      // 로드 갱신
      await get().loadLogs();
      await get().loadStats();
    } catch {
      snackbar.error('logs.errors.deleteFailed', true);
      throw new Error('logs.errors.deleteFailed');
    }
  },

  // 필터 액션
  setSearch: search => {
    set({ search, page: 0 });
  },
  setLevelFilter: levelFilter => {
    set({ levelFilter, page: 0 });
  },
  setCategoryFilter: categoryFilter => {
    set({ categoryFilter, page: 0 });
  },

  // 페이지네이션 액션
  setPage: page => set({ page }),
  setRowsPerPage: rowsPerPage => set({ rowsPerPage, page: 0 }),

  // 설정 액션
  setSettings: settings => set({ settings }),
  setSettingsOpen: settingsOpen => set({ settingsOpen }),

  // 선택 액션
  setSelectedLog: selectedLog => set({ selectedLog }),
}));
