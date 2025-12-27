import path from 'node:path';
import { PrismaClient } from '../database/prismaclient/index.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { logger } from '../utils/log.js';
import { env, isDevelopment } from '../config/index.js';
import { backendRoot } from '../utils/dir.js';
//------------------------------------------------------------------------------//
// 환경변수에서 DB 경로 추출 (file: 접두어 제거 후 절대 경로로 변환)
const dbRelativePath = env.DATABASE_URL_SQLITE.replace(/^file:/, '');
const dbPath = path.resolve(backendRoot, dbRelativePath);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create or reuse Prisma Client instance
function createPrismaClient(): PrismaClient {
  // In development, reuse existing instance to prevent multiple connections
  if (isDevelopment && globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Create adapter with URL
  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  // Create new PrismaClient instance with adapter
  const prismaClient = new PrismaClient({ adapter });

  // Cache the instance in development mode
  if (isDevelopment) {
    globalForPrisma.prisma = prismaClient;
  }

  return prismaClient;
}

export const database = createPrismaClient();

// Database connection status check function
export async function checkDatabaseConnection(): Promise<void> {
  try {
    await database.$connect();
    await database.$queryRaw`SELECT 1`;
    logger.info('database', 'Database connection established successfully');
  } catch (error) {
    logger.error('database', 'Database connection failed:', error);
    throw error;
  }
}

// Database disconnection function
export async function disconnectDatabase(): Promise<void> {
  await database.$disconnect();
  logger.info('database', 'Database connection closed successfully');
}

// Database connection health check (for Docker healthcheck)
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await database.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
