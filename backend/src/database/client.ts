/**
 * 데이터베이스 클라이언트
 *
 * Kysely + node:sqlite dialect를 사용한 데이터베이스 연결 관리.
 */
import path from 'node:path';
import { Kysely } from 'kysely';
import { NodeSqliteDialect } from './sqlite-dialect.js';
import { runMigrations } from './migrations.js';
import { logger } from '../utils/log.js';
import { env, isDevelopment } from '../config/index.js';
import { backendRoot } from '../utils/dir.js';
import type { Database } from './types.js';

//------------------------------------------------------------------------------
// 환경변수에서 DB 경로 추출 (file: 접두어 제거 후 절대 경로로 변환)
//------------------------------------------------------------------------------

const dbRelativePath = env.DATABASE_URL_SQLITE.replace(/^file:/, '');
const dbPath = path.resolve(backendRoot, dbRelativePath);

//------------------------------------------------------------------------------
// 싱글톤 인스턴스 관리
//------------------------------------------------------------------------------

const globalForDb = globalThis as unknown as {
  db: Kysely<Database> | undefined;
};

/**
 * Kysely 인스턴스 생성
 */
function createDatabase(): Kysely<Database> {
  // 개발 모드에서는 기존 인스턴스 재사용 (HMR 대응)
  if (isDevelopment && globalForDb.db) {
    return globalForDb.db;
  }

  const db = new Kysely<Database>({
    dialect: new NodeSqliteDialect({
      database: dbPath,
      pragmas: {
        // 성능 최적화 설정
        cache_size: -64000, // 64MB
        busy_timeout: 5000,
      },
    }),
  });

  // 개발 모드에서 인스턴스 캐싱
  if (isDevelopment) {
    globalForDb.db = db;
  }

  return db;
}

export const db = createDatabase();

// 하위 호환성을 위한 별칭 (기존 코드에서 database로 import하는 경우)
export const database = db;

//------------------------------------------------------------------------------
// 연결 관리 함수
//------------------------------------------------------------------------------

/**
 * 데이터베이스 초기화 (마이그레이션 실행 포함)
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // 마이그레이션 실행
    await runMigrations(db, msg => logger.info('database', msg));

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
  await db.destroy();
  logger.info('database', 'Database connection closed successfully');
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
