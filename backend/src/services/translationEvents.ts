import { EventEmitter } from 'events';
import type {
  WsServerEvent,
  WsChunkProgressEvent,
  WsChunkStartEvent,
  WsSessionStatusEvent,
  WsSessionCompleteEvent,
  ProgressInfo,
  TranslationSessionStatus,
} from '@languageforest/sharedtype';
import type { TranslationSession, TranslationChunk } from '../database/prismaclient/index.js';

// ============================================
// 세션별 이벤트 이미터 관리
// ============================================

const sessionEmitters = new Map<string, EventEmitter>();

/**
 * 세션용 이벤트 이미터 가져오기 (없으면 생성)
 */
export function getSessionEmitter(sessionId: string): EventEmitter {
  let emitter = sessionEmitters.get(sessionId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(100); // 여러 클라이언트가 구독할 수 있음
    sessionEmitters.set(sessionId, emitter);
  }
  return emitter;
}

/**
 * 세션 이벤트 이미터 정리
 */
export function cleanupSessionEmitter(sessionId: string): void {
  const emitter = sessionEmitters.get(sessionId);
  if (emitter) {
    emitter.removeAllListeners();
    sessionEmitters.delete(sessionId);
  }
}

/**
 * 진행 상황 정보 계산 헬퍼
 */
export function calculateProgress(chunks: TranslationChunk[]): ProgressInfo {
  const total = chunks.length;
  const completed = chunks.filter(c => c.status === 'completed').length;
  const failed = chunks.filter(c => c.status === 'failed').length;
  const pending = chunks.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, failed, pending, total, percent };
}

// ============================================
// 이벤트 발송 함수들
// ============================================

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
  getSessionEmitter(sessionId).emit('event', event);
}

/**
 * 청크 진행 상황 이벤트 (완료 또는 실패)
 */
export function emitChunkProgress(sessionId: string, chunk: TranslationChunk, allChunks: TranslationChunk[]): void {
  const progress = calculateProgress(allChunks);

  // Prisma 타입을 API 타입으로 변환
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
      createdAt: chunk.createdAt.toISOString(),
      updatedAt: chunk.updatedAt.toISOString(),
    },
    progress,
  };
  getSessionEmitter(sessionId).emit('event', event);
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
  getSessionEmitter(sessionId).emit('event', event);
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
      sourceText: session.sourceText,
      translatedText: session.translatedText,
      status: session.status as TranslationSessionStatus,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    translatedText: session.translatedText,
  };
  getSessionEmitter(sessionId).emit('event', event);
}

/**
 * 이벤트 구독 (WebSocket 핸들러에서 사용)
 */
export function subscribeToSession(sessionId: string, callback: (event: WsServerEvent) => void): () => void {
  const emitter = getSessionEmitter(sessionId);
  emitter.on('event', callback);

  // 구독 해제 함수 반환
  return () => {
    emitter.off('event', callback);
  };
}
