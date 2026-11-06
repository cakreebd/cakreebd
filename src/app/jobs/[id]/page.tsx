import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import ApplyButton from "@/components/apply-button";
import SaveJobButton from "@/components/save-job-button";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import FeaturedBadge from "@/components/featured-badge";
import DemoBadge from "@/components/demo-badge";
import JobViewTracker from "@/components/job-analytics-tracker";
import { getCurrentUser } from "@/lib/auth";
import { formatSalary, isValidJobId, parseTags, postedLabel } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { isDemoCompany } from "@/lib/demo-content";

type PageProps = { params: Promise<{ id: string }> };

export default function JobDetailPage({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading job details" />}><JobDetailContent params={params} /></Suspense>;
}

async function JobDetailContent({ params }: PageProps) {
  const { id: rawId } = await params;
  if (!isValidJobId(rawId)) notFound();

  const user = await getCurrentUser();
  const job = await prisma.job.findFirst({
    where: { id: rawId, status: "ACTIVE" },
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
      { featuredUntil: "desc" },
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
      {!isDemo && <JobViewTracker jobId={job.id} />}
      <main className="page-shell detail-layout job-detail-layout">
        <div className="detail-main">
          <nav aria-label="Breadcrumb" className="detail-breadcrumb">
            <Link href="/jobs">Jobs</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/jobs?category=${encodeURIComponent(job.category)}`}>{job.category}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{job.title}</span>
          </nav>
          <article className="detail-card job-detail-card">
            <header className="job-detail-header">
              <div className="detail-company-row">
                <span aria-hidden="true" className="result-logo detail-logo">{job.companyName.slice(0, 1).toUpperCase()}</span>
                <div className="job-detail-company">
                  <div className="job-detail-company-name">
                    {hasCompanyProfile
                      ? <Link className="result-company" href={`/companies/${job.employer.id}`}>{job.companyName}</Link>
                      : <span className="result-company">{job.companyName}</span>}
                    {isDemo && <DemoBadge />}
                    {hasCompanyProfile && job.employer.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}
                  </div>
                  <p>Posted {postedLabel(job.createdAt)} <span aria-hidden="true">·</span> {job.location}</p>
                </div>
              </div>
              <h1>{job.title}</h1>
              <div className="job-detail-status">
                <span className="job-active-badge"><span aria-hidden="true" /> Actively hiring</span>
                {job.featuredUntil && job.featuredUntil > new Date() && <FeaturedBadge />}
              </div>
            </header>
            {isDemo && <p className="demo-job-warning" role="note">This is a fictional sample listing for preview purposes, not a real vacancy. Applications are disabled for demo jobs.</p>}
            <div aria-label="Job details" className="job-detail-facts">
              <span>{job.employmentType}</span>
              <span>{job.workMode}</span>
              <span>{job.category}</span>
              <span>{job.location}</span>
            </div>
            <div className="detail-salary-card">
              <span className="detail-salary-label">Monthly salary</span>
              <p className="detail-salary">{formatSalary(job.salaryMin, job.salaryMax)}</p>
              <small>Salary details are provided by the employer.</small>
            </div>
            <section aria-labelledby="job-description-heading" className="detail-section">
              <h2 id="job-description-heading">About the role</h2>
              <p>{job.description}</p>
            </section>
            <section aria-labelledby="job-requirements-heading" className="detail-section">
              <h2 id="job-requirements-heading">What you’ll bring</h2>
              <p>{job.requirements}</p>
            </section>
            {job.benefits && <section aria-labelledby="job-benefits-heading" className="detail-section">
              <h2 id="job-benefits-heading">Benefits</h2>
              <p>{job.benefits}</p>
            </section>}
            {tags.length > 0 && <section aria-labelledby="job-skills-heading" className="detail-section job-skills-section">
              <h2 id="job-skills-heading">Skills and qualifications</h2>
              <div className="dialog-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </section>}
          </article>
        </div>
        <aside aria-label="Apply and learn more" className="detail-sidebar job-detail-sidebar">
          <div className="detail-action-card job-apply-card">
            <p className="section-kicker">NEXT STEP</p>
            <h2>Interested in this role?</h2>
            <p>Apply directly to {job.companyName}. You can include a cover letter with your application.</p>
            {isDemo
              ? <p className="demo-job-apply-note">Demo listing — you can explore the page, but applications are disabled.</p>
              : <ApplyButton alreadyApplied={applied} isJobSeeker={user?.role === "JOB_SEEKER"} jobId={job.id} signedIn={Boolean(user)} />}
            <div className="job-save-row">
              <span>Save this job for later</span>
              <SaveJobButton initiallySaved={saved} jobId={job.id} />
            </div>
          </div>
          <section aria-labelledby="company-about-heading" className="detail-action-card company-about">
            <p className="section-kicker">THE EMPLOYER</p>
            <h2 id="company-about-heading">About {job.companyName}</h2>
            {hasCompanyProfile
              ? <>
                <p>{job.employer.companyBio || "Learn more about this employer and explore their opportunities."}</p>
                <Link className="text-link" href={`/companies/${job.employer.id}`}>View company profile →</Link>
                {job.employer.website && <a className="text-link" href={job.employer.website} rel="noreferrer" target="_blank">Visit company website ↗</a>}
              </>
              : <p>This sample listing does not have a public company profile yet.</p>}
          </section>
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
