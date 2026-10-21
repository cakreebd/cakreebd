import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const resumeSchema = z.object({
  summary: z.string().trim().max(3000),
  targetRole: z.string().trim().max(140),
  sections: z.array(z.object({
    kind: z.enum(["WORK", "EDUCATION", "CERTIFICATION", "OTHER"]),
    title: z.string().trim().min(2).max(140),
    organization: z.string().trim().max(140).nullable(),
    startDate: z.string().trim().max(30).nullable(),
    endDate: z.string().trim().max(30).nullable(),
    description: z.string().trim().max(3000).nullable(),
  })).max(25),
});

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();

  const resume = await prisma.candidateResume.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ resume });
}

export async function PUT(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = resumeSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Check resume details and keep to 25 sections or fewer.");

  const resume = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.candidateResume.upsert({
      where: { userId: user.id },
      create: { userId: user.id, summary: parsed.data.summary, targetRole: parsed.data.targetRole },
      update: { summary: parsed.data.summary, targetRole: parsed.data.targetRole },
    });
    await transaction.resumeSection.deleteMany({ where: { resumeId: saved.id } });
    for (const [sortOrder, section] of parsed.data.sections.entries()) {
      await transaction.resumeSection.create({
        data: { ...section, resumeId: saved.id, sortOrder },
      });
    }
    return transaction.candidateResume.findUniqueOrThrow({
      where: { id: saved.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
  });
  return NextResponse.json({ resume });
}
