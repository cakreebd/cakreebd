import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { toPublicJob } from "@/lib/jobs";
import { EMPLOYER_PLANS, isEmployerPlan, type EmployerPlanKey } from "@/lib/employer-plans";
import { prisma } from "@/lib/prisma";

const createJobSchema = z.object({
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(100),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Internship", "Temporary"]),
  workMode: z.enum(["On-site", "Hybrid", "Remote"]),
  salaryMin: z.number().int().nonnegative().nullable(),
  salaryMax: z.number().int().positive().nullable(),
  description: z.string().trim().min(30).max(10000),
  requirements: z.string().trim().min(10).max(5000),
  benefits: z.string().trim().max(3000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const location = (params.get("location") ?? "").trim().slice(0, 100);
  const category = (params.get("category") ?? "").trim().slice(0, 80);
  const employmentType = params.get("employmentType");
  const workMode = params.get("workMode");
  const minSalaryValue = Number(params.get("minSalary"));
  const minSalary = Number.isFinite(minSalaryValue) && minSalaryValue > 0
    ? Math.floor(minSalaryValue)
    : undefined;
  const pageValue = Number(params.get("page") ?? 1);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  const pageSize = 12;

  const where = {
    status: "ACTIVE",
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { companyName: { contains: query } },
            { description: { contains: query } },
            { requirements: { contains: query } },
            { tags: { contains: query } },
          ],
        }
      : {}),
    ...(location ? { location: { contains: location } } : {}),
    ...(category ? { category } : {}),
    ...(employmentType ? { employmentType } : {}),
    ...(workMode ? { workMode } : {}),
    ...(minSalary ? { salaryMax: { gte: minSalary } } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({
    jobs: jobs.map(toPublicJob),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = createJobSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest("Check the required fields, salary range, and description lengths.");
  }
  if (
    parsed.data.salaryMin !== null &&
    parsed.data.salaryMax !== null &&
    parsed.data.salaryMin > parsed.data.salaryMax
  ) {
    return badRequest("The minimum salary cannot be higher than the maximum salary.");
  }

  const employer = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyName: true },
  });
  if (!employer?.companyName) {
    return badRequest("Add a company name to your employer profile before posting a job.");
  }
  const companyName = employer.companyName;
  const plan = await prisma.employerPlan.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  if (!isEmployerPlan(plan.plan)) throw new Error("Saved employer package is invalid.");
  let effectivePlan: EmployerPlanKey = plan.plan;
  if (effectivePlan !== "FREE" && (!plan.expiresAt || plan.expiresAt <= new Date())) {
    await prisma.employerPlan.update({
      where: { userId: user.id },
      data: { plan: "FREE", expiresAt: null },
    });
    effectivePlan = "FREE";
  }
  const packageDetails = EMPLOYER_PLANS[effectivePlan];
  const job = await prisma.$transaction(async (transaction) => {
    const activeJobs = await transaction.job.count({
      where: { employerId: user.id, status: "ACTIVE" },
    });
    if (activeJobs >= packageDetails.activeJobLimit) return null;
    return transaction.job.create({
      data: {
        ...parsed.data,
        tags: JSON.stringify(parsed.data.tags),
        employerId: user.id,
        companyName,
        benefits: parsed.data.benefits || null,
      },
    });
  });
  if (!job) {
    return NextResponse.json({
      error: `Your ${packageDetails.name} package allows ${packageDetails.activeJobLimit} active job${packageDetails.activeJobLimit === 1 ? "" : "s"}. Choose a larger package to post more.`,
      code: "ACTIVE_JOB_LIMIT",
    }, { status: 409 });
  }
  return NextResponse.json({ job: toPublicJob(job) }, { status: 201 });
}
