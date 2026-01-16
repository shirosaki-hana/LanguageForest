import { db, generateCuid, nowISOString } from '../database/index.js';
import type { TranslationSession, TranslationChunk, TranslationConfig } from '../database/index.js';
import { GeminiClient, type GeminiGenerationConfig } from '../external/gemini.js';
import { buildPromptFromDB } from '../translation/promptBuilder.js';
import { splitIntoChunks } from '../translation/chunker.js';
import type { ChunkInfo } from '../translation/promptBuilder.js';
import { emitChunkStart, emitChunkProgress, emitSessionStatus, emitSessionComplete } from './translationEvents.js';
import { templateService } from './templateService.js';
import { logger } from '../utils/index.js';
import { DEFAULT_MODEL_ID } from '../config/models.js';

// ============================================
// 후처리 유틸리티
// ============================================

/**
 * 번역 결과 후처리 - HTML 주석 제거
 * 프롬프트 기법으로 인해 모델 응답에 포함되는 마커 주석 등을 제거
 */
function postProcessTranslation(text: string): string {
  // HTML 주석 제거 (<!-- ... --> 패턴)
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

// ============================================
// 타입 정의
// ============================================

export interface CreateSessionInput {
  title: string;
  memo?: string;
  customDict?: string;
}

export interface StartTranslationInput {
  sessionId: string;
  sourceText: string;
}

export interface ChunkResult {
  chunkId: string;
  order: number;
  status: 'completed' | 'failed';
  translatedText?: string;
  errorMessage?: string;
}

export interface TranslationProgress {
  sessionId: string;
  status: string;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  pendingChunks: number;
}

// ============================================
// 전역 설정 관리
// ============================================

/**
 * 전역 번역 설정 조회 (없으면 기본값으로 생성)
 */
export async function getTranslationConfig(): Promise<TranslationConfig> {
  let config = await db.selectFrom('translation_config').selectAll().executeTakeFirst();

  if (!config) {
    const now = nowISOString();
    config = await db
      .insertInto('translation_config')
      .values({
        id: 1,
        model: DEFAULT_MODEL_ID,
        chunkSize: 2000,
        temperature: 1.0,
        maxOutputTokens: 32000,
        topP: null,
        topK: null,
        updatedAt: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  return config;
}

/**
 * 전역 번역 설정 업데이트
 */
export async function updateTranslationConfig(data: {
  model?: string;
  chunkSize?: number;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}): Promise<TranslationConfig> {
  const now = nowISOString();

  // upsert 구현: 먼저 존재 여부 확인
  const existing = await db.selectFrom('translation_config').select('id').where('id', '=', 1).executeTakeFirst();

  if (existing) {
    return await db
      .updateTable('translation_config')
      .set({
        ...(data.model !== undefined && { model: data.model }),
        ...(data.chunkSize !== undefined && { chunkSize: data.chunkSize }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.maxOutputTokens !== undefined && { maxOutputTokens: data.maxOutputTokens }),
        ...(data.topP !== undefined && { topP: data.topP }),
        ...(data.topK !== undefined && { topK: data.topK }),
        updatedAt: now,
      })
      .where('id', '=', 1)
      .returningAll()
      .executeTakeFirstOrThrow();
  } else {
    return await db
      .insertInto('translation_config')
      .values({
        id: 1,
        model: data.model ?? DEFAULT_MODEL_ID,
        chunkSize: data.chunkSize ?? 2000,
        temperature: data.temperature ?? 1.0,
        maxOutputTokens: data.maxOutputTokens ?? 32000,
        topP: data.topP ?? null,
        topK: data.topK ?? null,
        updatedAt: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}

/**
 * Config에서 GeminiClient 생성
 */
function createGeminiClientFromConfig(config: TranslationConfig): GeminiClient {
  const generationConfig: GeminiGenerationConfig = {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens ?? undefined,
    topP: config.topP ?? undefined,
    topK: config.topK ?? undefined,
  };

  return new GeminiClient({
    model: config.model,
    defaultGenerationConfig: generationConfig,
  });
}

// ============================================
// 세션 관리
// ============================================

/**
 * 새 번역 세션 생성
 */
export async function createSession(input: CreateSessionInput): Promise<TranslationSession> {
  const now = nowISOString();

  return await db
    .insertInto('translation_sessions')
    .values({
      id: generateCuid(),
      title: input.title,
      memo: input.memo ?? null,
      customDict: input.customDict ?? null,
      status: 'draft',
      originalFileName: null,
      sourceText: null,
      translatedText: null,
      totalChunks: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * 세션 조회
 */
export async function getSession(sessionId: string): Promise<TranslationSession | null> {
  const result = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

  return result ?? null;
}

/**
 * 세션 목록 조회
 */
export async function listSessions(): Promise<TranslationSession[]> {
  return await db.selectFrom('translation_sessions').selectAll().orderBy('createdAt', 'desc').execute();
}

/**
 * 세션 업데이트
 */
export async function updateSession(
  sessionId: string,
  data: Partial<Pick<TranslationSession, 'title' | 'memo' | 'customDict'>>
): Promise<TranslationSession> {
  const now = nowISOString();

  return await db
    .updateTable('translation_sessions')
    .set({
      ...data,
      updatedAt: now,
    })
    .where('id', '=', sessionId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * 세션 삭제 (청크도 함께 삭제됨 - CASCADE)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.deleteFrom('translation_sessions').where('id', '=', sessionId).execute();
}

/**
 * 세션의 청크 목록 조회 (전체)
 */
export async function getSessionChunks(sessionId: string): Promise<TranslationChunk[]> {
  return await db.selectFrom('translation_chunks').selectAll().where('sessionId', '=', sessionId).orderBy('order', 'asc').execute();
}

/**
 * 세션의 청크 목록 조회 (페이지네이션)
 */
export interface PaginatedChunksResult {
  chunks: TranslationChunk[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getSessionChunksPaginated(
  sessionId: string,
  options: { page: number; limit: number; status?: string }
): Promise<PaginatedChunksResult> {
  const { page, limit, status } = options;
  const offset = (page - 1) * limit;

  // 기본 쿼리 빌더
  let query = db.selectFrom('translation_chunks').where('sessionId', '=', sessionId);

  let countQuery = db.selectFrom('translation_chunks').where('sessionId', '=', sessionId);

  // status 필터 적용
  if (status) {
    query = query.where('status', '=', status);
    countQuery = countQuery.where('status', '=', status);
  }

  // 데이터 조회
  const chunks = await query.selectAll().orderBy('order', 'asc').offset(offset).limit(limit).execute();

  // 총 개수 조회
  const countResult = await countQuery.select(eb => eb.fn.countAll().as('count')).executeTakeFirstOrThrow();

  const total = Number(countResult.count);

  return {
    chunks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================
// 파일 업로드/다운로드
// ============================================

export interface FileUploadInput {
  sessionId: string;
  fileName: string;
  content: string;
}

export interface FileUploadResult {
  session: TranslationSession;
  totalChunks: number;
  originalFileName: string;
  fileSize: number;
  charCount: number;
}

/**
 * 파일 업로드 및 청킹 처리
 */
export async function uploadFileAndChunk(input: FileUploadInput): Promise<FileUploadResult> {
  const { sessionId, fileName, content } = input;
  const charCount = content.length;
  const fileSize = Buffer.byteLength(content, 'utf-8');

  // 설정 조회
  const config = await getTranslationConfig();

  // 청킹
  const chunks = splitIntoChunks(content, config.chunkSize);

  if (chunks.length === 0) {
    throw Object.assign(new Error('No content to translate'), { statusCode: 400 });
  }

  const now = nowISOString();

  // 트랜잭션으로 원자적 업데이트
  const session = await db.transaction().execute(async trx => {
    // 세션 조회
    const existingSession = await trx.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

    if (!existingSession) {
      throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }

    // 기존 청크 삭제 (재업로드 시)
    await trx.deleteFrom('translation_chunks').where('sessionId', '=', sessionId).execute();

    // 청크 DB에 저장
    for (let index = 0; index < chunks.length; index++) {
      await trx
        .insertInto('translation_chunks')
        .values({
          id: generateCuid(),
          sessionId,
          order: index,
          sourceText: chunks[index],
          translatedText: null,
          status: 'pending',
          errorMessage: null,
          retryCount: 0,
          tokenCount: null,
          processingTime: null,
          createdAt: now,
          updatedAt: now,
        })
        .execute();
    }

    // 세션 업데이트
    return await trx
      .updateTable('translation_sessions')
      .set({
        originalFileName: fileName,
        sourceText: content,
        translatedText: null,
        status: 'ready',
        totalChunks: chunks.length,
        updatedAt: now,
      })
      .where('id', '=', sessionId)
      .returningAll()
      .executeTakeFirstOrThrow();
  });

  return {
    session,
    totalChunks: chunks.length,
    originalFileName: fileName,
    fileSize,
    charCount,
  };
}

/**
 * 번역문 다운로드 (완료된 청크들 조립)
 */
export async function getTranslationForDownload(sessionId: string): Promise<{ content: string; fileName: string }> {
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  // 완료된 청크들 조회
  const chunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .where('status', '=', 'completed')
    .orderBy('order', 'asc')
    .execute();

  const content = chunks.map(c => c.translatedText ?? '').join('\n\n');

  // 파일명 생성: 원본 파일명에서 확장자 앞에 _translated 추가
  const originalName = session.originalFileName || session.title;
  const lastDot = originalName.lastIndexOf('.');
  const fileName =
    lastDot > 0 ? `${originalName.slice(0, lastDot)}_translated${originalName.slice(lastDot)}` : `${originalName}_translated.txt`;

  return { content, fileName };
}

// ============================================
// 번역 실행
// ============================================

/**
 * 번역 시작 - 원문을 청크로 분할하고 DB에 저장
 * 트랜잭션으로 묶어 원자성 보장
 * @deprecated Use uploadFileAndChunk instead
 */
export async function startTranslation(input: StartTranslationInput): Promise<TranslationProgress> {
  const { sessionId, sourceText } = input;

  // 설정 조회
  const config = await getTranslationConfig();

  // 청킹 (DB 작업 전에 먼저 수행)
  const chunks = splitIntoChunks(sourceText, config.chunkSize);

  if (chunks.length === 0) {
    throw Object.assign(new Error('No content to translate'), { statusCode: 400 });
  }

  const now = nowISOString();

  // 트랜잭션으로 원자적 업데이트
  await db.transaction().execute(async trx => {
    // 세션 조회
    const session = await trx.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

    if (!session) {
      throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }

    // 기존 청크 삭제 (재시작 시)
    await trx.deleteFrom('translation_chunks').where('sessionId', '=', sessionId).execute();

    // 청크 DB에 저장
    for (let index = 0; index < chunks.length; index++) {
      await trx
        .insertInto('translation_chunks')
        .values({
          id: generateCuid(),
          sessionId,
          order: index,
          sourceText: chunks[index],
          translatedText: null,
          status: 'pending',
          errorMessage: null,
          retryCount: 0,
          tokenCount: null,
          processingTime: null,
          createdAt: now,
          updatedAt: now,
        })
        .execute();
    }

    // 세션 상태 업데이트 (청킹 완료 = ready 상태)
    await trx
      .updateTable('translation_sessions')
      .set({
        sourceText,
        status: 'ready',
        updatedAt: now,
      })
      .where('id', '=', sessionId)
      .execute();
  });

  return getTranslationProgress(sessionId);
}

/**
 * 번역 진행 상황 조회
 */
export async function getTranslationProgress(sessionId: string): Promise<TranslationProgress> {
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  const chunks = await db.selectFrom('translation_chunks').selectAll().where('sessionId', '=', sessionId).execute();

  const completed = chunks.filter(c => c.status === 'completed').length;
  const failed = chunks.filter(c => c.status === 'failed').length;
  const pending = chunks.filter(c => c.status === 'pending' || c.status === 'processing').length;

  return {
    sessionId,
    status: session.status,
    totalChunks: chunks.length,
    completedChunks: completed,
    failedChunks: failed,
    pendingChunks: pending,
  };
}

/**
 * 내부용: 단일 청크 번역 (이미 조회된 데이터 활용)
 */
interface TranslateSingleChunkInput {
  chunk: TranslationChunk;
  session: TranslationSession;
  allChunks: TranslationChunk[];
  config: TranslationConfig;
  client: GeminiClient;
  template: string;
}

async function translateSingleChunk(input: TranslateSingleChunkInput): Promise<ChunkResult> {
  const { chunk, session, allChunks, client, template } = input;
  const startTime = Date.now();
  const now = nowISOString();

  // 청크 시작 이벤트 발송
  emitChunkStart(session.id, chunk.id, chunk.order);

  // 상태를 processing으로 업데이트
  await db.updateTable('translation_chunks').set({ status: 'processing', updatedAt: now }).where('id', '=', chunk.id).execute();

  try {
    // ChunkInfo 형태로 변환
    const chunkInfos: ChunkInfo[] = allChunks.map(c => ({
      order: c.order,
      sourceText: c.sourceText,
      translatedText: c.translatedText,
      status: c.status,
    }));

    // 프롬프트 빌드
    const promptResult = buildPromptFromDB({
      session: {
        id: session.id,
        title: session.title,
        customDict: session.customDict,
        memo: session.memo,
      },
      currentChunk: {
        order: chunk.order,
        sourceText: chunk.sourceText,
      },
      allChunks: chunkInfos,
      template,
    });

    if (!promptResult.success) {
      throw new Error(`Prompt build failed: ${promptResult.errors.join(', ')}`);
    }

    // Gemini API 호출
    const response = await client.generateContent({
      contents: promptResult.geminiMessages.contents,
      systemInstruction: promptResult.geminiMessages.systemInstruction,
    });

    const rawTranslatedText = client.extractText(response);
    const translatedText = postProcessTranslation(rawTranslatedText);
    const usage = client.extractUsage(response);
    const processingTime = Date.now() - startTime;

    // 성공 - 청크 업데이트
    const updatedChunk = await db
      .updateTable('translation_chunks')
      .set({
        status: 'completed',
        translatedText,
        processingTime,
        tokenCount: usage.totalTokens,
        errorMessage: null,
        updatedAt: nowISOString(),
      })
      .where('id', '=', chunk.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    // 청크 진행 상황 이벤트 발송
    const updatedChunks = allChunks.map(c => (c.id === chunk.id ? updatedChunk : c));
    emitChunkProgress(session.id, updatedChunk, updatedChunks);

    return {
      chunkId: chunk.id,
      order: chunk.order,
      status: 'completed',
      translatedText,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 실패 - 청크 업데이트
    const updatedChunk = await db
      .updateTable('translation_chunks')
      .set({
        status: 'failed',
        errorMessage,
        retryCount: chunk.retryCount + 1,
        updatedAt: nowISOString(),
      })
      .where('id', '=', chunk.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    // 청크 진행 상황 이벤트 발송 (실패)
    const updatedChunks = allChunks.map(c => (c.id === chunk.id ? updatedChunk : c));
    emitChunkProgress(session.id, updatedChunk, updatedChunks);

    return {
      chunkId: chunk.id,
      order: chunk.order,
      status: 'failed',
      errorMessage,
    };
  }
}

/**
 * 단일 청크 번역 실행 (외부 API용)
 * 프론트엔드가 완전한 TranslationChunk를 기대하므로 전체 객체 반환
 */
export async function translateChunk(chunkId: string, options: { templateId: string; customDict?: string }): Promise<TranslationChunk> {
  // 청크 조회
  const chunk = await db.selectFrom('translation_chunks').selectAll().where('id', '=', chunkId).executeTakeFirst();

  if (!chunk) {
    throw Object.assign(new Error('Chunk not found'), { statusCode: 404 });
  }

  // 세션 조회
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', chunk.sessionId).executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  // 템플릿 조회
  const promptTemplate = templateService.getByIdOrThrow(options.templateId);

  // 모든 청크 조회 (프롬프트 빌더용)
  const allChunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', chunk.sessionId)
    .orderBy('order', 'asc')
    .execute();

  // 설정 조회 및 클라이언트 생성
  const config = await getTranslationConfig();
  const client = createGeminiClientFromConfig(config);

  // customDict 오버라이드 적용
  const sessionWithOverride = options?.customDict ? { ...session, customDict: options.customDict } : session;

  const result = await translateSingleChunk({
    chunk,
    session: sessionWithOverride,
    allChunks,
    config,
    client,
    template: promptTemplate.content,
  });

  // 성공 시 번역문 조립 시도
  if (result.status === 'completed') {
    await assembleTranslation(chunk.sessionId);
  }

  // 업데이트된 전체 청크 조회해서 반환
  const updatedChunk = await db.selectFrom('translation_chunks').selectAll().where('id', '=', chunkId).executeTakeFirst();

  if (!updatedChunk) {
    throw Object.assign(new Error('Chunk not found after translation'), { statusCode: 500 });
  }

  return updatedChunk;
}

/**
 * 세션의 모든 pending 청크 번역 실행
 * DB 조회를 최적화하여 성능 개선
 * 중지(pause) 시 현재 청크 완료 후 중단
 */
export async function translateAllPendingChunks(sessionId: string, options: { templateId: string }): Promise<ChunkResult[]> {
  // 세션 조회
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  // 청크들 조회
  const allChunks = await db.selectFrom('translation_chunks').selectAll().where('sessionId', '=', sessionId).orderBy('order', 'asc').execute();

  // 템플릿 조회
  const promptTemplate = templateService.getByIdOrThrow(options.templateId);

  // 세션 상태를 translating으로 변경
  await db
    .updateTable('translation_sessions')
    .set({ status: 'translating', updatedAt: nowISOString() })
    .where('id', '=', sessionId)
    .execute();

  // 상태 변경 이벤트 발송
  emitSessionStatus(sessionId, 'translating', allChunks);

  // pending/failed 상태의 청크들 필터링
  const pendingChunks = allChunks.filter(c => c.status === 'pending' || c.status === 'failed');

  if (pendingChunks.length === 0) {
    // 이미 모두 완료된 경우
    await db
      .updateTable('translation_sessions')
      .set({ status: 'completed', updatedAt: nowISOString() })
      .where('id', '=', sessionId)
      .execute();
    emitSessionStatus(sessionId, 'completed', allChunks);
    return [];
  }

  // 설정을 한 번만 조회하고 클라이언트 생성
  const config = await getTranslationConfig();
  const client = createGeminiClientFromConfig(config);
  const template = promptTemplate.content;

  const results: ChunkResult[] = [];
  const mutableChunks = [...allChunks]; // 청크 목록 복사 (변경 추적용)

  // 순차적으로 번역 (이전 청크 컨텍스트 필요)
  for (const chunk of pendingChunks) {
    // 🔴 매 청크 전에 DB에서 세션 상태 확인 (단일 신뢰 원천)
    const currentSession = await db.selectFrom('translation_sessions').select('status').where('id', '=', sessionId).executeTakeFirst();

    // paused 상태면 루프 중단 - 남은 청크들은 pending 유지
    if (currentSession?.status === 'paused') {
      break;
    }

    const result = await translateSingleChunk({
      chunk,
      session,
      allChunks: mutableChunks,
      config,
      client,
      template,
    });
    results.push(result);

    // 청크 목록 업데이트 (다음 청크의 컨텍스트용)
    const chunkIndex = mutableChunks.findIndex(c => c.id === chunk.id);
    if (chunkIndex !== -1 && result.status === 'completed') {
      mutableChunks[chunkIndex] = {
        ...mutableChunks[chunkIndex],
        status: 'completed',
        translatedText: result.translatedText ?? null,
      };
    }
  }

  // 최종 상태 확인 (중간에 paused 되었을 수 있음)
  const finalSession = await db.selectFrom('translation_sessions').select('status').where('id', '=', sessionId).executeTakeFirst();

  // paused 상태가 아닐 때만 최종 상태 업데이트
  if (finalSession?.status !== 'paused') {
    const hasFailures = results.some(r => r.status === 'failed');
    const allProcessed = results.length === pendingChunks.length;

    let finalStatus: string;
    if (!allProcessed) {
      // 일부만 처리됨 (paused 되었다가 상태가 변경된 경우)
      finalStatus = 'paused';
    } else if (hasFailures) {
      finalStatus = 'failed';
    } else {
      finalStatus = 'completed';
    }

    await db
      .updateTable('translation_sessions')
      .set({ status: finalStatus, updatedAt: nowISOString() })
      .where('id', '=', sessionId)
      .execute();

    // 상태 변경 이벤트 발송
    emitSessionStatus(sessionId, finalStatus as 'completed' | 'failed' | 'paused', mutableChunks);

    // 모두 성공했으면 번역문 조립 및 완료 이벤트
    if (finalStatus === 'completed') {
      await assembleTranslation(sessionId);
      const completedSession = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();
      if (completedSession) {
        emitSessionComplete(sessionId, completedSession);
      }
    }
  }

  return results;
}

// ============================================
// 일시 중지 / 재개
// ============================================

/**
 * 번역 일시 중지
 * 현재 처리 중인 청크가 완료된 후 중단됨
 */
export async function pauseTranslation(sessionId: string): Promise<TranslationSession> {
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  // translating 상태일 때만 pause 가능
  if (session.status !== 'translating') {
    throw Object.assign(new Error(`Cannot pause session in '${session.status}' state`), { statusCode: 400 });
  }

  const updatedSession = await db
    .updateTable('translation_sessions')
    .set({ status: 'paused', updatedAt: nowISOString() })
    .where('id', '=', sessionId)
    .returningAll()
    .executeTakeFirstOrThrow();

  // 청크 목록 조회 (이벤트용)
  const chunks = await db.selectFrom('translation_chunks').selectAll().where('sessionId', '=', sessionId).execute();

  // 상태 변경 이벤트 발송
  emitSessionStatus(sessionId, 'paused', chunks);

  return updatedSession;
}

/**
 * 번역 재개
 * paused 상태에서 pending 청크들을 다시 번역 시작
 */
export async function resumeTranslation(sessionId: string, options: { templateId: string }): Promise<void> {
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  // paused 또는 failed 상태에서만 resume 가능
  if (session.status !== 'paused' && session.status !== 'failed') {
    throw Object.assign(new Error(`Cannot resume session in '${session.status}' state`), { statusCode: 400 });
  }

  // 비동기로 번역 재개 (응답은 즉시 반환)
  // 실제 진행 상황은 WebSocket으로 전달
  translateAllPendingChunks(sessionId, options).catch(error => {
    logger.error('system', `Resume translation failed for session ${sessionId}:`, error);
  });
}

/**
 * 실패한 청크 재시도
 * 프론트엔드가 완전한 TranslationChunk를 기대하므로 전체 객체 반환
 */
export async function retryFailedChunk(chunkId: string, options: { templateId: string }): Promise<TranslationChunk> {
  const chunk = await db.selectFrom('translation_chunks').selectAll().where('id', '=', chunkId).executeTakeFirst();

  if (!chunk) {
    throw Object.assign(new Error('Chunk not found'), { statusCode: 404 });
  }

  if (chunk.status !== 'failed') {
    throw Object.assign(new Error('Chunk is not in failed state'), { statusCode: 400 });
  }

  // 세션 조회 (customDict 가져오기용)
  const session = await db.selectFrom('translation_sessions').selectAll().where('id', '=', chunk.sessionId).executeTakeFirst();

  // pending으로 리셋
  await db
    .updateTable('translation_chunks')
    .set({ status: 'pending', updatedAt: nowISOString() })
    .where('id', '=', chunkId)
    .execute();

  return translateChunk(chunkId, {
    templateId: options.templateId,
    customDict: session?.customDict ?? undefined,
  });
}

// ============================================
// 번역문 조립
// ============================================

/**
 * 완료된 청크들을 조립하여 번역문 업데이트
 */
async function assembleTranslation(sessionId: string): Promise<void> {
  const chunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .orderBy('order', 'asc')
    .execute();

  // 모든 청크가 완료된 경우에만 조립
  const allCompleted = chunks.every(c => c.status === 'completed');

  if (allCompleted && chunks.length > 0) {
    const translatedText = chunks.map(c => c.translatedText ?? '').join('\n\n');

    await db
      .updateTable('translation_sessions')
      .set({
        translatedText,
        status: 'completed',
        updatedAt: nowISOString(),
      })
      .where('id', '=', sessionId)
      .execute();
  }
}

/**
 * 부분 번역문 조회 (완료된 청크들만)
 */
export async function getPartialTranslation(sessionId: string): Promise<string> {
  const chunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .where('status', '=', 'completed')
    .orderBy('order', 'asc')
    .execute();

  return chunks.map(c => c.translatedText ?? '').join('\n\n');
}
