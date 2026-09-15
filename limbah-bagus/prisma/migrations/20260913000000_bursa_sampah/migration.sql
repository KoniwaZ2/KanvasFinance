-- DropIndex
DROP INDEX "SubscriptionInvoice_paymentId_key";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "qrString" TEXT;

-- AlterTable
ALTER TABLE "TraderProfile" ADD COLUMN "payoutAccountName" TEXT;
ALTER TABLE "TraderProfile" ADD COLUMN "payoutAccountNumber" TEXT;
ALTER TABLE "TraderProfile" ADD COLUMN "payoutBankName" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PickupSchedule";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Subscription";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SubscriptionInvoice";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "WasteTariff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricePerKg" INTEGER NOT NULL,
    "regulationRef" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "WasteListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traderId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "estimatedKg" INTEGER NOT NULL,
    "readyDate" DATETIME NOT NULL,
    "readyWindow" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WasteListing_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "TraderProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WasteListing_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "WasteTariff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WastePurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "processorId" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "unitPricePerKg" INTEGER NOT NULL,
    "estimatedKg" INTEGER NOT NULL,
    "estimatedAmount" INTEGER NOT NULL,
    "actualKg" INTEGER,
    "finalAmount" INTEGER,
    "platformFee" INTEGER NOT NULL DEFAULT 2000,
    "feeStatus" TEXT NOT NULL DEFAULT 'outstanding',
    "pickupDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "paymentMethod" TEXT,
    "weighedAt" DATETIME,
    "paidAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WastePurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "WasteListing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WastePurchase_processorId_fkey" FOREIGN KEY ("processorId") REFERENCES "ProcessorProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WastePurchase_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "WasteTariff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WastePurchase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" DATETIME NOT NULL,
    "settledAt" DATETIME,
    "reference" TEXT,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "WastePurchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payout_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "TraderProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImpactRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "wasteKg" INTEGER NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpactRecord_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "WastePurchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ImpactRecord" ("id", "recordedAt", "wasteKg") SELECT "id", "recordedAt", "wasteKg" FROM "ImpactRecord";
DROP TABLE "ImpactRecord";
ALTER TABLE "new_ImpactRecord" RENAME TO "ImpactRecord";
CREATE UNIQUE INDEX "ImpactRecord_purchaseId_key" ON "ImpactRecord"("purchaseId");
CREATE TABLE "new_ProcessorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacityKgPerDay" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'unit_bsf',
    "buysWaste" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProcessorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProcessorProfile" ("capacityKgPerDay", "description", "id", "kind", "location", "unitName", "userId") SELECT "capacityKgPerDay", "description", "id", "kind", "location", "unitName", "userId" FROM "ProcessorProfile";
DROP TABLE "ProcessorProfile";
ALTER TABLE "new_ProcessorProfile" RENAME TO "ProcessorProfile";
CREATE UNIQUE INDEX "ProcessorProfile_userId_key" ON "ProcessorProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WastePurchase_listingId_key" ON "WastePurchase"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "WastePurchase_paymentId_key" ON "WastePurchase"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_purchaseId_key" ON "Payout"("purchaseId");
