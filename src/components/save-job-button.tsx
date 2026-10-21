"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SaveJobButton({
  jobId,
  initiallySaved = false,
}: {
  jobId: number;
  initiallySaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/save`, {
        method: saved ? "DELETE" : "POST",
      });
      const result = (await response.json()) as { saved?: boolean; error?: string };
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError(result.error ?? "Could not update saved jobs.");
        return;
      }
      setSaved(result.saved === true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="save-control">
      <button
        aria-label={saved ? "Remove from saved jobs" : "Save job"}
        aria-pressed={saved}
        className={`save-button${saved ? " save-button-active" : ""}`}
        disabled={busy}
        onClick={toggle}
        type="button"
      >
        <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
          <path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4V4.8Z" />
        </svg>
      </button>
      {error && <span className="save-error" role="alert">{error}</span>}
    </span>
  );
}
