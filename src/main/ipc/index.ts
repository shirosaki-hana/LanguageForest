import { ipcMain, dialog, BrowserWindow } from 'electron';
import {
  // Settings
  getAppSettings,
  updateApiKey,
  deleteApiKey,
  // Config
  getTranslationConfig,
  updateTranslationConfig,
  // Sessions
  listSessions,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getSessionChunks,
  getSessionChunksPaginated,
  // File operations
  uploadFileAndChunk,
  getTranslationForDownload,
  // Translation
  startTranslation,
  translateAllPendingChunks,
  getTranslationProgress,
  getPartialTranslation,
  retryFailedChunk,
  translateChunk,
  pauseTranslation,
  resumeTranslation,
} from '../services/translation';
import { templateService } from '../services/templateService';
import { initializeLogger, getLogs, getLogStats, deleteLogs, cleanupOldLogs } from '../services/logs';
import { GEMINI_MODELS } from '../config/models';
import { getGeminiClient, getGeminiClientAsync } from '../external/gemini';
import { calculateProgress } from '../services/translationEvents';
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  UpdateTranslationConfigRequest,
  GetLogsRequest,
  DeleteLogsRequest,
  LogSettings,
} from '@shared/types';

// 로그 설정 (메모리 저장)
let logSettings: LogSettings = {
  retentionDays: 7,
  maxLogs: 10000,
};

/**
 * 모든 IPC 핸들러 등록
 */
