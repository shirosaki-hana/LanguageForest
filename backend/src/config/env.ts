import dotenv from 'dotenv';
import { z } from 'zod';
import ms from 'ms';
import path from 'path';
import { fileURLToPath } from 'url';
//------------------------------------------------------------------------------//

// 경로 계산
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const projectRoot = path.resolve(backendRoot, '..');

dotenv.config({ path: path.resolve(backendRoot, '.env'), quiet: true });
dotenv.config({ path: path.resolve(projectRoot, '.env'), quiet: true });

// ms 라이브러리 형식의 시간 문자열을 검증하는 Zod 스키마
const msStringSchema = z
  .string()
  .refine(
    val => {
      try {
        const result = ms(val as ms.StringValue);
        return typeof result === 'number' && !isNaN(result);
      } catch {
        return false;
      }
    },
    { message: 'Invalid time format (e.g., "24h", "10s", "7d")' }
  )
  .transform(val => val as ms.StringValue);

// Gemini Safety Setting 스키마
const GeminiHarmCategorySchema = z.enum([
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_CIVIC_INTEGRITY',
]);

const GeminiThresholdSchema = z.enum(['BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_ONLY_HIGH']);

const GeminiSafetySettingSchema = z.object({
  category: GeminiHarmCategorySchema,
  threshold: GeminiThresholdSchema,
});

// 기본 Safety Settings (모든 카테고리 BLOCK_NONE)
const DEFAULT_SAFETY_SETTINGS: z.infer<typeof GeminiSafetySettingSchema>[] = [
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
];

// 환경 변수 Zod 스키마
const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().min(1).max(65535).default(4001),
  NODE_ENV: z.enum(['production', 'development']).default('production'),
  REQUEST_BODY_LIMIT: z.string().default('10mb'),
  FRONTEND_URL: z.url().default('http://127.0.0.1'),
  DATABASE_URL_SQLITE: z.string().default('file:./prisma/languageforest.db'),
  RATELIMIT_MAX: z.coerce.number().positive().default(100),
  RATELIMIT_WINDOWMS: msStringSchema.default('10s'),

  // Gemini Safety Settings (API 키는 DB에서 관리)
  GEMINI_SAFETY_SETTINGS: z
    .string()
    .default(JSON.stringify(DEFAULT_SAFETY_SETTINGS))
    .transform(val => {
      try {
        return z.array(GeminiSafetySettingSchema).parse(JSON.parse(val));
      } catch {
        return DEFAULT_SAFETY_SETTINGS;
      }
    }),
});

// 출력
export const env = envSchema.parse(process.env);
export type Environment = z.infer<typeof envSchema>;

// Gemini 타입 export
export type GeminiHarmCategory = z.infer<typeof GeminiHarmCategorySchema>;
export type GeminiThreshold = z.infer<typeof GeminiThresholdSchema>;
export type GeminiSafetySetting = z.infer<typeof GeminiSafetySettingSchema>;

// 유틸리티 함수
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
