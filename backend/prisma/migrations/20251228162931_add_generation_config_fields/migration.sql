-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_translation_config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    "chunkSize" INTEGER NOT NULL DEFAULT 2000,
    "temperature" REAL NOT NULL DEFAULT 1.0,
    "maxOutputTokens" INTEGER,
    "topP" REAL,
    "topK" INTEGER,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_translation_config" ("chunkSize", "id", "model", "updatedAt") SELECT "chunkSize", "id", "model", "updatedAt" FROM "translation_config";
DROP TABLE "translation_config";
ALTER TABLE "new_translation_config" RENAME TO "translation_config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