export function registerIpcHandlers(): void {
  // 로거 초기화
  initializeLogger();

  // 템플릿 서비스 초기화
  templateService.initialize();

  // ============================================
  // Settings
  // ============================================

  ipcMain.handle('settings:get', async () => {
    return getAppSettings();
  });

  ipcMain.handle('settings:update-api-key', async (_event, apiKey: string) => {
    return updateApiKey(apiKey);
  });

  ipcMain.handle('settings:delete-api-key', async () => {
    return deleteApiKey();
  });

  ipcMain.handle('settings:validate-api-key', async () => {
    try {
      const client = await getGeminiClientAsync();
      await client.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: { maxOutputTokens: 10 },
      });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'API 키 검증에 실패했습니다',
      };
    }
  });

  // ============================================
  // Provider & Models
  // ============================================

  ipcMain.handle('provider:get', async () => {
    try {
      const client = getGeminiClient();
      return {
        provider: 'gemini',
        model: client.modelName,
        status: 'ready' as const,
      };
    } catch {
      return {
        provider: 'gemini',
        status: 'error' as const,
      };
    }
  });

  ipcMain.handle('models:list', async () => {
    return GEMINI_MODELS;
  });

  // ============================================
  // Templates
  // ============================================

  ipcMain.handle('templates:list', async () => {
    return templateService.getAll();
  });

  ipcMain.handle('templates:get', async (_event, id: string) => {
    const template = templateService.getById(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }
    return {
      id: template.id,
      title: template.title,
      sourceLanguage: template.sourceLanguage,
      targetLanguage: template.targetLanguage,
      description: template.description,
      content: template.content,
    };
  });

  // ============================================
  // Config
  // ============================================

  ipcMain.handle('config:get', async () => {
    return getTranslationConfig();
  });

  ipcMain.handle('config:update', async (_event, data: UpdateTranslationConfigRequest) => {
    return updateTranslationConfig(data);
  });

  // ============================================
  // Sessions
  // ============================================

  ipcMain.handle('sessions:list', async () => {
    return listSessions();
  });

  ipcMain.handle('sessions:create', async (_event, data: CreateSessionRequest) => {
    return createSession(data);
  });

  ipcMain.handle('sessions:get', async (_event, id: string) => {
    return getSession(id);
  });

  ipcMain.handle('sessions:update', async (_event, id: string, data: UpdateSessionRequest) => {
    return updateSession(id, data);
  });

  ipcMain.handle('sessions:delete', async (_event, id: string) => {
    return deleteSession(id);
  });

  ipcMain.handle('sessions:get-chunks', async (_event, id: string) => {
    return getSessionChunks(id);
  });

  ipcMain.handle(
    'sessions:get-chunks-paginated',
    async (_event, id: string, options: { page: number; limit: number; status?: string }) => {
      return getSessionChunksPaginated(id, options);
    }
  );

  ipcMain.handle('sessions:upload-file', async (_event, sessionId: string, fileName: string, content: string) => {
    return uploadFileAndChunk({
      sessionId,
      fileName,
      content,
    });
  });

  ipcMain.handle('sessions:download-translation', async (_event, sessionId: string) => {
    return getTranslationForDownload(sessionId);
  });

  // ============================================
  // Translation
  // ============================================

  ipcMain.handle('translation:start', async (_event, sessionId: string, sourceText: string) => {
    return startTranslation({ sessionId, sourceText });
  });

  ipcMain.handle('translation:translate-all', async (_event, sessionId: string, templateId: string) => {
    // 비동기로 실행 (결과는 IPC 이벤트로 전달)
    translateAllPendingChunks(sessionId, { templateId }).catch(error => {
      // 에러를 renderer에 전달
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('translation:error', {
          type: 'error',
          sessionId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    });
  });

  ipcMain.handle('translation:get-progress', async (_event, sessionId: string) => {
    return getTranslationProgress(sessionId);
  });

  ipcMain.handle('translation:get-partial', async (_event, sessionId: string) => {
    return getPartialTranslation(sessionId);
  });

  ipcMain.handle('translation:retry-chunk', async (_event, chunkId: string, templateId: string) => {
    return retryFailedChunk(chunkId, { templateId });
  });

  ipcMain.handle('translation:translate-chunk', async (_event, chunkId: string, templateId: string) => {
    return translateChunk(chunkId, { templateId });
  });

  ipcMain.handle('translation:pause', async (_event, sessionId: string) => {
    return pauseTranslation(sessionId);
  });

  ipcMain.handle('translation:resume', async (_event, sessionId: string, templateId: string) => {
    return resumeTranslation(sessionId, { templateId });
  });

  ipcMain.handle('translation:subscribe', async (_event, sessionId: string) => {
    // 세션 정보와 진행 상황 반환
    const session = await getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    const chunks = await getSessionChunks(sessionId);
    const progress = calculateProgress(chunks);

    return {
      type: 'subscribed' as const,
      sessionId,
      session: {
        id: session.id,
        title: session.title,
        memo: session.memo,
        customDict: session.customDict,
        sourceText: session.sourceText,
        translatedText: session.translatedText,
        status: session.status,
        totalChunks: session.totalChunks,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      progress,
    };
  });

  ipcMain.handle('translation:unsubscribe', async (_event, _sessionId: string) => {
    // IPC에서는 특별한 구독 해제가 필요 없음
  });

  // ============================================
  // Logs
  // ============================================

  ipcMain.handle('logs:get', async (_event, params?: Partial<GetLogsRequest>) => {
    const result = await getLogs(params ?? {});
    return { success: true, ...result };
  });

  ipcMain.handle('logs:get-stats', async () => {
    const stats = await getLogStats();
    return { success: true, stats };
  });

  ipcMain.handle('logs:delete', async (_event, params: DeleteLogsRequest) => {
    const deletedCount = await deleteLogs(params);
    return { success: true, deletedCount };
  });

  ipcMain.handle('logs:get-settings', async () => {
    return { success: true, settings: logSettings };
  });

  ipcMain.handle('logs:update-settings', async (_event, settings: Partial<LogSettings>) => {
    logSettings = { ...logSettings, ...settings };
    return { success: true, settings: logSettings };
  });

  ipcMain.handle('logs:cleanup', async () => {
    const deletedCount = await cleanupOldLogs(logSettings);
    return { success: true, deletedCount };
  });

  // ============================================
  // Dialog helpers
  // ============================================

  ipcMain.handle('dialog:show-open', async (_event, options: Electron.OpenDialogOptions) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      return dialog.showOpenDialog(window, options);
    }
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle('dialog:show-save', async (_event, options: Electron.SaveDialogOptions) => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      return dialog.showSaveDialog(window, options);
    }
    return dialog.showSaveDialog(options);
  });
}
