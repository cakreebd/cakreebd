import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardClient from "@/components/dashboard-client";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { EMPLOYER_PLANS, isEmployerPlan, type EmployerPlanKey } from "@/lib/employer-plans";
import { isBkashConfigured } from "@/lib/bkash";
import { isDemoCompany } from "@/lib/demo-content";
import type { EmployerJobAnalytics } from "@/lib/employer-analytics";
import { toPublicJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

export default function DashboardPage() {
  return <DashboardSectionPage section="overview" />;
}

export function DashboardSectionPage({ section }: { section: string }) {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading dashboard" />}><DashboardContent section={section} /></Suspense>;
}

async function DashboardContent({ section }: { section: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  const allowedSections = user.role === "JOB_SEEKER"
    ? ["overview", "applications", "saved", "alerts", "profile", "cv", "notifications"]
    : ["overview", "post-job", "jobs", "applicants", "analytics", "candidates", "company", "verification", "plan", "notifications"];
  if (!allowedSections.includes(section)) redirect("/dashboard");

  if (user.role === "JOB_SEEKER") {
    const profile = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        headline: true,
        bio: true,
        skills: true,
        cvFileName: true,
        profileVisible: true,
        emailNotifications: true,
        notifications: {
          where: { readAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, title: true, message: true, href: true, createdAt: true },
        },
        applications: {
          orderBy: { createdAt: "desc" },
          include: {
            review: { select: { id: true, status: true } },
            interviews: {
              orderBy: { scheduledAt: "asc" },
              select: {
                id: true,
                scheduledAt: true,
                location: true,
                meetingUrl: true,
                notes: true,
                status: true,
              },
            },
            job: {
              select: {
                id: true,
                title: true,
                companyName: true,
                location: true,
                employmentType: true,
                status: true,
                employer: { select: { companyName: true } },
              },
            },
          },
        },
        savedJobs: {
          orderBy: { createdAt: "desc" },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                companyName: true,
                location: true,
                employmentType: true,
                status: true,
              },
            },
          },
        },
      },
    });
    let skills: string[];
    try {
      const parsed: unknown = JSON.parse(profile.skills);
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
        throw new Error("Saved profile skills have an invalid format.");
      }
      skills = parsed;
    } catch (error) {
      throw new Error("Could not load the saved profile skills.", { cause: error });
    }
    const recommendedJobs = section === "overview"
      ? await prisma.job.findMany({
          where: { status: "ACTIVE", NOT: { employerId: user.id } },
          orderBy: [
            { featuredUntil: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
          take: 16,
          include: {
            employer: {
              select: {
                companyName: true,
                companyVerification: { select: { status: true } },
              },
            },
          },
        })
      : [];
    return (
      <>
        <SiteHeader user={user} />
        <DashboardClient
          mode="JOB_SEEKER"
          section={section}
          profile={{ ...profile, skills }}
          recommendedJobs={recommendedJobs.map((job) => ({
            ...toPublicJob(job),
            demo: isDemoCompany(job.companyName),
            companyVerified: job.companyName === job.employer.companyName &&
              job.employer.companyVerification?.status === "VERIFIED",
          }))}
          applications={profile.applications.map((item) => ({
            id: item.id,
            status: item.status,
            createdAt: item.createdAt.toISOString(),
            job: {
              id: item.job.id,
              title: item.job.title,
              companyName: item.job.companyName,
              location: item.job.location,
              employmentType: item.job.employmentType,
              status: item.job.status,
            },
            reviewEligible: Boolean(item.job.employer.companyName && item.job.companyName === item.job.employer.companyName),
            review: item.review,
            interviews: item.interviews.map((interview) => ({
              id: interview.id,
              scheduledAt: interview.scheduledAt.toISOString(),
              location: interview.location,
              meetingUrl: interview.meetingUrl,
              notes: interview.notes,
              status: interview.status,
              jobTitle: item.job.title,
            })),
          }))}
          savedJobs={profile.savedJobs.map((item) => ({ id: item.id, job: item.job }))}
          notifications={profile.notifications.map((notification) => ({
            ...notification,
            createdAt: notification.createdAt.toISOString(),
          }))}
        />
      </>
    );
  }

  const employerPlan = await prisma.employerPlan.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  if (!isEmployerPlan(employerPlan.plan)) throw new Error("Saved employer package is invalid.");
  let effectiveEmployerPlan: EmployerPlanKey = employerPlan.plan;
  let planExpiresAt = employerPlan.expiresAt;
  if (effectiveEmployerPlan !== "FREE" && (!planExpiresAt || planExpiresAt <= new Date())) {
    await prisma.$transaction([
      prisma.employerPlan.update({
        where: { userId: user.id },
        data: { plan: "FREE", expiresAt: null },
      }),
      prisma.job.updateMany({
        where: { employerId: user.id },
        data: { featuredUntil: null },
      }),
    ]);
    effectiveEmployerPlan = "FREE";
    planExpiresAt = null;
  }
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      companyName: true,
      companyBio: true,
      website: true,
      emailNotifications: true,
      companyVerification: {
        select: {
          legalCompanyName: true,
          registrationAuthority: true,
          registrationNumber: true,
          status: true,
          reviewNote: true,
        },
      },
      notifications: {
        where: { readAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, message: true, href: true, createdAt: true },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        include: {
          applications: {
            orderBy: { createdAt: "desc" },
            include: {
              interviews: {
                orderBy: { scheduledAt: "asc" },
                select: {
                  id: true,
                  scheduledAt: true,
                  location: true,
                  meetingUrl: true,
                  notes: true,
                  status: true,
                },
              },
              applicant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  location: true,
                  headline: true,
                  cvFileName: true,
                  skills: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const jobs = profile.jobs.map((job) => ({
    ...toPublicJob(job),
    applications: job.applications.map((application) => ({
      id: application.id,
      status: application.status,
      createdAt: application.createdAt.toISOString(),
      coverLetter: application.coverLetter,
      interviews: application.interviews.map((interview) => ({
        ...interview,
        scheduledAt: interview.scheduledAt.toISOString(),
      })),
      applicant: {
        ...application.applicant,
        skills: parseSkills(application.applicant.skills),
      },
    })),
  }));
  let analytics: EmployerJobAnalytics[] | null = null;
  if (section === "analytics" && EMPLOYER_PLANS[effectiveEmployerPlan].analyticsDashboard) {
    const analyticsSince = new Date();
    analyticsSince.setTime(analyticsSince.getTime() - 30 * 24 * 60 * 60 * 1000);
    const jobIds = profile.jobs.map((job) => job.id);
    const events = jobIds.length > 0
      ? await prisma.jobAnalyticsEvent.groupBy({
          by: ["jobId", "eventType"],
          where: { jobId: { in: jobIds }, createdAt: { gte: analyticsSince } },
          _count: { _all: true },
        })
      : [];
    const eventCounts = new Map<string, number>();
    for (const event of events) {
      eventCounts.set(`${event.jobId}:${event.eventType}`, event._count._all);
    }
    analytics = profile.jobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      views: eventCounts.get(`${job.id}:VIEW`) ?? 0,
      applyClicks: eventCounts.get(`${job.id}:APPLY_CLICK`) ?? 0,
      applications: job.applications.filter((application) => application.createdAt >= analyticsSince).length,
    }));
  }

  return (
    <>
      <SiteHeader user={user} />
      <DashboardClient
        mode="EMPLOYER"
        section={section}
        profile={profile}
        jobs={jobs}
        plan={effectiveEmployerPlan}
        analytics={analytics}
        paymentConfigured={isBkashConfigured()}
        planExpiresAt={planExpiresAt?.toISOString() ?? null}
        notifications={profile.notifications.map((notification) => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        }))}
      />
    </>
  );
}

function parseSkills(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error("Could not load the saved profile skills.", { cause: error });
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Saved profile skills have an invalid format.");
  }
  return parsed.filter((item): item is string => typeof item === "string");
}
