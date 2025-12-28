import { fileURLToPath } from 'url';
import path from 'path';
//------------------------------------------------------------------------------//
const __filename: string = fileURLToPath(import.meta.url);
export const __dirname: string = path.dirname(__filename);

// 빌드 시 디렉토리 구조가 유지됨: dist/utils/dir.js → __dirname = dist/utils/ → ../../ = backend/
// tsx 개발 실행 시: src/utils/dir.ts → __dirname = src/utils/ → ../../ = backend/
export const backendRoot: string = path.join(__dirname, '../../');
// 참고: src/utils/ 또는 dist/utils/ 어느 쪽이든 ../../로 backend 폴더에 도달
export const projectRoot: string = path.join(backendRoot, '../');
