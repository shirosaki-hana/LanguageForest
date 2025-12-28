import { readFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { projectRoot } from '../utils/dir.js';

// ============================================
// 타입 정의
// ============================================

const TemplateFrontmatterSchema = z.object({
  title: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  description: z.string().optional(),
});

export interface PromptTemplate {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  description?: string;
  content: string;
  filePath: string;
}

// ============================================
// 템플릿 서비스 (싱글톤)
// ============================================

class TemplateService {
  private templates: Map<string, PromptTemplate> = new Map();
  private initialized = false;

  /**
   * 서버 시작 시 템플릿 로드
   * 템플릿이 없으면 예외 발생
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    const promptDir = join(projectRoot, 'prompt');

    // 디렉터리 스캔
    let files: string[];
    try {
      files = readdirSync(promptDir).filter(f => extname(f) === '.chatml');
    } catch {
      throw new Error(`Failed to read prompt directory: ${promptDir}. Make sure the 'prompt' directory exists.`);
    }

    if (files.length === 0) {
      throw new Error(`No .chatml template files found in ${promptDir}. At least one template is required.`);
    }

    // 각 파일 로드
    for (const file of files) {
      const filePath = join(promptDir, file);
      const id = basename(file, '.chatml');

      try {
        const content = readFileSync(filePath, 'utf-8');
        const parsed = matter(content);

        // frontmatter 검증
        const frontmatter = TemplateFrontmatterSchema.parse(parsed.data);

        const template: PromptTemplate = {
          id,
          title: frontmatter.title,
          sourceLanguage: frontmatter.sourceLanguage,
          targetLanguage: frontmatter.targetLanguage,
          description: frontmatter.description,
          content: parsed.content,
          filePath,
        };

        this.templates.set(id, template);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load template '${file}': ${message}`);
      }
    }

    this.initialized = true;
  }

  /**
   * 모든 템플릿 목록 반환 (content 제외)
   */
  getAll(): Omit<PromptTemplate, 'content' | 'filePath'>[] {
    this.ensureInitialized();

    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      title: t.title,
      sourceLanguage: t.sourceLanguage,
      targetLanguage: t.targetLanguage,
      description: t.description,
    }));
  }

  /**
   * ID로 템플릿 조회
   */
  getById(id: string): PromptTemplate | undefined {
    this.ensureInitialized();
    return this.templates.get(id);
  }

  /**
   * ID로 템플릿 조회 (없으면 예외)
   */
  getByIdOrThrow(id: string): PromptTemplate {
    const template = this.getById(id);
    if (!template) {
      throw Object.assign(new Error(`Template not found: ${id}`), { statusCode: 404 });
    }
    return template;
  }

  /**
   * 템플릿 개수
   */
  count(): number {
    this.ensureInitialized();
    return this.templates.size;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TemplateService is not initialized. Call initialize() first.');
    }
  }
}

// 싱글톤 인스턴스
export const templateService = new TemplateService();
