import { type FastifyPluginAsync } from 'fastify';
import {
  // Config
  UpdateTranslationConfigRequestSchema,
  // Session
  CreateSessionRequestSchema,
  UpdateSessionRequestSchema,
  // Translation
  StartTranslationRequestSchema,
} from '@languageforest/sharedtype';
import { getLLMClient } from '../external/llm.js';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../translation/types.js';
import {
  // Config
  getTranslationConfig,
  updateTranslationConfig,
  // Session
  createSession,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
  getSessionChunks,
  // Translation
  startTranslation,
  getTranslationProgress,
  translateAllPendingChunks,
  retryFailedChunk,
  getPartialTranslation,
} from '../services/translation.js';

// ============================================
// 번역 API 라우트
// ============================================

export const translationRoutes: FastifyPluginAsync = async fastify => {
  // ==========================================
  // LLM Provider (Mock/OpenAI)
  // ==========================================

  // POST /v1/chat/completions - OpenAI 호환 엔드포인트
  fastify.post<{
    Body: ChatCompletionRequest;
    Reply: ChatCompletionResponse;
  }>('/v1/chat/completions', async (request, reply) => {
    const client = getLLMClient();
    
    try {
      const response = await client.chatCompletion(request.body);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({
        error: {
          message,
          type: 'api_error',
          code: 'internal_error',
        },
      } as unknown as ChatCompletionResponse);
    }
  });

  // GET /provider - 현재 LLM 프로바이더 정보
  fastify.get('/provider', async () => {
    const client = getLLMClient();
    return {
      provider: client.providerName,
      status: 'ready',
    };
  });

  // ==========================================
  // 전역 설정
  // ==========================================

  // GET /config - 전역 설정 조회
  fastify.get('/config', async () => {
    return getTranslationConfig();
  });

  // PATCH /config - 전역 설정 업데이트
  fastify.patch<{
    Body: { model?: string; chunkSize?: number };
  }>('/config', async request => {
    const data = UpdateTranslationConfigRequestSchema.parse(request.body);
    return updateTranslationConfig(data);
  });

  // ==========================================
  // 세션 관리
  // ==========================================

  // GET /sessions - 세션 목록 조회
  fastify.get('/sessions', async () => {
    return listSessions();
  });

  // POST /sessions - 새 세션 생성
  fastify.post<{
    Body: { title: string; memo?: string; customDict?: string };
  }>('/sessions', async request => {
    const data = CreateSessionRequestSchema.parse(request.body);
    return createSession(data);
  });

  // GET /sessions/:id - 세션 상세 조회
  fastify.get<{
    Params: { id: string };
  }>('/sessions/:id', async (request, reply) => {
    const session = await getSession(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return session;
  });

  // PATCH /sessions/:id - 세션 업데이트
  fastify.patch<{
    Params: { id: string };
    Body: { title?: string; memo?: string; customDict?: string };
  }>('/sessions/:id', async request => {
    const data = UpdateSessionRequestSchema.parse(request.body);
    return updateSession(request.params.id, data);
  });

  // DELETE /sessions/:id - 세션 삭제
  fastify.delete<{
    Params: { id: string };
  }>('/sessions/:id', async (request, reply) => {
    await deleteSession(request.params.id);
    return reply.status(204).send();
  });

  // GET /sessions/:id/chunks - 세션의 청크 목록
  fastify.get<{
    Params: { id: string };
  }>('/sessions/:id/chunks', async request => {
    return getSessionChunks(request.params.id);
  });

  // ==========================================
  // 번역 실행
  // ==========================================

  // POST /sessions/:id/start - 번역 시작 (청킹)
  fastify.post<{
    Params: { id: string };
    Body: { sourceText: string };
  }>('/sessions/:id/start', async request => {
    const data = StartTranslationRequestSchema.parse(request.body);
    return startTranslation({
      sessionId: request.params.id,
      sourceText: data.sourceText,
    });
  });

  // POST /sessions/:id/translate - 모든 pending 청크 번역
  fastify.post<{
    Params: { id: string };
  }>('/sessions/:id/translate', async request => {
    return translateAllPendingChunks(request.params.id);
  });

  // GET /sessions/:id/progress - 번역 진행 상황
  fastify.get<{
    Params: { id: string };
  }>('/sessions/:id/progress', async request => {
    return getTranslationProgress(request.params.id);
  });

  // GET /sessions/:id/partial - 부분 번역문 조회
  fastify.get<{
    Params: { id: string };
  }>('/sessions/:id/partial', async request => {
    const text = await getPartialTranslation(request.params.id);
    return { translatedText: text };
  });

  // POST /chunks/:id/retry - 실패한 청크 재시도
  fastify.post<{
    Params: { id: string };
  }>('/chunks/:id/retry', async request => {
    return retryFailedChunk(request.params.id);
  });
};

export default translationRoutes;
