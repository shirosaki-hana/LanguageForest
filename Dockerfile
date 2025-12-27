# =============================================================================
# TemplateForest Dockerfile
# Multi-stage build for optimized production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base image with pnpm
# -----------------------------------------------------------------------------
FROM node:24-slim AS base

# pnpm 설치
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Dependencies installer (with native module build)
# -----------------------------------------------------------------------------
FROM base AS deps

# 네이티브 모듈 빌드에 필요한 도구 (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 워크스페이스 설정 파일들 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# 각 패키지의 package.json 복사
COPY types/package.json ./types/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# 의존성 설치 (better-sqlite3 네이티브 빌드 포함)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Types package build
# -----------------------------------------------------------------------------
FROM deps AS types-builder

COPY types ./types
RUN pnpm --filter types run build

# -----------------------------------------------------------------------------
# Stage 4: Frontend build
# -----------------------------------------------------------------------------
FROM deps AS frontend-builder

# types 빌드 결과물 복사
COPY --from=types-builder /app/types ./types

# 프론트엔드 소스 복사 및 빌드
COPY frontend ./frontend
RUN pnpm --filter frontend run build

# -----------------------------------------------------------------------------
# Stage 5: Backend build
# -----------------------------------------------------------------------------
FROM deps AS backend-builder

# types 빌드 결과물 복사
COPY --from=types-builder /app/types ./types

# 백엔드 소스 복사
COPY backend ./backend

# Prisma 클라이언트 생성 및 백엔드 빌드
RUN pnpm --filter backend run build

# -----------------------------------------------------------------------------
# Stage 6: Production runtime
# -----------------------------------------------------------------------------
FROM node:24-slim AS production

# 런타임 + 빌드 도구 설치 (better-sqlite3 네이티브 빌드 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# node:24-slim 이미지에는 이미 node 사용자(UID/GID 1000)가 존재함
# 별도의 사용자 생성 없이 기존 node 사용자 활용

WORKDIR /app

# pnpm 설치
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# 워크스페이스 설정 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./

# 각 패키지의 package.json 복사
COPY types/package.json ./types/
COPY backend/package.json ./backend/

# 프로덕션 의존성 설치 (better-sqlite3 네이티브 빌드 포함)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# 빌드 도구 제거 (이미지 크기 최적화)
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y && apt-get clean

# 빌드된 결과물 복사 (--chown으로 소유권 설정)
COPY --chown=node:node --from=types-builder /app/types/dist ./types/dist
COPY --chown=node:node --from=backend-builder /app/backend/dist ./backend/dist
COPY --chown=node:node --from=backend-builder /app/backend/prisma ./backend/prisma
COPY --chown=node:node --from=frontend-builder /app/frontend/dist ./frontend/dist

# 쓰기 권한이 필요한 디렉토리만 생성 및 권한 설정
RUN mkdir -p /app/data \
    && chown -R node:node /app/data

# 환경 변수 기본값
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4001
ENV DATABASE_URL_SQLITE=file:/app/data/templateforest.db

# 포트 노출
EXPOSE 4001

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:4001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# non-root 사용자로 전환
USER node

# 서버 시작 (마이그레이션 실행 후)
CMD ["sh", "-c", "pnpm --filter backend db:deploy && node /app/backend/dist/index.js"]
