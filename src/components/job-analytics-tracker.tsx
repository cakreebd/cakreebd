"use client";

import { useEffect } from "react";

type JobAnalyticsEvent = "VIEW" | "APPLY_CLICK";

export async function recordJobAnalytics(jobId: string, eventType: JobAnalyticsEvent) {
  try {
    const response = await fetch(`/api/jobs/${jobId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType }),
      keepalive: true,
    });
    if (!response.ok) {
      throw new Error(`Analytics request failed with status ${response.status}.`);
    }
  } catch (error) {
    console.error("Could not record job analytics.", error);
  }
}

export default function JobViewTracker({ jobId }: { jobId: string }) {
  useEffect(() => {
    void recordJobAnalytics(jobId, "VIEW");
  }, [jobId]);

  return null;
}
