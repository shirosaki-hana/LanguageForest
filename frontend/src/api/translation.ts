import { apiClient } from './client';
import type {
  // Config
  TranslationConfig,
  UpdateTranslationConfigRequest,
  // Session
  TranslationSession,
  CreateSessionRequest,
  UpdateSessionRequest,
  // Chunk
  TranslationChunk,
  // Progress
  TranslationProgressResponse,
  // Provider
  GetProviderResponse,
  // Templates
  PromptTemplate,
  GetTemplateResponse,
  // File upload
  FileUploadResponse,
  // Pagination
  PaginatedChunksResponse,
} from '@languageforest/sharedtype';

// ============================================
// LLM Provider
// ============================================

export async function getProvider(): Promise<GetProviderResponse> {
  const { data } = await apiClient.get<GetProviderResponse>('/translation/provider');
  return data;
}

// ============================================
// 프롬프트 템플릿
// ============================================

export async function listTemplates(): Promise<PromptTemplate[]> {
  const { data } = await apiClient.get<PromptTemplate[]>('/translation/templates');
  return data;
}

export async function getTemplate(id: string): Promise<GetTemplateResponse> {
  const { data } = await apiClient.get<GetTemplateResponse>(`/translation/templates/${id}`);
  return data;
}

// ============================================
// 전역 설정
// ============================================

export async function getConfig(): Promise<TranslationConfig> {
  const { data } = await apiClient.get<TranslationConfig>('/translation/config');
  return data;
}

export async function updateConfig(req: UpdateTranslationConfigRequest): Promise<TranslationConfig> {
  const { data } = await apiClient.patch<TranslationConfig>('/translation/config', req);
  return data;
}

// ============================================
// 세션 관리
// ============================================

export async function listSessions(): Promise<TranslationSession[]> {
  const { data } = await apiClient.get<TranslationSession[]>('/translation/sessions');
  return data;
}

export async function createSession(req: CreateSessionRequest): Promise<TranslationSession> {
  const { data } = await apiClient.post<TranslationSession>('/translation/sessions', req);
  return data;
}

export async function getSession(id: string): Promise<TranslationSession> {
  const { data } = await apiClient.get<TranslationSession>(`/translation/sessions/${id}`);
  return data;
}

export async function updateSession(id: string, req: UpdateSessionRequest): Promise<TranslationSession> {
  const { data } = await apiClient.patch<TranslationSession>(`/translation/sessions/${id}`, req);
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  await apiClient.delete(`/translation/sessions/${id}`);
}

export async function getSessionChunks(id: string): Promise<TranslationChunk[]> {
  const { data } = await apiClient.get<TranslationChunk[]>(`/translation/sessions/${id}/chunks`);
  return data;
}

export async function getSessionChunksPaginated(
  id: string,
  options: { page: number; limit: number; status?: string }
): Promise<PaginatedChunksResponse> {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });
  if (options.status) {
    params.set('status', options.status);
  }
  const { data } = await apiClient.get<PaginatedChunksResponse>(`/translation/sessions/${id}/chunks?${params}`);
  return data;
}

// ============================================
// 파일 업로드/다운로드
// ============================================

export async function uploadFile(sessionId: string, file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<FileUploadResponse>(`/translation/sessions/${sessionId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function downloadTranslation(sessionId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/translation/sessions/${sessionId}/download`, {
    responseType: 'blob',
  });
  return data;
}

// ============================================
// 번역 실행
// ============================================

export async function startTranslation(sessionId: string, sourceText: string): Promise<TranslationProgressResponse> {
  const { data } = await apiClient.post<TranslationProgressResponse>(`/translation/sessions/${sessionId}/start`, { sourceText });
  return data;
}

export async function translateAll(sessionId: string, templateId: string): Promise<void> {
  await apiClient.post(`/translation/sessions/${sessionId}/translate`, { templateId });
}

export async function getProgress(sessionId: string): Promise<TranslationProgressResponse> {
  const { data } = await apiClient.get<TranslationProgressResponse>(`/translation/sessions/${sessionId}/progress`);
  return data;
}

export async function getPartialTranslation(sessionId: string): Promise<string> {
  const { data } = await apiClient.get<{ translatedText: string }>(`/translation/sessions/${sessionId}/partial`);
  return data.translatedText;
}

export async function retryChunk(chunkId: string, templateId: string): Promise<TranslationChunk> {
  const { data } = await apiClient.post<TranslationChunk>(`/translation/chunks/${chunkId}/retry`, { templateId });
  return data;
}

export async function translateSingleChunk(chunkId: string, templateId: string): Promise<TranslationChunk> {
  const { data } = await apiClient.post<TranslationChunk>(`/translation/chunks/${chunkId}/translate`, { templateId });
  return data;
}
