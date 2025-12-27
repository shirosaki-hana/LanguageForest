import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * SPA fallback 및 404 핸들러
 * - API 요청은 404 JSON 반환
 * - HTML을 요청하는 GET 요청은 index.html 반환 (SPA 라우팅)
 * - 그 외는 404 JSON 반환
 */
export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  // API 요청은 404 반환
  if (request.url.startsWith('/api/')) {
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  }

  // GET 요청이고 Accept 헤더가 HTML을 포함하면 index.html 반환 (SPA 라우팅)
  if (request.method === 'GET' && request.headers.accept?.includes('text/html')) {
    return reply.type('text/html').sendFile('index.html');
  }

  // 그 외의 경우 404 반환
  return reply.code(404).send({
    error: 'Not Found',
    message: `Resource ${request.url} not found`,
  });
}
