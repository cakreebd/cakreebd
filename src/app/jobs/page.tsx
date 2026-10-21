import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import SaveJobButton from "@/components/save-job-button";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatSalary, postedLabel } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const categories = ["Technology", "Marketing", "Sales", "Design", "Finance", "Customer service"];
const locations = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna", "Remote"];
const types = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"];
const workModes = ["On-site", "Hybrid", "Remote"];

export default function JobsPage({ searchParams }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading job search" />}><JobsContent searchParams={searchParams} /></Suspense>;
}

async function JobsContent({ searchParams }: PageProps) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  const get = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0, 120);
  };
  const q = get("q");
  const location = get("location");
  const category = get("category");
  const employmentType = get("employmentType");
  const workMode = get("workMode");
  const minSalaryValue = Number(get("minSalary"));
  const minSalary = Number.isFinite(minSalaryValue) && minSalaryValue > 0
    ? Math.floor(minSalaryValue)
    : undefined;
  const pageValue = Number(get("page") || 1);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  const pageSize = 12;

  const where: Prisma.JobWhereInput = {
    status: "ACTIVE",
    ...(q ? {
      OR: [
        { title: { contains: q } },
        { companyName: { contains: q } },
        { description: { contains: q } },
        { requirements: { contains: q } },
        { tags: { contains: q } },
      ],
    } : {}),
    ...(location ? { location: { contains: location } } : {}),
    ...(categories.includes(category) ? { category } : {}),
    ...(types.includes(employmentType) ? { employmentType } : {}),
    ...(workModes.includes(workMode) ? { workMode } : {}),
    ...(minSalary ? { salaryMax: { gte: minSalary } } : {}),
  };
  const [jobs, total, saved] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    user?.role === "JOB_SEEKER"
      ? prisma.savedJob.findMany({ where: { userId: user.id }, select: { jobId: true } })
      : Promise.resolve([]),
  ]);
  const savedIds = new Set(saved.map((item) => item.jobId));
  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell">
        <div className="page-heading">
          <p className="section-kicker">YOUR NEXT STEP STARTS HERE</p>
          <h1>Find a role that fits.</h1>
          <p>Search opportunities from teams across Bangladesh.</p>
        </div>
        <form action="/jobs" className="filter-panel">
          <label className="filter-search">Search jobs, skills, or companies
            <input defaultValue={q} name="q" placeholder="e.g. product designer" />
          </label>
          <label>Location
            <select defaultValue={location} name="location">
              <option value="">All Bangladesh</option>
              {locations.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Category
            <select defaultValue={category} name="category">
              <option value="">All categories</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Job type
            <select defaultValue={employmentType} name="employmentType">
              <option value="">Any type</option>
              {types.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Work arrangement
            <select defaultValue={workMode} name="workMode">
              <option value="">Any arrangement</option>
              {workModes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Minimum monthly salary (BDT)
            <input defaultValue={get("minSalary")} min="0" name="minSalary" placeholder="e.g. 50000" type="number" />
          </label>
          <button className="button button-primary filter-submit" type="submit">Search jobs</button>
        </form>

        <div className="listing-heading">
          <div><h2>{total} {total === 1 ? "opportunity" : "opportunities"}</h2><p>Showing the latest matching roles</p></div>
          {(q || location || category || employmentType || workMode || minSalary) && <Link className="text-link" href="/jobs">Clear filters</Link>}
        </div>
        <p className="demo-notice">Sample listings are included to preview Cakree. Employers can publish real openings from their dashboard.</p>
        {jobs.length ? (
          <div className="search-results">
            {jobs.map((job) => (
              <article className="result-card" key={job.id}>
                <div className="result-logo">{job.companyName.slice(0, 1).toUpperCase()}</div>
                <div className="result-body">
                  <div className="result-company">{job.companyName}{job.companyName === job.employer.companyName && job.employer.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}<span className="job-posted">{postedLabel(job.createdAt)}</span></div>
                  <h3><Link href={`/jobs/${job.id}`}>{job.title}</Link></h3>
                  <div className="result-meta"><span>{job.location}</span><span>{job.employmentType}</span><span>{job.workMode}</span><span>{job.category}</span></div>
                  <p className="result-description">{job.description}</p>
                  <strong className="result-salary">{formatSalary(job.salaryMin, job.salaryMax)} <small>/ month</small></strong>
                </div>
                <div className="result-actions">
                  <SaveJobButton initiallySaved={savedIds.has(job.id)} jobId={job.id} />
                  <Link className="button button-outline" href={`/jobs/${job.id}`}>View details</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><h2>No matching jobs yet</h2><p>Try changing your search terms or filters.</p><Link className="button button-dark" href="/jobs">Clear filters</Link></div>
        )}
        {totalPages > 1 && (
          <nav aria-label="Search result pages" className="pagination">
            {page > 1 && <Link className="button button-outline" href={pageHref(params, page - 1)}>Previous</Link>}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages && <Link className="button button-outline" href={pageHref(params, page + 1)}>Next</Link>}
          </nav>
        )}
      </main>
    </>
  );
}

function pageHref(params: Record<string, string | string[] | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    query.set(key, Array.isArray(value) ? value[0] : value);
  }
  query.set("page", String(page));
  return `/jobs?${query.toString()}`;
}
