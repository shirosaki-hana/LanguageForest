import { z } from 'zod';

// ============================================
// Gemini 모델 정의
// ============================================

/**
 * Thinking 설정 타입
 * - budget: Gemini 2.5 이하에서 사용 (thinkingBudget: 0 = 사고 비활성화)
 * - level: Gemini 3.x에서 사용 (thinkingLevel: 'minimal' | 'low' | 'medium' | 'high')
 */
export const ThinkingConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('budget'),
    budget: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('level'),
    level: z.enum(['minimal', 'low', 'medium', 'high']),
  }),
]);
export type ThinkingConfig = z.infer<typeof ThinkingConfigSchema>;

/**
 * Gemini 모델 정보 스키마
 */
export const GeminiModelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxOutputTokens: z.number().int().positive(),
  defaultTemperature: z.number().min(0).max(2),
  contextWindow: z.number().int().positive(),
  isExperimental: z.boolean().default(false),
  thinkingConfig: ThinkingConfigSchema.optional(),
});
export type GeminiModelInfo = z.infer<typeof GeminiModelInfoSchema>;

/**
 * 사용 가능한 Gemini 모델 목록
 */
export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    maxOutputTokens: 65536,
    defaultTemperature: 1.0,
    contextWindow: 1048576,
    isExperimental: false,
    thinkingConfig: { type: 'level', level: 'minimal' },
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    maxOutputTokens: 65536,
    defaultTemperature: 1.0,
    contextWindow: 1048576,
    isExperimental: false,
    thinkingConfig: { type: 'budget', budget: 0 },
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    maxOutputTokens: 65536,
    defaultTemperature: 1.0,
    contextWindow: 1048576,
    isExperimental: false,
    thinkingConfig: { type: 'budget', budget: 0 },
  },
];

/**
 * 기본 모델 ID
 */
export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

/**
 * 모델 ID로 모델 정보 조회
 */
export function getModelById(modelId: string): GeminiModelInfo | undefined {
  return GEMINI_MODELS.find(m => m.id === modelId);
}

/**
 * 모델 ID 유효성 검증
 */
export function isValidModelId(modelId: string): boolean {
  return GEMINI_MODELS.some(m => m.id === modelId);
}

// ============================================
// GenerationConfig 기본값
// ============================================

/**
 * GenerationConfig 스키마 (번역 설정용)
 */
export const GenerationConfigSchema = z.object({
  temperature: z.number().min(0).max(2).default(1.0),
  maxOutputTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

/**
 * 기본 GenerationConfig
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 1.0,
  maxOutputTokens: 32000,
};

/**
 * GenerationConfig 병합 (사용자 설정 + 기본값)
 */
export function mergeGenerationConfig(userConfig?: Partial<GenerationConfig>, modelId?: string): GenerationConfig {
  const model = modelId ? getModelById(modelId) : undefined;

  return {
    ...DEFAULT_GENERATION_CONFIG,
    temperature: model?.defaultTemperature ?? DEFAULT_GENERATION_CONFIG.temperature,
    ...userConfig,
  };
}
