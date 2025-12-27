import type { LogLevel, LogCategory } from '@languageforest/sharedtype';

//------------------------------------------------------------------------------//
// DB 저장 함수 (지연 로딩으로 순환 참조 방지)
let saveToDbFn: ((level: LogLevel, category: LogCategory, message: string, meta?: unknown) => Promise<void>) | null = null;

export const setLogDbSaver = (fn: typeof saveToDbFn) => {
  saveToDbFn = fn;
};

// 로그
const log = (level: LogLevel, category: LogCategory, message: string, meta?: unknown): void => {
  if (saveToDbFn) {
    saveToDbFn(level, category, message, meta).catch(() => {});
  }
};

export const logger = {
  error: (category: LogCategory, message: string, meta?: unknown) => log('ERROR', category, message, meta),
  warn: (category: LogCategory, message: string, meta?: unknown) => log('WARN', category, message, meta),
  info: (category: LogCategory, message: string, meta?: unknown) => log('INFO', category, message, meta),
  debug: (category: LogCategory, message: string, meta?: unknown) => log('DEBUG', category, message, meta),
};

//------------------------------------------------------------------------------//
// 콘솔 로그 유틸 (ESLint no-console 규칙 무시)

/* eslint-disable no-console */
export const console_log = (...args: unknown[]): void => {
  console.log(...args);
};

export const console_error = (...args: unknown[]): void => {
  console.error(...args);
};

export const console_warn = (...args: unknown[]): void => {
  console.warn(...args);
};

export const console_debug = (...args: unknown[]): void => {
  console.debug(...args);
};
/* eslint-enable no-console */
