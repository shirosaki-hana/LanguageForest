import { z } from 'zod';
import { TemplateParser, getDefaultTemplateParser, HelperRegistry } from './templateParser';
import { ChatMLParser } from './chatmlParser';
import type { GeminiConvertedMessages } from './types';
import { chatMessagesToGemini } from './types';
import { registerDefaultHelpers } from './templateHelper';

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
  session: SessionInfo;
  current: {
    order: number;
    sourceText: string;
  };
  previous: {
    order: number;
    sourceText: string;
    translatedText: string;
  } | null;
  _chunks: ChunkInfo[];
  _currentOrder: number;
}

// ============================================
// 커스텀 헬퍼 등록
// ============================================

const registeredParsers = new WeakSet<TemplateParser>();

export function registerTranslationHelpers(parser: TemplateParser): void {
  if (registeredParsers.has(parser)) {
    return;
  }

  registerDefaultHelpers(parser);

  const helpers: HelperRegistry = {
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

    hasChunk(this: TranslationContext, offset: unknown) {
      const offsetNum = z.coerce.number().int().catch(0).parse(offset);
      const targetOrder = this._currentOrder + offsetNum;
      return this._chunks.some(c => c.order === targetOrder);
    },

    hasPrevious(this: TranslationContext) {
      return this.previous !== null;
    },

    hasTranslated(this: TranslationContext, offset: unknown) {
      const offsetNum = z.coerce.number().int().catch(0).parse(offset);
      const targetOrder = this._currentOrder + offsetNum;
      const chunk = this._chunks.find(c => c.order === targetOrder);
      return chunk?.status === 'completed' && chunk?.translatedText !== null;
    },

    chunkCount(this: TranslationContext) {
      return this._chunks.length;
    },

    currentOrder(this: TranslationContext) {
      return this._currentOrder;
    },

    isFirstChunk(this: TranslationContext) {
      return this._currentOrder === 0;
    },

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

export function buildPrompt(input: BuildPromptInput): BuildPromptResult {
  const { template, context } = input;

  try {
    const parser = getDefaultTemplateParser({ strict: false, noEscape: true });
    registerTranslationHelpers(parser);

    const renderedChatML = parser.parse(template, context as never);

    const parseResult = ChatMLParser.parse(renderedChatML);

    if (!parseResult.success) {
      return {
        success: false,
        geminiMessages: { contents: [] },
        errors: parseResult.errors,
        rawChatML: renderedChatML,
      };
    }

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
// 컨텍스트 빌더
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

export function buildTranslationContext(input: BuildContextInput): TranslationContext {
  const { session, currentChunk, allChunks } = input;

  const previousChunk = allChunks.find(
    c => c.order === currentChunk.order - 1 && c.status === 'completed' && c.translatedText !== null
  );

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
// 통합 함수
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
