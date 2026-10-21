import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionResponse } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(["JOB_SEEKER", "EMPLOYER"]),
  companyName: z.string().trim().max(120).nullish(),
});

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = registrationSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest("Enter a valid name, email, account type, and password (at least 10 characters).");
  }
  const companyName = parsed.data.role === "EMPLOYER"
    ? parsed.data.companyName?.trim() || null
    : null;
  if (parsed.data.role === "EMPLOYER" && !companyName) {
    return badRequest("Enter your company name to create an employer account.");
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      companyName,
    },
  });
  return createSessionResponse(user, 201);
}
