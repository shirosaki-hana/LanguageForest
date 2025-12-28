import { create } from 'zustand';
import type {
  TranslationSession,
  TranslationChunk,
  TranslationConfig,
  ProgressInfo,
  CreateSessionRequest,
  UpdateSessionRequest,
  UpdateTranslationConfigRequest,
  WsServerEvent,
  PromptTemplate,
  TranslationChunkStatus,
  GeminiModelInfo,
} from '@languageforest/sharedtype';
import * as api from '../api/translation';
import { translationWs } from '../api/websocket';
import { snackbar } from './snackbarStore';

// ============================================
// 타입 정의
// ============================================

interface ChunkPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TranslationState {
  // 세션 목록
  sessions: TranslationSession[];
  sessionsLoading: boolean;

  // 현재 세션
  currentSessionId: string | null;
  currentSession: TranslationSession | null;
  chunks: TranslationChunk[];
  sessionLoading: boolean;

  // 청크 페이지네이션
  chunkPagination: ChunkPagination | null;
  chunkFilter: TranslationChunkStatus | null;

  // 진행 상황 (WebSocket)
  progress: ProgressInfo | null;
  isTranslating: boolean;
  isPaused: boolean;

  // 파일 업로드 상태
  isUploading: boolean;
  uploadError: string | null;

  // 전역 설정
  config: TranslationConfig | null;

  // 모델 목록
  models: GeminiModelInfo[];
  modelsLoading: boolean;

  // WebSocket 상태
  wsConnected: boolean;

  // 템플릿
  templates: PromptTemplate[];
  templatesLoading: boolean;
  selectedTemplateId: string | null;

  // 액션
  loadSessions: () => Promise<void>;
  createSession: (data: CreateSessionRequest) => Promise<TranslationSession>;
  selectSession: (id: string | null) => Promise<void>;
  updateSession: (id: string, data: UpdateSessionRequest) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  // 파일 업로드/다운로드
  uploadFile: (file: File) => Promise<void>;
  downloadTranslation: () => Promise<void>;

  // 청크 관리
  loadChunks: (options?: { page?: number; status?: TranslationChunkStatus | null }) => Promise<void>;
  translateSingleChunk: (chunkId: string) => Promise<void>;
  retryChunk: (chunkId: string) => Promise<void>;

  // 번역 제어
  startTranslation: () => Promise<void>;
  pauseTranslation: () => void;
  resumeTranslation: () => void;

  // 설정
  loadConfig: () => Promise<void>;
  updateConfig: (data: UpdateTranslationConfigRequest) => Promise<void>;
  loadModels: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  selectTemplate: (id: string) => void;

