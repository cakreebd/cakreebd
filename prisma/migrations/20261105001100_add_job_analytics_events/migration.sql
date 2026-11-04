CREATE TABLE "JobAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "jobId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobAnalyticsEvent_jobId_eventType_createdAt_idx"
ON "JobAnalyticsEvent"("jobId", "eventType", "createdAt");

ALTER TABLE "JobAnalyticsEvent"
ADD CONSTRAINT "JobAnalyticsEvent_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
