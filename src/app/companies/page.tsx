import Link from "next/link";
import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import VerifiedBadge from "@/components/verified-badge";
import DemoBadge from "@/components/demo-badge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDemoCompany } from "@/lib/demo-content";

export default function CompaniesPage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading companies" />}><CompaniesContent /></Suspense>;
}

async function CompaniesContent() {
  const user = await getCurrentUser();
  const companies = await prisma.user.findMany({
    where: {
      role: "EMPLOYER",
      companyName: { not: null },
      jobs: { some: { status: "ACTIVE" } },
    },
    orderBy: { companyName: "asc" },
    take: 100,
    select: {
      id: true,
      companyName: true,
      companyBio: true,
      companyVerification: { select: { status: true } },
      jobs: { where: { status: "ACTIVE" }, select: { id: true } },
    },
  });

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell resource-page">
        <header className="page-heading">
          <p className="section-kicker">COMPANY DIRECTORY</p>
          <h1>Meet the teams hiring on Cakree.</h1>
          <p>Explore employer profiles and their active opportunities across Bangladesh.</p>
        </header>
        {companies.length ? <div className="company-directory-grid">
          {companies.map((company) => company.companyName && (
            <Link className="company-directory-card" href={`/companies/${company.id}`} key={company.id}>
              <span className="company-discovery-mark">{company.companyName.slice(0, 1).toUpperCase()}</span>
              <span className="company-directory-copy">
                <strong>{company.companyName}</strong>
                <span>{company.jobs.length} active {company.jobs.length === 1 ? "opening" : "openings"}</span>
                <small>{company.companyBio || "View this employer’s profile and current job openings."}</small>
              </span>
              {isDemoCompany(company.companyName) && <DemoBadge />}
              {company.companyVerification?.status === "VERIFIED" && <VerifiedBadge />}
            </Link>
          ))}
        </div> : <div className="dashboard-empty"><p>No companies with active jobs yet.</p><Link className="text-link" href="/jobs">Browse available jobs →</Link></div>}
      </main>
    </>
  );
}
