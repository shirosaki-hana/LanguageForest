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

// 환경 변수 Zod 스키마
const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().min(1).max(65535).default(4001),
  NODE_ENV: z.enum(['production', 'development']).default('production'),
  REQUEST_BODY_LIMIT: z.string().default('10mb'),
  FRONTEND_URL: z.url().default('http://127.0.0.1'),
  DATABASE_URL_SQLITE: z.string().default('file:./prisma/languageforest.db'),
  SESSION_COOKIE: z.string().default('session'),
  SESSION_TTL: msStringSchema.default('24h'),
  RATELIMIT_MAX: z.coerce.number().positive().default(100),
  RATELIMIT_WINDOWMS: msStringSchema.default('10s'),
});

// 출력
export const env = envSchema.parse(process.env);
export type Environment = z.infer<typeof envSchema>;

// 유틸리티 함수
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
