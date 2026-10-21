"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyButton({
  jobId,
  alreadyApplied,
  signedIn,
  isJobSeeker,
}: {
  jobId: number;
  alreadyApplied: boolean;
  signedIn: boolean;
  isJobSeeker: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter }),
      });
      const result = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setMessage(result.error ?? "Your application could not be sent.");
        return;
      }
      setMessage("Application submitted. You can track its progress in your dashboard.");
      setOpen(false);
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (alreadyApplied) {
    return <p className="form-success" role="status">You have applied for this role.</p>;
  }
  if (!signedIn) {
    return <a className="button button-primary" href="/login">Sign in to apply</a>;
  }
  if (!isJobSeeker) {
    return <p className="form-error">Employer accounts cannot apply for jobs.</p>;
  }

  return (
    <div className="apply-control">
      {!open ? (
        <button className="button button-primary" onClick={() => setOpen(true)} type="button">Apply for this job</button>
      ) : (
        <div className="application-form">
          <label>
            Cover letter <span>(optional)</span>
            <textarea maxLength={5000} onChange={(event) => setCoverLetter(event.target.value)} placeholder="Tell the employer why this role interests you." rows={5} value={coverLetter} />
          </label>
          <div className="application-actions">
            <button className="button button-outline" onClick={() => setOpen(false)} type="button">Cancel</button>
            <button className="button button-primary" disabled={busy} onClick={apply} type="button">{busy ? "Sending..." : "Submit application"}</button>
          </div>
        </div>
      )}
      {message && <p className={message.startsWith("Application submitted") ? "form-success" : "form-error"} role="status">{message}</p>}
    </div>
  );
}
