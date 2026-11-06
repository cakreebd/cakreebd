ALTER TABLE "Job"
ADD COLUMN "deadlineAt" TIMESTAMP(3);

UPDATE "Job"
SET "deadlineAt" = "createdAt" + INTERVAL '1 month';

ALTER TABLE "Job"
ALTER COLUMN "deadlineAt" SET NOT NULL;

CREATE INDEX "Job_status_deadlineAt_idx"
ON "Job"("status", "deadlineAt");
