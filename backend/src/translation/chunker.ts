// ============================================
// 텍스트 청킹 유틸리티
// ============================================

/**
 * 텍스트를 청크로 분할
 * - 문단(빈 줄) 단위로 우선 분할
 * - 문단이 목표 크기보다 크면 문장 단위로 분할
 * - 문장도 너무 길면 강제 분할
 */
export function splitIntoChunks(text: string, targetSize: number): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];

  // 문단 단위로 분할 (빈 줄 기준)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    // 현재 청크에 문단을 추가해도 목표 크기 이내인 경우
    if (currentChunk.length + trimmedParagraph.length + 2 <= targetSize) {
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
      currentChunk += trimmedParagraph;
    } else {
      // 현재 청크가 있으면 저장
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // 문단 자체가 목표 크기보다 큰 경우
      if (trimmedParagraph.length > targetSize) {
        // 문장 단위로 분할 시도
        const sentences = splitIntoSentences(trimmedParagraph);

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= targetSize) {
            if (currentChunk.length > 0) {
              currentChunk += ' ';
            }
            currentChunk += sentence;
          } else {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk);
              currentChunk = '';
            }

            // 문장도 너무 긴 경우 강제 분할
            if (sentence.length > targetSize) {
              const forceSplit = forceChunkSplit(sentence, targetSize);
              chunks.push(...forceSplit.slice(0, -1));
              currentChunk = forceSplit[forceSplit.length - 1] || '';
            } else {
              currentChunk = sentence;
            }
          }
        }
      } else {
        currentChunk = trimmedParagraph;
      }
    }
  }

  // 마지막 청크 저장
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 문장 단위로 분할
 */
function splitIntoSentences(text: string): string[] {
  // 한국어/영어 문장 종결 패턴
  const sentencePattern = /[^.!?。？！]+[.!?。？！]+\s*/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentencePattern.exec(text)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = sentencePattern.lastIndex;
  }

  // 마지막 남은 텍스트
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }
  }

  // 문장이 없으면 원본 반환
  if (sentences.length === 0 && text.trim().length > 0) {
    return [text.trim()];
  }

  return sentences;
}

/**
 * 강제 청크 분할 (마지막 수단)
 */
function forceChunkSplit(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxSize) {
    // 공백 위치에서 분할 시도
    let splitIndex = remaining.lastIndexOf(' ', maxSize);
    if (splitIndex === -1 || splitIndex < maxSize * 0.5) {
      splitIndex = maxSize;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

