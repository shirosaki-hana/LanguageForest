import { z } from 'zod';

// 로그 레벨 스키마
export const LogLevelSchema = z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

// 로그 카테고리 스키마
export const LogCategorySchema = z.enum(['api', 'auth', 'system', 'database', 'server', 'external_api']);
export type LogCategory = z.infer<typeof LogCategorySchema>;

// 단일 로그 항목 스키마
export const LogItemSchema = z.object({
  id: z.number().int(),
  level: LogLevelSchema,
  category: LogCategorySchema,
  message: z.string(),
  meta: z.string().nullable(),
  createdAt: z.string(), // ISO 8601 형식
});
export type LogItem = z.infer<typeof LogItemSchema>;

// 로그 목록 조회 요청 스키마
export const GetLogsRequestSchema = z.object({
  // 필터링
  level: LogLevelSchema.optional(),
  levels: z.array(LogLevelSchema).optional(), // 복수 레벨 필터
  category: LogCategorySchema.optional(),
  categories: z.array(LogCategorySchema).optional(), // 복수 카테고리 필터
  search: z.string().optional(), // 메시지 검색

  // 기간 필터
  startDate: z.string().optional(), // ISO 8601 형식
  endDate: z.string().optional(), // ISO 8601 형식

  // 페이지네이션
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),

  // 정렬
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type GetLogsRequest = z.infer<typeof GetLogsRequestSchema>;

// 로그 목록 조회 응답 스키마
export const GetLogsResponseSchema = z.object({
  success: z.literal(true),
  logs: z.array(LogItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type GetLogsResponse = z.infer<typeof GetLogsResponseSchema>;

// 로그 통계 응답 스키마
export const LogStatsResponseSchema = z.object({
  success: z.literal(true),
  stats: z.object({
    total: z.number().int(),
    byLevel: z.record(LogLevelSchema, z.number().int()),
    byCategory: z.record(LogCategorySchema, z.number().int()),
    last24h: z.number().int(),
    last7d: z.number().int(),
  }),
});
export type LogStatsResponse = z.infer<typeof LogStatsResponseSchema>;

// 로그 삭제 요청 스키마
export const DeleteLogsRequestSchema = z.object({
  // 특정 ID 삭제
  ids: z.array(z.number().int()).optional(),

  // 기간 기반 삭제
  olderThan: z.string().optional(), // ISO 8601 형식

  // 레벨 기반 삭제
  level: LogLevelSchema.optional(),
});
export type DeleteLogsRequest = z.infer<typeof DeleteLogsRequestSchema>;

// 로그 삭제 응답 스키마
export const DeleteLogsResponseSchema = z.object({
  success: z.literal(true),
  deletedCount: z.number().int(),
});
export type DeleteLogsResponse = z.infer<typeof DeleteLogsResponseSchema>;

// 로그 설정 스키마 (자동 정리 설정 등)
export const LogSettingsSchema = z.object({
  retentionDays: z.number().int().min(1).max(365).default(7),
  maxLogs: z.number().int().min(100).max(1000000).default(10000),
});
export type LogSettings = z.infer<typeof LogSettingsSchema>;

// 로그 설정 응답 스키마
export const GetLogSettingsResponseSchema = z.object({
  success: z.literal(true),
  settings: LogSettingsSchema,
});
export type GetLogSettingsResponse = z.infer<typeof GetLogSettingsResponseSchema>;

// 로그 설정 업데이트 응답 스키마
export const UpdateLogSettingsResponseSchema = z.object({
  success: z.literal(true),
  settings: LogSettingsSchema,
});
export type UpdateLogSettingsResponse = z.infer<typeof UpdateLogSettingsResponseSchema>;
