import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import ApplyButton from "@/components/apply-button";
import SaveJobButton from "@/components/save-job-button";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import FeaturedBadge from "@/components/featured-badge";
import DemoBadge from "@/components/demo-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatSalary, parseTags, postedLabel } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { isDemoCompany } from "@/lib/demo-content";

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
  const isDemo = isDemoCompany(job.companyName);
  const applied = Array.isArray(job.applications) && job.applications.length > 0;
  const saved = Array.isArray(job.savedBy) && job.savedBy.length > 0;
  const hasCompanyProfile = job.companyName === job.employer.companyName;
  const relatedWhere = {
    id: { not: job.id },
    status: "ACTIVE",
    category: job.category,
  };
  let relatedJobs = await prisma.job.findMany({
    where: relatedWhere,
    orderBy: [
      { featuredUntil: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 3,
    select: {
      id: true,
      title: true,
      companyName: true,
      location: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
    },
  });
  if (relatedJobs.length === 0) {
    relatedJobs = await prisma.job.findMany({
      where: {
        id: { not: job.id },
        status: "ACTIVE",
        location: { contains: job.location },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        companyName: true,
        location: true,
        employmentType: true,
        salaryMin: true,
        salaryMax: true,
      },
    });
  }

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell detail-layout">
        <div className="detail-main">
          <Link className="back-link" href="/jobs">← Back to job search</Link>
          <article className="detail-card">
            <div className="detail-company-row">
              <span className="result-logo detail-logo">{job.companyName.slice(0, 1).toUpperCase()}</span>
              <div>{hasCompanyProfile ? <Link className="result-company" href={`/companies/${job.employer.id}`}>{job.companyName}</Link> : <div className="result-company">{job.companyName}</div>}{isDemo && <DemoBadge />}{hasCompanyProfile && job.employer.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}<p>{job.location} · Posted {postedLabel(job.createdAt)}</p></div>
            </div>
            <h2>{job.title}{job.featuredUntil && job.featuredUntil > new Date() && <FeaturedBadge />}</h2>
            {isDemo && <p className="demo-job-warning" role="note">This is a fictional sample listing for preview purposes, not a real vacancy. Applications are disabled for demo jobs.</p>}
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
            {isDemo
              ? <p className="demo-job-apply-note">Demo listing — you can explore the page, but applications are disabled.</p>
              : <ApplyButton alreadyApplied={applied} isJobSeeker={user?.role === "JOB_SEEKER"} jobId={job.id} signedIn={Boolean(user)} />}
            <SaveJobButton initiallySaved={saved} jobId={job.id} />
          </div>
          <div className="detail-action-card company-about"><h2>About {job.companyName}</h2>{hasCompanyProfile ? <><p>{job.employer.companyBio || "Learn more about this employer and explore their opportunities."}</p><Link className="text-link" href={`/companies/${job.employer.id}`}>View company profile →</Link>{job.employer.website && <a className="text-link" href={job.employer.website} rel="noreferrer" target="_blank">Visit company website ↗</a>}</> : <p>This sample listing does not have a public company profile yet.</p>}</div>
          {relatedJobs.length > 0 && <section aria-labelledby="related-jobs-heading" className="detail-action-card related-jobs-card">
            <h2 id="related-jobs-heading">More roles like this</h2>
            {relatedJobs.map((relatedJob) => <article className="related-job" key={relatedJob.id}>
              <Link href={`/jobs/${relatedJob.id}`}>{relatedJob.title}</Link>
              <p>{relatedJob.companyName} · {relatedJob.location}</p>
              <small>{formatSalary(relatedJob.salaryMin, relatedJob.salaryMax)} · {relatedJob.employmentType}</small>
            </article>)}
            <Link className="text-link" href={`/jobs?category=${encodeURIComponent(job.category)}`}>Explore {job.category} jobs →</Link>
          </section>}
        </aside>
      </main>
    </>
  );
}
