import { z } from 'zod';
import type { ChatMessage } from './types';
import { ChatMessageRoleSchema, ChatMessageSchema } from './types';

// ============================================
// ChatML 파서
// ============================================

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

export type ZodParseResult = z.infer<typeof ParseResultSchema>;
export type ZodValidationResult = z.infer<typeof ValidationResultSchema>;

export class ChatMLParser {
  private static readonly START_TAG = '<|im_start|>';
  private static readonly END_TAG = '<|im_end|>';

  private constructor() {}

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

  private static normalizeNewlines(input: string): string {
    return input.replace(/\r\n/g, '\n');
  }

  private static getNonCommentNonEmptyLines(lines: string[]): string[] {
    return lines.map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#'));
  }

  private static isStartTagLine(trimmedLine: string): boolean {
    return trimmedLine.startsWith(this.START_TAG);
  }

  private static isEndTagLine(trimmedLine: string): boolean {
    return trimmedLine === this.END_TAG;
  }

  private static extractRoleFromStartTag(trimmedLine: string): string {
    return trimmedLine.slice(this.START_TAG.length).trim();
  }

  static parse(chatMLString: string): ParseResult {
    const result: ParseResult = {
      success: true,
      messages: [],
      errors: [],
    };

    if (typeof chatMLString !== 'string') {
      return {
        success: false,
        messages: [],
        errors: [`Invalid input type: expected string, got ${typeof chatMLString}`],
      };
    }

    if (!chatMLString || !chatMLString.trim()) {
      return { success: false, messages: [], errors: ['Empty input'] };
    }

    try {
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

        if (this.isEndTagLine(trimmedLine)) {
          if (!isInsideBlock) {
            result.errors.push('Unexpected <|im_end|> without a matching start.');
          } else {
            flushCurrentBlock();
          }
          continue;
        }

        if (isInsideBlock) {
          contentLines.push(rawLine);
          continue;
        }

        if (trimmedLine.length > 0) {
          if (trimmedLine.startsWith('#')) {
            continue;
          }
          result.errors.push(`Unexpected text outside of message block at line ${i + 1}: '${trimmedLine}'. Prepend '#' to mark comments.`);
        }
      }

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

  static stringify(messages: ChatMessage[]): string {
    if (!messages || messages.length === 0) {
      return '';
    }

    const validatedMessages = this.validateMessages(messages);
    if (!validatedMessages) {
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

  static isValidRole(role: string): role is ChatMessage['role'] {
    const result = ChatMessageRoleSchema.safeParse(role);
    return result.success;
  }

  static validate(chatMLString: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!chatMLString.trim()) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const startTagCount = (chatMLString.match(/<\|im_start\|>/g) || []).length;
    const endTagCount = (chatMLString.match(/<\|im_end\|>/g) || []).length;

    if (startTagCount !== endTagCount) {
      errors.push(`Tag mismatch: ${startTagCount} start tags, ${endTagCount} end tags`);
    }

    if (startTagCount === 0) {
      errors.push('No messages found: missing <|im_start|> tags.');
    }

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

    const parseResult = this.parse(chatMLString);
    errors.push(...parseResult.errors);

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

  static mergeConsecutiveMessagesByRole(messages: ChatMessage[]): ChatMessage[] {
    if (!Array.isArray(messages) || messages.length <= 1) {
      return messages;
    }

    const merged: ChatMessage[] = [];
    for (const message of messages) {
      const last = merged[merged.length - 1];
      if (last && last.role === message.role) {
        last.content = `${last.content}${message.content}`;
      } else {
        merged.push({ role: message.role, content: message.content });
      }
    }
    return merged;
  }
}
