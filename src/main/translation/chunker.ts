// ============================================
// 텍스트 청킹 유틸리티
// ============================================

/**
 * 텍스트를 청크로 분할
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

    if (currentChunk.length + trimmedParagraph.length + 2 <= targetSize) {
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
      currentChunk += trimmedParagraph;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      if (trimmedParagraph.length > targetSize) {
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

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * 문장 단위로 분할
 */
function splitIntoSentences(text: string): string[] {
  const sentencePattern = /[^.!?。？！]+[.!?。？！]+\s*/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentencePattern.exec(text)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = sentencePattern.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }
  }

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
