// ============================================
// Translation Module - Public API
// ============================================

// Types
export type {
  ChatMessage,
  ChatMessageRole,
  OpenAIMessage,
  OpenAIRole,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChoice,
  ChatCompletionUsage,
} from './types.js';

export {
  ChatMessageSchema,
  ChatMessageRoleSchema,
  OpenAIMessageSchema,
  OpenAIRoleSchema,
  ChatCompletionRequestSchema,
  chatMessageToOpenAI,
  openAIToChatMessage,
  chatMessagesToOpenAI,
  openAIToChatMessages,
} from './types.js';

// ChatML Parser
export { ChatMLParser, ParseResultSchema, ValidationResultSchema } from './chatmlParser.js';
export type { ParseResult, ZodParseResult, ZodValidationResult } from './chatmlParser.js';

// Template Parser
export {
  TemplateParser,
  getDefaultTemplateParser,
  parseTemplate,
} from './templateParser.js';
export type {
  TemplateValue,
  TemplateObject,
  TemplateData,
  TemplateParserOptions,
  HelperFunction,
  HelperRegistry,
} from './templateParser.js';

// Template Helper
export { registerDefaultHelpers } from './templateHelper.js';

// Chunker
export { splitIntoChunks } from './chunker.js';

// Prompt Builder
export {
  DEFAULT_TRANSLATION_TEMPLATE,
  registerTranslationHelpers,
  buildPrompt,
  buildTranslationContext,
  buildPromptFromDB,
} from './promptBuilder.js';
export type {
  ChunkInfo,
  SessionInfo,
  TranslationContext,
  BuildPromptInput,
  BuildPromptResult,
  BuildContextInput,
  BuildPromptFromDBInput,
} from './promptBuilder.js';

