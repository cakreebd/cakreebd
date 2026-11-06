import type { Job, Prisma } from "@prisma/client";
import { isJobFeatured } from "@/lib/featured-jobs";
import { prisma } from "@/lib/prisma";

const jobListingInclude = {
  employer: {
    select: {
      companyName: true,
      companyVerification: { select: { status: true } },
    },
  },
} satisfies Prisma.JobInclude;

type JobListing = Prisma.JobGetPayload<{ include: typeof jobListingInclude }>;

type SalarySortBucket = {
  where: Prisma.JobWhereInput;
  orderBy: Prisma.JobOrderByWithRelationInput[];
};

export function parseTags(tags: string): string[] {
  try {
    const value: unknown = JSON.parse(tags);
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch (error) {
    throw new Error("Could not parse stored job tags.", { cause: error });
  }
}

export function formatSalary(min: number | null, max: number | null) {
  if (min === null && max === null) return "Negotiable";
  const format = (amount: number) => `৳${amount.toLocaleString("en-BD")}`;
  if (min !== null && max !== null) return `${format(min)} – ${format(max)}`;
  if (min !== null) return `From ${format(min)}`;
  if (max !== null) return `Up to ${format(max)}`;
  return "Negotiable";
}

export function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function isValidJobId(value: string) {
  return /^[a-z0-9]{1,64}$/i.test(value);
}

export async function findJobsBySalaryAscending(
  where: Prisma.JobWhereInput,
  skip: number,
  take: number,
): Promise<JobListing[]> {
  const now = new Date();
  const featured = { featuredUntil: { gt: now } };
  const notFeatured = {
    OR: [{ featuredUntil: null }, { featuredUntil: { lte: now } }],
  };
  const buckets: SalarySortBucket[] = [
    {
      where: { AND: [where, featured, { salaryMin: { not: null } }] },
      orderBy: [
        { featuredUntil: "desc" },
        { salaryMin: "asc" },
        { createdAt: "desc" },
      ],
    },
    {
      where: { AND: [where, featured, { salaryMin: null }] },
      orderBy: [{ featuredUntil: "desc" }, { createdAt: "desc" }],
    },
    {
      where: { AND: [where, notFeatured, { salaryMin: { not: null } }] },
      orderBy: [{ salaryMin: "asc" }, { createdAt: "desc" }],
    },
    {
      where: { AND: [where, notFeatured, { salaryMin: null }] },
      orderBy: [{ createdAt: "desc" }],
    },
  ];
  const counts = await Promise.all(
    buckets.map(({ where: bucketWhere }) => prisma.job.count({ where: bucketWhere })),
  );
  const jobs: JobListing[] = [];
  let remainingSkip = skip;
  let remainingTake = take;

  for (const [index, bucket] of buckets.entries()) {
    if (remainingSkip >= counts[index]) {
      remainingSkip -= counts[index];
      continue;
    }

    const bucketSkip = remainingSkip;
    remainingSkip = 0;
    const bucketTake = Math.min(remainingTake, counts[index] - bucketSkip);
    const batch = await prisma.job.findMany({
      where: bucket.where,
      orderBy: bucket.orderBy,
      skip: bucketSkip,
      take: bucketTake,
      include: jobListingInclude,
    });
    jobs.push(...batch);
    remainingTake -= batch.length;
    if (remainingTake === 0) break;
  }

  return jobs;
}

export function postedLabel(date: Date) {
  const elapsedDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (elapsedDays <= 0) return "Today";
  if (elapsedDays === 1) return "1 day ago";
  if (elapsedDays < 7) return `${elapsedDays} days ago`;
  const weeks = Math.floor(elapsedDays / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function toPublicJob(job: Job) {
  return {
    id: job.id,
    featured: isJobFeatured(job.featuredUntil),
    title: job.title,
    company: job.companyName,
    location: job.location,
    salary: formatSalary(job.salaryMin, job.salaryMax),
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    employment: job.employmentType,
    workMode: job.workMode,
    category: job.category,
    posted: postedLabel(job.createdAt),
    description: job.description,
    requirements: job.requirements,
    benefits: job.benefits,
    tags: parseTags(job.tags),
    status: job.status,
    deadlineAt: job.deadlineAt,
  };
}
