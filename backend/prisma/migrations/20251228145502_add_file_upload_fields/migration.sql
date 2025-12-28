-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_translation_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "model" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL DEFAULT 2000,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_translation_config" ("chunkSize", "id", "model", "updatedAt") SELECT "chunkSize", "id", "model", "updatedAt" FROM "translation_config";
DROP TABLE "translation_config";
ALTER TABLE "new_translation_config" RENAME TO "translation_config";
CREATE TABLE "new_translation_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "memo" TEXT,
    "customDict" TEXT,
    "originalFileName" TEXT,
    "sourceText" TEXT,
    "translatedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_translation_sessions" ("createdAt", "customDict", "id", "memo", "sourceText", "status", "title", "translatedText", "updatedAt") SELECT "createdAt", "customDict", "id", "memo", "sourceText", "status", "title", "translatedText", "updatedAt" FROM "translation_sessions";
DROP TABLE "translation_sessions";
ALTER TABLE "new_translation_sessions" RENAME TO "translation_sessions";
CREATE INDEX "translation_sessions_status_idx" ON "translation_sessions"("status");
CREATE INDEX "translation_sessions_createdAt_idx" ON "translation_sessions"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