  // WebSocket
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
    chunkPagination: null,
    chunkFilter: null,
    progress: null,
    isTranslating: false,
    isPaused: false,
    isUploading: false,
    uploadError: null,
    config: null,
    models: [],
    modelsLoading: false,
    wsConnected: false,
    templates: [],
    templatesLoading: false,
    selectedTemplateId: null,

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
          chunkPagination: null,
          chunkFilter: null,
          progress: null,
          isTranslating: false,
          isPaused: false,
        });
        return;
      }

      set({ sessionLoading: true, currentSessionId: id });

      try {
        const session = await api.getSession(id);

        set({
          currentSession: session,
          isTranslating: session.status === 'translating',
          isPaused: session.status === 'paused',
          sessionLoading: false,
        });

        // 청크가 있으면 페이지네이션으로 로드
        if (session.totalChunks > 0) {
          await get().loadChunks({ page: 1 });
        } else {
          set({ chunks: [], chunkPagination: null });
        }

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

    // 파일 업로드
    uploadFile: async file => {
      const state = get();
      if (!state.currentSessionId) {
        snackbar.error('translation.errors.noSessionSelected', true);
        return;
      }

      set({ isUploading: true, uploadError: null });

      try {
        const result = await api.uploadFile(state.currentSessionId, file);

        set({
          currentSession: result.session,
          isUploading: false,
        });

        // 세션 목록 업데이트
        set(s => ({
          sessions: s.sessions.map(sess => (sess.id === result.session.id ? result.session : sess)),
        }));

        // 청크 로드
        await get().loadChunks({ page: 1 });

        snackbar.success('translation.fileUploaded', true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        set({ isUploading: false, uploadError: message });
        snackbar.error('translation.errors.uploadFailed', true);
      }
    },

    // 번역문 다운로드
    downloadTranslation: async () => {
      const state = get();
      if (!state.currentSessionId || !state.currentSession) {
        return;
      }

      try {
        const blob = await api.downloadTranslation(state.currentSessionId);

        // 파일 다운로드 트리거
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const originalName = state.currentSession.originalFileName || state.currentSession.title;
        const lastDot = originalName.lastIndexOf('.');
        const fileName =
          lastDot > 0 ? `${originalName.slice(0, lastDot)}_translated${originalName.slice(lastDot)}` : `${originalName}_translated.txt`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        snackbar.success('translation.downloadStarted', true);
      } catch {
        snackbar.error('translation.errors.downloadFailed', true);
      }
    },

    // 청크 로드 (페이지네이션)
    loadChunks: async options => {
      const state = get();
      if (!state.currentSessionId) return;

      const page = options?.page ?? state.chunkPagination?.page ?? 1;
      const status = options?.status !== undefined ? options.status : state.chunkFilter;

      try {
        const result = await api.getSessionChunksPaginated(state.currentSessionId, {
          page,
          limit: 20,
          status: status ?? undefined,
        });

        set({
          chunks: result.chunks,
          chunkPagination: result.pagination,
          chunkFilter: status,
          progress: {
            completed: result.chunks.filter(c => c.status === 'completed').length,
            failed: result.chunks.filter(c => c.status === 'failed').length,
            pending: result.chunks.filter(c => c.status === 'pending' || c.status === 'processing').length,
            total: result.pagination.total,
            percent: Math.round((result.chunks.filter(c => c.status === 'completed').length / result.pagination.total) * 100),
          },
        });
      } catch {
        snackbar.error('translation.errors.loadChunksFailed', true);
      }
    },

    // 단일 청크 번역
    translateSingleChunk: async chunkId => {
      const state = get();
      if (!state.selectedTemplateId) {
        snackbar.error('translation.errors.noTemplateSelected', true);
        return;
      }

      try {
        const chunk = await api.translateSingleChunk(chunkId, state.selectedTemplateId);
        set(s => ({
          chunks: s.chunks.map(c => (c.id === chunkId ? chunk : c)),
        }));
      } catch {
        snackbar.error('translation.errors.translateChunkFailed', true);
      }
    },

    // 번역 시작 (업로드된 파일 기반)
    startTranslation: async () => {
      const state = get();
      if (!state.currentSessionId || !state.currentSession) {
        return;
      }

      if (state.currentSession.status !== 'ready' && state.currentSession.status !== 'paused') {
        snackbar.error('translation.errors.invalidSessionState', true);
        return;
      }

      if (!state.selectedTemplateId) {
        snackbar.error('translation.errors.noTemplateSelected', true);
        return;
      }

      try {
        // WebSocket으로 번역 시작
        if (state.wsConnected) {
          translationWs.start(state.currentSessionId, state.selectedTemplateId);
        } else {
          // WebSocket 없으면 REST로
          await api.translateAll(state.currentSessionId, state.selectedTemplateId);
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
      if (state.currentSessionId && state.wsConnected && state.selectedTemplateId) {
        translationWs.resume(state.currentSessionId, state.selectedTemplateId);
      }
    },

    // 청크 재시도
    retryChunk: async chunkId => {
      const state = get();
      if (!state.selectedTemplateId) {
        snackbar.error('translation.errors.noTemplateSelected', true);
        return;
      }

      try {
        const chunk = await api.retryChunk(chunkId, state.selectedTemplateId);
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

    // 모델 목록 로드
    loadModels: async () => {
      set({ modelsLoading: true });
      try {
        const models = await api.listModels();
        set({ models, modelsLoading: false });
      } catch {
        snackbar.error('translation.errors.loadModelsFailed', true);
        set({ modelsLoading: false });
      }
    },

    // 템플릿 목록 로드
    loadTemplates: async () => {
      set({ templatesLoading: true });
      try {
        const templates = await api.listTemplates();
        set({ templates, templatesLoading: false });
        // 템플릿이 있고 선택된 것이 없으면 첫 번째 선택
        if (templates.length > 0 && !get().selectedTemplateId) {
          set({ selectedTemplateId: templates[0].id });
        }
      } catch {
        snackbar.error('translation.errors.loadTemplatesFailed', true);
        set({ templatesLoading: false });
      }
    },

    // 템플릿 선택
    selectTemplate: id => {
      set({ selectedTemplateId: id });
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
        chunkPagination: null,
        chunkFilter: null,
        progress: null,
        isTranslating: false,
        isPaused: false,
        isUploading: false,
        uploadError: null,
        config: null,
        models: [],
        modelsLoading: false,
        wsConnected: false,
        templates: [],
        templatesLoading: false,
        selectedTemplateId: null,
      });
    },
  };
});
