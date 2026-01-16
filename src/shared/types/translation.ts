import { z } from 'zod';

// ============================================
// 앱 설정 (App Settings)
// ============================================

export const AppSettingsSchema = z.object({
  id: z.number().int(),
  geminiApiKey: z.string().nullable(), // 마스킹된 형태로 반환
  hasApiKey: z.boolean(), // API 키 설정 여부
  updatedAt: z.string(), // ISO 8601
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

// GET /settings 응답
export const GetAppSettingsResponseSchema = AppSettingsSchema;
export type GetAppSettingsResponse = z.infer<typeof GetAppSettingsResponseSchema>;

// PUT /settings/api-key 요청
export const UpdateApiKeyRequestSchema = z.object({
  apiKey: z.string().min(1).max(500),
});
export type UpdateApiKeyRequest = z.infer<typeof UpdateApiKeyRequestSchema>;

// PUT /settings/api-key 응답
export const UpdateApiKeyResponseSchema = z.object({
  success: z.boolean(),
  hasApiKey: z.boolean(),
  updatedAt: z.string(),
});
export type UpdateApiKeyResponse = z.infer<typeof UpdateApiKeyResponseSchema>;

// DELETE /settings/api-key 응답
export const DeleteApiKeyResponseSchema = z.object({
  success: z.boolean(),
  updatedAt: z.string(),
});
export type DeleteApiKeyResponse = z.infer<typeof DeleteApiKeyResponseSchema>;

// GET /settings/api-key/validate 응답
export const ValidateApiKeyResponseSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
});
export type ValidateApiKeyResponse = z.infer<typeof ValidateApiKeyResponseSchema>;

// ============================================
// 번역 상태 enum
// ============================================

export const TranslationSessionStatusSchema = z.enum([
  'draft', // 초기 상태
  'ready', // 청킹 완료, 번역 준비됨
  'translating', // 번역 진행 중
  'paused', // 일시 중지
  'completed', // 완료
  'failed', // 실패
]);
export type TranslationSessionStatus = z.infer<typeof TranslationSessionStatusSchema>;

export const TranslationChunkStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export type TranslationChunkStatus = z.infer<typeof TranslationChunkStatusSchema>;

// ============================================
// Gemini 모델 정보
// ============================================

export const GeminiModelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxOutputTokens: z.number().int().positive(),
  defaultTemperature: z.number().min(0).max(2),
  contextWindow: z.number().int().positive(),
  isExperimental: z.boolean().default(false),
});
export type GeminiModelInfo = z.infer<typeof GeminiModelInfoSchema>;

// GET /models 응답
export const ListModelsResponseSchema = z.array(GeminiModelInfoSchema);
export type ListModelsResponse = z.infer<typeof ListModelsResponseSchema>;

// ============================================
// GenerationConfig (LLM 생성 설정)
// ============================================

export const GenerationConfigSchema = z.object({
  temperature: z.number().min(0).max(2).default(1.0),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

// ============================================
// 전역 설정 (TranslationConfig)
// ============================================

export const TranslationConfigSchema = z.object({
  id: z.number().int(),
  model: z.string(),
  chunkSize: z.number().int(),
  temperature: z.number().min(0).max(2).default(1.0),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  updatedAt: z.string(), // ISO 8601
});
export type TranslationConfig = z.infer<typeof TranslationConfigSchema>;

// GET /config 응답
export const GetTranslationConfigResponseSchema = TranslationConfigSchema;
export type GetTranslationConfigResponse = z.infer<typeof GetTranslationConfigResponseSchema>;

// PATCH /config 요청
export const UpdateTranslationConfigRequestSchema = z.object({
  model: z.string().optional(),
  chunkSize: z.number().int().min(100).max(10000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
});
export type UpdateTranslationConfigRequest = z.infer<typeof UpdateTranslationConfigRequestSchema>;

// PATCH /config 응답
export const UpdateTranslationConfigResponseSchema = TranslationConfigSchema;
export type UpdateTranslationConfigResponse = z.infer<typeof UpdateTranslationConfigResponseSchema>;

// ============================================
// 세션 (TranslationSession)
// ============================================

export const TranslationSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  memo: z.string().nullable(),
  customDict: z.string().nullable(),
  originalFileName: z.string().nullable().optional(),
  sourceText: z.string().nullable(),
  translatedText: z.string().nullable(),
  status: TranslationSessionStatusSchema,
  totalChunks: z.number().int().default(0),
  createdAt: z.string(), // ISO 8601
  updatedAt: z.string(), // ISO 8601
});
export type TranslationSession = z.infer<typeof TranslationSessionSchema>;

// GET /sessions 응답
export const ListSessionsResponseSchema = z.array(TranslationSessionSchema);
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>;

// POST /sessions 요청
export const CreateSessionRequestSchema = z.object({
  title: z.string().min(1).max(200),
  memo: z.string().optional(),
  customDict: z.string().optional(),
});
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

// POST /sessions 응답
export const CreateSessionResponseSchema = TranslationSessionSchema;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// GET /sessions/:id 응답
export const GetSessionResponseSchema = TranslationSessionSchema;
export type GetSessionResponse = z.infer<typeof GetSessionResponseSchema>;

// PATCH /sessions/:id 요청
export const UpdateSessionRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  memo: z.string().optional(),
  customDict: z.string().optional(),
});
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequestSchema>;

