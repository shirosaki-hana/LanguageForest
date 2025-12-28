import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import apiRoutes from './api/index.js';
import { websocketRoutes } from './api/websocket.js';
import { console_log } from './utils/index.js';
import { env, fastifyConfig, helmetConfig, rateLimitConfig, corsConfig, staticFilesConfig } from './config/index.js';
import { checkDatabaseConnection, disconnectDatabase } from './database/index.js';
import { notFoundHandler, errorHandler } from './handlers/index.js';
import { initializeLogger } from './services/logs.js';
import { templateService } from './services/templateService.js';
import { console_error } from './utils/index.js';
//------------------------------------------------------------------------------//

// Fastify 서버 생성
async function createFastifyApp() {
  const fastify = Fastify(fastifyConfig);
  //서버 초기 설정
  await fastify.register(helmet, helmetConfig); // 1. 보안 헤더 설정
  await fastify.register(rateLimit, rateLimitConfig); // 2. Rate Limit 설정
  await fastify.register(compress); // 3. 압축 설정
  await fastify.register(cors, corsConfig); // 4. CORS 정책 설정
  await fastify.register(cookie); // 5. Cookie 설정
  await fastify.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 6. Multipart (파일 업로드, 50MB)
  await fastify.register(websocket); // 7. WebSocket 플러그인
  await fastify.register(apiRoutes, { prefix: '/api' }); // 7. API 라우트 등록
  await fastify.register(websocketRoutes, { prefix: '/api/translation' }); // 8. WebSocket 라우트
  await fastify.register(staticFiles, staticFilesConfig); // 9. 정적 파일 서빙
  //핸들러 등록
  fastify.setNotFoundHandler(notFoundHandler); // SPA fallback 및 404 핸들러
  fastify.setErrorHandler(errorHandler); // 전역 에러 핸들러

  return fastify;
}

// 서버 시작 함수
async function startServer(host: string, port: number) {
  //앱 초기 동작 (Fastify 생성 전)
  await checkDatabaseConnection(); // 1. 데이터베이스 커넥션 확인
  initializeLogger(); // 2. 로거 초기화 (Fastify 로거가 사용하므로 먼저 초기화)
  templateService.initialize(); // 3. 템플릿 서비스 초기화 (템플릿 없으면 예외 발생)
  console_log(`Loaded ${templateService.count()} prompt template(s)`);
  //Fastify 앱 생성
  const fastify = await createFastifyApp(); // 4. Fastify 앱 생성 (로거 스트림 사용)
  await fastify.listen({ port, host: host }); // 5. 서버 리스닝 시작

  console_log(`Server is running on http://${host}:${port}`);
  return fastify;
}

// Graceful shutdown 핸들러
async function gracefulShutdown(fastify: Awaited<ReturnType<typeof createFastifyApp>>) {
  try {
    await fastify.close(); // 1. Fastify 서버 종료
    await disconnectDatabase(); // 2. 데이터베이스 연결 해제
    process.exitCode = 0;
  } catch (error) {
    console_error(error);
    process.exitCode = 1;
  }
}

// 메인 엔트리 포인트
async function main() {
  try {
    const fastify = await startServer(env.HOST, env.PORT);
    process.on('SIGINT', () => {
      gracefulShutdown(fastify).catch(() => {}); // SIGINT로 인한 서버 종료
    });
    process.on('SIGTERM', () => {
      gracefulShutdown(fastify).catch(() => {}); // SIGTERM으로 인한 서버 종료
    });
  } catch (error) {
    console_error(error);
    process.exitCode = 1;
  }
}

// 서버 시작
main();
