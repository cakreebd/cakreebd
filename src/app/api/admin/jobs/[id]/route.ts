import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return notFound("Job not found.");
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = z.object({ status: z.enum(["ACTIVE", "CLOSED"]) }).safeParse(body.data);
  if (!parsed.success) return badRequest("Choose active or closed.");
  const result = await prisma.job.updateMany({ where: { id }, data: { status: parsed.data.status } });
  if (!result.count) return notFound("Job not found.");
  return NextResponse.json({ status: parsed.data.status });
}
