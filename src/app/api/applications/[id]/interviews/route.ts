import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };
const interviewSchema = z.object({
  scheduledAt: z.string().datetime(),
  location: z.string().trim().max(200).nullable().optional(),
  meetingUrl: z.string().trim().url().max(500)
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"))
    .nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const { id } = await params;

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = interviewSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Check the interview date, meeting link, and details.");
  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (scheduledAt <= new Date() || scheduledAt.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) {
    return badRequest("Choose a future interview date within the next year.");
  }

  const application = await prisma.jobApplication.findFirst({
    where: { id, job: { employerId: user.id } },
    select: {
      id: true,
      applicant: { select: { id: true, name: true, email: true, emailNotifications: true } },
      job: { select: { title: true } },
    },
  });
  if (!application) return notFound("Application not found in your employer account.");

  const interview = await prisma.$transaction(async (transaction) => {
    const created = await transaction.interview.create({
      data: {
        applicationId: application.id,
        employerId: user.id,
        scheduledAt,
        location: parsed.data.location || null,
        meetingUrl: parsed.data.meetingUrl || null,
        notes: parsed.data.notes || null,
      },
    });
    await transaction.notification.create({
      data: {
        userId: application.applicant.id,
        title: "Interview scheduled",
        message: `An interview for ${application.job.title} has been scheduled.`,
        href: "/dashboard",
      },
    });
    if (application.applicant.emailNotifications) {
      const dashboardUrl = siteUrl("/dashboard");
      const date = scheduledAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });
      await sendEmail({
        to: application.applicant.email,
        subject: `Interview scheduled: ${application.job.title}`,
        text: `An interview for ${application.job.title} is scheduled for ${date}. ${parsed.data.location ?? ""} ${parsed.data.meetingUrl ?? ""} ${dashboardUrl}`,
        html: `<p>An interview for <strong>${escapeHtml(application.job.title)}</strong> is scheduled for ${escapeHtml(date)}.</p>${parsed.data.location ? `<p>Location: ${escapeHtml(parsed.data.location)}</p>` : ""}${parsed.data.meetingUrl ? `<p><a href="${escapeHtml(parsed.data.meetingUrl)}">Join meeting</a></p>` : ""}<p><a href="${dashboardUrl}">View your dashboard</a></p>`,
      });
    }
    return created;
  });

  return NextResponse.json({ interview }, { status: 201 });
}
