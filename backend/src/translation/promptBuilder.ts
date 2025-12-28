import { z } from 'zod';
import { TemplateParser, getDefaultTemplateParser, HelperRegistry } from './templateParser.js';
import { ChatMLParser } from './chatmlParser.js';
import type { GeminiConvertedMessages } from './types.js';
import { chatMessagesToGemini } from './types.js';
import { registerDefaultHelpers } from './templateHelper.js';

// ============================================
// TranslationContext 타입 정의
// ============================================

export interface ChunkInfo {
  order: number;
  sourceText: string;
  translatedText: string | null;
  status: string;
}

export interface SessionInfo {
  id: string;
  title: string;
  customDict: string | null;
  memo: string | null;
}

export interface TranslationContext {
  // 세션 정보
  session: SessionInfo;

  // 현재 청크
  current: {
    order: number;
    sourceText: string;
  };

  // 이전 청크 (번역 완료된 경우만)
  previous: {
    order: number;
    sourceText: string;
    translatedText: string;
  } | null;

  // 헬퍼용 내부 데이터 (언더스코어 prefix)
  _chunks: ChunkInfo[];
  _currentOrder: number;
}

// ============================================
// 커스텀 헬퍼 등록
// ============================================

// 이미 헬퍼가 등록된 파서 인스턴스 추적
const registeredParsers = new WeakSet<TemplateParser>();

/**
 * 번역용 커스텀 헬퍼 등록 (기본 헬퍼 포함)
 * 파서 인스턴스별로 한 번만 등록됨
 */
export function registerTranslationHelpers(parser: TemplateParser): void {
  if (registeredParsers.has(parser)) {
    return;
  }

  // 기본 헬퍼 먼저 등록 (eq, and, or, json 등)
  registerDefaultHelpers(parser);

  const helpers: HelperRegistry = {
    /**
     * {{chunk offset "field"}} - 상대 인덱스로 청크 접근
     *
     * @example
     * {{chunk 0 "source"}}      // 현재 청크 원문
     * {{chunk -1 "source"}}     // 이전 청크 원문
     * {{chunk -1 "translated"}} // 이전 청크 번역문
     * {{chunk -1}}              // 이전 청크 원문 (기본값)
     */
    chunk(this: TranslationContext, offset: unknown, field?: unknown) {
      const offsetNum = z.coerce.number().int().catch(0).parse(offset);
      const fieldStr = z.string().optional().parse(field);

      const targetOrder = this._currentOrder + offsetNum;
      const chunk = this._chunks.find(c => c.order === targetOrder);

      if (!chunk) {
        return '';
      }

      switch (fieldStr) {
        case 'source':
          return chunk.sourceText;
        case 'translated':
          return chunk.translatedText ?? '';
        case 'status':
          return chunk.status;
        default:
          return chunk.sourceText;
      }
    },

    /**
     * {{hasChunk offset}} - 특정 오프셋의 청크 존재 여부
     *
     * @example
     * {{#if (hasChunk -1)}}이전 청크 있음{{/if}}
     * {{#if (hasChunk -2)}}2개 전 청크 있음{{/if}}
     */
    hasChunk(this: TranslationContext, offset: unknown) {
      const offsetNum = z.coerce.number().int().catch(0).parse(offset);
      const targetOrder = this._currentOrder + offsetNum;
      return this._chunks.some(c => c.order === targetOrder);
    },

    /**
     * {{hasPrevious}} - 이전 청크가 존재하고 번역 완료되었는지
     *
     * @example
     * {{#if hasPrevious}}이전 번역 있음{{/if}}
     */
    hasPrevious(this: TranslationContext) {
      return this.previous !== null;
    },

    /**
     * {{hasTranslated offset}} - 특정 청크가 번역 완료되었는지
     *
     * @example
     * {{#if (hasTranslated -1)}}이전 청크 번역됨{{/if}}
     */
    hasTranslated(this: TranslationContext, offset: unknown) {
      const offsetNum = z.coerce.number().int().catch(0).parse(offset);
      const targetOrder = this._currentOrder + offsetNum;
      const chunk = this._chunks.find(c => c.order === targetOrder);
      return chunk?.status === 'completed' && chunk?.translatedText !== null;
    },

    /**
     * {{chunkCount}} - 전체 청크 개수
     */
    chunkCount(this: TranslationContext) {
      return this._chunks.length;
    },

    /**
     * {{currentOrder}} - 현재 청크 순서 (0-based)
     */
    currentOrder(this: TranslationContext) {
      return this._currentOrder;
    },

    /**
     * {{isFirstChunk}} - 첫 번째 청크인지
     */
    isFirstChunk(this: TranslationContext) {
      return this._currentOrder === 0;
    },

    /**
     * {{isLastChunk}} - 마지막 청크인지
     */
    isLastChunk(this: TranslationContext) {
      const maxOrder = Math.max(...this._chunks.map(c => c.order));
      return this._currentOrder === maxOrder;
    },
  };

  parser.registerHelpers(helpers);
  registeredParsers.add(parser);
}

