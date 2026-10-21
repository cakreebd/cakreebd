import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserFromRequest, unauthorizedResponse } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const { id } = await params;
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = z.object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    reviewNote: z.string().trim().max(500).nullable().optional(),
  }).safeParse(body.data);
  if (!parsed.success) return badRequest("Choose verified or rejected and provide a valid optional review note.");

  const result = await prisma.companyVerification.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: parsed.data.status,
      reviewNote: parsed.data.reviewNote || null,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });
  if (!result.count) return notFound("Pending verification request not found.");
  return NextResponse.json({ status: parsed.data.status });
}
