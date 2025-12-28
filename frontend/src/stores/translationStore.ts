import { create } from 'zustand';
import type {
  TranslationSession,
  TranslationChunk,
  TranslationConfig,
  ProgressInfo,
  CreateSessionRequest,
  UpdateSessionRequest,
  WsServerEvent,
} from '@languageforest/sharedtype';
import * as api from '../api/translation';
import { translationWs } from '../api/websocket';
import { snackbar } from './snackbarStore';

// ============================================
// 타입 정의
// ============================================

interface TranslationState {
  // 세션 목록
  sessions: TranslationSession[];
  sessionsLoading: boolean;

  // 현재 세션
  currentSessionId: string | null;
  currentSession: TranslationSession | null;
  chunks: TranslationChunk[];
  sessionLoading: boolean;

  // 진행 상황 (WebSocket)
  progress: ProgressInfo | null;
  isTranslating: boolean;
  isPaused: boolean;

  // 전역 설정
  config: TranslationConfig | null;

  // 원문 입력
  sourceText: string;

  // WebSocket 상태
  wsConnected: boolean;

  // 액션
  loadSessions: () => Promise<void>;
  createSession: (data: CreateSessionRequest) => Promise<TranslationSession>;
  selectSession: (id: string | null) => Promise<void>;
  updateSession: (id: string, data: UpdateSessionRequest) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setSourceText: (text: string) => void;
  startTranslation: () => Promise<void>;
  pauseTranslation: () => void;
  resumeTranslation: () => void;
  retryChunk: (chunkId: string) => Promise<void>;
  loadConfig: () => Promise<void>;
  updateConfig: (data: { model?: string; chunkSize?: number }) => Promise<void>;
  connectWs: () => void;
  disconnectWs: () => void;
  reset: () => void;
}

// ============================================
// 스토어
// ============================================

