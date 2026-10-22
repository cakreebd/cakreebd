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
import { isDemoCompany } from "@/lib/demo-content";

type RouteContext = { params: Promise<{ id: string }> };

const applicationSchema = z.object({
  coverLetter: z.string().trim().max(5000).optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return notFound("Job not found.");

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = applicationSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Cover letter cannot exceed 5,000 characters.");

  const job = await prisma.job.findFirst({ where: { id, status: "ACTIVE" } });
  if (!job) return notFound("This job is no longer available.");
  if (isDemoCompany(job.companyName)) {
    return NextResponse.json({ error: "Applications are disabled for fictional demo listings." }, { status: 409 });
  }
  const existing = await prisma.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId: id, applicantId: user.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already applied for this job." }, { status: 409 });
  }

  const application = await prisma.$transaction(async (transaction) => {
    const created = await transaction.jobApplication.create({
      data: {
        jobId: id,
        applicantId: user.id,
        coverLetter: parsed.data.coverLetter?.trim() || null,
      },
    });
    await transaction.notification.create({
      data: {
        userId: job.employerId,
        title: "New job application",
        message: `A candidate applied for ${job.title}.`,
        href: "/dashboard",
      },
    });
    return created;
  });
  const employer = await prisma.user.findUniqueOrThrow({
    where: { id: job.employerId },
    select: { name: true, email: true, emailNotifications: true },
  });
  if (employer.emailNotifications) {
    const dashboardUrl = siteUrl("/dashboard");
    await sendEmail({
      to: employer.email,
      subject: `New application: ${job.title}`,
      text: `${user.name} applied for ${job.title}. Review the application: ${dashboardUrl}`,
      html: `<p>${escapeHtml(user.name)} applied for <strong>${escapeHtml(job.title)}</strong>.</p><p><a href="${dashboardUrl}">Review application</a></p>`,
    });
  }
  return NextResponse.json({ applicationId: application.id }, { status: 201 });
}
