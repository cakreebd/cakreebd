import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export default function AdminPage() {
  return <AdminSectionPage section="overview" />;
}

export function AdminSectionPage({ section }: { section: string }) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading admin dashboard" />}><AdminContent section={section} /></Suspense>;
}

async function AdminContent({ section }: { section: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  if (!["overview", "verifications", "reviews", "jobs", "users"].includes(section)) redirect("/admin");
  return <><SiteHeader user={user} /><AdminDashboard section={section} /></>;
}
