import { redirect } from "next/navigation";
import { Suspense } from "react";
import ResumeBuilder from "@/components/resume-builder";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default function ResumePage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading resume builder" />}><ResumeContent /></Suspense>;
}

async function ResumeContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "JOB_SEEKER") redirect("/dashboard");
  const [profile, resume] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, location: true, headline: true, skills: true },
    }),
    prisma.candidateResume.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  let skills: string[];
  try {
    const parsed: unknown = JSON.parse(profile.skills);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("Resume skills have an invalid format.");
    }
    skills = parsed;
  } catch (error) {
    throw new Error("Could not load profile skills for the resume.", { cause: error });
  }
  return (
    <>
      <SiteHeader user={user} />
      <ResumeBuilder profile={{ ...profile, skills }} initialResume={{
        summary: resume.summary,
        targetRole: resume.targetRole,
        sections: resume.sections.map(({ kind, title, organization, startDate, endDate, description }) => ({
          kind: parseResumeSectionKind(kind),
          title,
          organization,
          startDate,
          endDate,
          description,
        })),
      }} />
    </>
  );
}

function parseResumeSectionKind(value: string): "WORK" | "EDUCATION" | "CERTIFICATION" | "OTHER" {
  if (value === "WORK" || value === "EDUCATION" || value === "CERTIFICATION" || value === "OTHER") {
    return value;
  }
  throw new Error("Saved resume section has an unsupported type.");
}