// PATCH /sessions/:id 응답
export const UpdateSessionResponseSchema = TranslationSessionSchema;
export type UpdateSessionResponse = z.infer<typeof UpdateSessionResponseSchema>;

// ============================================
// 청크 (TranslationChunk)
// ============================================

export const TranslationChunkSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  order: z.number().int(),
  sourceText: z.string(),
  translatedText: z.string().nullable(),
  status: TranslationChunkStatusSchema,
  errorMessage: z.string().nullable(),
  retryCount: z.number().int(),
  tokenCount: z.number().int().nullable(),
  processingTime: z.number().int().nullable(),
  createdAt: z.string(), // ISO 8601
  updatedAt: z.string(), // ISO 8601
});
export type TranslationChunk = z.infer<typeof TranslationChunkSchema>;

// GET /sessions/:id/chunks 응답 (기본 - 배열)
export const GetSessionChunksResponseSchema = z.array(TranslationChunkSchema);
export type GetSessionChunksResponse = z.infer<typeof GetSessionChunksResponseSchema>;

// GET /sessions/:id/chunks 요청 (페이지네이션)
export const GetSessionChunksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: TranslationChunkStatusSchema.optional(),
});
export type GetSessionChunksQuery = z.infer<typeof GetSessionChunksQuerySchema>;

