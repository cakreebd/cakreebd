import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/http";
import { toPublicJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function getJobId(params: RouteContext["params"]) {
  const { id } = await params;
  const jobId = Number(id);
  return Number.isInteger(jobId) && jobId > 0 ? jobId : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const id = await getJobId(params);
  if (!id) return notFound("Job not found.");
  const job = await prisma.job.findFirst({
    where: { id, status: "ACTIVE" },
    include: { employer: { select: { companyBio: true, website: true } } },
  });
  if (!job) return notFound("Job not found.");
  return NextResponse.json({
    job: { ...toPublicJob(job), companyBio: job.employer.companyBio, website: job.employer.website },
  });
}

const updateSchema = z.object({ status: z.enum(["ACTIVE", "CLOSED"]) });

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const id = await getJobId(params);
  if (!id) return notFound("Job not found.");

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = updateSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Choose a valid job status.");

  const result = await prisma.job.updateMany({
    where: { id, employerId: user.id },
    data: { status: parsed.data.status },
  });
  if (result.count === 0) return notFound("Job not found in your employer account.");
  const job = await prisma.job.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ job: toPublicJob(job) });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const id = await getJobId(params);
  if (!id) return notFound("Job not found.");

  const result = await prisma.job.deleteMany({
    where: { id, employerId: user.id },
  });
  if (result.count === 0) return notFound("Job not found in your employer account.");
  return NextResponse.json({ success: true });
}
