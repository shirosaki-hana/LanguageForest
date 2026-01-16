import { db } from '../database/index.js';
import { setLogDbSaver } from '../utils/log.js';
import type { LogLevel, LogCategory, GetLogsRequest, LogSettings } from '@languageforest/sharedtype';

//------------------------------------------------------------------------------//
// 로그 DB 저장 함수
const saveLogToDb = async (level: LogLevel, category: LogCategory, message: string, meta?: unknown): Promise<void> => {
  await db
    .insertInto('logs')
    .values({
      level,
      category,
      message,
      meta: meta ? JSON.stringify(meta) : null,
    })
    .execute();
};

// 로거 초기화 (앱 시작 시 호출)
export const initializeLogger = () => {
  setLogDbSaver(saveLogToDb);
};

//------------------------------------------------------------------------------//
// 로그 조회
export const getLogs = async (params: GetLogsRequest) => {
  const { level, levels, category, categories, search, startDate, endDate, page = 1, limit = 50, sortOrder = 'desc' } = params;

  // 기본 쿼리 빌더
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
      createdAt: log.createdAt, // 이미 ISO 문자열
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
// 모든 레벨과 카테고리에 대해 기본값 0을 설정 (Zod 스키마 검증을 위해)
const ALL_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'] as const;
const ALL_CATEGORIES = ['api', 'auth', 'system', 'database', 'server', 'external_api'] as const;

export const getLogStats = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 총 개수
  const totalResult = await db.selectFrom('logs').select(eb => eb.fn.countAll().as('count')).executeTakeFirstOrThrow();
  const total = Number(totalResult.count);

  // 레벨별 통계
  const byLevelResults = await db
    .selectFrom('logs')
    .select(['level', eb => eb.fn.countAll().as('count')])
    .groupBy('level')
    .execute();

  // 카테고리별 통계
  const byCategoryResults = await db
    .selectFrom('logs')
    .select(['category', eb => eb.fn.countAll().as('count')])
    .groupBy('category')
    .execute();

  // 최근 24시간
  const last24hResult = await db
    .selectFrom('logs')
    .select(eb => eb.fn.countAll().as('count'))
    .where('createdAt', '>=', oneDayAgo.toISOString())
    .executeTakeFirstOrThrow();
  const last24h = Number(last24hResult.count);

  // 최근 7일
  const last7dResult = await db
    .selectFrom('logs')
    .select(eb => eb.fn.countAll().as('count'))
    .where('createdAt', '>=', oneWeekAgo.toISOString())
    .executeTakeFirstOrThrow();
  const last7d = Number(last7dResult.count);

  // 레벨별 통계를 객체로 변환 (모든 레벨에 대해 기본값 0 설정)
  const byLevelMap: Record<string, number> = {};
  for (const level of ALL_LEVELS) {
    byLevelMap[level] = 0;
  }
  for (const item of byLevelResults) {
    byLevelMap[item.level] = Number(item.count);
  }

  // 카테고리별 통계를 객체로 변환 (모든 카테고리에 대해 기본값 0 설정)
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

  // 특정 ID 삭제
  if (ids && ids.length > 0) {
    const result = await db.deleteFrom('logs').where('id', 'in', ids).executeTakeFirst();
    return Number(result?.numDeletedRows ?? 0);
  }

  // 조건이 없으면 삭제하지 않음 (안전장치)
  if (!olderThan && !level) {
    return 0;
  }

  // 조건 기반 삭제
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

  // 1. 보관 기간 초과 로그 삭제
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const byDateResult = await db.deleteFrom('logs').where('createdAt', '<', cutoffDate.toISOString()).executeTakeFirst();
  deletedCount += Number(byDateResult?.numDeletedRows ?? 0);

  // 2. 최대 개수 초과 로그 삭제 (가장 오래된 것부터)
  const countResult = await db.selectFrom('logs').select(eb => eb.fn.countAll().as('count')).executeTakeFirstOrThrow();
  const currentCount = Number(countResult.count);

  if (currentCount > maxLogs) {
    const excessCount = currentCount - maxLogs;

    // 가장 오래된 로그 ID 조회
    const oldestLogs = await db.selectFrom('logs').select('id').orderBy('createdAt', 'asc').limit(excessCount).execute();

    if (oldestLogs.length > 0) {
      const idsToDelete = oldestLogs.map(l => l.id);
      const byCountResult = await db.deleteFrom('logs').where('id', 'in', idsToDelete).executeTakeFirst();
      deletedCount += Number(byCountResult?.numDeletedRows ?? 0);
    }
  }

  return deletedCount;
};
