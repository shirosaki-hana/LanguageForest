import { fileURLToPath } from 'url';
import path from 'path';
//------------------------------------------------------------------------------//
const __filename: string = fileURLToPath(import.meta.url);
export const __dirname: string = path.dirname(__filename);

// esbuild 번들링 시: dist/index.js → __dirname = dist/ → ../ = backend/
// tsx 개발 실행 시: src/utils/dir.ts → __dirname = src/utils/ → ../../ = backend/
const isInSrc = __dirname.includes(path.sep + 'src' + path.sep) || __dirname.endsWith(path.sep + 'src');
export const backendRoot: string = isInSrc
  ? path.join(__dirname, '../../') // 개발: src/utils → backend
  : path.join(__dirname, '../'); // 프로덕션: dist → backend
export const projectRoot: string = path.join(backendRoot, '../');
