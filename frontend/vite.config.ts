import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// pnpm(.pnpm) 구조까지 고려해 node_modules 경로에서 실제 패키지 이름을 추출
function getPackageName(id: string): string | null {
  if (!id.includes('node_modules')) return null;

  // 예:
  // - node_modules/react/index.js
  // - node_modules/.pnpm/react@19.2.0/node_modules/react/index.js
  // - node_modules/.pnpm/@mui+material@7.3.5/node_modules/@mui/material/index.js
  const match = id.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/);

  return match ? match[1] : null;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // debug 모드: 소스맵 포함, 난독화 제거 (프로덕션 버그 추적용)
  // 사용법: pnpm build:debug 또는 vite build --mode debug
  const isDebug = mode === 'debug';

  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      target: 'es2023',
      chunkSizeWarningLimit: 900,
      sourcemap: isDebug, // debug 모드에서 소스맵 생성
      minify: !isDebug, // debug 모드에서 난독화 비활성화
      rollupOptions: {
        output: {
          // 자동 청크 분리: pnpm 구조까지 고려해 패키지 단위로 분리
          manualChunks(id) {
            const packageName = getPackageName(id);
            if (!packageName) return;

            // React 코어 + React를 peerDependency로 사용하는 라이브러리들
            // MUI + Emotion도 React 컨텍스트를 많이 사용하므로 통합
            if (
              packageName === 'react' ||
              packageName === 'react-dom' ||
              packageName === 'scheduler' ||
              packageName === 'react-router-dom' ||
              packageName === 'react-router' ||
              packageName === 'react-i18next' ||
              packageName === 'use-sync-external-store' ||
              packageName.startsWith('@mui/') ||
              packageName.startsWith('@emotion/')
            ) {
              return 'vendor-react';
            }

            // HTTP 클라이언트
            if (packageName === 'axios') {
              return 'vendor-http';
            }

            // i18n 코어 (react-i18next 제외 - React 청크에 포함)
            if (packageName === 'i18next') {
              return 'vendor-i18n';
            }

            // 상태 관리 (zustand는 React 컨텍스트를 직접 사용하지 않으므로 분리 가능)
            if (packageName === 'zustand') {
              return 'vendor-state';
            }

            return;
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4001',
          changeOrigin: true,
          secure: false,
          ws: true, // 웹소켓 프록시 활성화
        },
      },
    },
  };
});
