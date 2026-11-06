import { prisma } from "@/lib/prisma";

export function isJobFeatured(featuredUntil: Date | null, now = new Date()) {
  return featuredUntil !== null && featuredUntil > now;
}

export async function expireJobs(now = new Date()) {
  await prisma.job.updateMany({
    where: { status: "ACTIVE", deadlineAt: { lte: now } },
    data: { status: "CLOSED", featuredUntil: null },
  });
  await prisma.job.updateMany({
    where: { status: "ACTIVE", featuredUntil: { lte: now } },
    data: { featuredUntil: null },
  });
}
