-- AlterTable
ALTER TABLE "EmployerPlan" ADD COLUMN "expiresAt" DATETIME;

-- CreateTable
CREATE TABLE "PaymentProviderToken" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'bkash',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
