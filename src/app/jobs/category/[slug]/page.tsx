import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import DemoBadge from "@/components/demo-badge";
import FeaturedBadge from "@/components/featured-badge";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import { getCurrentUser } from "@/lib/auth";
import { jobCategoryFromSlug } from "@/lib/job-categories";
import { formatSalary, postedLabel } from "@/lib/jobs";
import { isDemoCompany } from "@/lib/demo-content";
import { expireFeaturedJobs } from "@/lib/featured-jobs";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ slug: string }> };

export default function JobCategoryPage({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading category jobs" />}><CategoryContent params={params} /></Suspense>;
}

async function CategoryContent({ params }: PageProps) {
  const [{ slug }, user] = await Promise.all([params, getCurrentUser()]);
  const category = jobCategoryFromSlug(slug);
  if (!category) notFound();
  await expireFeaturedJobs();

  const jobs = await prisma.job.findMany({
    where: { category: category.name, status: "ACTIVE" },
    orderBy: [
      { featuredUntil: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 100,
    include: {
      employer: {
        select: {
          companyName: true,
          companyVerification: { select: { status: true } },
        },
      },
    },
  });

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell">
        <nav aria-label="Breadcrumb" className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/jobs">Jobs</Link><span aria-hidden="true">/</span><span>{category.name}</span></nav>
        <header className="page-heading category-page-heading">
          <p className="section-kicker">JOBS BY CATEGORY</p>
          <h1>{category.name} jobs in Bangladesh</h1>
          <p>{category.description} {jobs.length} {jobs.length === 1 ? "active opportunity" : "active opportunities"} to explore.</p>
        </header>
        <p className="demo-notice">Listings marked DEMO are fictional examples for preview only; applications are disabled.</p>
        {jobs.length ? <div className="search-results">
          {jobs.map((job) => (
            <article className="result-card" key={job.id}>
              <div className="result-logo">{job.companyName.slice(0, 1).toUpperCase()}</div>
              <div className="result-body">
                <div className="result-company">{job.companyName}{isDemoCompany(job.companyName) && <DemoBadge />}{job.featuredUntil && job.featuredUntil > new Date() && <FeaturedBadge />}{job.companyName === job.employer.companyName && job.employer.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}<span className="job-posted">{postedLabel(job.createdAt)}</span></div>
                <h2><Link href={`/jobs/${job.id}`}>{job.title}</Link></h2>
                <div className="result-meta"><span>{job.location}</span><span>{job.employmentType}</span><span>{job.workMode}</span></div>
                <p className="result-description">{job.description}</p>
                <strong className="result-salary">{formatSalary(job.salaryMin, job.salaryMax)} <small>/ month</small></strong>
              </div>
              <div className="result-actions"><Link className="button button-outline" href={`/jobs/${job.id}`}>View details</Link></div>
            </article>
          ))}
        </div> : <div className="dashboard-empty"><p>No active {category.name.toLowerCase()} openings right now.</p><Link className="text-link" href="/jobs">Explore all jobs →</Link></div>}
      </main>
    </>
  );
}
