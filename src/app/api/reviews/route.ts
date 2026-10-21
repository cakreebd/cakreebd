import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  applicationId: z.string().min(10).max(30),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20).max(3000),
  anonymous: z.boolean(),
});

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = reviewSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Add a 1–5 rating, a short title, and at least 20 characters of review.");

  const application = await prisma.jobApplication.findFirst({
    where: { id: parsed.data.applicationId, applicantId: user.id, status: "HIRED" },
    select: {
      id: true,
      job: {
        select: {
          companyName: true,
          employerId: true,
          employer: { select: { companyName: true } },
        },
      },
    },
  });
  if (!application) return notFound("Only a confirmed hire can review this employer.");
  if (!application.job.employer.companyName || application.job.companyName !== application.job.employer.companyName) {
    return badRequest("This listing is a sample and is not linked to a reviewable company profile.");
  }

  try {
    const review = await prisma.companyReview.create({
      data: {
        applicationId: application.id,
        authorId: user.id,
        employerId: application.job.employerId,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        anonymous: parsed.data.anonymous,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "You have already submitted a review for this application." }, { status: 409 });
    }
    throw error;
  }
}
