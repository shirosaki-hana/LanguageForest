/**
 * 데이터베이스 타입 정의
 *
 * Kysely에서 사용할 테이블 스키마 타입 정의.
 * 기존 Prisma 스키마를 기반으로 수동 정의.
 */
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

//------------------------------------------------------------------------------
// Database Schema
//------------------------------------------------------------------------------

export interface Database {
  logs: LogTable;
  app_settings: AppSettingsTable;
  translation_config: TranslationConfigTable;
  translation_sessions: TranslationSessionTable;
  translation_chunks: TranslationChunkTable;
  _migrations: MigrationTable;
}

//------------------------------------------------------------------------------
// App Settings Table (Singleton - id=1 고정)
//------------------------------------------------------------------------------

export interface AppSettingsTable {
  id: Generated<number>;
  geminiApiKey: string | null; // 암호화되어 저장됨
  updatedAt: string;
}

export type AppSettings = Selectable<AppSettingsTable>;
export type NewAppSettings = Insertable<AppSettingsTable>;
export type AppSettingsUpdate = Updateable<AppSettingsTable>;

//------------------------------------------------------------------------------
// Log Table
//------------------------------------------------------------------------------

export interface LogTable {
  id: Generated<number>;
  level: string; // ERROR, WARN, INFO, DEBUG
  category: string; // api, auth, system, database, server, external_api
  message: string;
  meta: string | null; // JSON 형태의 추가 데이터
  createdAt: Generated<string>; // SQLite는 날짜를 문자열로 저장
}

export type Log = Selectable<LogTable>;
export type NewLog = Insertable<LogTable>;
export type LogUpdate = Updateable<LogTable>;

//------------------------------------------------------------------------------
// Translation Config Table (Singleton - id=1 고정)
//------------------------------------------------------------------------------

export interface TranslationConfigTable {
  id: Generated<number>;
  model: Generated<string>;
  chunkSize: Generated<number>;
  temperature: Generated<number>;
  maxOutputTokens: number | null;
  topP: number | null;
  topK: number | null;
  updatedAt: string;
}

export type TranslationConfig = Selectable<TranslationConfigTable>;
export type NewTranslationConfig = Insertable<TranslationConfigTable>;
export type TranslationConfigUpdate = Updateable<TranslationConfigTable>;

//------------------------------------------------------------------------------
// Translation Session Table
//------------------------------------------------------------------------------

export interface TranslationSessionTable {
  id: string; // CUID
  title: string;
  memo: string | null;
  customDict: string | null;
  originalFileName: string | null;
  sourceText: string | null;
  translatedText: string | null;
  status: Generated<string>; // draft | ready | translating | paused | completed | failed
  totalChunks: Generated<number>;
  createdAt: Generated<string>;
  updatedAt: string;
}

export type TranslationSession = Selectable<TranslationSessionTable>;
export type NewTranslationSession = Insertable<TranslationSessionTable>;
export type TranslationSessionUpdate = Updateable<TranslationSessionTable>;

//------------------------------------------------------------------------------
// Translation Chunk Table
//------------------------------------------------------------------------------

export interface TranslationChunkTable {
  id: string; // CUID
  sessionId: string; // FK to translation_sessions
  order: number; // 청크 순서 (0부터)
  sourceText: string;
  translatedText: string | null;
  status: Generated<string>; // pending | processing | completed | failed
  errorMessage: string | null;
  retryCount: Generated<number>;
  tokenCount: number | null;
  processingTime: number | null; // ms
  createdAt: Generated<string>;
  updatedAt: string;
}

export type TranslationChunk = Selectable<TranslationChunkTable>;
export type NewTranslationChunk = Insertable<TranslationChunkTable>;
export type TranslationChunkUpdate = Updateable<TranslationChunkTable>;

//------------------------------------------------------------------------------
// Migration Table (Internal)
//------------------------------------------------------------------------------

export interface MigrationTable {
  version: number;
  name: string;
  appliedAt: Generated<string>;
}

export type Migration = Selectable<MigrationTable>;

//------------------------------------------------------------------------------
// Session with Chunks (for includes)
//------------------------------------------------------------------------------

export interface TranslationSessionWithChunks extends TranslationSession {
  chunks: TranslationChunk[];
}

//------------------------------------------------------------------------------
// Chunk with Session (for includes)
//------------------------------------------------------------------------------

export interface TranslationChunkWithSession extends TranslationChunk {
  session: TranslationSession;
}
