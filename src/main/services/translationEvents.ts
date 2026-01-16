import { BrowserWindow } from 'electron';
import type {
  WsServerEvent,
  WsChunkProgressEvent,
  WsChunkStartEvent,
  WsSessionStatusEvent,
  WsSessionCompleteEvent,
  ProgressInfo,
  TranslationSessionStatus,
} from '@shared/types';
import type { TranslationSession, TranslationChunk } from '../database/index';

// ============================================
// 진행 상황 계산 헬퍼
// ============================================

export function calculateProgress(chunks: TranslationChunk[]): ProgressInfo {
  const total = chunks.length;
  const completed = chunks.filter(c => c.status === 'completed').length;
  const failed = chunks.filter(c => c.status === 'failed').length;
  const pending = chunks.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, failed, pending, total, percent };
}

// ============================================
// IPC 이벤트 발송 함수들
// ============================================

/**
 * 모든 창에 이벤트 전송
 */
function sendToAllWindows(channel: string, data: WsServerEvent): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

/**
 * 청크 번역 시작 이벤트
 */
export function emitChunkStart(sessionId: string, chunkId: string, order: number): void {
  const event: WsChunkStartEvent = {
    type: 'chunk:start',
    sessionId,
    chunkId,
    order,
  };
  sendToAllWindows('translation:chunk-start', event);
}

/**
 * 청크 진행 상황 이벤트 (완료 또는 실패)
 */
export function emitChunkProgress(sessionId: string, chunk: TranslationChunk, allChunks: TranslationChunk[]): void {
  const progress = calculateProgress(allChunks);

  const event: WsChunkProgressEvent = {
    type: 'chunk:progress',
    sessionId,
    chunk: {
      id: chunk.id,
      sessionId: chunk.sessionId,
      order: chunk.order,
      sourceText: chunk.sourceText,
      translatedText: chunk.translatedText,
      status: chunk.status as 'pending' | 'processing' | 'completed' | 'failed',
      errorMessage: chunk.errorMessage,
      retryCount: chunk.retryCount,
      tokenCount: chunk.tokenCount,
      processingTime: chunk.processingTime,
      createdAt: chunk.createdAt,
      updatedAt: chunk.updatedAt,
    },
    progress,
  };
  sendToAllWindows('translation:chunk-progress', event);
}

/**
 * 세션 상태 변경 이벤트
 */
export function emitSessionStatus(sessionId: string, status: TranslationSessionStatus, chunks: TranslationChunk[]): void {
  const progress = calculateProgress(chunks);

  const event: WsSessionStatusEvent = {
    type: 'session:status',
    sessionId,
    status,
    progress,
  };
  sendToAllWindows('translation:session-status', event);
}

/**
 * 세션 완료 이벤트
 */
export function emitSessionComplete(sessionId: string, session: TranslationSession): void {
  const event: WsSessionCompleteEvent = {
    type: 'session:complete',
    sessionId,
    session: {
      id: session.id,
      title: session.title,
      memo: session.memo,
      customDict: session.customDict,
      originalFileName: session.originalFileName,
      sourceText: session.sourceText,
      translatedText: session.translatedText,
      status: session.status as TranslationSessionStatus,
      totalChunks: session.totalChunks,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
    translatedText: session.translatedText,
  };
  sendToAllWindows('translation:session-complete', event);
}

// ============================================
// 구독 관리 (IPC에서는 불필요하지만 호환성을 위해 유지)
// ============================================

const subscriptions = new Map<string, Set<string>>(); // sessionId -> Set of windowIds

export function subscribeToSession(sessionId: string, windowId: string): void {
  if (!subscriptions.has(sessionId)) {
    subscriptions.set(sessionId, new Set());
  }
  subscriptions.get(sessionId)!.add(windowId);
}

export function unsubscribeFromSession(sessionId: string, windowId: string): void {
  subscriptions.get(sessionId)?.delete(windowId);
}

export function cleanupSubscriptions(windowId: string): void {
  for (const subscribers of subscriptions.values()) {
    subscribers.delete(windowId);
  }
}
