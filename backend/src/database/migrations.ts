/**
 * 애플리케이션 레벨 마이그레이션 시스템
 *
 * 앱 시작 시 자동으로 스키마를 생성/업데이트합니다.
 * Prisma migrate 대체.
 */
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from './types.js';

//------------------------------------------------------------------------------
// Migration Definition
//------------------------------------------------------------------------------

interface MigrationDefinition {
  version: number;
  name: string;
  up: (db: Kysely<Database>) => Promise<void>;
}

//------------------------------------------------------------------------------
// Migrations
//------------------------------------------------------------------------------

const MIGRATIONS: MigrationDefinition[] = [
  {
    version: 1,
    name: 'init',
    up: async db => {
      // logs 테이블
      await sql`
        CREATE TABLE IF NOT EXISTS "logs" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "level" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "meta" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `.execute(db);

      await sql`CREATE INDEX IF NOT EXISTS "logs_level_idx" ON "logs"("level")`.execute(db);
      await sql`CREATE INDEX IF NOT EXISTS "logs_category_idx" ON "logs"("category")`.execute(db);
      await sql`CREATE INDEX IF NOT EXISTS "logs_createdAt_idx" ON "logs"("createdAt")`.execute(db);

      // translation_config 테이블 (싱글톤)
      await sql`
        CREATE TABLE IF NOT EXISTS "translation_config" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
          "model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
          "chunkSize" INTEGER NOT NULL DEFAULT 2000,
          "temperature" REAL NOT NULL DEFAULT 1.0,
          "maxOutputTokens" INTEGER,
          "topP" REAL,
          "topK" INTEGER,
          "updatedAt" DATETIME NOT NULL
        )
      `.execute(db);

      // translation_sessions 테이블
      await sql`
        CREATE TABLE IF NOT EXISTS "translation_sessions" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "memo" TEXT,
          "customDict" TEXT,
          "originalFileName" TEXT,
          "sourceText" TEXT,
          "translatedText" TEXT,
          "status" TEXT NOT NULL DEFAULT 'draft',
          "totalChunks" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        )
      `.execute(db);

      await sql`CREATE INDEX IF NOT EXISTS "translation_sessions_status_idx" ON "translation_sessions"("status")`.execute(db);
      await sql`CREATE INDEX IF NOT EXISTS "translation_sessions_createdAt_idx" ON "translation_sessions"("createdAt")`.execute(db);

      // translation_chunks 테이블
      await sql`
        CREATE TABLE IF NOT EXISTS "translation_chunks" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "order" INTEGER NOT NULL,
          "sourceText" TEXT NOT NULL,
          "translatedText" TEXT,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "errorMessage" TEXT,
          "retryCount" INTEGER NOT NULL DEFAULT 0,
          "tokenCount" INTEGER,
          "processingTime" INTEGER,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "translation_chunks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "translation_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `.execute(db);

      await sql`CREATE INDEX IF NOT EXISTS "translation_chunks_sessionId_idx" ON "translation_chunks"("sessionId")`.execute(db);
      await sql`CREATE INDEX IF NOT EXISTS "translation_chunks_status_idx" ON "translation_chunks"("status")`.execute(db);
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS "translation_chunks_sessionId_order_key" ON "translation_chunks"("sessionId", "order")`.execute(db);
    },
  },
  // 향후 마이그레이션 추가 예시:
  // {
  //   version: 2,
  //   name: 'add_new_feature',
  //   up: async (db) => {
  //     await sql`ALTER TABLE ...`.execute(db);
  //   },
  // },
];

//------------------------------------------------------------------------------
// Migration Runner
//------------------------------------------------------------------------------

/**
 * 마이그레이션 테이블 생성 (없으면)
 */
async function ensureMigrationTable(db: Kysely<Database>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "version" INTEGER NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);
}

/**
 * 적용된 마이그레이션 버전 조회
 */
async function getAppliedVersions(db: Kysely<Database>): Promise<Set<number>> {
  const results = await db.selectFrom('_migrations').select('version').execute();

  return new Set(results.map(r => r.version));
}

/**
 * 마이그레이션 실행
 *
 * @param db Kysely 인스턴스
 * @param logger 로거 함수 (선택)
 * @returns 적용된 마이그레이션 수
 */
export async function runMigrations(db: Kysely<Database>, logger?: (msg: string) => void): Promise<number> {
  const log = logger ?? (() => {});

  // 마이그레이션 테이블 확인
  await ensureMigrationTable(db);

  // 적용된 버전 조회
  const appliedVersions = await getAppliedVersions(db);

  // 미적용 마이그레이션 필터링 및 정렬
  const pendingMigrations = MIGRATIONS.filter(m => !appliedVersions.has(m.version)).sort((a, b) => a.version - b.version);

  if (pendingMigrations.length === 0) {
    log('[Migration] All migrations are up to date');
    return 0;
  }

  log(`[Migration] ${pendingMigrations.length} pending migration(s) found`);

  // 순차적으로 마이그레이션 실행
  for (const migration of pendingMigrations) {
    log(`[Migration] Applying v${migration.version}: ${migration.name}...`);

    try {
      // 트랜잭션 내에서 마이그레이션 실행
      await db.transaction().execute(async trx => {
        // 마이그레이션 로직 실행
        await migration.up(trx as Kysely<Database>);

        // 마이그레이션 기록 저장
        await trx
          .insertInto('_migrations')
          .values({
            version: migration.version,
            name: migration.name,
          })
          .execute();
      });

      log(`[Migration] v${migration.version} applied successfully`);
    } catch (error) {
      log(`[Migration] Failed to apply v${migration.version}: ${error}`);
      throw error;
    }
  }

  log(`[Migration] ${pendingMigrations.length} migration(s) applied`);
  return pendingMigrations.length;
}

/**
 * 현재 마이그레이션 상태 조회
 */
export async function getMigrationStatus(db: Kysely<Database>): Promise<{
  applied: Array<{ version: number; name: string; appliedAt: string }>;
  pending: Array<{ version: number; name: string }>;
}> {
  await ensureMigrationTable(db);

  const applied = await db.selectFrom('_migrations').selectAll().orderBy('version', 'asc').execute();

  const appliedVersions = new Set(applied.map(m => m.version));
  const pending = MIGRATIONS.filter(m => !appliedVersions.has(m.version))
    .sort((a, b) => a.version - b.version)
    .map(m => ({ version: m.version, name: m.name }));

  return { applied, pending };
}
