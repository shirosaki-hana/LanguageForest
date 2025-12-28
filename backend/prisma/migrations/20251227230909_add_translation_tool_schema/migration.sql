-- CreateTable
CREATE TABLE "translation_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "chunkSize" INTEGER NOT NULL DEFAULT 2000,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "translation_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "memo" TEXT,
    "customDict" TEXT,
    "sourceText" TEXT,
    "translatedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "translation_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER,
    "processingTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "translation_chunks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "translation_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "translation_sessions_status_idx" ON "translation_sessions"("status");

-- CreateIndex
CREATE INDEX "translation_sessions_createdAt_idx" ON "translation_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "translation_chunks_sessionId_idx" ON "translation_chunks"("sessionId");

-- CreateIndex
CREATE INDEX "translation_chunks_status_idx" ON "translation_chunks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "translation_chunks_sessionId_order_key" ON "translation_chunks"("sessionId", "order");
