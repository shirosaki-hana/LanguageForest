import { z } from 'zod';
import type { GeminiContent, GeminiSystemInstruction } from '../external/gemini';

// ============================================
// ChatMessage 타입 정의
// ============================================

export const ChatMessageRoleSchema = z.enum(['SYSTEM', 'USER', 'ASSISTANT', 'MODEL', 'ALTERNATIVE']);

export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export const ChatMessageSchema = z.object({
  role: ChatMessageRoleSchema,
  content: z.string(),
});

// ============================================
// Gemini 변환 결과 타입
// ============================================

export interface GeminiConvertedMessages {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
}

// ============================================
// ChatMessage <-> Gemini 변환 유틸
// ============================================

/**
 * ChatMessage를 Gemini 형식으로 변환
 */
export function chatMessagesToGemini(messages: ChatMessage[]): GeminiConvertedMessages {
  // SYSTEM 메시지 분리 (첫 번째만 사용)
  const systemMessage = messages.find(m => m.role === 'SYSTEM');
  const nonSystemMessages = messages.filter(m => m.role !== 'SYSTEM');

  // Gemini contents 생성
  const contents: GeminiContent[] = nonSystemMessages.map(m => ({
    role: m.role === 'USER' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  // 결과 반환
  const result: GeminiConvertedMessages = { contents };

  if (systemMessage) {
    result.systemInstruction = {
      parts: [{ text: systemMessage.content }],
    };
  }

  return result;
}

/**
 * Gemini 응답을 ChatMessage로 변환
 */
export function geminiResponseToChatMessage(text: string): ChatMessage {
  return {
    role: 'MODEL',
    content: text,
  };
}
