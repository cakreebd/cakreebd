import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import DemoBadge from "@/components/demo-badge";
import FeaturedBadge from "@/components/featured-badge";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import { getCurrentUser } from "@/lib/auth";
import { jobCategoryFromSlug } from "@/lib/job-categories";
import { dateDaysAgo, formatSalary, postedLabel } from "@/lib/jobs";
import { formatJobDeadline } from "@/lib/job-deadline";
import { isDemoCompany } from "@/lib/demo-content";
import { expireJobs } from "@/lib/featured-jobs";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const locations = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Remote"];
const employmentTypes = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"];
const workModes = ["On-site", "Hybrid", "Remote"];

export default function JobCategoryPage({ params, searchParams }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading category jobs" />}><CategoryContent params={params} searchParams={searchParams} /></Suspense>;
}

async function CategoryContent({ params, searchParams }: PageProps) {
  const [{ slug }, filters, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const category = jobCategoryFromSlug(slug);
  if (!category) notFound();
  await expireJobs();

  const getFilter = (key: string) => {
    const value = filters[key];
    return (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0, 120);
  };
  const location = getFilter("location");
  const employmentType = getFilter("employmentType");
  const workMode = getFilter("workMode");
  const minSalaryValue = Number(getFilter("minSalary"));
  const minSalary = Number.isFinite(minSalaryValue) && minSalaryValue > 0
    ? Math.floor(minSalaryValue)
    : undefined;
  const maxSalaryValue = Number(getFilter("maxSalary"));
  const maxSalary = Number.isFinite(maxSalaryValue) && maxSalaryValue > 0
    ? Math.floor(maxSalaryValue)
    : undefined;
  const postedWithin = ["1", "7", "30"].includes(getFilter("postedWithin"))
    ? Number(getFilter("postedWithin"))
    : undefined;
  const postedAfter = postedWithin ? dateDaysAgo(postedWithin) : undefined;
  const salaryRangeInvalid = minSalary !== undefined && maxSalary !== undefined && minSalary > maxSalary;
  const where: Prisma.JobWhereInput = {
    category: category.name,
    status: "ACTIVE",
    ...(location === "Remote"
      ? { OR: [{ location: { contains: "Remote" } }, { workMode: "Remote" }] }
      : location && locations.includes(location)
        ? { location: { contains: location } }
        : {}),
    ...(employmentTypes.includes(employmentType) ? { employmentType } : {}),
    ...(workModes.includes(workMode) ? { workMode } : {}),
    ...(minSalary ? { salaryMax: { gte: minSalary } } : {}),
    ...(maxSalary ? { salaryMin: { lte: maxSalary } } : {}),
    ...(postedAfter ? { createdAt: { gte: postedAfter } } : {}),
    ...(salaryRangeInvalid ? { id: { in: [] } } : {}),
  };
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
    where,
    orderBy: [
      { featuredUntil: "desc" },
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
    }),
    prisma.job.count({ where }),
  ]);
  const hasFilters = Boolean(location || employmentType || workMode || minSalary || maxSalary || postedWithin);

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell">
        <nav aria-label="Breadcrumb" className="breadcrumbs"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/jobs">Jobs</Link><span aria-hidden="true">/</span><span>{category.name}</span></nav>
        <header className="page-heading category-page-heading">
          <p className="section-kicker">JOBS BY CATEGORY</p>
          <h1>{category.name} jobs in Bangladesh</h1>
          <p>{category.description}</p>
        </header>
        <p className="demo-notice">Listings marked DEMO are fictional examples for preview only; applications are disabled.</p>
        <div className="listing-heading category-listing-heading">
          <div><h2>{total} {total === 1 ? "opportunity" : "opportunities"}</h2><p>Matching {category.name.toLowerCase()} roles</p></div>
        </div>
        {salaryRangeInvalid && <p className="form-error" role="alert">Maximum salary must be greater than or equal to minimum salary.</p>}
        <div className="category-listing-layout">
          <aside aria-label="Filter jobs" className="filter-panel category-filter-panel">
            <h2>Filter jobs</h2>
            <form action={`/jobs/category/${slug}`}>
              <label>Location
                <select defaultValue={locations.includes(location) ? location : ""} name="location">
                  <option value="">All locations</option>
                  {locations.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Job type
                <select defaultValue={employmentTypes.includes(employmentType) ? employmentType : ""} name="employmentType">
                  <option value="">Any type</option>
                  {employmentTypes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Work arrangement
                <select defaultValue={workModes.includes(workMode) ? workMode : ""} name="workMode">
                  <option value="">Any arrangement</option>
                  {workModes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>Minimum monthly salary (BDT)
                <input defaultValue={minSalary?.toString() ?? ""} min="0" name="minSalary" placeholder="e.g. 30000" type="number" />
              </label>
              <label>Maximum monthly salary (BDT)
                <input defaultValue={maxSalary?.toString() ?? ""} min="0" name="maxSalary" placeholder="e.g. 80000" type="number" />
              </label>
              <label>Posted within
                <select defaultValue={postedWithin?.toString() ?? ""} name="postedWithin">
                  <option value="">Any time</option>
                  <option value="1">24 hours</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </label>
              <button className="button button-primary filter-submit" type="submit">Apply filters</button>
              {hasFilters && <Link className="category-filter-clear" href={`/jobs/category/${slug}`}>Clear filters</Link>}
            </form>
          </aside>
          {jobs.length ? <div className="search-results">
            {jobs.map((job) => (
              <Link className={`result-card category-result-card${job.featuredUntil && job.featuredUntil > new Date() ? " result-card-featured" : ""}`} href={`/jobs/${job.id}`} key={job.id}>
                <div className="result-logo">{job.companyName.slice(0, 1).toUpperCase()}</div>
                <div className="result-body">
                  <div className="result-company">{job.companyName}{isDemoCompany(job.companyName) && <DemoBadge />}{job.featuredUntil && job.featuredUntil > new Date() && <FeaturedBadge />}{job.companyName === job.employer.companyName && job.employer.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}<span className="job-posted">{postedLabel(job.createdAt)}</span></div>
                  <h2>{job.title}</h2>
                  <div className="result-meta"><span>{job.location}</span><span>{job.employmentType}</span><span>{job.workMode}</span></div>
                  <p className="result-description">{job.description}</p>
                  <div className="result-salary-deadline">
                    <strong className="result-salary">{formatSalary(job.salaryMin, job.salaryMax)} <small>/ month</small></strong>
                    <span className="job-deadline">Apply by {formatJobDeadline(job.deadlineAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div> : <div className="dashboard-empty category-filter-empty"><p>{total === 0 && !hasFilters ? `No active ${category.name.toLowerCase()} openings right now.` : "No jobs match these filters."}</p>{hasFilters ? <Link className="text-link" href={`/jobs/category/${slug}`}>Clear filters</Link> : <Link className="text-link" href="/jobs">Explore all jobs →</Link>}</div>}
        </div>
      </main>
    </>
  );
}
