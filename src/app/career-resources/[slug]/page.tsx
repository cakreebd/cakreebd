import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { CAREER_RESOURCES } from "@/lib/career-resources";

type PageProps = { params: Promise<{ slug: string }> };

export default function CareerResourcePage({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading career guide" />}><CareerResourceContent params={params} /></Suspense>;
}

async function CareerResourceContent({ params }: PageProps) {
  const [{ slug }, user] = await Promise.all([params, getCurrentUser()]);
  const resource = CAREER_RESOURCES.find((item) => item.slug === slug);
  if (!resource) notFound();

  return (
    <>
      <SiteHeader user={user} />
      <main className="page-shell resource-page">
        <Link className="back-link" href="/career-resources">← All career resources</Link>
        <article className="resource-article">
          <header className="page-heading">
            <p className="section-kicker">CAREER GUIDE</p>
            <h1>{resource.title}</h1>
            <p>{resource.summary}</p>
          </header>
          <div className="resource-article-body">
            {resource.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
          <nav aria-label="Related career tools" className="resource-related-links">
            {resource.links.map((link) => <Link className="button button-outline" href={link.href} key={link.href}>{link.label}</Link>)}
            <Link className="text-link" href="/career-resources">More guides →</Link>
          </nav>
        </article>
      </main>
    </>
  );
}
