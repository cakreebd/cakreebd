import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard-client";
import SiteHeader from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { isEmployerPlan, type EmployerPlanKey } from "@/lib/employer-plans";
import { isBkashConfigured } from "@/lib/bkash";
import { toPublicJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

export default function DashboardPage() {
  return <Suspense fallback={<main className="route-loading" aria-label="Loading dashboard" />}><DashboardContent /></Suspense>;
}

async function DashboardContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

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
    return (
      <>
        <SiteHeader user={user} />
        <DashboardClient
          mode="JOB_SEEKER"
          profile={{ ...profile, skills }}
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
    await prisma.employerPlan.update({
      where: { userId: user.id },
      data: { plan: "FREE", expiresAt: null },
    });
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

  return (
    <>
      <SiteHeader user={user} />
      <DashboardClient
        mode="EMPLOYER"
        profile={profile}
        jobs={jobs}
        plan={effectiveEmployerPlan}
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
import { Suspense } from "react";
