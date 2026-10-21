import AuthForm from "@/components/auth-form";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default function LoginPage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading sign in" />}><LoginContent /></Suspense>;
}

async function LoginContent() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader user={user} />
      <main className="auth-page"><AuthForm mode="login" /></main>
    </>
  );
}
import { Suspense } from "react";
