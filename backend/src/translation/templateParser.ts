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
 * 최상위 레벨의 템플릿 데이터는 항상 객체 형태
 */
export type TemplateData = TemplateObject;

/**
 * 템플릿 파서 옵션
 */
export interface TemplateParserOptions {
  /** 엄격 모드 (등록되지 않은 헬퍼 사용 시 에러) */
  strict?: boolean;
  /** 빈 값 처리 방식 */
  noEscape?: boolean;
}

/**
 * 커스텀 헬퍼 함수 타입
 * Handlebars 내장 HelperDelegate와 호환되도록 정의
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
 *
 * 기본 콧수염 문법을 지원하며, 나중에 커스텀 헬퍼와
 * 변수 처리 로직을 확장할 수 있도록 설계되었습니다.
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

    // Create an isolated Handlebars instance
    this.handlebars = Handlebars.create();

    // Apply default configuration
    this.setupDefaultConfiguration();
  }

  /**
   * 템플릿 문자열을 파싱하여 결과 반환
   *
   * @param template 템플릿 문자열 (콧수염 문법 포함)
   * @param data 템플릿에 적용할 데이터
   * @returns 파싱된 결과 문자열
   */
  public parse(template: string, data: TemplateData = {}): string {
    try {
      const compiledTemplate = this.getCompiledTemplate(template);
      const result = compiledTemplate(data);

      return result;
    } catch (error) {
      throw new Error(`Template parsing error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 커스텀 헬퍼 등록
   *
   * @param name 헬퍼 이름
   * @param helperFn 헬퍼 함수
   */
  public registerHelper(name: string, helperFn: HelperFunction): void {
    this.customHelpers[name] = helperFn;
    this.handlebars.registerHelper(name, helperFn);
  }

  /**
   * 여러 커스텀 헬퍼를 한 번에 등록
   *
   * @param helpers 헬퍼 레지스트리
   */
  public registerHelpers(helpers: HelperRegistry): void {
    Object.entries(helpers).forEach(([name, helperFn]) => {
      this.registerHelper(name, helperFn);
    });
  }

  /**
   * 등록된 헬퍼 목록 조회
   *
   * @returns 등록된 헬퍼의 이름 배열
   */
  public getRegisteredHelpers(): string[] {
    return Object.keys(this.customHelpers);
  }

  /**
   * 컴파일된 템플릿 가져오기 (캐싱 지원)
   */
  private getCompiledTemplate(template: string): Handlebars.TemplateDelegate {
    // Always compile; caching is deprecated and disabled
    const compiledTemplate = this.handlebars.compile(template, {
      noEscape: this.options.noEscape,
      strict: this.options.strict,
    });
    return compiledTemplate;
  }

  /**
   * 기본 Handlebars 설정
   */
  private setupDefaultConfiguration(): void {
    // 엄격 모드 설정
    if (this.options.strict) {
      this.handlebars.registerHelper('helperMissing', function (...args: unknown[]) {
        const options = args[args.length - 1] as { name?: string };
        const helperName = options?.name || 'unknown';
        throw new Error(`Unknown helper: ${helperName}`);
      });
    }
  }
}

/**
 * 기본 템플릿 파서 인스턴스 (싱글톤)
 */
let defaultParser: TemplateParser | null = null;

/**
 * 기본 템플릿 파서 인스턴스 가져오기
 *
 * @param options 파서 옵션 (처음 호출 시에만 적용)
 * @returns 템플릿 파서 인스턴스
 */
export function getDefaultTemplateParser(options?: TemplateParserOptions): TemplateParser {
  if (!defaultParser) {
    defaultParser = new TemplateParser(options);
  }
  return defaultParser;
}

/**
 * 편의 함수: 기본 파서로 템플릿 파싱
 *
 * @param template 템플릿 문자열
 * @param data 템플릿 데이터
 * @returns 파싱된 결과
 */
export function parseTemplate(template: string, data: TemplateData = {}): string {
  return getDefaultTemplateParser().parse(template, data);
}

