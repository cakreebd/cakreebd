import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  const { id } = await params;
  const result = await prisma.jobAlert.deleteMany({ where: { id, userId: user.id } });
  if (!result.count) return notFound("Job alert not found.");
  return NextResponse.json({ deleted: true });
}
