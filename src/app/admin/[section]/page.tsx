import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminSectionPage } from "@/app/admin/admin-section";

type PageProps = { params: Promise<{ section: string }> };

export default function AdminRoute({ params }: PageProps) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading admin dashboard" />}><AdminRouteContent params={params} /></Suspense>;
}

async function AdminRouteContent({ params }: PageProps) {
  const { section } = await params;
  if (section === "overview") redirect("/admin");
  return <AdminSectionPage section={section} />;
}
