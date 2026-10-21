import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseSkills(value: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error("Could not load candidate skills.", { cause: error });
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Candidate skills have an invalid format.");
  }
  return parsed;
}

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const location = (params.get("location") ?? "").trim().slice(0, 100);
  const where = {
    role: "JOB_SEEKER",
    profileVisible: true,
    ...(location ? { location: { contains: location } } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { headline: { contains: query } },
            { bio: { contains: query } },
            { skills: { contains: query } },
          ],
        }
      : {}),
  };
  const candidates = await prisma.user.findMany({
    where,
    select: { id: true, name: true, location: true, headline: true, bio: true, skills: true },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    candidates: candidates.map((candidate) => ({
      ...candidate,
      skills: parseSkills(candidate.skills),
    })),
  });
}
