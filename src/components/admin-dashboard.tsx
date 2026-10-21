"use client";

import { useEffect, useState } from "react";

type Overview = {
  users: { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }[];
  jobs: { id: number; title: string; companyName: string; status: string; createdAt: string; employer: { email: string } }[];
  pendingReviews: { id: string; rating: number; title: string; body: string; createdAt: string; author: { name: string; email: string }; company: { companyName: string | null; email: string } }[];
  pendingVerifications: {
    id: string;
    legalCompanyName: string;
    registrationAuthority: string;
    registrationNumber: string;
    submittedAt: string;
    employer: { id: string; email: string; companyName: string | null; website: string | null };
  }[];
  counts: { users: number; jobs: number; pendingReviews: number; pendingVerifications: number };
};

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  async function fetchOverview() {
    const response = await fetch("/api/admin/overview");
    const result = (await response.json()) as Overview & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Admin data could not be loaded.");
    return result;
  }

  async function load() {
    setData(await fetchOverview());
  }

  useEffect(() => {
    fetchOverview()
      .then(setData)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Admin data could not be loaded."));
  }, []);

  async function update(path: string, payload: Record<string, unknown>, success: string) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The admin action could not be completed.");
        return;
      }
      await load();
      setMessage(success);
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <main className="dashboard-shell admin-shell">
      <div className="dashboard-heading"><p className="section-kicker">CAKREE OPERATIONS</p><h1>Admin dashboard</h1><p>Review platform activity and moderate new content.</p></div>
      {(error || message) && <p className={error ? "form-error" : "form-success"} role={error ? "alert" : "status"}>{error || message}</p>}
      {!data ? <p>Loading administration data…</p> : <>
        <div className="employer-stats"><div><strong>{data.counts.users}</strong><span>Accounts</span></div><div><strong>{data.counts.jobs}</strong><span>Job listings</span></div><div><strong>{data.counts.pendingReviews}</strong><span>Reviews awaiting moderation</span></div><div><strong>{data.counts.pendingVerifications}</strong><span>Companies awaiting verification</span></div></div>
        <section className="dashboard-card">
          <div className="dashboard-card-heading"><div><p className="section-kicker">BUSINESS REVIEW</p><h2>Company verification requests</h2></div></div>
          {data.pendingVerifications.length ? <div className="dashboard-list">{data.pendingVerifications.map((verification) => (
            <article className="activity-row admin-row" key={verification.id}>
              <div className="verification-details">
                <strong>{verification.employer.companyName ?? "Company profile incomplete"} · {verification.legalCompanyName}</strong>
                <p>{verification.employer.email}{verification.employer.website ? <> · <a className="text-link" href={verification.employer.website} rel="noreferrer" target="_blank">Company website</a></> : null}</p>
                <p>{registrationAuthorityLabel(verification.registrationAuthority)}: {verification.registrationNumber}</p>
                <small>Submitted {new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(verification.submittedAt))}</small>
                <label>Note for employer (optional)<textarea maxLength={500} onChange={(event) => setReviewNotes((current) => ({ ...current, [verification.id]: event.target.value }))} rows={2} value={reviewNotes[verification.id] ?? ""} /></label>
              </div>
              <div className="admin-actions"><button className="button button-outline" onClick={() => update(`/api/admin/verifications/${verification.id}`, { status: "VERIFIED" }, "Company verified.")} type="button">Approve</button><button className="subtle-button" onClick={() => update(`/api/admin/verifications/${verification.id}`, { status: "REJECTED", reviewNote: reviewNotes[verification.id] || null }, "Verification request rejected.")} type="button">Reject</button></div>
            </article>
          ))}</div> : <div className="dashboard-empty"><p>No companies are awaiting verification.</p></div>}
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card-heading"><div><p className="section-kicker">CONTENT REVIEW</p><h2>Pending company reviews</h2></div></div>
          {data.pendingReviews.length ? <div className="dashboard-list">{data.pendingReviews.map((review) => (
            <article className="activity-row admin-row" key={review.id}>
              <div><strong>{review.company.companyName ?? review.company.email} · {review.rating}/5 · {review.title}</strong><p>{review.body}</p><small>Author: {review.author.name} ({review.author.email})</small></div>
              <div className="admin-actions"><button className="button button-outline" onClick={() => update(`/api/admin/reviews/${review.id}`, { status: "APPROVED" }, "Review approved.")} type="button">Approve</button><button className="subtle-button" onClick={() => update(`/api/admin/reviews/${review.id}`, { status: "REJECTED" }, "Review rejected.")} type="button">Reject</button></div>
            </article>
          ))}</div> : <div className="dashboard-empty"><p>No reviews need moderation.</p></div>}
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card-heading"><div><p className="section-kicker">LISTING SAFETY</p><h2>Recent jobs</h2></div></div>
          <div className="dashboard-list">{data.jobs.map((job) => (
            <article className="activity-row" key={job.id}>
              <div><strong>{job.title}</strong><p>{job.companyName} · {job.employer.email}</p></div>
              <button className="subtle-button" onClick={() => update(`/api/admin/jobs/${job.id}`, { status: job.status === "ACTIVE" ? "CLOSED" : "ACTIVE" }, "Job status updated.")} type="button">{job.status === "ACTIVE" ? "Close listing" : "Reopen listing"}</button>
            </article>
          ))}</div>
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card-heading"><div><p className="section-kicker">ACCOUNT SAFETY</p><h2>Recent accounts</h2></div></div>
          <div className="dashboard-list">{data.users.map((account) => (
            <article className="activity-row" key={account.id}>
              <div><strong>{account.name}</strong><p>{account.email} · {account.role}</p></div>
              {account.role !== "ADMIN" && <button className="subtle-button" onClick={() => update(`/api/admin/users/${account.id}`, { isActive: !account.isActive }, account.isActive ? "Account suspended." : "Account restored.")} type="button">{account.isActive ? "Suspend account" : "Restore account"}</button>}
            </article>
          ))}</div>
        </section>
      </>}
    </main>
  );
}

function registrationAuthorityLabel(authority: string) {
  switch (authority) {
    case "RJSC": return "RJSC registration";
    case "TRADE_LICENSE": return "Trade license";
    case "TIN_BIN": return "TIN / BIN";
    case "OTHER": return "Other registration";
    default: return authority;
  }
}
