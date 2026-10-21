-- AlterTable
ALTER TABLE "JobAlert" ADD COLUMN "lastNotifiedAt" DATETIME;

-- CreateTable
CREATE TABLE "CandidateResume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "targetRole" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CandidateResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResumeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ResumeSection_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "CandidateResume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "employerResponse" TEXT,
    "moderatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanyReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompanyReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompanyReview_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployerPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amountBdt" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "providerTransactionId" TEXT,
    "checkoutUrl" TEXT,
    "failureReason" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployerPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'JOB_SEEKER',
    "phone" TEXT,
    "location" TEXT,
    "headline" TEXT,
    "bio" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "cvFileName" TEXT,
    "cvStorageKey" TEXT,
    "companyName" TEXT,
    "companyBio" TEXT,
    "website" TEXT,
    "profileVisible" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bio", "companyBio", "companyName", "createdAt", "cvFileName", "cvStorageKey", "email", "headline", "id", "location", "name", "passwordHash", "phone", "profileVisible", "role", "skills", "updatedAt", "website") SELECT "bio", "companyBio", "companyName", "createdAt", "cvFileName", "cvStorageKey", "email", "headline", "id", "location", "name", "passwordHash", "phone", "profileVisible", "role", "skills", "updatedAt", "website" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CandidateResume_userId_key" ON "CandidateResume"("userId");

-- CreateIndex
CREATE INDEX "ResumeSection_resumeId_sortOrder_idx" ON "ResumeSection"("resumeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyReview_applicationId_key" ON "CompanyReview"("applicationId");

-- CreateIndex
CREATE INDEX "CompanyReview_employerId_status_createdAt_idx" ON "CompanyReview"("employerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyReview_authorId_createdAt_idx" ON "CompanyReview"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerPayment_invoiceNumber_key" ON "EmployerPayment"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerPayment_providerPaymentId_key" ON "EmployerPayment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerPayment_providerTransactionId_key" ON "EmployerPayment"("providerTransactionId");

-- CreateIndex
CREATE INDEX "EmployerPayment_userId_status_createdAt_idx" ON "EmployerPayment"("userId", "status", "createdAt");
