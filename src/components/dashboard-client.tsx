"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { EMPLOYER_PLANS, type EmployerPlanKey } from "@/lib/employer-plans";
import VerifiedBadge from "@/components/verified-badge";
import FeaturedBadge from "@/components/featured-badge";

type BasicJob = {
  id: number;
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  status: string;
  featured?: boolean;
};

type CandidateProfile = {
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  cvFileName: string | null;
  profileVisible: boolean;
  emailNotifications: boolean;
};

type EmployerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  companyBio: string | null;
  website: string | null;
  emailNotifications: boolean;
  companyVerification: {
    legalCompanyName: string;
    registrationAuthority: string;
    registrationNumber: string;
    status: string;
    reviewNote: string | null;
  } | null;
};

type CandidateInterview = {
  id: string;
  scheduledAt: string;
  location: string | null;
  meetingUrl: string | null;
  notes: string | null;
  status: string;
  jobTitle: string;
};

type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  createdAt: string;
};

type JobAlert = {
  id: string;
  name: string;
  query: string | null;
  location: string | null;
  category: string | null;
  minSalary: number | null;
  matches: { id: number; title: string; companyName: string; location: string }[];
};

type CandidateApplication = {
  id: string;
  status: string;
  createdAt: string;
  job: BasicJob;
  interviews: CandidateInterview[];
  review: { id: string; status: string } | null;
  reviewEligible: boolean;
};

type SavedJob = { id: string; job: BasicJob };

type EmployerJob = {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  employment: string;
  workMode: string;
  category: string;
  description: string;
  requirements: string;
  benefits: string | null;
  tags: string[];
  status: string;
  featured?: boolean;
  applications: {
    id: string;
    status: string;
    createdAt: string;
    coverLetter: string | null;
    interviews: {
      id: string;
      scheduledAt: string;
      location: string | null;
      meetingUrl: string | null;
      notes: string | null;
      status: string;
    }[];
    applicant: {
      id: string;
      name: string;
      email: string;
      location: string | null;
      headline: string | null;
      cvFileName: string | null;
      skills: string[];
    };
  }[];
};

type Props =
  | {
      mode: "JOB_SEEKER";
      profile: CandidateProfile;
      applications: CandidateApplication[];
      savedJobs: SavedJob[];
      notifications: DashboardNotification[];
    }
  | {
      mode: "EMPLOYER";
      profile: EmployerProfile;
      jobs: EmployerJob[];
      plan: "FREE" | "STARTER" | "GROWTH";
      paymentConfigured: boolean;
      planExpiresAt: string | null;
      notifications: DashboardNotification[];
    };

export default function DashboardClient(props: Props) {
  if (props.mode === "JOB_SEEKER") {
    return <CandidateDashboard profile={props.profile} initialApplications={props.applications} initialSavedJobs={props.savedJobs} notifications={props.notifications} />;
  }
  return <EmployerDashboard profile={props.profile} initialJobs={props.jobs} plan={props.plan} paymentConfigured={props.paymentConfigured} planExpiresAt={props.planExpiresAt} notifications={props.notifications} />;
}

