ALTER TABLE "Job"
ADD COLUMN "featuredUntil" TIMESTAMP(3);

CREATE INDEX "Job_status_featuredUntil_createdAt_idx"
ON "Job"("status", "featuredUntil", "createdAt");

UPDATE "Job"
SET "featuredUntil" = "EmployerPlan"."expiresAt"
FROM "EmployerPlan"
WHERE "EmployerPlan"."userId" = "Job"."employerId"
  AND "EmployerPlan"."plan" = 'GROWTH'
  AND "EmployerPlan"."expiresAt" > CURRENT_TIMESTAMP
  AND "Job"."status" = 'ACTIVE';
