import { z } from 'zod';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenAIMessage,
} from '../translation/types.js';
import { ChatCompletionRequestSchema } from '../translation/types.js';

// ============================================
// LLM Provider 인터페이스
// ============================================

export interface LLMProvider {
  name: string;
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
}

// ============================================
// LLM 클라이언트 설정
// ============================================

export interface LLMClientConfig {
  provider: 'openai' | 'mock';
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

const defaultConfig: LLMClientConfig = {
  provider: 'mock',
  defaultModel: 'gpt-4o-mini',
};

// ============================================
// Mock Provider (개발/테스트용)
// ============================================

function generateMockId(): string {
  return `chatcmpl-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function estimateTokens(text: string): number {
  // 간단한 토큰 추정 (영어: ~4자당 1토큰, 한글: ~2자당 1토큰)
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars / 2 + otherChars / 4);
}

function generateMockTranslation(messages: OpenAIMessage[]): string {
  // 마지막 user 메시지를 찾아서 Mock 번역 생성
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  
  if (!lastUserMessage) {
    return '[Mock Translation] No user message found.';
  }

  const content = lastUserMessage.content;
  
  // 간단한 Mock 번역 로직
  // 실제로는 그냥 "[번역됨]" 태그를 붙여서 반환
  return `[MOCK TRANSLATED]\n${content}\n[/MOCK TRANSLATED]`;
}

export class MockLLMProvider implements LLMProvider {
  name = 'mock';
  
  private delay: number;
  private failureRate: number;

  constructor(options: { delay?: number; failureRate?: number } = {}) {
    this.delay = options.delay ?? 100; // 기본 100ms 딜레이
    this.failureRate = options.failureRate ?? 0; // 기본 실패율 0%
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // 딜레이 시뮬레이션
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // 실패 시뮬레이션
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new Error('Mock API failure (simulated)');
    }

    const content = generateMockTranslation(request.messages);
    
    // 토큰 계산
    const promptTokens = request.messages.reduce(
      (acc, m) => acc + estimateTokens(m.content),
      0
    );
    const completionTokens = estimateTokens(content);

    return {
      id: generateMockId(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }
}

// ============================================
// OpenAI Provider (실제 API 호출용 - 추후 구현)
// ============================================

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  
  private apiKey: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<ChatCompletionResponse>;
  }
}

// ============================================
// LLM 클라이언트 (Provider 추상화)
// ============================================

export class LLMClient {
  private provider: LLMProvider;
  private defaultModel: string;

  constructor(config: LLMClientConfig = defaultConfig) {
    this.defaultModel = config.defaultModel ?? 'gpt-4o-mini';

    if (config.provider === 'openai') {
      if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      this.provider = new OpenAIProvider({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });
    } else {
      this.provider = new MockLLMProvider();
    }
  }

  get providerName(): string {
    return this.provider.name;
  }

  async chatCompletion(
    request: Omit<ChatCompletionRequest, 'model'> & { model?: string }
  ): Promise<ChatCompletionResponse> {
    const validatedRequest = ChatCompletionRequestSchema.parse({
      ...request,
      model: request.model ?? this.defaultModel,
    });

    return this.provider.chatCompletion(validatedRequest);
  }
}

// ============================================
// 기본 클라이언트 인스턴스 (싱글톤)
// ============================================

let defaultClient: LLMClient | null = null;

export function getLLMClient(config?: LLMClientConfig): LLMClient {
  if (!defaultClient) {
    defaultClient = new LLMClient(config);
  }
  return defaultClient;
}

export function setLLMClient(client: LLMClient): void {
  defaultClient = client;
}

