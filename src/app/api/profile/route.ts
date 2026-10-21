import { NextResponse } from "next/server";
import { z } from "zod";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { badRequest, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  headline: z.string().trim().max(140).nullable().optional(),
  bio: z.string().trim().max(3000).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  companyName: z.string().trim().min(2).max(120).optional(),
  companyBio: z.string().trim().max(3000).nullable().optional(),
  website: z.string().trim().url().max(250).nullable().optional(),
  profileVisible: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

function parseSkills(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error("Could not load the saved profile skills.", { cause: error });
  }
  if (!Array.isArray(parsed) || !parsed.every((skill) => typeof skill === "string")) {
    throw new Error("The saved profile skills are not a string list.");
  }
  return parsed.filter((skill): skill is string => typeof skill === "string");
}

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      location: true,
      headline: true,
      bio: true,
      skills: true,
      cvFileName: true,
      companyName: true,
      companyBio: true,
      website: true,
      profileVisible: true,
      emailNotifications: true,
    },
  });
  return NextResponse.json({ profile: { ...profile, skills: parseSkills(profile.skills) } });
}

export async function PATCH(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  const body = await readJson(request);
  if (body.response) return body.response;
  const parsed = profileSchema.safeParse(body.data);
  if (!parsed.success) return badRequest("Check your profile details and try again.");
  if (
    user.role === "JOB_SEEKER" &&
    (parsed.data.companyName !== undefined ||
      parsed.data.companyBio !== undefined ||
      parsed.data.website !== undefined)
  ) {
    return roleRequiredResponse();
  }
  if (user.role === "ADMIN" && (
    parsed.data.companyName !== undefined ||
    parsed.data.companyBio !== undefined ||
    parsed.data.website !== undefined ||
    parsed.data.profileVisible !== undefined ||
    parsed.data.headline !== undefined ||
    parsed.data.bio !== undefined ||
    parsed.data.skills !== undefined ||
    parsed.data.emailNotifications !== undefined
  )) {
    return roleRequiredResponse();
  }
  if (user.role === "EMPLOYER" && parsed.data.profileVisible !== undefined) {
    return roleRequiredResponse();
  }
  if (
    user.role === "EMPLOYER" &&
    (parsed.data.headline !== undefined ||
      parsed.data.bio !== undefined ||
      parsed.data.skills !== undefined)
  ) {
    return roleRequiredResponse();
  }
  if (
    user.role === "EMPLOYER" &&
    parsed.data.website &&
    !parsed.data.website.startsWith("https://") &&
    !parsed.data.website.startsWith("http://")
  ) {
    return badRequest("Company website must start with http:// or https://.");
  }

  const { skills, ...profileData } = parsed.data;
  const profile = await prisma.$transaction(async (transaction) => {
    const currentCompany = user.role === "EMPLOYER" && parsed.data.companyName !== undefined
      ? await transaction.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { companyName: true, companyVerification: { select: { status: true } } },
        })
      : null;
    const updatedProfile = await transaction.user.update({
      where: { id: user.id },
      data: {
        ...profileData,
        ...(skills ? { skills: JSON.stringify(skills) } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        location: true,
        headline: true,
        bio: true,
        skills: true,
        cvFileName: true,
        companyName: true,
        companyBio: true,
        website: true,
        profileVisible: true,
        emailNotifications: true,
      },
    });
    if (
      currentCompany &&
      currentCompany.companyName !== parsed.data.companyName &&
      (currentCompany.companyVerification?.status === "VERIFIED" ||
        currentCompany.companyVerification?.status === "PENDING")
    ) {
      await transaction.companyVerification.updateMany({
        where: { employerId: user.id, status: { in: ["PENDING", "VERIFIED"] } },
        data: {
          status: "REJECTED",
          reviewNote: "The company name changed. Submit updated registration details for review.",
          reviewedAt: new Date(),
          reviewedById: null,
        },
      });
    }
    return updatedProfile;
  });
  return NextResponse.json({ profile: { ...profile, skills: parseSkills(profile.skills) } });
}
