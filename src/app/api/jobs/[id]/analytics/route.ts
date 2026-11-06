import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserFromRequest } from "@/lib/auth";
import { notFound, readJson } from "@/lib/http";
import { isDemoCompany } from "@/lib/demo-content";
import { expireJobs } from "@/lib/featured-jobs";
import { isValidJobId } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const eventSchema = z.object({
  eventType: z.enum(["VIEW", "APPLY_CLICK"]),
});

export async function POST(request: Request, { params }: RouteContext) {
  await expireJobs();
  const id = (await params).id;
  if (!isValidJobId(id)) return notFound("Job not found.");

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = eventSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid analytics event." }, { status: 400 });
  }

  const job = await prisma.job.findFirst({
    where: { id, status: "ACTIVE" },
    select: { employerId: true, companyName: true },
  });
  if (!job) return notFound("Job not found.");
  if (isDemoCompany(job.companyName)) return new NextResponse(null, { status: 204 });

  const user = await currentUserFromRequest(request);
  if (user?.id === job.employerId) return new NextResponse(null, { status: 204 });

  const plan = await prisma.employerPlan.findUnique({
    where: { userId: job.employerId },
    select: { plan: true, expiresAt: true },
  });
  if (plan?.plan !== "GROWTH" || !plan.expiresAt || plan.expiresAt <= new Date()) {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.jobAnalyticsEvent.create({
    data: { jobId: id, eventType: parsed.data.eventType },
  });
  return new NextResponse(null, { status: 204 });
}
