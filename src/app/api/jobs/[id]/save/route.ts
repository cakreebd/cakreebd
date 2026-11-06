import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { notFound } from "@/lib/http";
import { expireJobs } from "@/lib/featured-jobs";
import { isValidJobId } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  await expireJobs();
  const id = (await params).id;
  if (!isValidJobId(id)) return notFound("Job not found.");

  const job = await prisma.job.findFirst({ where: { id, status: "ACTIVE" } });
  if (!job) return notFound("Job not found.");
  await prisma.savedJob.upsert({
    where: { jobId_userId: { jobId: id, userId: user.id } },
    update: {},
    create: { jobId: id, userId: user.id },
  });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  const id = (await params).id;
  if (!isValidJobId(id)) return notFound("Job not found.");

  await prisma.savedJob.deleteMany({ where: { jobId: id, userId: user.id } });
  return NextResponse.json({ saved: false });
}
