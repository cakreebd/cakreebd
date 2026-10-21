import AuthForm from "@/components/auth-form";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

type PageProps = { searchParams: Promise<{ role?: string }> };

export default function RegisterPage({ searchParams }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading account form" />}><RegisterContent searchParams={searchParams} /></Suspense>;
}

async function RegisterContent({ searchParams }: PageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const initialRole = params.role === "employer" ? "EMPLOYER" : "JOB_SEEKER";
  return (
    <>
      <SiteHeader user={user} />
      <main className="auth-page"><AuthForm initialRole={initialRole} mode="register" /></main>
    </>
  );
}
import { Suspense } from "react";