// GET /sessions/:id/chunks 응답 (페이지네이션)
export const PaginatedChunksResponseSchema = z.object({
  chunks: z.array(TranslationChunkSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type PaginatedChunksResponse = z.infer<typeof PaginatedChunksResponseSchema>;

// ============================================
// 파일 업로드/다운로드
// ============================================

// POST /sessions/:id/upload 응답
export const FileUploadResponseSchema = z.object({
  session: TranslationSessionSchema,
  totalChunks: z.number().int(),
  originalFileName: z.string(),
  fileSize: z.number().int(),
  charCount: z.number().int(),
});
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

// ============================================
// 번역 실행
// ============================================

// POST /sessions/:id/start 요청 (청킹만 수행)
export const StartTranslationRequestSchema = z.object({
  sourceText: z.string().min(1),
});
export type StartTranslationRequest = z.infer<typeof StartTranslationRequestSchema>;

// POST /sessions/:id/translate 요청 (번역 실행)
export const TranslateRequestSchema = z.object({
  templateId: z.string(),
});
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;

// POST /sessions/:id/start 응답
export const StartTranslationResponseSchema = z.object({
  session: TranslationSessionSchema,
  chunks: z.array(TranslationChunkSchema),
  totalChunks: z.number().int(),
});
export type StartTranslationResponse = z.infer<typeof StartTranslationResponseSchema>;

// POST /sessions/:id/translate 응답
export const TranslateAllResponseSchema = z.object({
  session: TranslationSessionSchema,
  chunks: z.array(TranslationChunkSchema),
  completedCount: z.number().int(),
  failedCount: z.number().int(),
});
export type TranslateAllResponse = z.infer<typeof TranslateAllResponseSchema>;

// GET /sessions/:id/progress 응답
export const TranslationProgressResponseSchema = z.object({
  sessionId: z.string(),
  status: TranslationSessionStatusSchema,
  totalChunks: z.number().int(),
  completedChunks: z.number().int(),
  failedChunks: z.number().int(),
  pendingChunks: z.number().int(),
  processingChunks: z.number().int(),
  progressPercent: z.number(),
});
export type TranslationProgressResponse = z.infer<typeof TranslationProgressResponseSchema>;

// GET /sessions/:id/partial 응답
export const PartialTranslationResponseSchema = z.object({
  translatedText: z.string(),
});
export type PartialTranslationResponse = z.infer<typeof PartialTranslationResponseSchema>;

// POST /chunks/:id/retry 응답
export const RetryChunkResponseSchema = TranslationChunkSchema;
export type RetryChunkResponse = z.infer<typeof RetryChunkResponseSchema>;

// POST /chunks/:id/translate 요청 (단일 청크 번역)
export const TranslateChunkRequestSchema = z.object({
  templateId: z.string(),
});
export type TranslateChunkRequest = z.infer<typeof TranslateChunkRequestSchema>;

// POST /chunks/:id/translate 응답
export const TranslateChunkResponseSchema = TranslationChunkSchema;
export type TranslateChunkResponse = z.infer<typeof TranslateChunkResponseSchema>;

// ============================================
// LLM Provider
// ============================================

// GET /provider 응답
export const GetProviderResponseSchema = z.object({
  provider: z.string(),
  status: z.enum(['ready', 'error']),
});
export type GetProviderResponse = z.infer<typeof GetProviderResponseSchema>;

// ============================================
// 프롬프트 템플릿
// ============================================

export const PromptTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  description: z.string().optional(),
});
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>;

// GET /templates 응답
export const ListTemplatesResponseSchema = z.array(PromptTemplateSchema);
export type ListTemplatesResponse = z.infer<typeof ListTemplatesResponseSchema>;

// GET /templates/:id 응답
export const GetTemplateResponseSchema = PromptTemplateSchema.extend({
  content: z.string(),
});
export type GetTemplateResponse = z.infer<typeof GetTemplateResponseSchema>;

// ============================================
// 에러 응답
// ============================================

export const TranslationErrorResponseSchema = z.object({
  error: z.string(),
});
export type TranslationErrorResponse = z.infer<typeof TranslationErrorResponseSchema>;

// 세션 not found 응답
export const SessionNotFoundResponseSchema = z.object({
  error: z.literal('Session not found'),
});
export type SessionNotFoundResponse = z.infer<typeof SessionNotFoundResponseSchema>;

// ============================================
// WebSocket 메시지 타입 (IPC 이벤트로 사용)
// ============================================

// 진행 상황 정보
export const ProgressInfoSchema = z.object({
  completed: z.number().int(),
  failed: z.number().int(),
  pending: z.number().int(),
  total: z.number().int(),
  percent: z.number(),
});
export type ProgressInfo = z.infer<typeof ProgressInfoSchema>;

// --- 서버 → 클라이언트 이벤트 ---

// 구독 확인
export const WsSubscribedEventSchema = z.object({
  type: z.literal('subscribed'),
  sessionId: z.string(),
  session: TranslationSessionSchema,
  progress: ProgressInfoSchema,
});
export type WsSubscribedEvent = z.infer<typeof WsSubscribedEventSchema>;

// 청크 진행 상황
export const WsChunkProgressEventSchema = z.object({
  type: z.literal('chunk:progress'),
  sessionId: z.string(),
  chunk: TranslationChunkSchema,
  progress: ProgressInfoSchema,
});
export type WsChunkProgressEvent = z.infer<typeof WsChunkProgressEventSchema>;

// 청크 시작
export const WsChunkStartEventSchema = z.object({
  type: z.literal('chunk:start'),
  sessionId: z.string(),
  chunkId: z.string(),
  order: z.number().int(),
});
export type WsChunkStartEvent = z.infer<typeof WsChunkStartEventSchema>;

// 세션 상태 변경
export const WsSessionStatusEventSchema = z.object({
  type: z.literal('session:status'),
  sessionId: z.string(),
  status: TranslationSessionStatusSchema,
  progress: ProgressInfoSchema,
});
export type WsSessionStatusEvent = z.infer<typeof WsSessionStatusEventSchema>;

// 세션 완료
export const WsSessionCompleteEventSchema = z.object({
  type: z.literal('session:complete'),
  sessionId: z.string(),
  session: TranslationSessionSchema,
  translatedText: z.string().nullable(),
});
export type WsSessionCompleteEvent = z.infer<typeof WsSessionCompleteEventSchema>;

// 에러
export const WsErrorEventSchema = z.object({
  type: z.literal('error'),
  sessionId: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});
export type WsErrorEvent = z.infer<typeof WsErrorEventSchema>;

// 서버 이벤트 통합
export const WsServerEventSchema = z.discriminatedUnion('type', [
  WsSubscribedEventSchema,
  WsChunkProgressEventSchema,
  WsChunkStartEventSchema,
  WsSessionStatusEventSchema,
  WsSessionCompleteEventSchema,
  WsErrorEventSchema,
]);
export type WsServerEvent = z.infer<typeof WsServerEventSchema>;
