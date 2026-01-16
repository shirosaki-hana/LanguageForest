import type {
  TranslationConfig,
  UpdateTranslationConfigRequest,
  TranslationSession,
  CreateSessionRequest,
  UpdateSessionRequest,
  TranslationChunk,
  TranslationProgressResponse,
  GetProviderResponse,
  PromptTemplate,
  GetTemplateResponse,
  FileUploadResponse,
  PaginatedChunksResponse,
  GeminiModelInfo,
  AppSettings,
  UpdateApiKeyResponse,
  DeleteApiKeyResponse,
  ValidateApiKeyResponse,
} from '@shared/types';

// ============================================
// LLM Provider
// ============================================

export async function getProvider(): Promise<GetProviderResponse> {
  return window.api.provider.get();
}

// ============================================
// 모델 목록
// ============================================

export async function listModels(): Promise<GeminiModelInfo[]> {
  return window.api.models.list();
}

// ============================================
// 프롬프트 템플릿
// ============================================

export async function listTemplates(): Promise<PromptTemplate[]> {
  return window.api.templates.list();
}

export async function getTemplate(id: string): Promise<GetTemplateResponse> {
  return window.api.templates.get(id);
}

// ============================================
// 전역 설정
// ============================================

export async function getConfig(): Promise<TranslationConfig> {
  return window.api.config.get();
}

export async function updateConfig(req: UpdateTranslationConfigRequest): Promise<TranslationConfig> {
  return window.api.config.update(req);
}

// ============================================
// 세션 관리
// ============================================

export async function listSessions(): Promise<TranslationSession[]> {
  return window.api.sessions.list();
}

export async function createSession(req: CreateSessionRequest): Promise<TranslationSession> {
  return window.api.sessions.create(req);
}

export async function getSession(id: string): Promise<TranslationSession> {
  const result = await window.api.sessions.get(id);
  if (!result) {
    throw new Error('Session not found');
  }
  return result;
}

export async function updateSession(id: string, req: UpdateSessionRequest): Promise<TranslationSession> {
  return window.api.sessions.update(id, req);
}

export async function deleteSession(id: string): Promise<void> {
  return window.api.sessions.delete(id);
}

export async function getSessionChunks(id: string): Promise<TranslationChunk[]> {
  return window.api.sessions.getChunks(id);
}

export async function getSessionChunksPaginated(
  id: string,
  options: { page: number; limit: number; status?: string }
): Promise<PaginatedChunksResponse> {
  return window.api.sessions.getChunksPaginated(id, options);
}

// ============================================
// 파일 업로드/다운로드
// ============================================

export async function uploadFile(sessionId: string, file: File): Promise<FileUploadResponse> {
  // 파일 내용을 직접 읽어서 main 프로세스로 전달
  const content = await file.text();
  return window.api.sessions.uploadFile(sessionId, file.name, content);
}

export async function downloadTranslation(sessionId: string): Promise<Blob> {
  const result = await window.api.sessions.downloadTranslation(sessionId);
  // 텍스트를 Blob으로 변환
  return new Blob([result.content], { type: 'text/plain' });
}

// ============================================
// 번역 실행
// ============================================

export async function startTranslation(sessionId: string, sourceText: string): Promise<TranslationProgressResponse> {
  return window.api.translation.start(sessionId, sourceText);
}

export async function translateAll(sessionId: string, templateId: string): Promise<void> {
  return window.api.translation.translateAll(sessionId, templateId);
}

export async function getProgress(sessionId: string): Promise<TranslationProgressResponse> {
  return window.api.translation.getProgress(sessionId);
}

export async function getPartialTranslation(sessionId: string): Promise<string> {
  return window.api.translation.getPartial(sessionId);
}

export async function retryChunk(chunkId: string, templateId: string): Promise<TranslationChunk> {
  return window.api.translation.retryChunk(chunkId, templateId);
}

export async function translateSingleChunk(chunkId: string, templateId: string): Promise<TranslationChunk> {
  return window.api.translation.translateChunk(chunkId, templateId);
}

// ============================================
// 앱 설정 (API 키 등)
// ============================================

export async function getAppSettings(): Promise<AppSettings> {
  return window.api.settings.get();
}

export async function updateApiKey(apiKey: string): Promise<UpdateApiKeyResponse> {
  return window.api.settings.updateApiKey(apiKey);
}

export async function deleteApiKey(): Promise<DeleteApiKeyResponse> {
  return window.api.settings.deleteApiKey();
}

export async function validateApiKey(): Promise<ValidateApiKeyResponse> {
  return window.api.settings.validateApiKey();
}
