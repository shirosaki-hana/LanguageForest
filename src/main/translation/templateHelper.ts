import { z } from 'zod';
import type { TemplateParser, HelperRegistry } from './templateParser';

/**
 * 기본 템플릿 헬퍼들을 파서에 등록합니다.
 */
export function registerDefaultHelpers(parser: TemplateParser): void {
  const helpers: HelperRegistry = {
    // 문자열 변환
    uppercase(this: unknown, value: unknown) {
      const toStringSchema = z.preprocess(v => (typeof v === 'string' ? v : String(v ?? '')), z.string());
      const text = toStringSchema.parse(value);
      return text.toUpperCase();
    },
    lowercase(this: unknown, value: unknown) {
      const toStringSchema = z.preprocess(v => (typeof v === 'string' ? v : String(v ?? '')), z.string());
      const text = toStringSchema.parse(value);
      return text.toLowerCase();
    },

    // 비교/논리 연산
    eq(this: unknown, a: unknown, b: unknown) {
      return a === b;
    },
    ne(this: unknown, a: unknown, b: unknown) {
      return a !== b;
    },
    gt(this: unknown, a: unknown, b: unknown) {
      const num = z.coerce.number();
      const la = num.safeParse(a);
      const lb = num.safeParse(b);
      if (!la.success || !lb.success) {
        return false;
      }
      return la.data > lb.data;
    },
    gte(this: unknown, a: unknown, b: unknown) {
      const num = z.coerce.number();
      const la = num.safeParse(a);
      const lb = num.safeParse(b);
      if (!la.success || !lb.success) {
        return false;
      }
      return la.data >= lb.data;
    },
    lt(this: unknown, a: unknown, b: unknown) {
      const num = z.coerce.number();
      const la = num.safeParse(a);
      const lb = num.safeParse(b);
      if (!la.success || !lb.success) {
        return false;
      }
      return la.data < lb.data;
    },
    lte(this: unknown, a: unknown, b: unknown) {
      const num = z.coerce.number();
      const la = num.safeParse(a);
      const lb = num.safeParse(b);
      if (!la.success || !lb.success) {
        return false;
      }
      return la.data <= lb.data;
    },
    and(this: unknown, ...args: unknown[]) {
      const values = args.slice(0, -1);
      const boolFromTruthiness = z.preprocess(v => Boolean(v), z.boolean());
      return values.every(v => boolFromTruthiness.parse(v));
    },
    or(this: unknown, ...args: unknown[]) {
      const values = args.slice(0, -1);
      const boolFromTruthiness = z.preprocess(v => Boolean(v), z.boolean());
      return values.some(v => boolFromTruthiness.parse(v));
    },
    not(this: unknown, value: unknown) {
      const boolFromTruthiness = z.preprocess(v => Boolean(v), z.boolean());
      return !boolFromTruthiness.parse(value);
    },

    // 배열/객체/문자열 유틸
    json(this: unknown, value: unknown, space?: unknown) {
      const indent = z.coerce.number().int().min(0).catch(0).parse(space);
      try {
        return JSON.stringify(value, null, indent);
      } catch {
        return '';
      }
    },
    join(this: unknown, value: unknown, separator?: unknown) {
      const sep = z.coerce
        .string()
        .default(', ')
        .catch(', ')
        .parse(separator as string | undefined);
      const arrayCheck = z.array(z.unknown());
      const parsed = arrayCheck.safeParse(value);
      return parsed.success ? parsed.data.join(sep) : '';
    },
    length(this: unknown, value: unknown) {
      if (typeof value === 'string') {
        return value.length;
      }
      if (Array.isArray(value)) {
        return value.length;
      }
      const objResult = z.record(z.string(), z.unknown()).safeParse(value);
      return objResult.success ? Object.keys(objResult.data).length : 0;
    },
    slice(this: unknown, value: unknown, start: unknown, end?: unknown) {
      const s = z.coerce.number().int().catch(0).parse(start);
      const e = end === undefined ? undefined : z.coerce.number().int().optional().catch(undefined).parse(end);
      if (typeof value === 'string') {
        return value.slice(s, e);
      }
      if (Array.isArray(value)) {
        return (value as unknown[]).slice(s, e);
      }
      return '';
    },
  };

  parser.registerHelpers(helpers);
}
