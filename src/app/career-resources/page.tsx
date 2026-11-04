import Link from "next/link";
import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { CAREER_RESOURCES } from "@/lib/career-resources";

export default function CareerResourcesPage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading career resources" />}><CareerResourcesContent /></Suspense>;
}

async function CareerResourcesContent() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell resource-page">
        <header className="page-heading">
          <p className="section-kicker">CAREER RESOURCES</p>
          <h1>Practical guidance for your next step.</h1>
          <p>Explore focused guides for building your profile, applying, interviewing, and discussing salary.</p>
        </header>
        <div className="resource-grid">
          {CAREER_RESOURCES.map((resource) => (
            <Link className="resource-card" href={`/career-resources/${resource.slug}`} key={resource.slug}>
              <span className="section-kicker">CAREER GUIDE</span>
              <h2>{resource.title}</h2>
              <p>{resource.summary}</p>
              <span className="resource-card-link">Read guide <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
