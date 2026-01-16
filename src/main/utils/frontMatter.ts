/**
 * Front Matter 파서 (FSM 기반)
 *
 * YAML Front Matter를 파싱합니다.
 * 정규식 대신 유한 상태 머신(FSM) 방식을 사용하여:
 * - ReDoS 취약점 완전 제거 (항상 O(n))
 * - 명확한 에러 메시지 제공
 * - 엣지 케이스 처리 (trailing space, 빈 Front Matter 등)
 */

export interface FrontMatterResult {
  /** 파싱된 Front Matter 데이터 (raw string) */
  data: string;
  /** Front Matter 이후의 본문 내용 */
  content: string;
}

const DELIMITER = '---';

/**
 * Front Matter를 파싱합니다.
 *
 * @param content - 파싱할 전체 문자열
 * @returns Front Matter 데이터와 본문
 * @throws 유효하지 않은 Front Matter 형식일 경우
 *
 * @example
 * ```ts
 * const result = parseFrontMatter(`---
 * title: Hello
 * ---
 * Body content here`);
 *
 * // result.data = "title: Hello"
 * // result.content = "Body content here"
 * ```
 */
export function parseFrontMatter(content: string): FrontMatterResult {
  const lines = content.split(/\r?\n/);

  // ============================================
  // State 1: EXPECT_OPENING_DELIMITER
  // 첫 줄이 반드시 '---'여야 함
  // ============================================
  if (lines.length === 0 || lines[0].trim() !== DELIMITER) {
    throw new FrontMatterError('missing_opening_delimiter', `Front Matter must start with '${DELIMITER}'`);
  }

  // ============================================
  // State 2: IN_FRONT_MATTER
  // 닫는 '---'를 찾을 때까지 탐색
  // ============================================
  let closingIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === DELIMITER) {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new FrontMatterError('missing_closing_delimiter', `Front Matter must end with '${DELIMITER}'`);
  }

  // ============================================
  // State 3: EXTRACT_CONTENT
  // Front Matter 데이터와 본문 추출
  // ============================================
  const data = lines.slice(1, closingIndex).join('\n');
  const bodyContent = lines.slice(closingIndex + 1).join('\n');

  return {
    data,
    content: bodyContent,
  };
}

/**
 * Front Matter 파싱 에러
 */
export class FrontMatterError extends Error {
  constructor(
    public readonly code: 'missing_opening_delimiter' | 'missing_closing_delimiter',
    message: string
  ) {
    super(message);
    this.name = 'FrontMatterError';
  }
}
