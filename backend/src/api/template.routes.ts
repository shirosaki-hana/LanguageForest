import { type FastifyPluginAsync } from 'fastify';
import { templateService } from '../services/templateService.js';

// ============================================
// 템플릿 API 라우트
// ============================================

export const templateRoutes: FastifyPluginAsync = async fastify => {
  // GET /templates - 템플릿 목록 조회
  fastify.get('/templates', async () => {
    return templateService.getAll();
  });

  // GET /templates/:id - 템플릿 상세 조회
  fastify.get<{
    Params: { id: string };
  }>('/templates/:id', async (request, reply) => {
    const template = templateService.getById(request.params.id);
    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }
    return {
      id: template.id,
      title: template.title,
      sourceLanguage: template.sourceLanguage,
      targetLanguage: template.targetLanguage,
      description: template.description,
      content: template.content,
    };
  });
};

export default templateRoutes;
