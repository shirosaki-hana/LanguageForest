import { z } from 'zod';
import type { ChatMessage } from './types.js';
import { ChatMessageRoleSchema, ChatMessageSchema } from './types.js';

// ============================================
// ChatML 파서
// ============================================

// Zod schemas for runtime validation (exported for external use)
export const ParseResultSchema = z.object({
  success: z.boolean(),
  messages: z.array(ChatMessageSchema),
  errors: z.array(z.string()),
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

// Type definitions
export interface ParseResult {
  success: boolean;
  messages: ChatMessage[];
  errors: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Type inference from Zod schemas
export type ZodParseResult = z.infer<typeof ParseResultSchema>;
export type ZodValidationResult = z.infer<typeof ValidationResultSchema>;

export class ChatMLParser {
  private static readonly START_TAG = '<|im_start|>';
  private static readonly END_TAG = '<|im_end|>';

  private constructor() {}

  // Zod validation helpers
  private static validateRole(role: string): ChatMessage['role'] | null {
    const result = ChatMessageRoleSchema.safeParse(role);
    return result.success ? result.data : null;
  }

  private static validateMessage(message: unknown): ChatMessage | null {
    const result = ChatMessageSchema.safeParse(message);
    return result.success ? result.data : null;
  }

  private static validateMessages(messages: unknown): ChatMessage[] | null {
    if (!Array.isArray(messages)) {
      return null;
    }

    const validatedMessages: ChatMessage[] = [];
    for (const message of messages) {
      const validated = this.validateMessage(message);
      if (!validated) {
        return null;
      }
      validatedMessages.push(validated);
    }
    return validatedMessages;
  }

  // 내부 유틸리티: 개행 정규화
  private static normalizeNewlines(input: string): string {
    return input.replace(/\r\n/g, '\n');
  }

  // 내부 유틸리티: 주석/공백 제거된 라인들
  private static getNonCommentNonEmptyLines(lines: string[]): string[] {
    return lines.map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#'));
  }

  // 내부 유틸리티: 태그 라인 판별 및 역할 추출
  private static isStartTagLine(trimmedLine: string): boolean {
    return trimmedLine.startsWith(this.START_TAG);
  }

  private static isEndTagLine(trimmedLine: string): boolean {
    return trimmedLine === this.END_TAG;
  }

  private static extractRoleFromStartTag(trimmedLine: string): string {
    return trimmedLine.slice(this.START_TAG.length).trim();
  }

  /**
   * ChatML 문자열을 메시지 배열로 파싱합니다.
   */
  static parse(chatMLString: string): ParseResult {
    const result: ParseResult = {
      success: true,
      messages: [],
      errors: [],
    };

    // 입력 타입 검증
    if (typeof chatMLString !== 'string') {
      return { success: false, messages: [], errors: [`Invalid input type: expected string, got ${typeof chatMLString}`] };
    }

    if (!chatMLString || !chatMLString.trim()) {
      return { success: false, messages: [], errors: ['Empty input'] };
    }

    try {
      // 상태 머신 기반 파서
      // - 라인 단위로 처리하여 태그 라인 앞뒤 공백 허용
      // - 콘텐츠 내 리터럴 태그 보존 (태그와 동일한 단독 라인일 때만 태그로 인식)
      // - CRLF를 LF로 정규화
      const normalized = this.normalizeNewlines(chatMLString);
      const lines = normalized.split('\n');

      let isInsideBlock = false;
      let currentRole: ChatMessage['role'] | null = null;
      let contentLines: string[] = [];

      const flushCurrentBlock = () => {
        if (!isInsideBlock) {
          return;
        }
        if (currentRole !== null) {
          const content = contentLines.join('\n');
          result.messages.push({ role: currentRole, content });
        }
        isInsideBlock = false;
        currentRole = null;
        contentLines = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmedLine = rawLine.trim();

        // 시작 태그 처리
        if (this.isStartTagLine(trimmedLine)) {
          if (isInsideBlock) {
            result.errors.push('Unexpected <|im_start|> before closing previous block.');
            flushCurrentBlock();
          }

          const rolePart = this.extractRoleFromStartTag(trimmedLine);
          isInsideBlock = true;
          contentLines = [];

          const validatedRole = this.validateRole(rolePart);
          if (validatedRole) {
            currentRole = validatedRole;
          } else {
            currentRole = null;
            result.errors.push(`Invalid role: '${rolePart}'`);
          }
          continue;
        }

        // 종료 태그 처리 (단독 라인으로만 인식, 공백 허용)
        if (this.isEndTagLine(trimmedLine)) {
          if (!isInsideBlock) {
            result.errors.push('Unexpected <|im_end|> without a matching start.');
          } else {
            flushCurrentBlock();
          }
          continue;
        }

        // 콘텐츠 라인 처리
        if (isInsideBlock) {
          contentLines.push(rawLine);
          continue;
        }

        // 블록 밖 처리: 주석(`#`)만 허용, 그 외 비정형 텍스트는 에러
        if (trimmedLine.length > 0) {
          if (trimmedLine.startsWith('#')) {
            continue;
          }
          result.errors.push(`Unexpected text outside of message block at line ${i + 1}: '${trimmedLine}'. Prepend '#' to mark comments.`);
        }
      }

      // 입력 종료 시 열린 블록이 있다면 에러
      if (isInsideBlock) {
        result.errors.push('Unclosed message block: missing <|im_end|>.');
        flushCurrentBlock();
      }

      if (result.messages.length === 0) {
        result.errors.push('No valid ChatML messages found.');
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 메시지 배열을 ChatML 문자열로 변환합니다.
   */
  static stringify(messages: ChatMessage[]): string {
    if (!messages || messages.length === 0) {
      return '';
    }

    // Zod를 사용한 전체 배열 유효성 검사
    const validatedMessages = this.validateMessages(messages);
    if (!validatedMessages) {
      // 개별 메시지 검사하여 구체적인 오류 제공
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const validated = this.validateMessage(msg);
        if (!validated) {
          const roleValidation = ChatMessageRoleSchema.safeParse(msg?.role);
          const contentValidation = z.string().safeParse(msg?.content);

          if (!roleValidation.success) {
            throw new Error(`Invalid role '${msg?.role}' at message index ${i}`);
          }
          if (!contentValidation.success) {
            throw new Error(`Invalid content type at message index ${i}: expected string, got ${typeof msg?.content}`);
          }
        }
      }
      throw new Error('Invalid messages array structure');
    }

    return validatedMessages.map(msg => `${this.START_TAG}${msg.role}\n${msg.content}\n${this.END_TAG}`).join('\n');
  }

  /**
   * 유효한 role인지 검사합니다.
   */
  static isValidRole(role: string): role is ChatMessage['role'] {
    const result = ChatMessageRoleSchema.safeParse(role);
    return result.success;
  }

  /**
   * ChatML 포맷 유효성을 검사합니다.
   */
  static validate(chatMLString: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!chatMLString.trim()) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // 기본적인 태그 균형 검사
    const startTagCount = (chatMLString.match(/<\|im_start\|>/g) || []).length;
    const endTagCount = (chatMLString.match(/<\|im_end\|>/g) || []).length;

    if (startTagCount !== endTagCount) {
      errors.push(`Tag mismatch: ${startTagCount} start tags, ${endTagCount} end tags`);
    }

    if (startTagCount === 0) {
      errors.push('No messages found: missing <|im_start|> tags.');
    }

    // 첫 번째와 마지막 태그 검사 (주석과 공백은 무시)
    const normalized = this.normalizeNewlines(chatMLString);
    const lines = normalized.split('\n');
    const nonCommentNonEmptyLines = this.getNonCommentNonEmptyLines(lines);
    if (nonCommentNonEmptyLines.length > 0) {
      const firstLine = nonCommentNonEmptyLines[0];
      const lastLine = nonCommentNonEmptyLines[nonCommentNonEmptyLines.length - 1];
      if (!this.isStartTagLine(firstLine)) {
        errors.push('Input must start with <|im_start|> tag (ignoring comments).');
      }
      if (!this.isEndTagLine(lastLine)) {
        errors.push('Input must end with <|im_end|> tag (ignoring comments).');
      }
    }

    // 파싱 테스트로 추가 검증
    const parseResult = this.parse(chatMLString);
    errors.push(...parseResult.errors);

    // 빈 메시지 경고
    for (const message of parseResult.messages) {
      if (!message.content.trim()) {
        warnings.push(`Empty message found: role '${message.role}'`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 후처리용: 연속된 동일 role의 메시지의 content를 병합합니다.
   */
  static mergeConsecutiveMessagesByRole(messages: ChatMessage[]): ChatMessage[] {
    if (!Array.isArray(messages) || messages.length <= 1) {
      return messages;
    }

    const merged: ChatMessage[] = [];
    for (const message of messages) {
      const last = merged[merged.length - 1];
      if (last && last.role === message.role) {
        // 공백/개행 보존: 어떠한 구분자도 추가하지 않고 그대로 연결
        last.content = `${last.content}${message.content}`;
      } else {
        merged.push({ role: message.role, content: message.content });
      }
    }
    return merged;
  }
}

