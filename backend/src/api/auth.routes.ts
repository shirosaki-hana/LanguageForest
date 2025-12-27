import { type FastifyPluginAsync } from 'fastify';
import {
  AuthStatusResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  SetupPasswordRequestSchema,
  SetupPasswordResponseSchema,
} from '@languageforest/types';
import { env } from '../config/index.js';
import { authenticateByToken, getCookieOptions, isPasswordSetup, login, logoutByToken, setupPassword } from '../services/auth.js';
import { logger, getRequestMeta } from '../utils/index.js';
//------------------------------------------------------------------------------//
export const authRoutes: FastifyPluginAsync = async fastify => {
  // 상태 조회: 최초 설정 여부, 인증 여부
  fastify.get('/status', async (request, reply) => {
    const token = request.cookies?.[env.SESSION_COOKIE];
    const [setup, authed] = await Promise.all([isPasswordSetup(), authenticateByToken(token)]);
    const body = { isSetup: setup, isAuthenticated: authed };
    return reply.send(AuthStatusResponseSchema.parse(body));
  });

  // 최초 비밀번호 설정
  fastify.post('/setup', async (request, reply) => {
    const { password } = SetupPasswordRequestSchema.parse(request.body);
    await setupPassword({ password });

    const meta = getRequestMeta(request);
    logger.info('auth', 'Password setup completed', meta);

    return reply.send(SetupPasswordResponseSchema.parse({ success: true }));
  });

  // 로그인: 세션 발급 + 쿠키 설정
  fastify.post('/login', async (request, reply) => {
    const { password } = LoginRequestSchema.parse(request.body);
    const meta = getRequestMeta(request);

    try {
      const token = await login({ password });
      reply.setCookie(env.SESSION_COOKIE, token, getCookieOptions());

      logger.info('auth', 'Login successful', meta);

      return reply.send(LoginResponseSchema.parse({ success: true }));
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;

      // Invalid password
      if (statusCode === 401) {
        logger.warn('auth', 'Login failed: invalid password', meta);
      }

      throw error;
    }
  });

  // 로그아웃: 세션 제거 + 쿠키 삭제
  fastify.post('/logout', async (request, reply) => {
    const token = request.cookies?.[env.SESSION_COOKIE];
    if (token) {
      await logoutByToken(token);
    }
    reply.clearCookie(env.SESSION_COOKIE, getCookieOptions());

    const meta = getRequestMeta(request);
    logger.info('auth', 'Logout', meta);

    return reply.send(LogoutResponseSchema.parse({ success: true }));
  });
};
