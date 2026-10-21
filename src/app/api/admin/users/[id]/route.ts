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
  const { id } = await params;
  if (id === user.id) return badRequest("You cannot suspend your own administrator account.");
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = z.object({ isActive: z.boolean() }).safeParse(body.data);
  if (!parsed.success) return badRequest("Choose an active-account state.");

  const result = await prisma.user.updateMany({
    where: { id, role: { not: "ADMIN" } },
    data: { isActive: parsed.data.isActive },
  });
  if (!result.count) return notFound("Account not found.");
  if (!parsed.data.isActive) await prisma.session.deleteMany({ where: { userId: id } });
  return NextResponse.json({ isActive: parsed.data.isActive });
}
