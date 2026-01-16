import { db } from '../database/index';
import { setLogDbSaver, flushLogQueue } from '../utils/log';
import type { LogLevel, LogCategory, GetLogsRequest, LogSettings } from '@shared/types';

//------------------------------------------------------------------------------//
// 로그 DB 저장 함수
const saveLogToDb = async (
  level: LogLevel,
  category: LogCategory,
  message: string,
  meta?: unknown,
  timestamp?: string
): Promise<void> => {
  await db
    .insertInto('logs')
    .values({
      level,
      category,
      message,
      meta: meta ? JSON.stringify(meta) : null,
      // timestamp가 제공되면 사용, 아니면 DB 기본값(CURRENT_TIMESTAMP) 사용
      ...(timestamp && { createdAt: timestamp }),
    })
    .execute();
};

// 로거 초기화 (앱 시작 시 호출, DB 준비 후 호출해야 함)
export const initializeLogger = async (): Promise<void> => {
  setLogDbSaver(saveLogToDb);
  // DB 준비 완료 - 큐에 쌓인 로그 모두 flush
  await flushLogQueue();
};

//------------------------------------------------------------------------------//
// 로그 조회
export const getLogs = async (params: GetLogsRequest) => {
  const { level, levels, category, categories, search, startDate, endDate, page = 1, limit = 50, sortOrder = 'desc' } = params;

  let query = db.selectFrom('logs');
  let countQuery = db.selectFrom('logs');

  // 레벨 필터
  if (levels && levels.length > 0) {
    query = query.where('level', 'in', levels);
    countQuery = countQuery.where('level', 'in', levels);
  } else if (level) {
    query = query.where('level', '=', level);
    countQuery = countQuery.where('level', '=', level);
  }

  // 카테고리 필터
  if (categories && categories.length > 0) {
    query = query.where('category', 'in', categories);
    countQuery = countQuery.where('category', 'in', categories);
  } else if (category) {
    query = query.where('category', '=', category);
    countQuery = countQuery.where('category', '=', category);
  }

  // 검색어 필터
  if (search) {
    query = query.where('message', 'like', `%${search}%`);
    countQuery = countQuery.where('message', 'like', `%${search}%`);
  }

  // 기간 필터
  if (startDate) {
    query = query.where('createdAt', '>=', new Date(startDate).toISOString());
    countQuery = countQuery.where('createdAt', '>=', new Date(startDate).toISOString());
  }
  if (endDate) {
    query = query.where('createdAt', '<=', new Date(endDate).toISOString());
    countQuery = countQuery.where('createdAt', '<=', new Date(endDate).toISOString());
  }

  // 총 개수 조회
  const countResult = await countQuery.select(eb => eb.fn.countAll().as('count')).executeTakeFirstOrThrow();
  const total = Number(countResult.count);

  // 데이터 조회
  const logs = await query
    .selectAll()
    .orderBy('createdAt', sortOrder === 'desc' ? 'desc' : 'asc')
    .offset((page - 1) * limit)
    .limit(limit)
    .execute();

  return {
    logs: logs.map(log => ({
      ...log,
      createdAt: log.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

//------------------------------------------------------------------------------//
// 로그 통계
const ALL_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'] as const;
const ALL_CATEGORIES = ['api', 'auth', 'system', 'database', 'server', 'external_api'] as const;

export const getLogStats = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalResult = await db.selectFrom('logs').select(eb => eb.fn.countAll().as('count')).executeTakeFirstOrThrow();
  const total = Number(totalResult.count);

  const byLevelResults = await db
    .selectFrom('logs')
    .select(['level', eb => eb.fn.countAll().as('count')])
    .groupBy('level')
    .execute();

  const byCategoryResults = await db
    .selectFrom('logs')
    .select(['category', eb => eb.fn.countAll().as('count')])
    .groupBy('category')
    .execute();

  const last24hResult = await db
    .selectFrom('logs')
    .select(eb => eb.fn.countAll().as('count'))
    .where('createdAt', '>=', oneDayAgo.toISOString())
    .executeTakeFirstOrThrow();
  const last24h = Number(last24hResult.count);

  const last7dResult = await db
    .selectFrom('logs')
    .select(eb => eb.fn.countAll().as('count'))
    .where('createdAt', '>=', oneWeekAgo.toISOString())
    .executeTakeFirstOrThrow();
  const last7d = Number(last7dResult.count);

  const byLevelMap: Record<string, number> = {};
  for (const level of ALL_LEVELS) {
    byLevelMap[level] = 0;
  }
  for (const item of byLevelResults) {
    byLevelMap[item.level] = Number(item.count);
  }

  const byCategoryMap: Record<string, number> = {};
  for (const category of ALL_CATEGORIES) {
    byCategoryMap[category] = 0;
  }
  for (const item of byCategoryResults) {
    byCategoryMap[item.category] = Number(item.count);
  }

  return {
    total,
    byLevel: byLevelMap,
    byCategory: byCategoryMap,
    last24h,
    last7d,
  };
};

//------------------------------------------------------------------------------//
// 로그 삭제
export const deleteLogs = async (params: { ids?: number[]; olderThan?: string; level?: LogLevel }): Promise<number> => {
  const { ids, olderThan, level } = params;

  if (ids && ids.length > 0) {
    const result = await db.deleteFrom('logs').where('id', 'in', ids).executeTakeFirst();
    return Number(result?.numDeletedRows ?? 0);
  }

  if (!olderThan && !level) {
    return 0;
  }

  let query = db.deleteFrom('logs');

  if (olderThan) {
    query = query.where('createdAt', '<', new Date(olderThan).toISOString());
  }

  if (level) {
    query = query.where('level', '=', level);
  }

  const result = await query.executeTakeFirst();
  return Number(result?.numDeletedRows ?? 0);
};

//------------------------------------------------------------------------------//
// 오래된 로그 자동 정리
export const cleanupOldLogs = async (settings: LogSettings): Promise<number> => {
  const { retentionDays, maxLogs } = settings;

  let deletedCount = 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const byDateResult = await db.deleteFrom('logs').where('createdAt', '<', cutoffDate.toISOString()).executeTakeFirst();
  deletedCount += Number(byDateResult?.numDeletedRows ?? 0);

  const countResult = await db.selectFrom('logs').select(eb => eb.fn.countAll().as('count')).executeTakeFirstOrThrow();
  const currentCount = Number(countResult.count);

  if (currentCount > maxLogs) {
    const excessCount = currentCount - maxLogs;

    const oldestLogs = await db.selectFrom('logs').select('id').orderBy('createdAt', 'asc').limit(excessCount).execute();

    if (oldestLogs.length > 0) {
      const idsToDelete = oldestLogs.map(l => l.id);
      const byCountResult = await db.deleteFrom('logs').where('id', 'in', idsToDelete).executeTakeFirst();
      deletedCount += Number(byCountResult?.numDeletedRows ?? 0);
    }
  }

  return deletedCount;
};
