import { type FastifyRequest, type FastifyReply } from 'fastify';
import { env } from '../config/index.js';
import { authenticateByToken } from '../services/index.js';
import { logger, getRequestMeta } from '../utils/index.js';
//------------------------------------------------------------------------------//
/**
 * 세션 인증 미들웨어
 * 쿠키에서 세션 토큰을 확인하고 유효하지 않으면 401 응답
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies?.[env.SESSION_COOKIE];
  const isAuthenticated = await authenticateByToken(token);

  if (!isAuthenticated) {
    const meta = getRequestMeta(request);
    logger.warn('auth', `Authentication failed: ${request.method} ${request.url}`, {
      ...meta,
      hasToken: Boolean(token),
    });

    reply.code(401).send({ error: 'Unauthorized' });
  }
}
