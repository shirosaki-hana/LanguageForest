import { type FastifyPluginAsync } from 'fastify';
import { isDatabaseConnected } from '../database/index.js';
//------------------------------------------------------------------------------//
export const healthRoutes: FastifyPluginAsync = async fastify => {
  // 헬스체크 엔드포인트
  fastify.get('/', async (_request, reply) => {
    const dbOk = await isDatabaseConnected();

    if (!dbOk) {
      return reply.status(503).send({ status: 'unhealthy', db: false });
    }

    return reply.send({ status: 'ok', db: true });
  });
};
