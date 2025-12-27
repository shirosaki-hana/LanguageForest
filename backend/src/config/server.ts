import path from 'path';
import ms from 'ms';
import { env, isDevelopment, isProduction } from './env.js';
import { projectRoot, logger } from '../utils/index.js';
import type { LogLevel } from '@languageforest/sharedtype';
//------------------------------------------------------------------------------//
// Pino 레벨 -> 프로젝트 레벨 매핑
const pinoLevelToLogLevel = (level: number): LogLevel => {
  if (level >= 50) {
    return 'ERROR';
  } // error, fatal
  if (level >= 40) {
    return 'WARN';
  } // warn
  if (level >= 30) {
    return 'INFO';
  } // info
  return 'DEBUG'; // debug, trace
};

// Fastify 커스텀 로거 스트림 (콘솔 출력 없이 DB에만 저장)
const fastifyLoggerStream = {
  write(msg: string) {
    try {
      const obj = JSON.parse(msg);
      const level = pinoLevelToLogLevel(obj.level);
      const message = obj.msg || 'Fastify log';
      // 불필요한 필드 제거 후 메타데이터로 저장
      const excludeKeys = new Set(['level', 'msg', 'time', 'pid', 'hostname']);
      const meta = Object.fromEntries(Object.entries(obj).filter(([key]) => !excludeKeys.has(key)));
      logger[level.toLowerCase() as Lowercase<LogLevel>]('server', message, Object.keys(meta).length > 0 ? meta : undefined);
    } catch {
      logger.info('server', msg.trim());
    }
  },
};

export const fastifyConfig = {
  bodyLimit: parseInt(env.REQUEST_BODY_LIMIT.replace('mb', '')) * 1024 * 1024,
  logger: {
    level: isDevelopment ? 'debug' : 'info',
    stream: fastifyLoggerStream,
  },
};

export const corsConfig = {
  origin: isDevelopment ? true : env.FRONTEND_URL,
  credentials: true,
};

export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 비디오 스트리밍을 위한 설정 (blob URL, data URL 허용)
      mediaSrc: ["'self'", 'blob:', 'data:'],
      // HLS 세그먼트 fetch를 위한 설정
      connectSrc: ["'self'", 'blob:', 'data:'],
      // 스크립트 소스 (Vidstack 플레이어)
      scriptSrc: ["'self'", "'unsafe-inline'"],
      // 스타일 소스
      styleSrc: ["'self'", "'unsafe-inline'"],
      // 이미지 소스 (썸네일 등)
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      // 웹 워커 (Vidstack이 사용할 수 있음)
      workerSrc: ["'self'", 'blob:'],
      // 폰트
      fontSrc: ["'self'", 'data:'],
      // 객체 임베드 비활성화
      objectSrc: ["'none'"],
      // base 태그 제한
      baseUri: ["'self'"],
      // form action 제한
      formAction: ["'self'"],
      // frame ancestors 제한 (clickjacking 방지)
      frameAncestors: ["'self'"],
      // 업그레이드 안전하지 않은 요청 (프로덕션에서만)
      ...(isProduction && { upgradeInsecureRequests: [] }),
    },
  },
  crossOriginEmbedderPolicy: false,
  // Cross-Origin-Resource-Policy 헤더 설정
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
};

export const rateLimitConfig = {
  max: env.RATELIMIT_MAX,
  timeWindow: ms(env.RATELIMIT_WINDOWMS),
};

export const staticFilesConfig = {
  root: path.join(projectRoot, 'frontend/dist'),
  prefix: '/',
  cacheControl: isProduction,
  etag: true,
  lastModified: true,
  maxAge: isProduction ? ms('1d') : 0,
};
