-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "midtransOrderId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "grossAmount" INTEGER NOT NULL,
    "method" TEXT,
    "qrisUrl" TEXT,
    "qrString" TEXT,
    "expiryAt" DATETIME,
    "paidAt" DATETIME,
    "rawNotification" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Payment" ("createdAt", "expiryAt", "grossAmount", "id", "lastCheckedAt", "method", "midtransOrderId", "paidAt", "purpose", "qrString", "qrisUrl", "rawNotification", "status", "updatedAt") SELECT "createdAt", "expiryAt", "grossAmount", "id", "lastCheckedAt", "method", "midtransOrderId", "paidAt", "purpose", "qrString", "qrisUrl", "rawNotification", "status", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_midtransOrderId_key" ON "Payment"("midtransOrderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
