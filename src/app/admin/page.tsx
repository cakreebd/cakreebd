import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminDashboard from "@/components/admin-dashboard";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default function AdminPage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading admin dashboard" />}><AdminContent /></Suspense>;
}

async function AdminContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return <><SiteHeader user={user} /><AdminDashboard /></>;
}
