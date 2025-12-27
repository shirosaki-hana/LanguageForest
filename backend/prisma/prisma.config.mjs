// Prisma CLI에서 직접 실행하는 설정 파일입니다.
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

// .env 파일 로드 (backend 폴더 또는 프로젝트 루트에서)
dotenv.config({ path: path.resolve(backendRoot, '.env'), quiet: true });
dotenv.config({ path: path.resolve(backendRoot, '../.env'), quiet: true });

// 환경변수에서 DB 경로 추출 (file: 접두어 제거 후 절대 경로로 변환)
const dbUrlFromEnv = process.env.DATABASE_URL_SQLITE || 'file:./prisma/videoforest.db';
const dbRelativePath = dbUrlFromEnv.replace(/^file:/, '');
const dbPath = path.resolve(backendRoot, dbRelativePath);
const dbUrl = `file:${dbPath}`;

export default defineConfig({
  schema: path.resolve(__dirname, 'schema.prisma'),
  datasource: {
    url: dbUrl,
  },
  migrate: {
    development: {
      url: dbUrl,
    },
  },
});
