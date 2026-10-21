import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const [users, jobs, reviews, verifications, counts] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.job.findMany({
      select: { id: true, title: true, companyName: true, status: true, createdAt: true, employer: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.companyReview.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
        company: { select: { companyName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.companyVerification.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        legalCompanyName: true,
        registrationAuthority: true,
        registrationNumber: true,
        submittedAt: true,
        employer: {
          select: {
            id: true,
            email: true,
            companyName: true,
            website: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
      take: 100,
    }),
    Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.companyReview.count({ where: { status: "PENDING" } }),
      prisma.companyVerification.count({ where: { status: "PENDING" } }),
    ]),
  ]);

  return NextResponse.json({
    users,
    jobs,
    pendingReviews: reviews,
    pendingVerifications: verifications,
    counts: { users: counts[0], jobs: counts[1], pendingReviews: counts[2], pendingVerifications: counts[3] },
  });
}
