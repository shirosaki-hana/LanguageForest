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
} from '@languageforest/sharedtype';

// ============================================
// LLM Provider
// ============================================

export async function getProvider(): Promise<GetProviderResponse> {
  const { data } = await apiClient.get<GetProviderResponse>('/translation/provider');
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

// ============================================
// 번역 실행
// ============================================

export async function startTranslation(sessionId: string, sourceText: string): Promise<TranslationProgressResponse> {
  const { data } = await apiClient.post<TranslationProgressResponse>(`/translation/sessions/${sessionId}/start`, { sourceText });
  return data;
}

export async function translateAll(sessionId: string): Promise<void> {
  await apiClient.post(`/translation/sessions/${sessionId}/translate`);
}

export async function getProgress(sessionId: string): Promise<TranslationProgressResponse> {
  const { data } = await apiClient.get<TranslationProgressResponse>(`/translation/sessions/${sessionId}/progress`);
  return data;
}

export async function getPartialTranslation(sessionId: string): Promise<string> {
  const { data } = await apiClient.get<{ translatedText: string }>(`/translation/sessions/${sessionId}/partial`);
  return data.translatedText;
}

export async function retryChunk(chunkId: string): Promise<TranslationChunk> {
  const { data } = await apiClient.post<TranslationChunk>(`/translation/chunks/${chunkId}/retry`);
  return data;
}
