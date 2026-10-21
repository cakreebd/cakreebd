"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type ResumeSection = {
  kind: "WORK" | "EDUCATION" | "CERTIFICATION" | "OTHER";
  title: string;
  organization: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

type ResumeData = { summary: string; targetRole: string; sections: ResumeSection[] };
type Profile = {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  skills: string[];
};

const sectionTypes: ResumeSection["kind"][] = ["WORK", "EDUCATION", "CERTIFICATION", "OTHER"];

export default function ResumeBuilder({ profile, initialResume }: { profile: Profile; initialResume: ResumeData }) {
  const [resume, setResume] = useState(initialResume);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateSection(index: number, key: keyof ResumeSection, value: string) {
    setResume((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) => sectionIndex === index
        ? { ...section, [key]: value || null }
        : section),
    }));
  }

  function addSection(kind: ResumeSection["kind"]) {
    setResume((current) => ({
      ...current,
      sections: [...current.sections, { kind, title: "", organization: "", startDate: "", endDate: "", description: "" }],
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      const result = (await response.json()) as { error?: string; resume?: { summary: string; targetRole: string; sections: ResumeSection[] } };
      if (!response.ok || !result.resume) {
        setError(result.error ?? "Resume could not be saved.");
        return;
      }
      setResume(result.resume);
      setMessage("Resume saved.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-shell resume-page">
      <div className="dashboard-heading resume-controls">
        <div><p className="section-kicker">CAREER TOOLS</p><h1>Resume builder</h1><p>Create a clean, printable resume from your experience.</p></div>
        <div className="resume-actions"><Link className="text-link" href="/dashboard">← Back to dashboard</Link><button className="button button-outline no-print" onClick={() => window.print()} type="button">Print / Save as PDF</button></div>
      </div>
      {(error || message) && <p className={error ? "form-error no-print" : "form-success no-print"} role={error ? "alert" : "status"}>{error || message}</p>}
      <div className="resume-layout">
        <form className="dashboard-card dashboard-form resume-editor no-print" onSubmit={save}>
          <h2 className="full-width">Resume details</h2>
          <label className="full-width">Target role<input maxLength={140} onChange={(event) => setResume((current) => ({ ...current, targetRole: event.target.value }))} placeholder="Frontend Engineer" value={resume.targetRole} /></label>
          <label className="full-width">Professional summary<textarea maxLength={3000} onChange={(event) => setResume((current) => ({ ...current, summary: event.target.value }))} rows={5} value={resume.summary} /></label>
          {resume.sections.map((section, index) => (
            <section className="resume-entry full-width" key={`${section.kind}-${index}`}>
              <div className="resume-entry-heading"><h3>{sectionTypesLabel(section.kind)}</h3><button className="subtle-button" onClick={() => setResume((current) => ({ ...current, sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index) }))} type="button">Remove</button></div>
              <label>Title<input maxLength={140} onChange={(event) => updateSection(index, "title", event.target.value)} required value={section.title} /></label>
              <label>Organization<input maxLength={140} onChange={(event) => updateSection(index, "organization", event.target.value)} value={section.organization ?? ""} /></label>
              <label>Start date<input maxLength={30} onChange={(event) => updateSection(index, "startDate", event.target.value)} placeholder="Jan 2022" value={section.startDate ?? ""} /></label>
              <label>End date<input maxLength={30} onChange={(event) => updateSection(index, "endDate", event.target.value)} placeholder="Present" value={section.endDate ?? ""} /></label>
              <label className="full-width">Details<textarea maxLength={3000} onChange={(event) => updateSection(index, "description", event.target.value)} rows={3} value={section.description ?? ""} /></label>
            </section>
          ))}
          <div className="resume-add-actions full-width">{sectionTypes.map((kind) => <button className="subtle-button" key={kind} onClick={() => addSection(kind)} type="button">+ {sectionTypesLabel(kind)}</button>)}</div>
          <button className="button button-primary" disabled={busy} type="submit">{busy ? "Saving..." : "Save resume"}</button>
        </form>
        <article className="resume-paper">
          <header><h1>{profile.name}</h1><p>{resume.targetRole || profile.headline || "Professional profile"}</p><small>{[profile.email, profile.phone, profile.location].filter(Boolean).join(" · ")}</small></header>
          {resume.summary && <section><h2>Professional Summary</h2><p>{resume.summary}</p></section>}
          {profile.skills.length > 0 && <section><h2>Skills</h2><p>{profile.skills.join(" · ")}</p></section>}
          {resume.sections.map((section, index) => (
            <section key={`${section.kind}-${index}`}>
              <h2>{sectionTypesLabel(section.kind)}</h2>
              <div className="resume-paper-heading"><strong>{section.title || "Untitled"}</strong><span>{[section.startDate, section.endDate].filter(Boolean).join(" – ")}</span></div>
              {section.organization && <p><em>{section.organization}</em></p>}
              {section.description && <p>{section.description}</p>}
            </section>
          ))}
          {resume.sections.length === 0 && !resume.summary && <p className="resume-empty">Your resume preview will appear here as you add details.</p>}
        </article>
      </div>
    </main>
  );
}

function sectionTypesLabel(kind: ResumeSection["kind"]) {
  const labels: Record<ResumeSection["kind"], string> = {
    WORK: "Work experience",
    EDUCATION: "Education",
    CERTIFICATION: "Certifications",
    OTHER: "Additional experience",
  };
  return labels[kind];
}
