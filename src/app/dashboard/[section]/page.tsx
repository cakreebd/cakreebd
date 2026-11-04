import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardSectionPage } from "@/app/dashboard/dashboard-section";

type PageProps = { params: Promise<{ section: string }> };

export default function DashboardRoute({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading dashboard" />}><DashboardRouteContent params={params} /></Suspense>;
}

async function DashboardRouteContent({ params }: PageProps) {
  const { section } = await params;
  if (section === "overview") redirect("/dashboard");
  return <DashboardSectionPage section={section} />;
}
