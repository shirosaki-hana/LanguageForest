import type { LogLevel, LogCategory } from '@shared/types';

//------------------------------------------------------------------------------//
// 로그 큐 (DB 준비 전 로그 보관용)
interface QueuedLog {
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: unknown;
  timestamp: string;
}

const logQueue: QueuedLog[] = [];
let isDbReady = false;

//------------------------------------------------------------------------------//
// DB 저장 함수 (지연 로딩으로 순환 참조 방지)
let saveToDbFn: ((level: LogLevel, category: LogCategory, message: string, meta?: unknown, timestamp?: string) => Promise<void>) | null =
  null;

export const setLogDbSaver = (fn: typeof saveToDbFn) => {
  saveToDbFn = fn;
};

/**
 * DB 준비 완료 알림 - 큐에 쌓인 로그를 모두 DB에 저장
 */
export const flushLogQueue = async (): Promise<void> => {
  if (!saveToDbFn) {
    return;
  }

  isDbReady = true;

  // 큐에 쌓인 로그 모두 저장
  const queuedLogs = [...logQueue];
  logQueue.length = 0; // 큐 비우기

  for (const log of queuedLogs) {
    try {
      await saveToDbFn(log.level, log.category, log.message, log.meta, log.timestamp);
    } catch {
      // 실패해도 조용히 무시
    }
  }
};

//------------------------------------------------------------------------------//
// 로그
const log = (level: LogLevel, category: LogCategory, message: string, meta?: unknown): void => {
  const timestamp = new Date().toISOString();

  // DB 준비 여부에 따라 처리
  if (isDbReady && saveToDbFn) {
    // DB 준비됨 - 바로 저장
    saveToDbFn(level, category, message, meta, timestamp).catch(() => {
      // 실패해도 조용히 무시
    });
  } else {
    // DB 미준비 - 큐에 추가
    logQueue.push({ level, category, message, meta, timestamp });
  }
};

export const logger = {
  error: (category: LogCategory, message: string, meta?: unknown) => log('ERROR', category, message, meta),
  warn: (category: LogCategory, message: string, meta?: unknown) => log('WARN', category, message, meta),
  info: (category: LogCategory, message: string, meta?: unknown) => log('INFO', category, message, meta),
  debug: (category: LogCategory, message: string, meta?: unknown) => log('DEBUG', category, message, meta),
};
