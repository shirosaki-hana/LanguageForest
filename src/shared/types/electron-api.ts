import type {
  AppSettings,
  UpdateApiKeyResponse,
  DeleteApiKeyResponse,
  ValidateApiKeyResponse,
  GetProviderResponse,
  GeminiModelInfo,
  PromptTemplate,
  GetTemplateResponse,
  TranslationConfig,
  TranslationSession,
  TranslationChunk,
  PaginatedChunksResponse,
  FileUploadResponse,
  TranslationProgressResponse,
  GetLogsRequest,
  GetLogsResponse,
  LogStatsResponse,
  DeleteLogsRequest,
  DeleteLogsResponse,
  GetLogSettingsResponse,
  UpdateLogSettingsResponse,
  LogSettings,
  CreateSessionRequest,
  UpdateSessionRequest,
  UpdateTranslationConfigRequest,
  WsSubscribedEvent,
  ProgressInfo,
} from './index';

export interface ElectronAPI {
  // Settings
  settings: {
    get: () => Promise<AppSettings>;
    updateApiKey: (apiKey: string) => Promise<UpdateApiKeyResponse>;
    deleteApiKey: () => Promise<DeleteApiKeyResponse>;
    validateApiKey: () => Promise<ValidateApiKeyResponse>;
  };

  // Provider
  provider: {
    get: () => Promise<GetProviderResponse>;
  };

  // Models
  models: {
    list: () => Promise<GeminiModelInfo[]>;
  };

  // Templates
  templates: {
    list: () => Promise<PromptTemplate[]>;
    get: (id: string) => Promise<GetTemplateResponse>;
  };

  // Config
  config: {
    get: () => Promise<TranslationConfig>;
    update: (data: UpdateTranslationConfigRequest) => Promise<TranslationConfig>;
  };

  // Sessions
  sessions: {
    list: () => Promise<TranslationSession[]>;
    create: (data: CreateSessionRequest) => Promise<TranslationSession>;
    get: (id: string) => Promise<TranslationSession | null>;
    update: (id: string, data: UpdateSessionRequest) => Promise<TranslationSession>;
    delete: (id: string) => Promise<void>;
    getChunks: (id: string) => Promise<TranslationChunk[]>;
    getChunksPaginated: (
      id: string,
      options: { page: number; limit: number; status?: string }
    ) => Promise<PaginatedChunksResponse>;
    uploadFile: (id: string, filePath: string) => Promise<FileUploadResponse>;
    downloadTranslation: (id: string) => Promise<{ fileName: string; content: string }>;
  };

  // Translation
  translation: {
    start: (sessionId: string, sourceText: string) => Promise<TranslationProgressResponse>;
    translateAll: (sessionId: string, templateId: string) => Promise<void>;
    getProgress: (sessionId: string) => Promise<TranslationProgressResponse>;
    getPartial: (sessionId: string) => Promise<string>;
    retryChunk: (chunkId: string, templateId: string) => Promise<TranslationChunk>;
    translateChunk: (chunkId: string, templateId: string) => Promise<TranslationChunk>;
    pause: (sessionId: string) => Promise<void>;
    resume: (sessionId: string, templateId: string) => Promise<void>;
    subscribe: (sessionId: string) => Promise<WsSubscribedEvent>;
    unsubscribe: (sessionId: string) => Promise<void>;
  };

  // Logs
  logs: {
    get: (params?: Partial<GetLogsRequest>) => Promise<GetLogsResponse>;
    getStats: () => Promise<LogStatsResponse>;
    delete: (params: DeleteLogsRequest) => Promise<DeleteLogsResponse>;
    getSettings: () => Promise<GetLogSettingsResponse>;
    updateSettings: (settings: Partial<LogSettings>) => Promise<UpdateLogSettingsResponse>;
    cleanup: () => Promise<DeleteLogsResponse>;
  };

  // Events (IPC event listeners)
  on: (channel: string, callback: (data: unknown) => void) => () => void;

  // Dialog helpers
  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
    showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  };
}

// Extend Window interface
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

// Translation event types (for IPC events)
export interface TranslationEvents {
  'translation:subscribed': WsSubscribedEvent;
  'translation:chunk-start': {
    sessionId: string;
    chunkId: string;
    order: number;
  };
  'translation:chunk-progress': {
    sessionId: string;
    chunk: TranslationChunk;
    progress: ProgressInfo;
  };
  'translation:session-status': {
    sessionId: string;
    status: string;
    progress: ProgressInfo;
  };
  'translation:session-complete': {
    sessionId: string;
    session: TranslationSession;
    translatedText: string | null;
  };
  'translation:error': {
    sessionId?: string;
    message: string;
    code?: string;
  };
}
