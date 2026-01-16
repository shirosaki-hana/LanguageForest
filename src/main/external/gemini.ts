import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import { logger } from '../utils/log';
import { getModelById, type ThinkingConfig } from '../config/models';
import { db } from '../database/index';

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

/**
 * thinkingConfig 스키마 (Gemini API용)
 */
export const GeminiThinkingConfigSchema = z.union([
  z.object({ thinkingBudget: z.number().int().min(0) }),
  z.object({ thinkingLevel: z.enum(['minimal', 'low', 'medium', 'high']) }),
]);
export type GeminiThinkingConfig = z.infer<typeof GeminiThinkingConfigSchema>;

export const GeminiGenerationConfigSchema = z.object({
  maxOutputTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  presencePenalty: z.number().nullable().optional(),
  frequencyPenalty: z.number().nullable().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  thinkingConfig: GeminiThinkingConfigSchema.optional(),
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
export type GeminiSafetySetting = z.infer<typeof GeminiSafetySettingSchema>;

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
// 기본 Safety Settings (모든 카테고리 BLOCK_NONE)
// ============================================

const DEFAULT_SAFETY_SETTINGS: GeminiSafetySetting[] = [
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
];

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
    if (!config.apiKey) {
      throw new GeminiAPIError('API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.', 401, 'API_KEY_NOT_SET');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
    this.defaultGenerationConfig = config.defaultGenerationConfig ?? {
      maxOutputTokens: 32000,
      temperature: 1.2,
    };
    this.safetySettings = config.safetySettings ?? DEFAULT_SAFETY_SETTINGS;
  }

  get modelName(): string {
    return this.model;
  }

  /**
   * 모델의 thinkingConfig를 Gemini API 형식으로 변환
   */
  private buildThinkingConfig(config: ThinkingConfig): GeminiThinkingConfig {
    if (config.type === 'budget') {
      return { thinkingBudget: config.budget };
    } else {
      return { thinkingLevel: config.level };
    }
  }

  /**
   * Gemini API 호출
   */
  async generateContent(request: GeminiRequest): Promise<GeminiResponse> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const url = `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;
    const urlWithoutKey = `${GEMINI_API_BASE}/${this.model}:generateContent`;

    // 모델 정보에서 thinkingConfig 가져오기
    const modelInfo = getModelById(this.model);
    const thinkingConfig = modelInfo?.thinkingConfig ? this.buildThinkingConfig(modelInfo.thinkingConfig) : undefined;

    // 요청 병합 (safetySettings, generationConfig 기본값 적용)
    const mergedRequest: GeminiRequest = {
      ...request,
      generationConfig: {
        ...this.defaultGenerationConfig,
        ...request.generationConfig,
        // 모델별 thinkingConfig 자동 적용
        ...(thinkingConfig && { thinkingConfig }),
      },
      safetySettings: request.safetySettings ?? this.safetySettings,
    };

    // 요청 검증
    const validatedRequest = GeminiRequestSchema.parse(mergedRequest);

    // 요청 로깅
    logger.info('external_api', 'Gemini API request started', {
      requestId,
      provider: 'gemini',
      model: this.model,
      endpoint: urlWithoutKey,
      method: 'POST',
      request: {
        contentsLength: validatedRequest.contents.length,
        contents: validatedRequest.contents,
        generationConfig: validatedRequest.generationConfig,
        safetySettings: validatedRequest.safetySettings,
        systemInstruction: validatedRequest.systemInstruction,
      },
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await axios.post<GeminiResponse>(url, validatedRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2분 타임아웃
      });

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // 응답 검증
      const validatedResponse = GeminiResponseSchema.parse(response.data);

      // 성공 응답 로깅
      logger.info('external_api', 'Gemini API request successful', {
        requestId,
        provider: 'gemini',
        model: this.model,
        endpoint: urlWithoutKey,
        method: 'POST',
        httpStatus: response.status,
        httpStatusText: response.statusText,
        durationMs,
        response: {
          modelVersion: validatedResponse.modelVersion,
          responseId: validatedResponse.responseId,
          candidatesCount: validatedResponse.candidates.length,
          candidates: validatedResponse.candidates,
          finishReason: validatedResponse.candidates[0]?.finishReason,
        },
        usage: {
          promptTokenCount: validatedResponse.usageMetadata.promptTokenCount,
          candidatesTokenCount: validatedResponse.usageMetadata.candidatesTokenCount,
          totalTokenCount: validatedResponse.usageMetadata.totalTokenCount,
          promptTokensDetails: validatedResponse.usageMetadata.promptTokensDetails,
        },
        responseHeaders: {
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length'],
        },
        timestamp: new Date().toISOString(),
      });

      return validatedResponse;
    } catch (error) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      if (error instanceof AxiosError) {
        const errorData = error.response?.data;

        // Gemini API 에러 응답 파싱 시도
        const parsed = GeminiErrorResponseSchema.safeParse(errorData);

        // 에러 로깅
        logger.error('external_api', 'Gemini API request failed', {
          requestId,
          provider: 'gemini',
          model: this.model,
          endpoint: urlWithoutKey,
          method: 'POST',
          durationMs,
          error: {
            type: 'AxiosError',
            code: error.code,
            message: error.message,
            httpStatus: error.response?.status,
            httpStatusText: error.response?.statusText,
            responseData: errorData,
            parsedError: parsed.success ? parsed.data.error : null,
          },
          request: {
            contentsLength: validatedRequest.contents.length,
            generationConfig: validatedRequest.generationConfig,
          },
          timestamp: new Date().toISOString(),
        });

        if (parsed.success) {
          throw new GeminiAPIError(parsed.data.error.message, parsed.data.error.code, parsed.data.error.status);
        }

        // 일반 HTTP 에러
        throw new GeminiAPIError(error.message, error.response?.status ?? 500, 'UNKNOWN_ERROR');
      }

      // Zod 검증 에러 등
      logger.error('external_api', 'Gemini API request failed (non-HTTP error)', {
        requestId,
        provider: 'gemini',
        model: this.model,
        endpoint: urlWithoutKey,
        method: 'POST',
        durationMs,
        error: {
          type: error instanceof Error ? error.constructor.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        request: {
          contentsLength: validatedRequest.contents.length,
          generationConfig: validatedRequest.generationConfig,
        },
        timestamp: new Date().toISOString(),
      });

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

/**
 * DB에서 API 키 가져오기
 */
async function getApiKeyFromDB(): Promise<string | null> {
  const settings = await db.selectFrom('app_settings').select('geminiApiKey').executeTakeFirst();
  return settings?.geminiApiKey ?? null;
}

/**
 * GeminiClient 싱글톤 가져오기 (비동기)
 */
export async function getGeminiClientAsync(config?: GeminiClientConfig): Promise<GeminiClient> {
  if (!defaultClient) {
    const dbApiKey = await getApiKeyFromDB();
    const apiKey = config?.apiKey ?? dbApiKey;

    if (!apiKey) {
      throw new GeminiAPIError('API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.', 401, 'API_KEY_NOT_SET');
    }

    defaultClient = new GeminiClient({ ...config, apiKey });
  }
  return defaultClient;
}

/**
 * GeminiClient 싱글톤 가져오기 (동기)
 */
export function getGeminiClient(config?: GeminiClientConfig): GeminiClient {
  if (!defaultClient) {
    defaultClient = new GeminiClient(config);
  }
  return defaultClient;
}

export function setGeminiClient(client: GeminiClient): void {
  defaultClient = client;
}

/**
 * GeminiClient 싱글톤 리셋 (API 키 변경 시 호출)
 */
export function resetGeminiClient(): void {
  defaultClient = null;
}
