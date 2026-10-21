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
const statusSchema = z.object({
  status: z.enum(["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"]),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const id = (await params).id;
  if (!id || id.length > 30) return notFound("Application not found.");

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = statusSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Choose a valid application status.");

  const application = await prisma.jobApplication.findFirst({
    where: { id, job: { employerId: user.id } },
    select: {
      id: true,
      applicant: { select: { id: true, name: true, email: true, emailNotifications: true } },
      job: { select: { title: true } },
    },
  });
  if (!application) return notFound("Application not found in your employer account.");
  await prisma.$transaction([
    prisma.jobApplication.update({
      where: { id: application.id },
      data: { status: parsed.data.status },
    }),
    prisma.notification.create({
      data: {
        userId: application.applicant.id,
        title: "Application status updated",
        message: `Your application for ${application.job.title} is now ${parsed.data.status.toLowerCase()}.`,
        href: "/dashboard",
      },
    }),
  ]);
  if (application.applicant.emailNotifications) {
    const dashboardUrl = siteUrl("/dashboard");
    await sendEmail({
      to: application.applicant.email,
      subject: `Application update: ${application.job.title}`,
      text: `Your application for ${application.job.title} is now ${parsed.data.status.toLowerCase()}. View your dashboard: ${dashboardUrl}`,
      html: `<p>Your application for <strong>${escapeHtml(application.job.title)}</strong> is now ${escapeHtml(parsed.data.status.toLowerCase())}.</p><p><a href="${dashboardUrl}">View your dashboard</a></p>`,
    });
  }
  return NextResponse.json({ status: parsed.data.status });
}