function CandidateDashboard({
  profile,
  initialApplications,
  initialSavedJobs,
  notifications,
}: {
  profile: CandidateProfile;
  initialApplications: CandidateApplication[];
  initialSavedJobs: SavedJob[];
  notifications: DashboardNotification[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [savedJobs, setSavedJobs] = useState(initialSavedJobs);
  const [applicationFilter, setApplicationFilter] = useState("ALL");
  const activeApplications = applications.filter((application) => !["REJECTED", "HIRED"].includes(application.status)).length;
  const shortlistedApplications = applications.filter((application) => application.status === "SHORTLISTED").length;
  const visibleApplications = applications.filter((application) => {
    if (applicationFilter === "IN_PROGRESS") return !["REJECTED", "HIRED"].includes(application.status);
    if (applicationFilter === "INTERVIEW") return application.interviews.some((interview) => interview.status === "SCHEDULED");
    if (applicationFilter === "COMPLETED") return ["REJECTED", "HIRED"].includes(application.status);
    return applicationFilter === "ALL" || application.status === applicationFilter;
  });
  const scheduledInterviews = applications.reduce(
    (total, application) => total + application.interviews.filter((interview) => interview.status === "SCHEDULED").length,
    0,
  );
  const upcomingInterviews = applications.flatMap((application) => application.interviews
    .filter((interview) => interview.status === "SCHEDULED" && new Date(interview.scheduledAt).getTime() >= Date.now())
    .map((interview) => ({ ...interview, companyName: application.job.companyName, jobId: application.job.id })))
    .sort((first, second) => first.scheduledAt.localeCompare(second.scheduledAt));
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [profileVisible, setProfileVisible] = useState(profile.profileVisible);
  const [emailNotifications, setEmailNotifications] = useState(profile.emailNotifications);
  const [cvName, setCvName] = useState(profile.cvFileName);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const profileFields = [name.trim(), phone.trim(), location.trim(), headline.trim(), bio.trim(), skills.trim(), cvName];
  const completedProfileFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100);
  const nextProfileStep = !headline.trim()
    ? "Add a professional headline"
    : !skills.trim()
      ? "Add your key skills"
      : !cvName
        ? "Upload your CV"
        : !bio.trim()
          ? "Add a short introduction"
          : "Keep your profile up to date";

  useEffect(() => {
    fetch("/api/job-alerts")
      .then(async (response) => {
        const result = (await response.json()) as { alerts?: JobAlert[]; error?: string };
        if (!response.ok || !result.alerts) throw new Error(result.error ?? "Job alerts could not be loaded.");
        setAlerts(result.alerts);
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Job alerts could not be loaded.");
      });
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          location: location || null,
          headline: headline || null,
          bio: bio || null,
          skills: skills.split(",").map((skill) => skill.trim()).filter(Boolean),
          profileVisible,
          emailNotifications,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Your profile could not be saved.");
        return;
      }

      setMessage("Your profile has been saved.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          query: form.get("query") || null,
          location: form.get("location") || null,
          category: form.get("category") || null,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Job alert could not be saved.");
        return;
      }

      const refreshed = await fetch("/api/job-alerts");
      const refreshedResult = (await refreshed.json()) as { alerts?: JobAlert[]; error?: string };
      if (!refreshed.ok || !refreshedResult.alerts) {
        setError(refreshedResult.error ?? "Job alert was saved but matches could not be loaded.");
        return;
      }
      setAlerts(refreshedResult.alerts);
      formElement.reset();
      setMessage("Job alert saved. Matching jobs are shown below.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function removeAlert(id: string) {
    try {
      const response = await fetch(`/api/job-alerts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? "Job alert could not be removed.");
        return;
      }

      setAlerts((items) => items.filter((item) => item.id !== id));
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, applicationId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          rating: Number(form.get("rating")),
          title: form.get("title"),
          body: form.get("body"),
          anonymous: form.get("anonymous") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string; review?: { id: string; status: string } };
      if (!response.ok || !result.review) {
        setError(result.error ?? "Your review could not be submitted.");
        return;
      }
      setApplications((current) => current.map((application) => application.id === applicationId
        ? { ...application, review: result.review! }
        : application));
      formElement.reset();
      setMessage("Review submitted for moderation.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function uploadCv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile/cv", { method: "POST", body: form });
      const result = (await response.json()) as { error?: string; fileName?: string };
      if (!response.ok || !result.fileName) {
        setError(result.error ?? "Your CV could not be uploaded.");
        return;
      }
      setCvName(result.fileName);
      setMessage("Your CV has been uploaded.");
      formElement.reset();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCv() {
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile/cv", { method: "DELETE" });
      if (!response.ok) {
        setError("Your CV could not be removed. Please try again.");
        return;
      }
      setCvName(null);
      setMessage("Your CV has been removed.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function removeSavedJob(jobId: number) {
    try {
      const response = await fetch(`/api/jobs/${jobId}/save`, { method: "DELETE" });
      if (!response.ok) {
        setError("This saved job could not be removed. Please try again.");
        return;
      }
      setSavedJobs((items) => items.filter((item) => item.job.id !== jobId));
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-heading">
        <p className="section-kicker">YOUR CAKREE SPACE</p>
        <h1>Welcome, {profile.name.split(" ")[0]}.</h1>
        <p>Keep your profile ready and stay close to the roles you care about.</p>
      </div>
      <nav aria-label="Job seeker dashboard sections" className="dashboard-shortcuts">
        <a href="#candidate-applications">Applications</a>
        <a href="#candidate-profile">My profile</a>
        <a href="#candidate-saved">Saved jobs</a>
        <a href="#candidate-alerts">Job alerts</a>
        <Link href="/resume">Resume builder</Link>
        <Link href="/jobs">Find jobs <span aria-hidden="true">↗</span></Link>
      </nav>
      {(error || message) && <p className={error ? "form-error" : "form-success"} role={error ? "alert" : "status"}>{error || message}</p>}
      <section aria-label="Profile readiness" className="profile-readiness">
        <div className="profile-readiness-copy">
          <span className="readiness-mark" aria-hidden="true">✦</span>
          <div>
            <p className="section-kicker">YOUR PROFILE READINESS</p>
            <h2>{profileCompletion === 100 ? "Your profile is looking great." : "Take one more step toward being discovered."}</h2>
            <p>{profileCompletion === 100 ? "Your key profile details are filled in. Keep them current as your experience grows." : `Next up: ${nextProfileStep.toLowerCase()}. A complete profile gives employers a clearer view of what you bring.`}</p>
          </div>
        </div>
        <div aria-label={`Profile ${profileCompletion}% complete`} className="readiness-progress">
          <div aria-hidden="true" className="readiness-progress-track"><span style={{ width: `${profileCompletion}%` }} /></div>
          <strong>{profileCompletion}%</strong>
          <a href="#candidate-profile">{profileCompletion === 100 ? "Review profile" : "Complete profile"} <span aria-hidden="true">→</span></a>
        </div>
      </section>
      <div aria-label="Application overview" className="application-overview">
        <div><strong>{applications.length}</strong><span>Total applications</span></div>
        <div><strong>{activeApplications}</strong><span>Still in progress</span></div>
        <div><strong>{shortlistedApplications}</strong><span>Shortlisted</span></div>
        <div><strong>{scheduledInterviews}</strong><span>Interviews scheduled</span></div>
      </div>
      {upcomingInterviews.length > 0 && <section aria-labelledby="upcoming-interviews-title" className="upcoming-interviews">
        <div className="upcoming-interviews-heading">
          <span className="upcoming-interviews-icon" aria-hidden="true">◷</span>
          <div><p className="section-kicker">COMING UP</p><h2 id="upcoming-interviews-title">Your next interviews</h2></div>
        </div>
        <div className="upcoming-interview-list">{upcomingInterviews.map((interview) => (
          <article className="upcoming-interview" key={interview.id}>
            <div><strong>{interview.jobTitle}</strong><p>{interview.companyName} · {formatDateTime(interview.scheduledAt)}</p></div>
            {interview.meetingUrl
              ? <a className="button button-outline" href={interview.meetingUrl} rel="noreferrer" target="_blank">Join interview <span aria-hidden="true">↗</span></a>
              : interview.location && <span className="upcoming-interview-location">{interview.location}</span>}
          </article>
        ))}</div>
      </section>}
      <div className="dashboard-columns">
        <div className="dashboard-main-column">
          <section className="dashboard-card" id="candidate-profile">
            <div className="dashboard-card-heading"><div><p className="section-kicker">YOUR STORY</p><h2>Candidate profile</h2></div><span className="profile-badge">{profile.email}</span></div>
            <form className="dashboard-form" onSubmit={saveProfile}>
              <label>Full name<input maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} /></label>
              <label>Email address<input disabled value={profile.email} /></label>
              <label>Phone number<input maxLength={30} onChange={(event) => setPhone(event.target.value)} placeholder="+880 1XXX-XXXXXX" value={phone} /></label>
              <label>Preferred location<input maxLength={100} onChange={(event) => setLocation(event.target.value)} placeholder="Dhaka or open to remote" value={location} /></label>
              <label className="full-width">Professional headline<input maxLength={140} onChange={(event) => setHeadline(event.target.value)} placeholder="e.g. Product designer making useful things" value={headline} /></label>
              <label className="full-width">About you<textarea maxLength={3000} onChange={(event) => setBio(event.target.value)} placeholder="Share a little about your experience and what you’re looking for." rows={4} value={bio} /></label>
              <label className="full-width">Skills <span className="label-hint">Separate skills with commas</span><input maxLength={1200} onChange={(event) => setSkills(event.target.value)} placeholder="Figma, user research, prototyping" value={skills} /></label>
              <label className="full-width"><span>Employer search visibility</span><span className="visibility-option"><input checked={profileVisible} className="visibility-checkbox" onChange={(event) => setProfileVisible(event.target.checked)} type="checkbox" /><span>Allow employers to find my name, headline, location, bio, and skills. Contact details and CV stay private.</span></span></label>
              <label className="full-width"><span>Email updates</span><span className="visibility-option"><input checked={emailNotifications} className="visibility-checkbox" onChange={(event) => setEmailNotifications(event.target.checked)} type="checkbox" /><span>Send me interview and application updates, plus matching job-alert emails.</span></span></label>
              <button className="button button-primary" disabled={busy} type="submit">{busy ? "Saving..." : "Save profile"}</button>
            </form>
          </section>

          <section className="dashboard-card" id="candidate-applications">
            <div className="dashboard-card-heading"><div><p className="section-kicker">YOUR APPLICATIONS</p><h2>Application activity</h2></div><span className="count-badge">{applications.length}</span></div>
            {applications.length > 0 && <div aria-label="Filter applications" className="application-filters">
              {[
                { value: "ALL", label: "All", count: applications.length },
                { value: "IN_PROGRESS", label: "In progress", count: activeApplications },
                { value: "SHORTLISTED", label: "Shortlisted", count: shortlistedApplications },
                { value: "INTERVIEW", label: "Interview", count: applications.filter((application) => application.interviews.some((interview) => interview.status === "SCHEDULED")).length },
                { value: "COMPLETED", label: "Completed", count: applications.filter((application) => ["REJECTED", "HIRED"].includes(application.status)).length },
              ].map((filter) => <button aria-pressed={applicationFilter === filter.value} className="application-filter" key={filter.value} onClick={() => setApplicationFilter(filter.value)} type="button">{filter.label}<span>{filter.count}</span></button>)}
            </div>}
            {applications.length ? visibleApplications.length ? <div className="dashboard-list">{visibleApplications.map((application) => (
              <article className="activity-row" key={application.id}>
                <div><Link className="activity-title" href={`/jobs/${application.job.id}`}>{application.job.title}</Link><p>{application.job.companyName} · {application.job.location}</p>{application.interviews.filter((interview) => interview.status === "SCHEDULED").map((interview) => <p key={interview.id}>Interview: {formatDateTime(interview.scheduledAt)}{interview.location ? ` · ${interview.location}` : ""}{interview.meetingUrl ? <> · <a className="text-link" href={interview.meetingUrl} rel="noreferrer" target="_blank">Join meeting</a></> : ""}{interview.notes ? ` · ${interview.notes}` : ""}</p>)}
                  {application.status === "HIRED" && application.reviewEligible && !application.review && <form className="stacked-form no-print" onSubmit={(event) => submitReview(event, application.id)}>
                    <strong>Review your experience with {application.job.companyName}</strong>
                    <label>Rating<select defaultValue="5" name="rating">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
                    <label>Review title<input maxLength={120} minLength={3} name="title" required /></label>
                    <label>Review<textarea maxLength={3000} minLength={20} name="body" required rows={3} /></label>
                    <label className="visibility-option"><input className="visibility-checkbox" name="anonymous" type="checkbox" /> Post anonymously</label>
                    <button className="button button-outline" type="submit">Submit review</button>
                  </form>}
                  {application.review && <p className="label-hint">Review status: {application.review.status.toLowerCase()}</p>}
                </div>
                <div className="activity-status"><span className={`status-pill status-${application.status.toLowerCase()}`}>{statusLabel(application.status)}</span><small>{formatDate(application.createdAt)}</small></div>
              </article>
            ))}</div> : <div className="dashboard-empty"><p>No applications in this view yet.</p><button className="subtle-button" onClick={() => setApplicationFilter("ALL")} type="button">Show all applications</button></div> : <div className="dashboard-empty"><p>You haven’t applied for a role yet.</p><Link className="text-link" href="/jobs">Explore open jobs →</Link></div>}
          </section>

          <section className="dashboard-card" id="candidate-saved">
            <div className="dashboard-card-heading"><div><p className="section-kicker">SAVED FOR LATER</p><h2>Saved jobs</h2></div><span className="count-badge">{savedJobs.length}</span></div>
            {savedJobs.length ? <div className="dashboard-list">{savedJobs.map((saved) => (
              <article className="activity-row" key={saved.id}>
                <div><Link className="activity-title" href={`/jobs/${saved.job.id}`}>{saved.job.title}</Link><p>{saved.job.companyName} · {saved.job.location}</p></div>
                <button className="subtle-button" onClick={() => removeSavedJob(saved.job.id)} type="button">Remove</button>
              </article>
            ))}</div> : <div className="dashboard-empty"><p>Save interesting roles and they’ll be waiting here.</p><Link className="text-link" href="/jobs">Find a job →</Link></div>}
          </section>

          <section className="dashboard-card" id="candidate-alerts">
            <div className="dashboard-card-heading"><div><p className="section-kicker">STAY IN THE LOOP</p><h2>Job alerts</h2></div><span className="count-badge">{alerts.length}</span></div>
            <form className="dashboard-form" onSubmit={createAlert}>
              <label>Alert name<input maxLength={80} minLength={2} name="name" placeholder="Remote product jobs" required /></label>
              <label>Keywords<input maxLength={100} name="query" placeholder="Designer, React..." /></label>
              <label>Location<input maxLength={100} name="location" placeholder="Dhaka or Remote" /></label>
              <label>Category<select defaultValue="" name="category"><option value="">Any category</option>{["Technology", "Marketing", "Sales", "Design", "Finance", "Customer service", "Operations", "Education", "Healthcare", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <button className="button button-outline" type="submit">Save job alert</button>
            </form>
            {alerts.length ? <div className="dashboard-list">{alerts.map((alert) => (
              <article className="activity-row" key={alert.id}>
                <div><strong>{alert.name}</strong><p>{alert.matches.length ? alert.matches.map((job) => <span key={job.id}><Link className="text-link" href={`/jobs/${job.id}`}>{job.title}</Link> · {job.companyName} · {job.location}<br /></span>) : "No matching jobs yet. New matches will appear here."}</p></div>
                <button className="subtle-button" onClick={() => removeAlert(alert.id)} type="button">Remove</button>
              </article>
            ))}</div> : <div className="dashboard-empty"><p>Save a search to see matching jobs here whenever you return.</p></div>}
          </section>
        </div>

        <aside className="dashboard-side-column">
          <section className="dashboard-card">
            <p className="section-kicker">CAREER TOOLS</p><h2>Build your resume</h2>
            <p>Turn your profile and experience into a polished, printable resume.</p>
            <Link className="button button-outline" href="/resume">Open resume builder</Link>
          </section>
          <section className="dashboard-card cv-card">
            <p className="section-kicker">YOUR CV</p><h2>Make it easy to say yes.</h2>            <p>Upload a PDF or DOCX CV (up to 5 MB). Employers can access it when you apply for their job.</p>
            {cvName ? <div className="cv-file"><a href="/api/profile/cv">{cvName}</a><button className="subtle-button" onClick={removeCv} type="button">Remove</button></div> : <p className="cv-empty">No CV uploaded yet</p>}
            <form className="cv-upload" onSubmit={uploadCv}>
              <label className="upload-field">Choose a CV<input accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" name="cv" required type="file" /></label>
              <button className="button button-outline" disabled={busy} type="submit">{busy ? "Uploading..." : "Upload CV"}</button>
            </form>
          </section>
          <section className="dashboard-tip"><p className="section-kicker">A QUICK TIP</p><h2>Keep your profile fresh.</h2><p>A clear headline and a few relevant skills help employers understand what you bring.</p></section>
        </aside>
      </div>
      <NotificationPanel notifications={notifications} />
    </main>
  );
}

function EmployerDashboard({
  profile,
  initialJobs,
  plan: initialPlan,
  paymentConfigured,
  planExpiresAt,
  notifications,
}: {
  profile: EmployerProfile;
  initialJobs: EmployerJob[];
  plan: EmployerPlanKey;
  paymentConfigured: boolean;
  planExpiresAt: string | null;
  notifications: DashboardNotification[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [companyName, setCompanyName] = useState(profile.companyName ?? "");
  const [companyBio, setCompanyBio] = useState(profile.companyBio ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [verification, setVerification] = useState(profile.companyVerification);
  const [legalCompanyName, setLegalCompanyName] = useState(profile.companyVerification?.legalCompanyName ?? "");
  const [registrationAuthority, setRegistrationAuthority] = useState(profile.companyVerification?.registrationAuthority ?? "RJSC");
  const [registrationNumber, setRegistrationNumber] = useState(profile.companyVerification?.registrationNumber ?? "");
  const [emailNotifications, setEmailNotifications] = useState(profile.emailNotifications);
  const [plan, setPlan] = useState<EmployerPlanKey>(initialPlan);
  const [candidateResults, setCandidateResults] = useState<{
    id: string;
    name: string;
    headline: string | null;
    location: string | null;
    bio: string | null;
    skills: string[];
  }[]>([]);
  const [candidateSearchError, setCandidateSearchError] = useState("");
  const paymentResult = useSearchParams().get("payment");
  const paymentMessages: Record<string, string> = {
    success: "bKash payment verified. Your package is active for 30 days.",
    cancelled: "Checkout was cancelled. Your package was not changed.",
    failed: "Payment was not verified, so your package was not changed.",
    expired: "The checkout session expired. Please start again.",
    pending: "Payment is still being verified. Refresh this dashboard in a moment.",
    invalid: "The payment callback could not be matched to an order.",
  };
  const paymentMessage = paymentResult ? paymentMessages[paymentResult] : undefined;

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, companyBio: companyBio || null, website: website || null, emailNotifications }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Company profile could not be saved.");
        return;
      }
      setMessage("Company profile saved.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/company-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalCompanyName, registrationAuthority, registrationNumber }),
      });
      const result = (await response.json()) as {
        error?: string;
        verification?: EmployerProfile["companyVerification"];
      };
      if (!response.ok || !result.verification) {
        setError(result.error ?? "Your verification request could not be submitted.");
        return;
      }
      setVerification(result.verification);
      setMessage("Company registration details submitted for review.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      category: form.get("category"),
      location: form.get("location"),
      employmentType: form.get("employmentType"),
      workMode: form.get("workMode"),
      salaryMin: numberOrNull(form.get("salaryMin")),
      salaryMax: numberOrNull(form.get("salaryMax")),
      description: form.get("description"),
      requirements: form.get("requirements"),
      benefits: form.get("benefits") || null,
      tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; job?: Omit<EmployerJob, "applications"> };
      if (!response.ok || !result.job) {
        setError(result.error ?? "The job could not be published.");
        return;
      }
      setJobs((current) => [{ ...result.job!, applications: [] }, ...current]);
      formElement.reset();
      setMessage("Your job is live and accepting applications.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateJobStatus(jobId: number, status: "ACTIVE" | "CLOSED") {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not update job status.");
        return;
      }
      setJobs((current) => current.map((job) => job.id === jobId ? { ...job, status } : job));
      setMessage(status === "CLOSED" ? "Job closed." : "Job reopened.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function updateApplication(applicationId: string, status: string) {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not update applicant status.");
        return;
      }
      setJobs((current) => current.map((job) => ({
        ...job,
        applications: job.applications.map((application) => application.id === applicationId
          ? { ...application, status }
          : application),
      })));
      setMessage("Applicant status updated.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function scheduleInterview(event: FormEvent<HTMLFormElement>, applicationId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const localDate = String(form.get("scheduledAt") ?? "");
    const scheduledAt = new Date(localDate);
    if (!localDate || !Number.isFinite(scheduledAt.getTime())) {
      setError("Choose a valid interview date and time.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/applications/${applicationId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          location: form.get("location") || null,
          meetingUrl: form.get("meetingUrl") || null,
          notes: form.get("notes") || null,
        }),
      });
      const result = (await response.json()) as { error?: string; interview?: EmployerJob["applications"][number]["interviews"][number] };
      if (!response.ok || !result.interview) {
        setError(result.error ?? "Interview could not be scheduled.");
        return;
      }
      setJobs((current) => current.map((job) => ({
        ...job,
        applications: job.applications.map((application) => application.id === applicationId
          ? { ...application, interviews: [...application.interviews, result.interview!] }
          : application),
      })));
      formElement.reset();
      setMessage("Interview scheduled and candidate notified.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function searchCandidates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const query = String(form.get("query") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    if (query) params.set("q", query);
    if (location) params.set("location", location);
    setCandidateSearchError("");
    try {
      const response = await fetch(`/api/candidates?${params.toString()}`);
      const result = (await response.json()) as { candidates?: typeof candidateResults; error?: string };
      if (!response.ok || !result.candidates) {
        setCandidateSearchError(result.error ?? "Candidate search could not be completed.");
        return;
      }
      setCandidateResults(result.candidates);
    } catch {
      setCandidateSearchError("Could not reach the server. Please try again.");
    }
  }

  async function changePlan(nextPlan: EmployerPlanKey) {
    setError("");
    setMessage("");
    try {
      const isPaid = nextPlan !== "FREE";
      const response = await fetch(isPaid ? "/api/employer/payments" : "/api/employer/plan", {
        method: isPaid ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: nextPlan }),
      });
      const result = (await response.json()) as { error?: string; checkoutUrl?: string };
      if (!response.ok) {
        setError(result.error ?? "Package could not be changed.");
        return;
      }
      if (isPaid) {
        if (!result.checkoutUrl) {
          setError("bKash did not return a checkout link. Your package has not changed.");
          return;
        }
        window.location.assign(result.checkoutUrl);
        return;
      }
      setPlan(nextPlan);
      setMessage("Package changed to Free.");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  const allApplications = jobs.flatMap((job) => job.applications);
  const totalApplications = allApplications.length;
  const activeJobCount = jobs.filter((job) => job.status === "ACTIVE").length;
  const inReviewCount = allApplications.filter((application) => ["SUBMITTED", "REVIEWING"].includes(application.status)).length;
  const shortlistedCount = allApplications.filter((application) => application.status === "SHORTLISTED").length;
  const interviewCount = allApplications.filter((application) => application.interviews.some((interview) => interview.status === "SCHEDULED")).length;
  const pipelineStages = [
    { value: "SUBMITTED", label: "New", count: allApplications.filter((application) => application.status === "SUBMITTED").length },
    { value: "REVIEWING", label: "In review", count: allApplications.filter((application) => application.status === "REVIEWING").length },
    { value: "SHORTLISTED", label: "Shortlisted", count: shortlistedCount },
    { value: "HIRED", label: "Hired", count: allApplications.filter((application) => application.status === "HIRED").length },
  ];

  return (
    <main className="dashboard-shell">
      <div className="dashboard-heading">
        <p className="section-kicker">EMPLOYER WORKSPACE</p>
        <h1>{profile.companyName || "Your company"} dashboard</h1>
        <p>Post openings and keep your hiring moving.</p>
      </div>
      <nav aria-label="Employer dashboard sections" className="dashboard-shortcuts">
        <a href="#employer-post-job">Post a job</a>
        <a href="#employer-applications">Applicants</a>
        <a href="#employer-candidates">Find candidates</a>
        <a href="#employer-company">Company profile</a>
        <a href="#employer-plan">Hiring package</a>
      </nav>
      {(error || message || paymentMessage) && <p className={error ? "form-error" : "form-success"} role={error ? "alert" : "status"}>{error || message || paymentMessage}</p>}
      <div className="employer-stats"><div><strong>{activeJobCount}</strong><span>Active jobs</span></div><div><strong>{totalApplications}</strong><span>Applications</span></div><div><strong>{inReviewCount}</strong><span>To review</span></div><div><strong>{shortlistedCount}</strong><span>Shortlisted</span></div></div>
      <section aria-label="Hiring pipeline" className="hiring-pipeline">
        <div className="hiring-pipeline-heading"><div><p className="section-kicker">HIRING PIPELINE</p><h2>See where candidates are</h2></div><a href="#employer-applications">Manage applicants <span aria-hidden="true">→</span></a></div>
        <div className="hiring-pipeline-stages">
          {pipelineStages.map((stage) => <button aria-pressed={applicationStatusFilter === stage.value} className="hiring-pipeline-stage" key={stage.value} onClick={() => { setApplicationStatusFilter(stage.value); document.getElementById("employer-applications")?.scrollIntoView({ behavior: "smooth" }); }} type="button">
            <span className="hiring-pipeline-stage-label">{stage.label}</span><strong>{stage.count}</strong><span className="hiring-pipeline-track"><span style={{ width: `${totalApplications ? Math.max(5, (stage.count / totalApplications) * 100) : 0}%` }} /></span>
          </button>)}
          <div className="hiring-pipeline-stage hiring-pipeline-interviews"><span className="hiring-pipeline-stage-label">Interviews scheduled</span><strong>{interviewCount}</strong><span className="hiring-pipeline-stage-note">Across all your openings</span></div>
        </div>
      </section>
      <div className="dashboard-columns employer-columns">
        <div className="dashboard-main-column">
          <section className="dashboard-card" id="employer-post-job">
            <div className="dashboard-card-heading"><div><p className="section-kicker">CREATE AN OPPORTUNITY</p><h2>Post a job</h2></div></div>
            <form className="dashboard-form" onSubmit={createJob}>
              <label className="full-width">Job title<input maxLength={140} minLength={3} name="title" placeholder="e.g. Senior Product Designer" required /></label>
              <label>Category<select defaultValue="Technology" name="category">{["Technology", "Marketing", "Sales", "Design", "Finance", "Customer service", "Operations", "Education", "Healthcare", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Location<input maxLength={100} name="location" placeholder="Dhaka or Remote" required /></label>
              <label>Employment type<select name="employmentType">{["Full-time", "Part-time", "Contract", "Internship", "Temporary"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Work arrangement<select name="workMode">{["On-site", "Hybrid", "Remote"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Minimum salary (BDT / month)<input min="0" name="salaryMin" placeholder="e.g. 50000" type="number" /></label>
              <label>Maximum salary (BDT / month)<input min="0" name="salaryMax" placeholder="e.g. 80000" type="number" /></label>
              <label className="full-width">Role description<textarea minLength={30} name="description" placeholder="Describe the role and what success looks like." required rows={5} /></label>
              <label className="full-width">Requirements<textarea minLength={10} name="requirements" placeholder="What experience and skills are you looking for?" required rows={4} /></label>
              <label className="full-width">Benefits <span className="label-hint">Optional</span><textarea name="benefits" placeholder="Benefits, leave, learning, and other perks." rows={3} /></label>
              <label className="full-width">Skills and tags <span className="label-hint">Separate with commas</span><input name="tags" placeholder="React, Figma, 3+ years" /></label>
              <p className="label-hint">Package usage: {activeJobCount} / {EMPLOYER_PLANS[plan].activeJobLimit} active jobs</p>
              <button className="button button-primary" disabled={busy || activeJobCount >= EMPLOYER_PLANS[plan].activeJobLimit} type="submit">{activeJobCount >= EMPLOYER_PLANS[plan].activeJobLimit ? "Active-job limit reached" : busy ? "Publishing..." : "Publish job"}</button>
            </form>
          </section>

          <section className="dashboard-card" id="employer-applications">
            <div className="dashboard-card-heading"><div><p className="section-kicker">YOUR OPENINGS</p><h2>Job postings</h2></div><span className="count-badge">{jobs.length}</span></div>
            {jobs.length > 0 && <div className="applicant-filters">
              <label>Find an applicant<input onChange={(event) => setApplicantSearch(event.target.value)} placeholder="Name, email, skills, or job title" value={applicantSearch} /></label>
              <label>Application stage<select onChange={(event) => setApplicationStatusFilter(event.target.value)} value={applicationStatusFilter}>
                <option value="ALL">All stages</option>
                {["SUBMITTED", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select></label>
            </div>}
            {jobs.length ? <div className="dashboard-list">{jobs.map((job) => {
              const normalizedSearch = applicantSearch.trim().toLowerCase();
              const visibleApplications = job.applications.filter((application) => {
                const matchesStatus = applicationStatusFilter === "ALL" || application.status === applicationStatusFilter;
                const searchable = `${application.applicant.name} ${application.applicant.email} ${application.applicant.headline ?? ""} ${application.applicant.skills.join(" ")} ${job.title}`.toLowerCase();
                return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
              });
              return (
              <article className="employer-job-card" key={job.id}>
                <div className="employer-job-heading"><div><h3><Link href={`/jobs/${job.id}`}>{job.title}</Link>{job.featured && <FeaturedBadge />}</h3><p>{job.location} · {job.employment}</p></div><span className={`status-pill status-${job.status.toLowerCase()}`}>{statusLabel(job.status)}</span></div>
                <div className="applicant-list-heading"><strong>{visibleApplications.length}{visibleApplications.length !== job.applications.length ? ` of ${job.applications.length}` : ""} {visibleApplications.length === 1 ? "application" : "applications"}</strong><button className="subtle-button" onClick={() => updateJobStatus(job.id, job.status === "ACTIVE" ? "CLOSED" : "ACTIVE")} type="button">{job.status === "ACTIVE" ? "Close job" : "Reopen job"}</button></div>
                {visibleApplications.length > 0 ? <div className="applicant-list">{visibleApplications.map((application) => (
                  <div className="applicant-row" key={application.id}>
                    <div><strong>{application.applicant.name}</strong><p>{application.applicant.headline || application.applicant.location || application.applicant.email}</p>{application.applicant.skills.length > 0 && <small>{application.applicant.skills.join(" · ")}</small>}{application.coverLetter && <blockquote>{application.coverLetter}</blockquote>}{application.applicant.cvFileName && <a className="cv-download-link" href={`/api/applications/${application.id}/cv`}>Download CV · {application.applicant.cvFileName}</a>}
                      {application.interviews.filter((interview) => interview.status === "SCHEDULED").map((interview) => <p key={interview.id}>Interview: {formatDateTime(interview.scheduledAt)}{interview.location ? ` · ${interview.location}` : ""}{interview.meetingUrl ? <> · <a className="text-link" href={interview.meetingUrl} rel="noreferrer" target="_blank">Meeting link</a></> : ""}</p>)}
                      <form className="stacked-form" onSubmit={(event) => scheduleInterview(event, application.id)}>
                        <label>Schedule an interview<input min={localDateTimeMinimum()} name="scheduledAt" required type="datetime-local" /></label>
                        <label>Location<input maxLength={200} name="location" placeholder="Office / video call" /></label>
                        <label>Meeting URL<input maxLength={500} name="meetingUrl" placeholder="https://..." type="url" /></label>
                        <label>Candidate note<textarea maxLength={2000} name="notes" rows={2} /></label>
                        <button className="button button-outline" type="submit">Schedule interview</button>
                      </form>
                    </div>
                    <label className="status-select-label">Application status<select aria-label={`Status for ${application.applicant.name}`} onChange={(event) => updateApplication(application.id, event.target.value)} value={application.status}>{["SUBMITTED", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
                  </div>
                ))}</div> : job.applications.length > 0
                  ? <p className="applicant-filter-empty">No applicants match these filters.</p>
                  : <p className="applicant-filter-empty">No applications yet. Applicants will appear here when they apply.</p>}
              </article>
              );
            })}</div> : <div className="dashboard-empty"><p>No openings yet. Add your first role above to meet candidates.</p></div>}
          </section>
        </div>
        <aside className="dashboard-side-column">
          <section className="dashboard-card" id="employer-candidates">
            <p className="section-kicker">RECRUITING TOOLS</p><h2>Search candidates</h2>
            <p>Only candidates who have opted into employer discovery are shown. CVs and contact details remain private until they apply.</p>
            <form className="stacked-form" onSubmit={searchCandidates}>
              <label>Skills or keywords<input maxLength={100} name="query" placeholder="React, designer, accountant" /></label>
              <label>Location<input maxLength={100} name="location" placeholder="Dhaka, Chattogram..." /></label>
              <button className="button button-outline" type="submit">Search profiles</button>
            </form>
            {candidateSearchError && <p className="form-error" role="alert">{candidateSearchError}</p>}
            {candidateResults.length > 0 && <div className="dashboard-list">{candidateResults.map((candidate) => (
              <article className="activity-row" key={candidate.id}>
                <div><strong>{candidate.name}</strong><p>{candidate.headline || candidate.location || "Candidate"}</p>{candidate.bio && <small>{candidate.bio}</small>}{candidate.skills.length > 0 && <p>{candidate.skills.join(" · ")}</p>}</div>
              </article>
            ))}</div>}
            {candidateResults.length === 0 && <p className="cv-empty">Search results appear here. Candidates control their visibility from their profile.</p>}
          </section>
          <section className="dashboard-card" id="employer-plan">
            <p className="section-kicker">HIRING PACKAGES</p><h2>{EMPLOYER_PLANS[plan].name} package</h2>
            <p>{activeJobCount} of {EMPLOYER_PLANS[plan].activeJobLimit} active job slots used.{planExpiresAt ? ` Expires ${formatDate(planExpiresAt)}.` : ""}</p>
            {EMPLOYER_PLANS[plan].featuredListings && <p className="verification-state"><FeaturedBadge /> Active job listings are highlighted in search until your Growth package expires.</p>}
            <div className="dashboard-list">{(Object.keys(EMPLOYER_PLANS) as EmployerPlanKey[]).map((key) => (
              <article className="activity-row" key={key}>
                <div><strong>{EMPLOYER_PLANS[key].name}</strong><p>{EMPLOYER_PLANS[key].price === 0 ? "Free" : `৳${EMPLOYER_PLANS[key].price.toLocaleString("en-BD")} / month`} · {EMPLOYER_PLANS[key].activeJobLimit} active jobs{EMPLOYER_PLANS[key].featuredListings ? " · featured listing placement" : ""}</p></div>
                <button className="subtle-button" disabled={plan === key || (key !== "FREE" && !paymentConfigured)} onClick={() => changePlan(key)} type="button">{plan === key ? "Current" : key === "FREE" ? "Downgrade" : paymentConfigured ? "Pay with bKash" : "Configure bKash"}</button>
              </article>
            ))}</div>
            <p className="demo-notice">{paymentConfigured ? "Paid plans activate only after bKash confirms the exact amount, currency, and invoice. Set up bKash sandbox credentials before production." : "bKash checkout is disabled until server credentials, a token encryption key, and a public HTTPS SITE_URL are configured."}</p>
          </section>
          <section className="dashboard-card" id="employer-company">
            <p className="section-kicker">YOUR COMPANY</p><h2>Company profile</h2>
            {verification?.status === "VERIFIED" && <p className="verification-state"><VerifiedBadge /> Your company registration has been reviewed.</p>}
            {profile.companyName && <p><Link className="text-link" href={`/companies/${profile.id}`}>View public profile →</Link></p>}
            <form className="stacked-form company-form" onSubmit={saveCompany}>
              <label>Company name<input maxLength={120} minLength={2} onChange={(event) => setCompanyName(event.target.value)} required value={companyName} /></label>
              <label>Website<input onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" type="url" value={website} /></label>
              <label>About your company<textarea maxLength={3000} onChange={(event) => setCompanyBio(event.target.value)} placeholder="Share what your team does." rows={5} value={companyBio} /></label>
              <label className="visibility-option"><input checked={emailNotifications} className="visibility-checkbox" onChange={(event) => setEmailNotifications(event.target.checked)} type="checkbox" /> Send application and interview updates to this account by email.</label>
              <button className="button button-outline" disabled={busy} type="submit">Save company profile</button>
            </form>
          </section>
          <section className="dashboard-card">
            <p className="section-kicker">BUILD TRUST</p><h2>Company verification</h2>
            {verification?.status === "PENDING" && <p className="verification-state">Your request is awaiting admin review.</p>}
            {verification?.status === "REJECTED" && <p className="form-error">Your request was not approved.{verification.reviewNote ? ` ${verification.reviewNote}` : " Update the details and submit again."}</p>}
            {verification?.status !== "VERIFIED" && <form className="stacked-form company-form" onSubmit={submitVerification}>
              <p>Submit your company’s registration details. Our team will review them before a verified badge is shown publicly. These details are visible only to administrators.</p>
              <label>Legal company name<input maxLength={160} minLength={2} onChange={(event) => setLegalCompanyName(event.target.value)} required value={legalCompanyName} /></label>
              <label>Registration authority<select onChange={(event) => setRegistrationAuthority(event.target.value)} value={registrationAuthority}>
                <option value="RJSC">RJSC registration</option>
                <option value="TRADE_LICENSE">Trade license</option>
                <option value="TIN_BIN">TIN / BIN</option>
                <option value="OTHER">Other</option>
              </select></label>
              <label>Registration number<input maxLength={100} minLength={3} onChange={(event) => setRegistrationNumber(event.target.value)} required value={registrationNumber} /></label>
              <button className="button button-outline" disabled={busy} type="submit">{busy ? "Submitting..." : verification?.status === "REJECTED" ? "Resubmit for review" : verification?.status === "PENDING" ? "Update submitted details" : "Request verification"}</button>
            </form>}
          </section>
        </aside>
      </div>
      <NotificationPanel notifications={notifications} />
    </main>
  );
}

function NotificationPanel({ notifications }: { notifications: DashboardNotification[] }) {
  const [items, setItems] = useState(notifications);
  const [error, setError] = useState("");
  if (items.length === 0) return null;

  async function markAllRead() {
    setError("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? "Notifications could not be marked as read.");
        return;
      }
      setItems([]);
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-heading"><div><p className="section-kicker">UPDATES</p><h2>Notifications</h2></div><button className="subtle-button" onClick={markAllRead} type="button">Mark all read</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dashboard-list">{items.map((notification) => (
        <article className="activity-row" key={notification.id}>
          <div><strong>{notification.href ? <Link className="activity-title" href={notification.href}>{notification.title}</Link> : notification.title}</strong><p>{notification.message}</p><small>{formatDate(notification.createdAt)}</small></div>
        </article>
      ))}</div>
    </section>
  );
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? Math.floor(number) : null;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    CLOSED: "Closed",
    SUBMITTED: "Submitted",
    REVIEWING: "Reviewing",
    SHORTLISTED: "Shortlisted",
    REJECTED: "Not selected",
    HIRED: "Hired",
  };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function localDateTimeMinimum() {
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return localNow.toISOString().slice(0, 16);
}
