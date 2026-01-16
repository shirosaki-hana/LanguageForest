import { db, generateCuid, nowISOString } from '../database/index';
import type { TranslationSession, TranslationChunk, TranslationConfig } from '../database/index';
import { GeminiClient, type GeminiGenerationConfig, resetGeminiClient } from '../external/gemini';
import { buildPromptFromDB } from '../translation/promptBuilder';
import { splitIntoChunks } from '../translation/chunker';
import type { ChunkInfo } from '../translation/promptBuilder';
import { emitChunkStart, emitChunkProgress, emitSessionStatus, emitSessionComplete } from './translationEvents';
import { templateService } from './templateService';
import { logger } from '../utils/index';
import { DEFAULT_MODEL_ID } from '../config/models';

// ============================================
// 후처리 유틸리티
// ============================================

function postProcessTranslation(text: string): string {
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
  processingChunks: number;
  progressPercent: number;
}

// ============================================
// 전역 설정 관리
// ============================================

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

export async function updateTranslationConfig(data: {
  model?: string;
  chunkSize?: number;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}): Promise<TranslationConfig> {
  const now = nowISOString();

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

async function createGeminiClientFromConfig(config: TranslationConfig): Promise<GeminiClient> {
  const generationConfig: GeminiGenerationConfig = {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens ?? undefined,
    topP: config.topP ?? undefined,
    topK: config.topK ?? undefined,
  };

  const apiKey = await getApiKeyFromDB();
  if (!apiKey) {
    throw new Error('API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.');
  }

  return new GeminiClient({
    apiKey,
    model: config.model,
    defaultGenerationConfig: generationConfig,
  });
}

// ============================================
// 세션 관리
// ============================================

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

export async function getSession(sessionId: string): Promise<TranslationSession | null> {
  const result = await db.selectFrom('translation_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();
  return result ?? null;
}

export async function listSessions(): Promise<TranslationSession[]> {
  return await db.selectFrom('translation_sessions').selectAll().orderBy('createdAt', 'desc').execute();
}

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

export async function deleteSession(sessionId: string): Promise<void> {
  await db.deleteFrom('translation_sessions').where('id', '=', sessionId).execute();
}

export async function getSessionChunks(sessionId: string): Promise<TranslationChunk[]> {
  return await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .orderBy('order', 'asc')
    .execute();
}

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

  let query = db.selectFrom('translation_chunks').where('sessionId', '=', sessionId);
  let countQuery = db.selectFrom('translation_chunks').where('sessionId', '=', sessionId);

  if (status) {
    query = query.where('status', '=', status);
    countQuery = countQuery.where('status', '=', status);
  }

  const chunks = await query.selectAll().orderBy('order', 'asc').offset(offset).limit(limit).execute();
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

export async function uploadFileAndChunk(input: FileUploadInput): Promise<FileUploadResult> {
  const { sessionId, fileName, content } = input;
  const charCount = content.length;
  const fileSize = Buffer.byteLength(content, 'utf-8');

  const config = await getTranslationConfig();
  const chunks = splitIntoChunks(content, config.chunkSize);

  if (chunks.length === 0) {
    throw Object.assign(new Error('No content to translate'), { statusCode: 400 });
  }

  const now = nowISOString();

  const session = await db.transaction().execute(async trx => {
    const existingSession = await trx
      .selectFrom('translation_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!existingSession) {
      throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }

    await trx.deleteFrom('translation_chunks').where('sessionId', '=', sessionId).execute();

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

export async function getTranslationForDownload(sessionId: string): Promise<{ content: string; fileName: string }> {
  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  const chunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .where('status', '=', 'completed')
    .orderBy('order', 'asc')
    .execute();

  const content = chunks.map(c => c.translatedText ?? '').join('\n\n');

  const originalName = session.originalFileName || session.title;
  const lastDot = originalName.lastIndexOf('.');
  const fileName =
    lastDot > 0
      ? `${originalName.slice(0, lastDot)}_translated${originalName.slice(lastDot)}`
      : `${originalName}_translated.txt`;

  return { content, fileName };
}

// ============================================
// 번역 실행
// ============================================

export async function startTranslation(input: StartTranslationInput): Promise<TranslationProgress> {
  const { sessionId, sourceText } = input;

  const config = await getTranslationConfig();
  const chunks = splitIntoChunks(sourceText, config.chunkSize);

  if (chunks.length === 0) {
    throw Object.assign(new Error('No content to translate'), { statusCode: 400 });
  }

  const now = nowISOString();

  await db.transaction().execute(async trx => {
    const session = await trx
      .selectFrom('translation_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }

    await trx.deleteFrom('translation_chunks').where('sessionId', '=', sessionId).execute();

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

export async function getTranslationProgress(sessionId: string): Promise<TranslationProgress> {
  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  const chunks = await db.selectFrom('translation_chunks').selectAll().where('sessionId', '=', sessionId).execute();

  const completed = chunks.filter(c => c.status === 'completed').length;
  const failed = chunks.filter(c => c.status === 'failed').length;
  const pending = chunks.filter(c => c.status === 'pending').length;
  const processing = chunks.filter(c => c.status === 'processing').length;

  return {
    sessionId,
    status: session.status,
    totalChunks: chunks.length,
    completedChunks: completed,
    failedChunks: failed,
    pendingChunks: pending,
    processingChunks: processing,
    progressPercent: chunks.length > 0 ? Math.round((completed / chunks.length) * 100) : 0,
  };
}

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

  emitChunkStart(session.id, chunk.id, chunk.order);

  await db
    .updateTable('translation_chunks')
    .set({ status: 'processing', updatedAt: now })
    .where('id', '=', chunk.id)
    .execute();

  try {
    const chunkInfos: ChunkInfo[] = allChunks.map(c => ({
      order: c.order,
      sourceText: c.sourceText,
      translatedText: c.translatedText,
      status: c.status,
    }));

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

    const response = await client.generateContent({
      contents: promptResult.geminiMessages.contents,
      systemInstruction: promptResult.geminiMessages.systemInstruction,
    });

    const rawTranslatedText = client.extractText(response);
    const translatedText = postProcessTranslation(rawTranslatedText);
    const usage = client.extractUsage(response);
    const processingTime = Date.now() - startTime;

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

export async function translateChunk(
  chunkId: string,
  options: { templateId: string; customDict?: string }
): Promise<TranslationChunk> {
  const chunk = await db.selectFrom('translation_chunks').selectAll().where('id', '=', chunkId).executeTakeFirst();

  if (!chunk) {
    throw Object.assign(new Error('Chunk not found'), { statusCode: 404 });
  }

  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', chunk.sessionId)
    .executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  const promptTemplate = templateService.getByIdOrThrow(options.templateId);

  const allChunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', chunk.sessionId)
    .orderBy('order', 'asc')
    .execute();

  const config = await getTranslationConfig();
  const client = await createGeminiClientFromConfig(config);

  const sessionWithOverride = options?.customDict ? { ...session, customDict: options.customDict } : session;

  const result = await translateSingleChunk({
    chunk,
    session: sessionWithOverride,
    allChunks,
    config,
    client,
    template: promptTemplate.content,
  });

  if (result.status === 'completed') {
    await assembleTranslation(chunk.sessionId);
  }

  const updatedChunk = await db.selectFrom('translation_chunks').selectAll().where('id', '=', chunkId).executeTakeFirst();

  if (!updatedChunk) {
    throw Object.assign(new Error('Chunk not found after translation'), { statusCode: 500 });
  }

  return updatedChunk;
}

export async function translateAllPendingChunks(
  sessionId: string,
  options: { templateId: string }
): Promise<ChunkResult[]> {
  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  const allChunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .orderBy('order', 'asc')
    .execute();

  const promptTemplate = templateService.getByIdOrThrow(options.templateId);

  await db
    .updateTable('translation_sessions')
    .set({ status: 'translating', updatedAt: nowISOString() })
    .where('id', '=', sessionId)
    .execute();

  emitSessionStatus(sessionId, 'translating', allChunks);

  const pendingChunks = allChunks.filter(c => c.status === 'pending' || c.status === 'failed');

  if (pendingChunks.length === 0) {
    await db
      .updateTable('translation_sessions')
      .set({ status: 'completed', updatedAt: nowISOString() })
      .where('id', '=', sessionId)
      .execute();
    emitSessionStatus(sessionId, 'completed', allChunks);
    return [];
  }

  const config = await getTranslationConfig();
  const client = await createGeminiClientFromConfig(config);
  const template = promptTemplate.content;

  const results: ChunkResult[] = [];
  const mutableChunks = [...allChunks];

  for (const chunk of pendingChunks) {
    const currentSession = await db
      .selectFrom('translation_sessions')
      .select('status')
      .where('id', '=', sessionId)
      .executeTakeFirst();

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

    const chunkIndex = mutableChunks.findIndex(c => c.id === chunk.id);
    if (chunkIndex !== -1 && result.status === 'completed') {
      mutableChunks[chunkIndex] = {
        ...mutableChunks[chunkIndex],
        status: 'completed',
        translatedText: result.translatedText ?? null,
      };
    }
  }

  const finalSession = await db
    .selectFrom('translation_sessions')
    .select('status')
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (finalSession?.status !== 'paused') {
    const hasFailures = results.some(r => r.status === 'failed');
    const allProcessed = results.length === pendingChunks.length;

    let finalStatus: string;
    if (!allProcessed) {
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

    emitSessionStatus(sessionId, finalStatus as 'completed' | 'failed' | 'paused', mutableChunks);

    if (finalStatus === 'completed') {
      await assembleTranslation(sessionId);
      const completedSession = await db
        .selectFrom('translation_sessions')
        .selectAll()
        .where('id', '=', sessionId)
        .executeTakeFirst();
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

export async function pauseTranslation(sessionId: string): Promise<TranslationSession> {
  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  if (session.status !== 'translating') {
    throw Object.assign(new Error(`Cannot pause session in '${session.status}' state`), { statusCode: 400 });
  }

  const updatedSession = await db
    .updateTable('translation_sessions')
    .set({ status: 'paused', updatedAt: nowISOString() })
    .where('id', '=', sessionId)
    .returningAll()
    .executeTakeFirstOrThrow();

  const chunks = await db.selectFrom('translation_chunks').selectAll().where('sessionId', '=', sessionId).execute();

  emitSessionStatus(sessionId, 'paused', chunks);

  return updatedSession;
}

export async function resumeTranslation(sessionId: string, options: { templateId: string }): Promise<void> {
  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!session) {
    throw Object.assign(new Error('Session not found'), { statusCode: 404 });
  }

  if (session.status !== 'paused' && session.status !== 'failed') {
    throw Object.assign(new Error(`Cannot resume session in '${session.status}' state`), { statusCode: 400 });
  }

  translateAllPendingChunks(sessionId, options).catch(error => {
    logger.error('system', `Resume translation failed for session ${sessionId}:`, error);
  });
}

export async function retryFailedChunk(
  chunkId: string,
  options: { templateId: string }
): Promise<TranslationChunk> {
  const chunk = await db.selectFrom('translation_chunks').selectAll().where('id', '=', chunkId).executeTakeFirst();

  if (!chunk) {
    throw Object.assign(new Error('Chunk not found'), { statusCode: 404 });
  }

  if (chunk.status !== 'failed') {
    throw Object.assign(new Error('Chunk is not in failed state'), { statusCode: 400 });
  }

  const session = await db
    .selectFrom('translation_sessions')
    .selectAll()
    .where('id', '=', chunk.sessionId)
    .executeTakeFirst();

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

async function assembleTranslation(sessionId: string): Promise<void> {
  const chunks = await db
    .selectFrom('translation_chunks')
    .selectAll()
    .where('sessionId', '=', sessionId)
    .orderBy('order', 'asc')
    .execute();

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

// ============================================
// 앱 설정 관리 (API 키 등)
// ============================================

function maskApiKey(apiKey: string | null): string | null {
  if (!apiKey || apiKey.length < 12) return null;
  return `${apiKey.slice(0, 4)}${'*'.repeat(Math.min(apiKey.length - 8, 20))}${apiKey.slice(-4)}`;
}

export async function getAppSettings(): Promise<{
  id: number;
  geminiApiKey: string | null;
  hasApiKey: boolean;
  updatedAt: string;
}> {
  let settings = await db.selectFrom('app_settings').selectAll().executeTakeFirst();

  if (!settings) {
    const now = nowISOString();
    settings = await db
      .insertInto('app_settings')
      .values({
        id: 1,
        geminiApiKey: null,
        updatedAt: now,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  return {
    id: settings.id,
    geminiApiKey: maskApiKey(settings.geminiApiKey),
    hasApiKey: !!settings.geminiApiKey,
    updatedAt: settings.updatedAt,
  };
}

export async function updateApiKey(apiKey: string): Promise<{
  success: boolean;
  hasApiKey: boolean;
  updatedAt: string;
}> {
  const now = nowISOString();

  const existing = await db.selectFrom('app_settings').selectAll().executeTakeFirst();

  if (existing) {
    await db
      .updateTable('app_settings')
      .set({
        geminiApiKey: apiKey,
        updatedAt: now,
      })
      .where('id', '=', 1)
      .execute();
  } else {
    await db
      .insertInto('app_settings')
      .values({
        id: 1,
        geminiApiKey: apiKey,
        updatedAt: now,
      })
      .execute();
  }

  resetGeminiClient();

  return {
    success: true,
    hasApiKey: true,
    updatedAt: now,
  };
}

export async function deleteApiKey(): Promise<{
  success: boolean;
  updatedAt: string;
}> {
  const now = nowISOString();

  await db
    .updateTable('app_settings')
    .set({
      geminiApiKey: null,
      updatedAt: now,
    })
    .where('id', '=', 1)
    .execute();

  resetGeminiClient();

  return {
    success: true,
    updatedAt: now,
  };
}

export async function getApiKeyFromDB(): Promise<string | null> {
  const settings = await db.selectFrom('app_settings').select('geminiApiKey').executeTakeFirst();
  return settings?.geminiApiKey ?? null;
}
