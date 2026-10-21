"use client";

import { useEffect, useState } from "react";

type Overview = {
  users: { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string }[];
  jobs: { id: number; title: string; companyName: string; status: string; createdAt: string; employer: { email: string } }[];
  pendingReviews: { id: string; rating: number; title: string; body: string; createdAt: string; author: { name: string; email: string }; company: { companyName: string | null; email: string } }[];
  counts: { users: number; jobs: number; pendingReviews: number };
};

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
        <div className="employer-stats"><div><strong>{data.counts.users}</strong><span>Accounts</span></div><div><strong>{data.counts.jobs}</strong><span>Job listings</span></div><div><strong>{data.counts.pendingReviews}</strong><span>Reviews awaiting moderation</span></div></div>
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
