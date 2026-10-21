import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { readCv } from "@/lib/cv-storage";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "EMPLOYER") return roleRequiredResponse();
  const id = (await params).id;
  if (!id || id.length > 30) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const application = await prisma.jobApplication.findFirst({
    where: { id, job: { employerId: user.id } },
    select: {
      applicant: { select: { cvFileName: true, cvStorageKey: true } },
    },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found in your employer account." }, { status: 404 });
  }
  const { cvFileName, cvStorageKey } = application.applicant;
  if (!cvFileName || !cvStorageKey) {
    return NextResponse.json({ error: "This applicant has not uploaded a CV." }, { status: 404 });
  }
  const file = await readCv(cvStorageKey);
  if (!file) return NextResponse.json({ error: "The stored CV could not be found." }, { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.contentLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(cvFileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
