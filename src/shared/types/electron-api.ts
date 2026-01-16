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

// Dialog 타입 정의 (Electron 네임스페이스 대신 직접 정의)
export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >;
  message?: string;
}

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  message?: string;
  nameFieldLabel?: string;
  showsTagField?: boolean;
  properties?: Array<'showHiddenFiles' | 'createDirectory' | 'treatPackageAsDirectory' | 'showOverwriteConfirmation' | 'dontAddToRecent'>;
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

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
    getChunksPaginated: (id: string, options: { page: number; limit: number; status?: string }) => Promise<PaginatedChunksResponse>;
    uploadFile: (id: string, fileName: string, content: string) => Promise<FileUploadResponse>;
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
    showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
    showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
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
