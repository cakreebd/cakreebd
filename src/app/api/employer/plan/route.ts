import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { EMPLOYER_PLANS, isEmployerPlan, type EmployerPlanKey } from "@/lib/employer-plans";
import { isBkashConfigured } from "@/lib/bkash";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const plan = await prisma.employerPlan.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  if (!isEmployerPlan(plan.plan)) throw new Error("Saved employer package is invalid.");
  let effectivePlan: EmployerPlanKey = plan.plan;
  let expiresAt = plan.expiresAt;
  if (effectivePlan !== "FREE" && (!expiresAt || expiresAt <= new Date())) {
    await prisma.$transaction([
      prisma.employerPlan.update({
        where: { userId: user.id },
        data: { plan: "FREE", expiresAt: null },
      }),
      prisma.job.updateMany({
        where: { employerId: user.id },
        data: { featuredUntil: null },
      }),
    ]);
    effectivePlan = "FREE";
    expiresAt = null;
  }
  return NextResponse.json({
    plan: effectivePlan,
    details: EMPLOYER_PLANS[effectivePlan],
    activeJobs: await prisma.job.count({ where: { employerId: user.id, status: "ACTIVE" } }),
    expiresAt,
    paymentConfigured: isBkashConfigured(),
  });
}

export async function PUT(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = z.object({ plan: z.literal("FREE") }).safeParse(body.data);
  if (!parsed.success) return badRequest("Choose a valid employer package.");

  const activeJobs = await prisma.job.count({ where: { employerId: user.id, status: "ACTIVE" } });
  if (activeJobs > EMPLOYER_PLANS.FREE.activeJobLimit) {
    return NextResponse.json({ error: "Close active jobs until you are within the Free package limit before downgrading." }, { status: 409 });
  }
  const plan = await prisma.$transaction(async (transaction) => {
    const updatedPlan = await transaction.employerPlan.upsert({
      where: { userId: user.id },
      create: { userId: user.id, plan: parsed.data.plan, expiresAt: null },
      update: { plan: parsed.data.plan, expiresAt: null },
    });
    await transaction.job.updateMany({
      where: { employerId: user.id },
      data: { featuredUntil: null },
    });
    return updatedPlan;
  });
  return NextResponse.json({
    plan: plan.plan,
    details: EMPLOYER_PLANS[parsed.data.plan],
  });
}
