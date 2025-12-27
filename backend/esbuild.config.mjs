import { build } from 'esbuild';

// 네이티브/런타임 종속성은 번들에서 제외해야 합니다.
const externals = [
  // Prisma 7 (순수 TS + WASM 기반, Rust Engine 제거됨)
  // - WASM 동적 로딩 및 Generated Client 경로 문제로 external 유지 필요
  '@prisma/client',
  '@prisma/client-runtime-utils',
  '@prisma/adapter-better-sqlite3',
  'prisma',
  '.prisma/client',

  // SQLite (Prisma 7 adapter)
  'better-sqlite3',

  // Native
  '@node-rs/argon2',

  // FFmpeg/FFprobe installers (네이티브 바이너리 포함)
  '@ffmpeg-installer/ffmpeg',
  '@ffprobe-installer/ffprobe',
];

// 상대 경로로 임포트되는 Prisma generated client를 external 처리하는 플러그인
const externalizeGeneratedClient = {
  name: 'externalize-generated-client',
  setup(build) {
    build.onResolve({ filter: /prismaclient(\/.*)?$/ }, () => {
      return { path: './database/prismaclient/index.js', external: true };
    });
  },
};

await build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  splitting: false,
  packages: 'bundle',
  // ESM 번들에서 CJS require가 필요한 경우(일부 의존성 내부), Node의 require를 주입
  banner: {
    js: 'import { createRequire as __esbuild_createRequire } from "node:module"; const require = __esbuild_createRequire(import.meta.url);',
  },
  //압축 및 최적화 옵션들
  minify: true,
  keepNames: false,
  treeShaking: true,
  legalComments: 'none',
  logLevel: 'info',
  // 문제 소지가 있는 의존성들은 external 처리
  external: [
    ...externals,
    // Node.js 내장 모듈(node:*)은 번들에서 제외
    'node:*',
  ],
  plugins: [externalizeGeneratedClient],
});
