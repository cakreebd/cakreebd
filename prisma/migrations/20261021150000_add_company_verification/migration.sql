CREATE TABLE "CompanyVerification" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "legalCompanyName" TEXT NOT NULL,
    "registrationAuthority" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "CompanyVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyVerification_employerId_key" ON "CompanyVerification"("employerId");
CREATE INDEX "CompanyVerification_status_submittedAt_idx" ON "CompanyVerification"("status", "submittedAt");
CREATE INDEX "CompanyVerification_reviewedById_idx" ON "CompanyVerification"("reviewedById");

ALTER TABLE "CompanyVerification"
ADD CONSTRAINT "CompanyVerification_employerId_fkey"
FOREIGN KEY ("employerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyVerification"
ADD CONSTRAINT "CompanyVerification_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
