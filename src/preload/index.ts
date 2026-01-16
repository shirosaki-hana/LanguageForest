import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shared/types/electron-api';

// Custom APIs for renderer
const api: ElectronAPI = {
  // ============================================
  // App Settings
  // ============================================
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    updateApiKey: (apiKey: string) => ipcRenderer.invoke('settings:update-api-key', apiKey),
    deleteApiKey: () => ipcRenderer.invoke('settings:delete-api-key'),
    validateApiKey: () => ipcRenderer.invoke('settings:validate-api-key'),
  },

  // ============================================
  // Provider & Models
  // ============================================
  provider: {
    get: () => ipcRenderer.invoke('provider:get'),
  },
  models: {
    list: () => ipcRenderer.invoke('models:list'),
  },

  // ============================================
  // Templates
  // ============================================
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    get: (id: string) => ipcRenderer.invoke('templates:get', id),
  },

  // ============================================
  // Config
  // ============================================
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (data: unknown) => ipcRenderer.invoke('config:update', data),
  },

  // ============================================
  // Sessions
  // ============================================
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    create: (data: unknown) => ipcRenderer.invoke('sessions:create', data),
    get: (id: string) => ipcRenderer.invoke('sessions:get', id),
    update: (id: string, data: unknown) => ipcRenderer.invoke('sessions:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('sessions:delete', id),
    getChunks: (id: string) => ipcRenderer.invoke('sessions:get-chunks', id),
    getChunksPaginated: (id: string, options: unknown) =>
      ipcRenderer.invoke('sessions:get-chunks-paginated', id, options),
    uploadFile: (id: string, fileName: string, content: string) =>
      ipcRenderer.invoke('sessions:upload-file', id, fileName, content),
    downloadTranslation: (id: string) => ipcRenderer.invoke('sessions:download-translation', id),
  },

  // ============================================
  // Translation
  // ============================================
  translation: {
    start: (sessionId: string, sourceText: string) =>
      ipcRenderer.invoke('translation:start', sessionId, sourceText),
    translateAll: (sessionId: string, templateId: string) =>
      ipcRenderer.invoke('translation:translate-all', sessionId, templateId),
    getProgress: (sessionId: string) => ipcRenderer.invoke('translation:get-progress', sessionId),
    getPartial: (sessionId: string) => ipcRenderer.invoke('translation:get-partial', sessionId),
    retryChunk: (chunkId: string, templateId: string) =>
      ipcRenderer.invoke('translation:retry-chunk', chunkId, templateId),
    translateChunk: (chunkId: string, templateId: string) =>
      ipcRenderer.invoke('translation:translate-chunk', chunkId, templateId),
    pause: (sessionId: string) => ipcRenderer.invoke('translation:pause', sessionId),
    resume: (sessionId: string, templateId: string) =>
      ipcRenderer.invoke('translation:resume', sessionId, templateId),
    subscribe: (sessionId: string) => ipcRenderer.invoke('translation:subscribe', sessionId),
    unsubscribe: (sessionId: string) => ipcRenderer.invoke('translation:unsubscribe', sessionId),
  },

  // ============================================
  // Logs
  // ============================================
  logs: {
    get: (params?: unknown) => ipcRenderer.invoke('logs:get', params),
    getStats: () => ipcRenderer.invoke('logs:get-stats'),
    delete: (params: unknown) => ipcRenderer.invoke('logs:delete', params),
    getSettings: () => ipcRenderer.invoke('logs:get-settings'),
    updateSettings: (settings: unknown) => ipcRenderer.invoke('logs:update-settings', settings),
    cleanup: () => ipcRenderer.invoke('logs:cleanup'),
  },

  // ============================================
  // Events (WebSocket replacement)
  // ============================================
  on: (channel: string, callback: (data: unknown) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  // ============================================
  // Dialog helpers
  // ============================================
  dialog: {
    showOpenDialog: (options: unknown) => ipcRenderer.invoke('dialog:show-open', options),
    showSaveDialog: (options: unknown) => ipcRenderer.invoke('dialog:show-save', options),
  },
};

// Expose in the main world
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error window.api in non-isolated context
  window.api = api;
}
