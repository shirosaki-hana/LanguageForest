import { database } from '../database/index.js';
import { setLogDbSaver } from '../utils/log.js';
import type { LogLevel, LogCategory, GetLogsRequest, LogSettings } from '@languageforest/sharedtype';

//------------------------------------------------------------------------------//
// 로그 DB 저장 함수
const saveLogToDb = async (level: LogLevel, category: LogCategory, message: string, meta?: unknown): Promise<void> => {
  await database.log.create({
    data: {
      level,
      category,
      message,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
};

// 로거 초기화 (앱 시작 시 호출)
export const initializeLogger = () => {
  setLogDbSaver(saveLogToDb);
};

//------------------------------------------------------------------------------//
// 로그 조회
export const getLogs = async (params: GetLogsRequest) => {
  const { level, levels, category, categories, search, startDate, endDate, page = 1, limit = 50, sortOrder = 'desc' } = params;

  // WHERE 조건 구성
  const where: {
    level?: { in: string[] } | string;
    category?: { in: string[] } | string;
    message?: { contains: string };
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  // 레벨 필터
  if (levels && levels.length > 0) {
    where.level = { in: levels };
  } else if (level) {
    where.level = level;
  }

  // 카테고리 필터
  if (categories && categories.length > 0) {
    where.category = { in: categories };
  } else if (category) {
    where.category = category;
  }

  // 검색어 필터
  if (search) {
    where.message = { contains: search };
  }

  // 기간 필터
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // 총 개수 및 데이터 조회
  const [total, logs] = await Promise.all([
    database.log.count({ where }),
    database.log.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    logs: logs.map(log => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
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
const ALL_CATEGORIES = ['api', 'auth', 'system', 'database', 'server'] as const;

export const getLogStats = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, byLevel, byCategory, last24h, last7d] = await Promise.all([
    database.log.count(),
    database.log.groupBy({
      by: ['level'],
      _count: { level: true },
    }),
    database.log.groupBy({
      by: ['category'],
      _count: { category: true },
    }),
    database.log.count({ where: { createdAt: { gte: oneDayAgo } } }),
    database.log.count({ where: { createdAt: { gte: oneWeekAgo } } }),
  ]);

  // 레벨별 통계를 객체로 변환 (모든 레벨에 대해 기본값 0 설정)
  const byLevelMap: Record<string, number> = {};
  for (const level of ALL_LEVELS) {
    byLevelMap[level] = 0;
  }
  for (const item of byLevel) {
    byLevelMap[item.level] = item._count.level;
  }

  // 카테고리별 통계를 객체로 변환 (모든 카테고리에 대해 기본값 0 설정)
  const byCategoryMap: Record<string, number> = {};
  for (const category of ALL_CATEGORIES) {
    byCategoryMap[category] = 0;
  }
  for (const item of byCategory) {
    byCategoryMap[item.category] = item._count.category;
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
    const result = await database.log.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  // 조건 기반 삭제
  const where: {
    createdAt?: { lt: Date };
    level?: string;
  } = {};

  if (olderThan) {
    where.createdAt = { lt: new Date(olderThan) };
  }

  if (level) {
    where.level = level;
  }

  // 조건이 없으면 삭제하지 않음 (안전장치)
  if (Object.keys(where).length === 0) {
    return 0;
  }

  const result = await database.log.deleteMany({ where });
  return result.count;
};

//------------------------------------------------------------------------------//
// 오래된 로그 자동 정리
export const cleanupOldLogs = async (settings: LogSettings): Promise<number> => {
  const { retentionDays, maxLogs } = settings;

  let deletedCount = 0;

  // 1. 보관 기간 초과 로그 삭제
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const byDateResult = await database.log.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });
  deletedCount += byDateResult.count;

  // 2. 최대 개수 초과 로그 삭제 (가장 오래된 것부터)
  const currentCount = await database.log.count();
  if (currentCount > maxLogs) {
    const excessCount = currentCount - maxLogs;

    // 가장 오래된 로그 ID 조회
    const oldestLogs = await database.log.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: excessCount,
    });

    if (oldestLogs.length > 0) {
      const byCountResult = await database.log.deleteMany({
        where: { id: { in: oldestLogs.map(l => l.id) } },
      });
      deletedCount += byCountResult.count;
    }
  }

  return deletedCount;
};
