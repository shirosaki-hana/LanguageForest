import { randomBytes } from 'crypto';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import type { CookieSerializeOptions } from '@fastify/cookie';
import ms from 'ms';
import { database } from '../database/index.js';
import { env, isProduction } from '../config/index.js';
import type { LoginRequest, SetupPasswordRequest } from '@templateforest/types';
import { LoginRequestSchema, SetupPasswordRequestSchema } from '@templateforest/types';
//------------------------------------------------------------------------------//
const SESSION_TTL_MS = ms(env.SESSION_TTL);

// 세션 토큰 메모리 캐시: token -> expiresAt(ms)
// 단일 사용자 VOD 특성상 메모리 캐시만으로도 큰 이점이 있음
const sessionCache = new Map<string, number>();

/**
 * 안전한 세션 토큰 생성 (96자 hex 문자열)
 */
function generateToken(): string {
  return randomBytes(48).toString('hex');
}

/**
 * 비밀번호가 설정되어 있는지 확인
 */
export async function isPasswordSetup(): Promise<boolean> {
  const auth = await database.auth.findFirst();
  return Boolean(auth?.passwordHash);
}

/**
 * 최초 비밀번호 설정
 * @throws 이미 설정된 경우 statusCode 400 에러
 */
export async function setupPassword(body: unknown): Promise<void> {
  const { password } = SetupPasswordRequestSchema.parse(body) satisfies SetupPasswordRequest;

  const exists = await database.auth.findFirst();
  if (exists?.passwordHash) {
    throw Object.assign(new Error('Already configured'), { statusCode: 400 });
  }

  const passwordHash = await argon2Hash(password);

  if (exists) {
    await database.auth.update({ where: { id: exists.id }, data: { passwordHash } });
  } else {
    await database.auth.create({ data: { id: 1, passwordHash } });
  }
}

/**
 * 로그인 처리 및 세션 토큰 발급
 * @returns 세션 토큰
 * @throws 비밀번호 미설정 시 statusCode 400, 인증 실패 시 statusCode 401 에러
 */
export async function login(body: unknown): Promise<string> {
  const { password } = LoginRequestSchema.parse(body) satisfies LoginRequest;

  const record = await database.auth.findFirst();
  if (!record?.passwordHash) {
    throw Object.assign(new Error('Setup required'), { statusCode: 400 });
  }

  const isValid = await argon2Verify(record.passwordHash, password);
  if (!isValid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const token = generateToken();
  const ttlMs = Math.max(60_000, Math.floor(SESSION_TTL_MS));
  await database.session.create({ data: { token, ttl: ttlMs } });

  return token;
}

/**
 * 세션 토큰으로 로그아웃 처리
 */
export async function logoutByToken(token: string): Promise<void> {
  await database.session.deleteMany({ where: { token } });
  sessionCache.delete(token);
}

/**
 * 세션 토큰으로 인증 확인
 * @param token 세션 토큰 (선택적)
 * @returns 유효한 세션 여부
 */
export async function authenticateByToken(token?: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  const now = Date.now();
  const cachedExpiry = sessionCache.get(token);
  if (cachedExpiry) {
    if (cachedExpiry > now) {
      return true;
    }
    // 캐시 만료
    sessionCache.delete(token);
  }

  const session = await database.session.findUnique({ where: { token } });
  if (!session) {
    return false;
  }

  const expiresAtMs = session.createdAt.getTime() + session.ttl;
  if (expiresAtMs <= now) {
    await database.session.delete({ where: { token } }).catch(() => undefined);
    return false;
  }

  // 유효한 세션을 캐시 (만료 시각까지만)
  sessionCache.set(token, expiresAtMs);
  return true;
}

/**
 * 만료된 세션 정리
 * @returns 정리된 세션 개수
 */
export async function pruneExpiredSessions(): Promise<number> {
  const now = new Date();
  const sessions = await database.session.findMany();
  const expired = sessions.filter(s => s.createdAt.getTime() + s.ttl <= now.getTime());

  if (expired.length === 0) {
    return 0;
  }

  await database.session.deleteMany({ where: { id: { in: expired.map(s => s.id) } } });
  return expired.length;
}

/**
 * 세션 쿠키 옵션 반환
 */
export function getCookieOptions(): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
