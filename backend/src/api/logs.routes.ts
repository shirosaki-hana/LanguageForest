import { type FastifyPluginAsync } from 'fastify';
import {
  GetLogsRequestSchema,
  GetLogsResponseSchema,
  LogStatsResponseSchema,
  DeleteLogsRequestSchema,
  DeleteLogsResponseSchema,
  GetLogSettingsResponseSchema,
  LogSettingsSchema,
  UpdateLogSettingsResponseSchema,
} from '@languageforest/sharedtype';
import { getLogs, getLogStats, deleteLogs, cleanupOldLogs } from '../services/logs.js';
import { requireAuth } from '../middleware/auth.js';

//------------------------------------------------------------------------------//
// 기본 로그 설정 (추후 설정 테이블로 이동 가능)
let logSettings = {
  retentionDays: 7,
  maxLogs: 10000,
};

export const logsRoutes: FastifyPluginAsync = async fastify => {
  // 모든 로그 API는 인증 필요
  fastify.addHook('onRequest', requireAuth);

  // 로그 목록 조회
  fastify.get('/', async (request, reply) => {
    const params = GetLogsRequestSchema.parse(request.query);
    const result = await getLogs(params);
    return reply.send(
      GetLogsResponseSchema.parse({
        success: true,
        ...result,
      })
    );
  });

  // 로그 통계 조회
  fastify.get('/stats', async (_request, reply) => {
    const stats = await getLogStats();
    return reply.send(
      LogStatsResponseSchema.parse({
        success: true,
        stats,
      })
    );
  });

  // 로그 삭제
  fastify.delete('/', async (request, reply) => {
    const params = DeleteLogsRequestSchema.parse(request.body);
    const deletedCount = await deleteLogs(params);
    return reply.send(
      DeleteLogsResponseSchema.parse({
        success: true,
        deletedCount,
      })
    );
  });

  // 로그 설정 조회
  fastify.get('/settings', async (_request, reply) => {
    return reply.send(
      GetLogSettingsResponseSchema.parse({
        success: true,
        settings: logSettings,
      })
    );
  });

  // 로그 설정 업데이트
  fastify.put('/settings', async (request, reply) => {
    const newSettings = LogSettingsSchema.parse(request.body);
    logSettings = { ...logSettings, ...newSettings };
    return reply.send(
      UpdateLogSettingsResponseSchema.parse({
        success: true,
        settings: logSettings,
      })
    );
  });

  // 수동 로그 정리
  fastify.post('/cleanup', async (_request, reply) => {
    const deletedCount = await cleanupOldLogs(logSettings);
    return reply.send(
      DeleteLogsResponseSchema.parse({
        success: true,
        deletedCount,
      })
    );
  });
};
