import type {
  GetLogsRequest,
  GetLogsResponse,
  LogStatsResponse,
  DeleteLogsRequest,
  DeleteLogsResponse,
  LogSettings,
  GetLogSettingsResponse,
  UpdateLogSettingsResponse,
} from '@shared/types';
import {
  GetLogsResponseSchema,
  LogStatsResponseSchema,
  DeleteLogsResponseSchema,
  GetLogSettingsResponseSchema,
  UpdateLogSettingsResponseSchema,
} from '@shared/types';
import { z } from 'zod';

// 타입 가드를 위한 검증 헬퍼
function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

// 로그 목록 조회
export async function getLogs(params?: Partial<GetLogsRequest>): Promise<GetLogsResponse> {
  const response = await window.api.logs.get(params);
  return validateResponse(GetLogsResponseSchema, response);
}

// 로그 통계 조회
export async function getLogStats(): Promise<LogStatsResponse> {
  const response = await window.api.logs.getStats();
  return validateResponse(LogStatsResponseSchema, response);
}

// 로그 삭제
export async function deleteLogs(data: DeleteLogsRequest): Promise<DeleteLogsResponse> {
  const response = await window.api.logs.delete(data);
  return validateResponse(DeleteLogsResponseSchema, response);
}

// 로그 설정 조회
export async function getLogSettings(): Promise<GetLogSettingsResponse> {
  const response = await window.api.logs.getSettings();
  return validateResponse(GetLogSettingsResponseSchema, response);
}

// 로그 설정 업데이트
export async function updateLogSettings(settings: Partial<LogSettings>): Promise<UpdateLogSettingsResponse> {
  const response = await window.api.logs.updateSettings(settings);
  return validateResponse(UpdateLogSettingsResponseSchema, response);
}

// 수동 로그 정리
export async function cleanupLogs(): Promise<DeleteLogsResponse> {
  const response = await window.api.logs.cleanup();
  return validateResponse(DeleteLogsResponseSchema, response);
}
