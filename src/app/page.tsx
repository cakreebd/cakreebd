import { Suspense } from "react";
import HomeClient, { type Job } from "@/components/home-client";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { toPublicJob } from "@/lib/jobs";
import { expireFeaturedJobs } from "@/lib/featured-jobs";
import { prisma } from "@/lib/prisma";

const logoTones = ["coral", "pink", "orange", "navy", "green", "blue", "teal", "purple"];

export default function HomePage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading jobs" />}><HomeContent /></Suspense>;
}

async function HomeContent() {
  const user = await getCurrentUser();
  await expireFeaturedJobs();
  const [jobs, saved] = await Promise.all([
    prisma.job.findMany({
      where: { status: "ACTIVE" },
      orderBy: [
        { featuredUntil: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 8,
      include: {
        employer: {
          select: {
            companyName: true,
            companyVerification: { select: { status: true } },
          },
        },
      },
    }),
    user?.role === "JOB_SEEKER"
      ? prisma.savedJob.findMany({
          where: { userId: user.id },
          select: { jobId: true },
        })
      : Promise.resolve([]),
  ]);

  const initialJobs: Job[] = jobs.map((job, index) => {
    const publicJob = toPublicJob(job);
    return {
      ...publicJob,
      companyVerified: job.companyName === job.employer.companyName &&
        job.employer.companyVerification?.status === "VERIFIED",
      logo: publicJob.company.charAt(0).toLowerCase(),
      logoTone: logoTones[index % logoTones.length],
    };
  });

  return (
    <>
      <SiteHeader user={user} />
      <HomeClient initialJobs={initialJobs} initiallySavedJobIds={saved.map((item) => item.jobId)} />
    </>
  );
}
