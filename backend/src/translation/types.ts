import { z } from 'zod';

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
// OpenAI 호환 타입 정의
// ============================================

export const OpenAIRoleSchema = z.enum(['system', 'user', 'assistant']);

export type OpenAIRole = z.infer<typeof OpenAIRoleSchema>;

export interface OpenAIMessage {
  role: OpenAIRole;
  content: string;
}

export const OpenAIMessageSchema = z.object({
  role: OpenAIRoleSchema,
  content: z.string(),
});

// Chat Completion 요청
export interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(OpenAIMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
});

// Chat Completion 응답
export interface ChatCompletionChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

// ============================================
// ChatMessage <-> OpenAI 변환 유틸
// ============================================

const roleMapping: Record<ChatMessageRole, OpenAIRole> = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  MODEL: 'assistant', // MODEL은 assistant로 매핑
  ALTERNATIVE: 'assistant', // ALTERNATIVE도 assistant로 매핑
};

const reverseRoleMapping: Record<OpenAIRole, ChatMessageRole> = {
  system: 'SYSTEM',
  user: 'USER',
  assistant: 'ASSISTANT',
};

export function chatMessageToOpenAI(message: ChatMessage): OpenAIMessage {
  return {
    role: roleMapping[message.role],
    content: message.content,
  };
}

export function openAIToChatMessage(message: OpenAIMessage): ChatMessage {
  return {
    role: reverseRoleMapping[message.role],
    content: message.content,
  };
}

export function chatMessagesToOpenAI(messages: ChatMessage[]): OpenAIMessage[] {
  return messages.map(chatMessageToOpenAI);
}

export function openAIToChatMessages(messages: OpenAIMessage[]): ChatMessage[] {
  return messages.map(openAIToChatMessage);
}

