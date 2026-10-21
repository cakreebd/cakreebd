import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import FeaturedBadge from "@/components/featured-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatSalary, parseTags } from "@/lib/jobs";
import { expireFeaturedJobs } from "@/lib/featured-jobs";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ id: string }> };

export default function CompanyPage({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading company profile" />}><CompanyContent params={params} /></Suspense>;
}

async function CompanyContent({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  await expireFeaturedJobs();
  const company = await prisma.user.findFirst({
    where: { id, role: "EMPLOYER", companyName: { not: null } },
    select: {
      id: true,
      companyName: true,
      companyBio: true,
      website: true,
      companyVerification: { select: { status: true } },
    },
  });
  if (!company?.companyName) notFound();
  const [jobs, reviews] = await Promise.all([
    prisma.job.findMany({
      where: { employerId: company.id, companyName: company.companyName, status: "ACTIVE" },
      orderBy: [
        { featuredUntil: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        location: true,
        employmentType: true,
        workMode: true,
        salaryMin: true,
        salaryMax: true,
        tags: true,
        featuredUntil: true,
      },
    }),
    prisma.companyReview.findMany({
      where: { employerId: company.id, status: "APPROVED" },
      select: {
        rating: true,
        title: true,
        body: true,
        anonymous: true,
        createdAt: true,
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const rating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : null;

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell">
        <Link className="back-link" href="/jobs">← Back to job search</Link>
        <header className="company-profile-hero">
          <div className="company-profile-identity">
            <span aria-hidden="true" className="company-profile-mark">{company.companyName.slice(0, 1).toUpperCase()}</span>
            <div>
              <p className="section-kicker">COMPANY PROFILE</p>
              <h1>{company.companyName}{company.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}</h1>
              <p className="company-profile-summary">{company.companyBio || "Discover this employer’s open roles and learn more about their team."}</p>
              {company.website && <a className="text-link" href={company.website} rel="noreferrer" target="_blank">Visit company website ↗</a>}
            </div>
          </div>
          <div className="company-profile-stats">
            <div><strong>{jobs.length}</strong><span>Open roles</span></div>
            <div><strong>{rating === null ? "—" : rating.toFixed(1)}</strong><span>{reviews.length ? `${reviews.length} reviews` : "Company rating"}</span></div>
          </div>
        </header>
        <section className="dashboard-card company-openings">
          <div className="dashboard-card-heading"><div><p className="section-kicker">CURRENT OPENINGS</p><h2>Jobs at {company.companyName}</h2></div><span className="count-badge">{jobs.length}</span></div>
          {jobs.length ? <div className="dashboard-list">{jobs.map((job) => (
            <article className="activity-row" key={job.id}>
              <div>
                <Link className="activity-title" href={`/jobs/${job.id}`}>{job.title}</Link>
                {job.featuredUntil && job.featuredUntil > new Date() && <FeaturedBadge />}
                <p>{job.location} · {job.employmentType} · {job.workMode}</p>
                <small>{formatSalary(job.salaryMin, job.salaryMax)} per month · {parseTags(job.tags).join(" · ")}</small>
              </div>
            </article>
          ))}</div> : <div className="dashboard-empty"><p>This company has no active openings right now.</p></div>}
        </section>
        <section className="dashboard-card company-reviews">
          <div className="dashboard-card-heading"><div><p className="section-kicker">VERIFIED EXPERIENCES</p><h2>Company reviews</h2></div><span className="count-badge">{rating === null ? "—" : `${rating.toFixed(1)} / 5`}</span></div>
          {reviews.length ? <div className="dashboard-list">{reviews.map((review, index) => (
            <article className="activity-row" key={`${review.createdAt.toISOString()}-${index}`}>
              <div><strong>{review.title}</strong><p aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} · {review.anonymous ? "Former employee" : review.author.name}</p><p>{review.body}</p><small>{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(review.createdAt)}</small></div>
            </article>
          ))}</div> : <div className="dashboard-empty"><p>No approved reviews yet.</p></div>}
        </section>
      </main>
    </>
  );
}
