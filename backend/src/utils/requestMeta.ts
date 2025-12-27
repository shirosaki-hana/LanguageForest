import type { FastifyRequest } from 'fastify';

/**
 * 감사 로그용 요청 메타데이터
 */
export interface RequestMeta {
  ip: string;
  userAgent: string | null;
}

/**
 * Fastify 요청에서 감사 로그용 메타데이터 추출
 * - IP: x-forwarded-for 헤더 우선 (프록시/리버스 프록시 지원)
 * - User-Agent: 클라이언트 브라우저/앱 정보
 */
export function getRequestMeta(request: FastifyRequest): RequestMeta {
  // x-forwarded-for 헤더에서 첫 번째 IP 추출 (프록시 체인의 원본 IP)
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : Array.isArray(forwarded) ? forwarded[0] : null;

  return {
    ip: forwardedIp || request.ip || 'unknown',
    userAgent: (request.headers['user-agent'] as string) || null,
  };
}
