import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const alertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  query: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  minSalary: z.number().int().positive().nullable().optional(),
});

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();

  const alerts = await prisma.jobAlert.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "desc" },
  });
  const matches = await Promise.all(alerts.map((alert) => {
    const query = alert.query?.trim();
    return prisma.job.findMany({
      where: {
        status: "ACTIVE",
        ...(alert.location ? { location: { contains: alert.location } } : {}),
        ...(alert.category ? { category: alert.category } : {}),
        ...(alert.minSalary ? { salaryMax: { gte: alert.minSalary } } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { companyName: { contains: query } },
                { description: { contains: query } },
                { tags: { contains: query } },
              ],
            }
          : {}),
      },
      select: { id: true, title: true, companyName: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  }));

  return NextResponse.json({
    alerts: alerts.map((alert, index) => ({ ...alert, matches: matches[index] })),
  });
}

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = alertSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Enter a name and valid job alert filters.");

  const alert = await prisma.jobAlert.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      query: parsed.data.query || null,
      location: parsed.data.location || null,
      category: parsed.data.category || null,
      minSalary: parsed.data.minSalary ?? null,
    },
  });
  return NextResponse.json({ alert }, { status: 201 });
}
