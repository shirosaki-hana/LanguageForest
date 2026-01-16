/**
 * 데이터베이스 유틸리티 함수들
 */
import { randomBytes } from 'node:crypto';

//------------------------------------------------------------------------------
// CUID Generator
//------------------------------------------------------------------------------

/**
 * CUID(Collision-resistant Unique IDentifier) 생성
 *
 * 형식: c + timestamp(8) + random(16) = 25자
 */
export function generateCuid(): string {
  const timestamp = Date.now().toString(36).slice(-8).padStart(8, '0');
  const random = randomBytes(12).toString('base64url').slice(0, 16);
  return `c${timestamp}${random}`;
}

//------------------------------------------------------------------------------
// Date Utils
//------------------------------------------------------------------------------

/**
 * 현재 시간을 ISO 문자열로 반환 (SQLite 저장용)
 */
export function nowISOString(): string {
  return new Date().toISOString();
}

/**
 * ISO 문자열을 Date 객체로 변환
 */
export function parseISOString(isoString: string): Date {
  return new Date(isoString);
}
