import { apiClient } from './client';
import type {
  GetLogsRequest,
  GetLogsResponse,
  LogStatsResponse,
  DeleteLogsRequest,
  DeleteLogsResponse,
  LogSettings,
  GetLogSettingsResponse,
  UpdateLogSettingsResponse,
} from '@languageforest/sharedtype';
import {
  GetLogsResponseSchema,
  LogStatsResponseSchema,
  DeleteLogsResponseSchema,
  GetLogSettingsResponseSchema,
  UpdateLogSettingsResponseSchema,
} from '@languageforest/sharedtype';
import { z } from 'zod';

// 타입 가드를 위한 검증 헬퍼
function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

// 로그 목록 조회
export async function getLogs(params?: Partial<GetLogsRequest>): Promise<GetLogsResponse> {
  const response = await apiClient.get('/logs', { params });
  return validateResponse(GetLogsResponseSchema, response.data);
}

// 로그 통계 조회
export async function getLogStats(): Promise<LogStatsResponse> {
  const response = await apiClient.get('/logs/stats');
  return validateResponse(LogStatsResponseSchema, response.data);
}

// 로그 삭제
export async function deleteLogs(data: DeleteLogsRequest): Promise<DeleteLogsResponse> {
  const response = await apiClient.delete('/logs', { data });
  return validateResponse(DeleteLogsResponseSchema, response.data);
}

// 로그 설정 조회
export async function getLogSettings(): Promise<GetLogSettingsResponse> {
  const response = await apiClient.get('/logs/settings');
  return validateResponse(GetLogSettingsResponseSchema, response.data);
}

// 로그 설정 업데이트
export async function updateLogSettings(settings: Partial<LogSettings>): Promise<UpdateLogSettingsResponse> {
  const response = await apiClient.put('/logs/settings', settings);
  return validateResponse(UpdateLogSettingsResponseSchema, response.data);
}

// 수동 로그 정리
export async function cleanupLogs(): Promise<DeleteLogsResponse> {
  const response = await apiClient.post('/logs/cleanup');
  return validateResponse(DeleteLogsResponseSchema, response.data);
}