// ============================================
// 프롬프트 빌더
// ============================================

export interface BuildPromptInput {
  template: string;
  context: TranslationContext;
}

export interface BuildPromptResult {
  success: boolean;
  geminiMessages: GeminiConvertedMessages;
  errors: string[];
  rawChatML?: string;
}

/**
 * 프롬프트 빌드 (템플릿 렌더링 + ChatML 파싱 + Gemini 변환)
 */
export function buildPrompt(input: BuildPromptInput): BuildPromptResult {
  const { template, context } = input;

  try {
    // 1. 템플릿 파서 가져오기 + 헬퍼 등록
    const parser = getDefaultTemplateParser({ strict: false, noEscape: true });
    registerTranslationHelpers(parser);

    // 2. 템플릿 렌더링 (Handlebars)
    // TranslationContext를 TemplateData로 캐스팅 (Handlebars는 any 타입으로 처리)
    const renderedChatML = parser.parse(template, context as never);

    // 3. ChatML 파싱
    const parseResult = ChatMLParser.parse(renderedChatML);

    if (!parseResult.success) {
      return {
        success: false,
        geminiMessages: { contents: [] },
        errors: parseResult.errors,
        rawChatML: renderedChatML,
      };
    }

    // 4. ChatMessage -> Gemini 형식 변환
    const geminiMessages = chatMessagesToGemini(parseResult.messages);

    return {
      success: true,
      geminiMessages,
      errors: [],
      rawChatML: renderedChatML,
    };
  } catch (error) {
    return {
      success: false,
      geminiMessages: { contents: [] },
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// ============================================
// 컨텍스트 빌더 (DB 데이터 -> TranslationContext)
// ============================================

export interface BuildContextInput {
  session: {
    id: string;
    title: string;
    customDict: string | null;
    memo: string | null;
  };
  currentChunk: {
    order: number;
    sourceText: string;
  };
  allChunks: ChunkInfo[];
}

/**
 * DB 데이터로부터 TranslationContext 생성
 */
export function buildTranslationContext(input: BuildContextInput): TranslationContext {
  const { session, currentChunk, allChunks } = input;

  // 이전 청크 찾기 (번역 완료된 것만)
  const previousChunk = allChunks.find(c => c.order === currentChunk.order - 1 && c.status === 'completed' && c.translatedText !== null);

  return {
    session: {
      id: session.id,
      title: session.title,
      customDict: session.customDict,
      memo: session.memo,
    },
    current: {
      order: currentChunk.order,
      sourceText: currentChunk.sourceText,
    },
    previous: previousChunk
      ? {
          order: previousChunk.order,
          sourceText: previousChunk.sourceText,
          translatedText: previousChunk.translatedText!,
        }
      : null,
    _chunks: allChunks,
    _currentOrder: currentChunk.order,
  };
}

// ============================================
// 통합 함수: DB 데이터 -> OpenAI 메시지
// ============================================

export interface BuildPromptFromDBInput {
  session: {
    id: string;
    title: string;
    customDict: string | null;
    memo: string | null;
  };
  currentChunk: {
    order: number;
    sourceText: string;
  };
  allChunks: ChunkInfo[];
  template: string;
}

/**
 * DB 데이터로부터 바로 OpenAI 메시지 생성
 */
export function buildPromptFromDB(input: BuildPromptFromDBInput): BuildPromptResult {
  const context = buildTranslationContext({
    session: input.session,
    currentChunk: input.currentChunk,
    allChunks: input.allChunks,
  });

  return buildPrompt({
    template: input.template,
    context,
  });
}
