-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProcessorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacityKgPerDay" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'unit_bsf',
    "acceptsPickup" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProcessorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProcessorProfile" ("capacityKgPerDay", "description", "id", "location", "unitName", "userId") SELECT "capacityKgPerDay", "description", "id", "location", "unitName", "userId" FROM "ProcessorProfile";
DROP TABLE "ProcessorProfile";
ALTER TABLE "new_ProcessorProfile" RENAME TO "ProcessorProfile";
CREATE UNIQUE INDEX "ProcessorProfile_userId_key" ON "ProcessorProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
