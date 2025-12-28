import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import { env, type GeminiSafetySetting } from '../config/env.js';

// ============================================
// Gemini API 타입 정의 (Zod 스키마)
// ============================================

// --- 요청 타입 ---

export const GeminiPartSchema = z.object({
  text: z.string(),
});
export type GeminiPart = z.infer<typeof GeminiPartSchema>;

export const GeminiContentSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(GeminiPartSchema),
});
export type GeminiContent = z.infer<typeof GeminiContentSchema>;

export const GeminiGenerationConfigSchema = z.object({
  maxOutputTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  presencePenalty: z.number().nullable().optional(),
  frequencyPenalty: z.number().nullable().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
});
export type GeminiGenerationConfig = z.infer<typeof GeminiGenerationConfigSchema>;

export const GeminiSafetySettingSchema = z.object({
  category: z.enum([
    'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    'HARM_CATEGORY_HATE_SPEECH',
    'HARM_CATEGORY_HARASSMENT',
    'HARM_CATEGORY_DANGEROUS_CONTENT',
    'HARM_CATEGORY_CIVIC_INTEGRITY',
  ]),
  threshold: z.enum(['BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_ONLY_HIGH']),
});

export const GeminiSystemInstructionSchema = z.object({
  parts: z.array(GeminiPartSchema),
});
export type GeminiSystemInstruction = z.infer<typeof GeminiSystemInstructionSchema>;

export const GeminiRequestSchema = z.object({
  contents: z.array(GeminiContentSchema),
  generationConfig: GeminiGenerationConfigSchema.optional(),
  safetySettings: z.array(GeminiSafetySettingSchema).optional(),
  systemInstruction: GeminiSystemInstructionSchema.optional(),
});
export type GeminiRequest = z.infer<typeof GeminiRequestSchema>;

// --- 응답 타입 ---

export const GeminiCandidateContentSchema = z.object({
  parts: z.array(GeminiPartSchema),
  role: z.literal('model'),
});

export const GeminiCandidateSchema = z.object({
  content: GeminiCandidateContentSchema,
  finishReason: z.string(),
  index: z.number().int(),
});
export type GeminiCandidate = z.infer<typeof GeminiCandidateSchema>;

export const GeminiUsageMetadataSchema = z.object({
  promptTokenCount: z.number().int(),
  candidatesTokenCount: z.number().int(),
  totalTokenCount: z.number().int(),
  promptTokensDetails: z
    .array(
      z.object({
        modality: z.string(),
        tokenCount: z.number().int(),
      })
    )
    .optional(),
});
export type GeminiUsageMetadata = z.infer<typeof GeminiUsageMetadataSchema>;

export const GeminiResponseSchema = z.object({
  candidates: z.array(GeminiCandidateSchema),
  usageMetadata: GeminiUsageMetadataSchema,
  modelVersion: z.string(),
  responseId: z.string(),
});
export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

// 에러 응답 타입
export const GeminiErrorResponseSchema = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
    status: z.string(),
  }),
});
export type GeminiErrorResponse = z.infer<typeof GeminiErrorResponseSchema>;

// ============================================
// Gemini API 클라이언트
// ============================================

export interface GeminiClientConfig {
  apiKey?: string;
  model?: string;
  defaultGenerationConfig?: GeminiGenerationConfig;
  safetySettings?: GeminiSafetySetting[];
}

const DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultGenerationConfig: GeminiGenerationConfig;
  private readonly safetySettings: GeminiSafetySetting[];

  constructor(config: GeminiClientConfig = {}) {
    this.apiKey = config.apiKey ?? env.GEMINI_API_KEY;
    this.model = config.model ?? DEFAULT_MODEL;
    this.defaultGenerationConfig = config.defaultGenerationConfig ?? {
      maxOutputTokens: 32000,
      temperature: 1.2,
    };
    this.safetySettings = config.safetySettings ?? env.GEMINI_SAFETY_SETTINGS;
  }

  get modelName(): string {
    return this.model;
  }

  /**
   * Gemini API 호출
   */
  async generateContent(request: GeminiRequest): Promise<GeminiResponse> {
    const url = `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    // 요청 병합 (safetySettings, generationConfig 기본값 적용)
    const mergedRequest: GeminiRequest = {
      ...request,
      generationConfig: {
        ...this.defaultGenerationConfig,
        ...request.generationConfig,
      },
      safetySettings: request.safetySettings ?? this.safetySettings,
    };

    // 요청 검증
    const validatedRequest = GeminiRequestSchema.parse(mergedRequest);

    try {
      const response = await axios.post<GeminiResponse>(url, validatedRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2분 타임아웃
      });

      // 응답 검증
      return GeminiResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorData = error.response?.data;

        // Gemini API 에러 응답 파싱 시도
        const parsed = GeminiErrorResponseSchema.safeParse(errorData);
        if (parsed.success) {
          throw new GeminiAPIError(parsed.data.error.message, parsed.data.error.code, parsed.data.error.status);
        }

        // 일반 HTTP 에러
        throw new GeminiAPIError(error.message, error.response?.status ?? 500, 'UNKNOWN_ERROR');
      }

      // Zod 검증 에러 등
      throw error;
    }
  }

  /**
   * 텍스트 추출 헬퍼
   */
  extractText(response: GeminiResponse): string {
    return response.candidates[0]?.content.parts[0]?.text ?? '';
  }

  /**
   * 토큰 사용량 추출 헬퍼
   */
  extractUsage(response: GeminiResponse): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    return {
      promptTokens: response.usageMetadata.promptTokenCount,
      completionTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    };
  }
}

// ============================================
// 커스텀 에러 클래스
// ============================================

export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status: string
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

// ============================================
// 싱글톤 인스턴스
// ============================================

let defaultClient: GeminiClient | null = null;

export function getGeminiClient(config?: GeminiClientConfig): GeminiClient {
  if (!defaultClient) {
    defaultClient = new GeminiClient(config);
  }
  return defaultClient;
}

export function setGeminiClient(client: GeminiClient): void {
  defaultClient = client;
}
