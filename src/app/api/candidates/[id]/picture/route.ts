import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { readProfilePicture } from "@/lib/profile-picture-storage";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();

  const { id } = await params;
  const candidate = await prisma.user.findFirst({
    where: { id, role: "JOB_SEEKER" },
    select: { profileVisible: true, profilePictureStorageKey: true },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }
  if (!candidate.profileVisible) {
    const application = await prisma.jobApplication.findFirst({
      where: { applicantId: id, job: { employerId: user.id } },
      select: { id: true },
    });
    if (!application) return roleRequiredResponse();
  }
  if (!candidate.profilePictureStorageKey) {
    return NextResponse.json({ error: "No profile picture has been uploaded." }, { status: 404 });
  }

  const picture = await readProfilePicture(candidate.profilePictureStorageKey);
  if (!picture) {
    return NextResponse.json({ error: "The stored profile picture could not be found." }, { status: 404 });
  }
  return new Response(picture.body, {
    headers: {
      "Content-Type": picture.contentType,
      "Content-Length": String(picture.contentLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
