import { type FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.routes.js';
import { logsRoutes } from './logs.routes.js';
import { translationRoutes } from './translation.routes.js';

export const apiRoutes: FastifyPluginAsync = async fastify => {
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(logsRoutes, { prefix: '/logs' });
  await fastify.register(translationRoutes, { prefix: '/translation' });
};

export default apiRoutes;
