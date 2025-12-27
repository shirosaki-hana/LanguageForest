import { apiClient } from './client';
import type {
  AuthStatusResponse,
  SetupPasswordRequest,
  SetupPasswordResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
} from '@languageforest/sharedtype';
import { AuthStatusResponseSchema, SetupPasswordResponseSchema, LoginResponseSchema, LogoutResponseSchema } from '@languageforest/sharedtype';
import { z } from 'zod';

// 타입 가드를 위한 검증 헬퍼
function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

// 인증 상태 조회
export async function checkAuthStatus(): Promise<AuthStatusResponse> {
  const response = await apiClient.get('/auth/status');
  return validateResponse(AuthStatusResponseSchema, response.data);
}

// 비밀번호 최초 설정
export async function setupPassword(data: SetupPasswordRequest): Promise<SetupPasswordResponse> {
  const response = await apiClient.post('/auth/setup', data);
  return validateResponse(SetupPasswordResponseSchema, response.data);
}

// 로그인
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post('/auth/login', data);
  return validateResponse(LoginResponseSchema, response.data);
}

// 로그아웃
export async function logout(): Promise<LogoutResponse> {
  const response = await apiClient.post('/auth/logout');
  return validateResponse(LogoutResponseSchema, response.data);
}
