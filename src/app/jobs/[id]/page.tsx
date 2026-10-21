import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import ApplyButton from "@/components/apply-button";
import SaveJobButton from "@/components/save-job-button";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import FeaturedBadge from "@/components/featured-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatSalary, parseTags, postedLabel } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ id: string }> };

export default function JobDetailPage({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading job details" />}><JobDetailContent params={params} /></Suspense>;
}

async function JobDetailContent({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const user = await getCurrentUser();
  const job = await prisma.job.findFirst({
    where: { id, status: "ACTIVE" },
    include: {
      employer: {
        select: {
          id: true,
          companyName: true,
          companyBio: true,
          website: true,
          companyVerification: { select: { status: true } },
        },
      },
      applications: user?.role === "JOB_SEEKER"
        ? { where: { applicantId: user.id }, select: { id: true } }
        : false,
      savedBy: user?.role === "JOB_SEEKER"
        ? { where: { userId: user.id }, select: { id: true } }
        : false,
    },
  });
  if (!job) notFound();

  const tags = parseTags(job.tags);
  const applied = Array.isArray(job.applications) && job.applications.length > 0;
  const saved = Array.isArray(job.savedBy) && job.savedBy.length > 0;
  const hasCompanyProfile = job.companyName === job.employer.companyName;

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell detail-layout">
        <div className="detail-main">
          <Link className="back-link" href="/jobs">← Back to job search</Link>
          <article className="detail-card">
            <div className="detail-company-row">
              <span className="result-logo detail-logo">{job.companyName.slice(0, 1).toUpperCase()}</span>
              <div>{hasCompanyProfile ? <Link className="result-company" href={`/companies/${job.employer.id}`}>{job.companyName}</Link> : <div className="result-company">{job.companyName}</div>}{hasCompanyProfile && job.employer.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}<p>{job.location} · Posted {postedLabel(job.createdAt)}</p></div>
            </div>
            <h1>{job.title}{job.featuredUntil && job.featuredUntil > new Date() && <FeaturedBadge />}</h1>
            <div className="result-meta"><span>{job.employmentType}</span><span>{job.workMode}</span><span>{job.category}</span><span>{job.location}</span></div>
            <p className="detail-salary">{formatSalary(job.salaryMin, job.salaryMax)} <small>per month</small></p>
            <section className="detail-section"><h2>About the role</h2><p>{job.description}</p></section>
            <section className="detail-section"><h2>What you’ll bring</h2><p>{job.requirements}</p></section>
            {job.benefits && <section className="detail-section"><h2>Benefits</h2><p>{job.benefits}</p></section>}
            {tags.length > 0 && <div className="dialog-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
          </article>
        </div>
        <aside className="detail-sidebar">
          <div className="detail-action-card">
            <h2>Interested in this role?</h2>
            <p>Send your application directly to {job.companyName}.</p>
            <ApplyButton alreadyApplied={applied} isJobSeeker={user?.role === "JOB_SEEKER"} jobId={job.id} signedIn={Boolean(user)} />
            <SaveJobButton initiallySaved={saved} jobId={job.id} />
          </div>
          <div className="detail-action-card company-about"><h2>About {job.companyName}</h2>{hasCompanyProfile ? <><p>{job.employer.companyBio || "Learn more about this employer and explore their opportunities."}</p><Link className="text-link" href={`/companies/${job.employer.id}`}>View company profile →</Link>{job.employer.website && <a className="text-link" href={job.employer.website} rel="noreferrer" target="_blank">Visit company website ↗</a>}</> : <p>This sample listing does not have a public company profile yet.</p>}</div>
        </aside>
      </main>
    </>
  );
}
