import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const verificationSchema = z.object({
  legalCompanyName: z.string().trim().min(2).max(160),
  registrationAuthority: z.enum(["RJSC", "TRADE_LICENSE", "TIN_BIN", "OTHER"]),
  registrationNumber: z.string().trim().min(3).max(100),
});

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();

  const verification = await prisma.companyVerification.findUnique({
    where: { employerId: user.id },
    select: {
      legalCompanyName: true,
      registrationAuthority: true,
      registrationNumber: true,
      status: true,
      reviewNote: true,
      submittedAt: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json({ verification });
}

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();

  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = verificationSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest("Enter the legal company name, registration authority, and registration number.");
  }

  const employer = await prisma.user.findUnique({
    where: { id: user.id },
    select: { companyName: true },
  });
  if (!employer?.companyName?.trim()) {
    return badRequest("Save your company profile before requesting verification.");
  }

  const existing = await prisma.companyVerification.findUnique({
    where: { employerId: user.id },
    select: { status: true },
  });
  if (existing?.status === "VERIFIED") {
    return NextResponse.json({ error: "This company is already verified." }, { status: 409 });
  }

  const verification = await prisma.companyVerification.upsert({
    where: { employerId: user.id },
    create: {
      employerId: user.id,
      ...parsed.data,
    },
    update: {
      ...parsed.data,
      status: "PENDING",
      reviewNote: null,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
    },
    select: {
      legalCompanyName: true,
      registrationAuthority: true,
      registrationNumber: true,
      status: true,
      reviewNote: true,
      submittedAt: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json({ verification }, { status: 201 });
}