export const useTranslationStore = create<TranslationState>((set, get) => {
  // WebSocket 이벤트 핸들러
  const handleWsEvent = (event: WsServerEvent) => {
    const state = get();

    switch (event.type) {
      case 'subscribed':
        set({
          currentSession: event.session,
          progress: event.progress,
          isTranslating: event.session.status === 'translating',
          isPaused: event.session.status === 'paused',
        });
        break;

      case 'chunk:start':
        // 청크 시작 - UI에서 진행 중 표시
        set(state => ({
          chunks: state.chunks.map(c => (c.id === event.chunkId ? { ...c, status: 'processing' as const } : c)),
        }));
        break;

      case 'chunk:progress':
        // 청크 완료/실패
        set(state => ({
          chunks: state.chunks.map(c => (c.id === event.chunk.id ? event.chunk : c)),
          progress: event.progress,
        }));
        break;

      case 'session:status':
        set({
          progress: event.progress,
          isTranslating: event.status === 'translating',
          isPaused: event.status === 'paused',
        });
        // 세션 목록도 업데이트
        if (state.currentSession) {
          set(s => ({
            currentSession: s.currentSession ? { ...s.currentSession, status: event.status } : null,
            sessions: s.sessions.map(sess => (sess.id === event.sessionId ? { ...sess, status: event.status } : sess)),
          }));
        }
        break;

      case 'session:complete':
        set(state => ({
          currentSession: event.session,
          isTranslating: false,
          isPaused: false,
          sessions: state.sessions.map(sess => (sess.id === event.sessionId ? event.session : sess)),
        }));
        snackbar.success('translation.completed', true);
        break;

      case 'error':
        snackbar.error(event.message);
        break;
    }
  };

  return {
    // 초기 상태
    sessions: [],
    sessionsLoading: false,
    currentSessionId: null,
    currentSession: null,
    chunks: [],
    sessionLoading: false,
    progress: null,
    isTranslating: false,
    isPaused: false,
    config: null,
    sourceText: '',
    wsConnected: false,

    // 세션 목록 로드
    loadSessions: async () => {
      set({ sessionsLoading: true });
      try {
        const sessions = await api.listSessions();
        set({ sessions, sessionsLoading: false });
      } catch {
        snackbar.error('translation.errors.loadSessionsFailed', true);
        set({ sessionsLoading: false });
      }
    },

    // 새 세션 생성
    createSession: async data => {
      try {
        const session = await api.createSession(data);
        set(state => ({
          sessions: [session, ...state.sessions],
        }));
        snackbar.success('translation.sessionCreated', true);
        return session;
      } catch {
        snackbar.error('translation.errors.createSessionFailed', true);
        throw new Error('Failed to create session');
      }
    },

    // 세션 선택
    selectSession: async id => {
      const state = get();

      // 이전 세션 구독 해제
      if (state.currentSessionId && state.wsConnected) {
        translationWs.unsubscribe(state.currentSessionId);
      }

      if (!id) {
        set({
          currentSessionId: null,
          currentSession: null,
          chunks: [],
          progress: null,
          isTranslating: false,
          isPaused: false,
          sourceText: '',
        });
        return;
      }

      set({ sessionLoading: true, currentSessionId: id });

      try {
        const [session, chunks] = await Promise.all([api.getSession(id), api.getSessionChunks(id)]);

        set({
          currentSession: session,
          chunks,
          sourceText: session.sourceText || '',
          isTranslating: session.status === 'translating',
          isPaused: session.status === 'paused',
          sessionLoading: false,
        });

        // WebSocket 구독
        if (state.wsConnected) {
          translationWs.subscribe(id);
        }
      } catch {
        snackbar.error('translation.errors.loadSessionFailed', true);
        set({ sessionLoading: false });
      }
    },

    // 세션 업데이트
    updateSession: async (id, data) => {
      try {
        const session = await api.updateSession(id, data);
        set(state => ({
          sessions: state.sessions.map(s => (s.id === id ? session : s)),
          currentSession: state.currentSessionId === id ? session : state.currentSession,
        }));
      } catch {
        snackbar.error('translation.errors.updateSessionFailed', true);
        throw new Error('Failed to update session');
      }
    },

    // 세션 삭제
    deleteSession: async id => {
      try {
        await api.deleteSession(id);
        const state = get();

        set(s => ({
          sessions: s.sessions.filter(sess => sess.id !== id),
        }));

        // 현재 선택된 세션이면 선택 해제
        if (state.currentSessionId === id) {
          get().selectSession(null);
        }

        snackbar.success('translation.sessionDeleted', true);
      } catch {
        snackbar.error('translation.errors.deleteSessionFailed', true);
        throw new Error('Failed to delete session');
      }
    },

    // 원문 설정
    setSourceText: text => {
      set({ sourceText: text });
    },

    // 번역 시작
    startTranslation: async () => {
      const state = get();
      if (!state.currentSessionId || !state.sourceText.trim()) {
        snackbar.error('translation.errors.noSourceText', true);
        return;
      }

      try {
        // 청킹 시작
        const progress = await api.startTranslation(state.currentSessionId, state.sourceText);

        // 청크 로드
        const chunks = await api.getSessionChunks(state.currentSessionId);
        set({
          chunks,
          progress: {
            completed: progress.completedChunks,
            failed: progress.failedChunks,
            pending: progress.pendingChunks,
            total: progress.totalChunks,
            percent: 0,
          },
        });

        // WebSocket으로 번역 시작
        if (state.wsConnected) {
          translationWs.start(state.currentSessionId);
        } else {
          // WebSocket 없으면 REST로
          await api.translateAll(state.currentSessionId);
        }

        set({ isTranslating: true });
      } catch {
        snackbar.error('translation.errors.startFailed', true);
      }
    },

    // 번역 일시정지
    pauseTranslation: () => {
      const state = get();
      if (state.currentSessionId && state.wsConnected) {
        translationWs.pause(state.currentSessionId);
      }
    },

    // 번역 재개
    resumeTranslation: () => {
      const state = get();
      if (state.currentSessionId && state.wsConnected) {
        translationWs.resume(state.currentSessionId);
      }
    },

    // 청크 재시도
    retryChunk: async chunkId => {
      try {
        const chunk = await api.retryChunk(chunkId);
        set(state => ({
          chunks: state.chunks.map(c => (c.id === chunkId ? chunk : c)),
        }));
      } catch {
        snackbar.error('translation.errors.retryFailed', true);
      }
    },

    // 설정 로드
    loadConfig: async () => {
      try {
        const config = await api.getConfig();
        set({ config });
      } catch {
        snackbar.error('translation.errors.loadConfigFailed', true);
      }
    },

    // 설정 업데이트
    updateConfig: async data => {
      try {
        const config = await api.updateConfig(data);
        set({ config });
        snackbar.success('translation.configUpdated', true);
      } catch {
        snackbar.error('translation.errors.updateConfigFailed', true);
        throw new Error('Failed to update config');
      }
    },

    // WebSocket 연결
    connectWs: () => {
      translationWs.connect();
      translationWs.onEvent(handleWsEvent);
      set({ wsConnected: true });
    },

    // WebSocket 연결 해제
    disconnectWs: () => {
      const state = get();
      if (state.currentSessionId) {
        translationWs.unsubscribe(state.currentSessionId);
      }
      translationWs.disconnect();
      set({ wsConnected: false });
    },

    // 상태 초기화
    reset: () => {
      get().disconnectWs();
      set({
        sessions: [],
        sessionsLoading: false,
        currentSessionId: null,
        currentSession: null,
        chunks: [],
        sessionLoading: false,
        progress: null,
        isTranslating: false,
        isPaused: false,
        config: null,
        sourceText: '',
        wsConnected: false,
      });
    },
  };
});
