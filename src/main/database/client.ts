/**
 * 데이터베이스 클라이언트
 *
 * Kysely + node:sqlite dialect를 사용한 데이터베이스 연결 관리.
 * Electron userData 디렉토리에 DB 파일을 저장합니다.
 */
import { app } from 'electron';
import path from 'node:path';
import { Kysely } from 'kysely';
import { NodeSqliteDialect } from './sqlite-dialect';
import { runMigrations } from './migrations';
import { logger } from '../utils/log';
import type { Database } from './types';

//------------------------------------------------------------------------------
// 데이터베이스 경로 (Electron userData)
//------------------------------------------------------------------------------

function getDatabasePath(): string {
  // Electron userData 디렉토리에 DB 파일 저장
  // Windows: %APPDATA%/LanguageForest/languageforest.db
  // macOS: ~/Library/Application Support/LanguageForest/languageforest.db
  // Linux: ~/.config/LanguageForest/languageforest.db
  return path.join(app.getPath('userData'), 'languageforest.db');
}

//------------------------------------------------------------------------------
// 싱글톤 인스턴스 관리
//------------------------------------------------------------------------------

let dbInstance: Kysely<Database> | null = null;

/**
 * Kysely 인스턴스 생성
 */
function createDatabase(): Kysely<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  logger.info('database', `Database path: ${dbPath}`);

  dbInstance = new Kysely<Database>({
    dialect: new NodeSqliteDialect({
      database: dbPath,
      pragmas: {
        // 성능 최적화 설정
        cache_size: -64000, // 64MB
        busy_timeout: 5000,
      },
    }),
  });

  return dbInstance;
}

export const db = createDatabase();

// 하위 호환성을 위한 별칭
export const database = db;

//------------------------------------------------------------------------------
// 연결 관리 함수
//------------------------------------------------------------------------------

/**
 * 데이터베이스 초기화 (마이그레이션 실행 포함)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // DB 인스턴스 생성 (이미 생성되어 있으면 재사용)
    const database = createDatabase();

    // 마이그레이션 실행
    await runMigrations(database, msg => logger.info('database', msg));

    // 연결 테스트
    await checkDatabaseConnection();

    logger.info('database', 'Database initialized successfully');
  } catch (error) {
    logger.error('database', 'Database initialization failed:', error);
    throw error;
  }
}

/**
 * 데이터베이스 연결 상태 확인
 */
export async function checkDatabaseConnection(): Promise<void> {
  try {
    // 간단한 쿼리로 연결 확인
    await db.selectFrom('_migrations').select('version').limit(1).execute();
    logger.info('database', 'Database connection established successfully');
  } catch (error) {
    logger.error('database', 'Database connection failed:', error);
    throw error;
  }
}

/**
 * 데이터베이스 연결 종료
 */
export async function disconnectDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
    logger.info('database', 'Database connection closed successfully');
  }
}

/**
 * 데이터베이스 연결 상태 확인 (헬스체크용)
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await db.selectFrom('_migrations').select('version').limit(1).execute();
    return true;
  } catch {
    return false;
  }
}
