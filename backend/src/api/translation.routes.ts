import { type FastifyPluginAsync } from 'fastify';
import {
  // Config
  UpdateTranslationConfigRequestSchema,
  // Session
  CreateSessionRequestSchema,
  UpdateSessionRequestSchema,
  // Translation
  StartTranslationRequestSchema,
  TranslateRequestSchema,
  TranslateChunkRequestSchema,
  // Pagination
  GetSessionChunksQuerySchema,
} from '@languageforest/sharedtype';
import { getGeminiClient } from '../external/gemini.js';
import { GEMINI_MODELS } from '../config/models.js';
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
  getSessionChunksPaginated,
  // File upload/download
  uploadFileAndChunk,
  getTranslationForDownload,
  // Translation
  startTranslation,
  getTranslationProgress,
  translateAllPendingChunks,
  translateChunk,
  retryFailedChunk,
  getPartialTranslation,
} from '../services/translation.js';
import { templateRoutes } from './template.routes.js';

// ============================================
// 번역 API 라우트
// ============================================

export const translationRoutes: FastifyPluginAsync = async fastify => {
  // ==========================================
  // 템플릿 라우트 등록
  // ==========================================
  await fastify.register(templateRoutes);

  // ==========================================
  // LLM Provider (Gemini)
  // ==========================================

  // GET /provider - 현재 LLM 프로바이더 정보
  fastify.get('/provider', async () => {
    const client = getGeminiClient();
    return {
      provider: 'gemini',
      model: client.modelName,
      status: 'ready',
    };
  });

  // GET /models - 사용 가능한 모델 목록
  fastify.get('/models', async () => {
    return GEMINI_MODELS;
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

  // GET /sessions/:id/chunks - 세션의 청크 목록 (페이지네이션 지원)
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: string; limit?: string; status?: string };
  }>('/sessions/:id/chunks', async request => {
    const { page, limit, status } = request.query;

    // 페이지네이션 파라미터가 있으면 페이지네이션 응답
    if (page || limit) {
      const query = GetSessionChunksQuerySchema.parse({
        page: page ?? 1,
        limit: limit ?? 20,
        status,
      });
      return getSessionChunksPaginated(request.params.id, query);
    }

    // 파라미터가 없으면 전체 목록 (하위 호환성)
    return getSessionChunks(request.params.id);
  });

  // POST /sessions/:id/upload - 파일 업로드 및 청킹
  fastify.post<{
    Params: { id: string };
  }>('/sessions/:id/upload', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    // 파일 내용 읽기
    const buffer = await data.toBuffer();
    const content = buffer.toString('utf-8');
    const fileName = data.filename;

    // 파일 확장자 검증
    if (!fileName.endsWith('.txt')) {
      return reply.status(400).send({ error: 'Only .txt files are allowed' });
    }

    return uploadFileAndChunk({
      sessionId: request.params.id,
      fileName,
      content,
    });
  });

  // GET /sessions/:id/download - 번역문 다운로드
  fastify.get<{
    Params: { id: string };
  }>('/sessions/:id/download', async (request, reply) => {
    const result = await getTranslationForDownload(request.params.id);

    return reply
      .header('Content-Type', 'text/plain; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`)
      .send(result.content);
  });

  // ==========================================
  // 번역 실행
  // ==========================================

  // POST /sessions/:id/start - 번역 시작 (청킹만 수행)
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

  // POST /sessions/:id/translate - 모든 pending 청크 번역 실행
  fastify.post<{
    Params: { id: string };
    Body: { templateId: string };
  }>('/sessions/:id/translate', async request => {
    const data = TranslateRequestSchema.parse(request.body);
    return translateAllPendingChunks(request.params.id, { templateId: data.templateId });
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
    Body: { templateId: string };
  }>('/chunks/:id/retry', async request => {
    const data = TranslateRequestSchema.parse(request.body);
    return retryFailedChunk(request.params.id, { templateId: data.templateId });
  });

  // POST /chunks/:id/translate - 단일 청크 번역 (상태 무관)
  fastify.post<{
    Params: { id: string };
    Body: { templateId: string };
  }>('/chunks/:id/translate', async request => {
    const data = TranslateChunkRequestSchema.parse(request.body);
    return translateChunk(request.params.id, { templateId: data.templateId });
  });
};

export default translationRoutes;
