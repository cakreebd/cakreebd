import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return notFound("Job not found.");

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
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return notFound("Job not found.");

  await prisma.savedJob.deleteMany({ where: { jobId: id, userId: user.id } });
  return NextResponse.json({ saved: false });
}
