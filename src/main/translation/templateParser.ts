import Handlebars from 'handlebars';

/**
 * 템플릿에서 사용 가능한 기본 값 타입들
 */
export type TemplateValue = string | number | boolean | null | undefined | TemplateObject | TemplateValue[];

/**
 * 템플릿 객체 타입 (중첩 가능)
 */
export interface TemplateObject {
  [key: string]: TemplateValue;
}

/**
 * 템플릿 변수 데이터 타입
 */
export type TemplateData = TemplateObject;

/**
 * 템플릿 파서 옵션
 */
export interface TemplateParserOptions {
  strict?: boolean;
  noEscape?: boolean;
}

/**
 * 커스텀 헬퍼 함수 타입
 */
export type HelperFunction = Handlebars.HelperDelegate;

/**
 * 커스텀 헬퍼 등록 정보
 */
export interface HelperRegistry {
  [helperName: string]: HelperFunction;
}

/**
 * Handlebars 기반 템플릿 파서
 */
export class TemplateParser {
  private handlebars: typeof Handlebars;
  private options: TemplateParserOptions;
  private customHelpers: HelperRegistry = {};

  constructor(options: TemplateParserOptions = {}) {
    this.options = {
      strict: false,
      noEscape: false,
      ...options,
    };

    this.handlebars = Handlebars.create();
    this.setupDefaultConfiguration();
  }

  public parse(template: string, data: TemplateData = {}): string {
    try {
      const compiledTemplate = this.getCompiledTemplate(template);
      const result = compiledTemplate(data);
      return result;
    } catch (error) {
      throw new Error(`Template parsing error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public registerHelper(name: string, helperFn: HelperFunction): void {
    this.customHelpers[name] = helperFn;
    this.handlebars.registerHelper(name, helperFn);
  }

  public registerHelpers(helpers: HelperRegistry): void {
    Object.entries(helpers).forEach(([name, helperFn]) => {
      this.registerHelper(name, helperFn);
    });
  }

  public getRegisteredHelpers(): string[] {
    return Object.keys(this.customHelpers);
  }

  private getCompiledTemplate(template: string): Handlebars.TemplateDelegate {
    const compiledTemplate = this.handlebars.compile(template, {
      noEscape: this.options.noEscape,
      strict: this.options.strict,
    });
    return compiledTemplate;
  }

  private setupDefaultConfiguration(): void {
    if (this.options.strict) {
      this.handlebars.registerHelper('helperMissing', function (...args: unknown[]) {
        const options = args[args.length - 1] as { name?: string };
        const helperName = options?.name || 'unknown';
        throw new Error(`Unknown helper: ${helperName}`);
      });
    }
  }
}

let defaultParser: TemplateParser | null = null;

export function getDefaultTemplateParser(options?: TemplateParserOptions): TemplateParser {
  if (!defaultParser) {
    defaultParser = new TemplateParser(options);
  }
  return defaultParser;
}

export function parseTemplate(template: string, data: TemplateData = {}): string {
  return getDefaultTemplateParser().parse(template, data);
}
