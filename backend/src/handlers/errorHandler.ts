import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/index.js';
import { isDevelopment } from '../config/index.js';

/**
 * 전역 에러 핸들러
 * - 개발 환경에서는 상세한 에러 메시지와 스택 트레이스 반환
 * - 프로덕션 환경에서는 일반적인 에러 메시지만 반환
 */
export async function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  logger.error('system', 'Unhandled error:', error);

  const statusCode = error.statusCode || 500;

  return reply.code(statusCode).send({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
  });
}
