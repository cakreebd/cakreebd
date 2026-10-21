import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
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
  if (path.basename(cvStorageKey) !== cvStorageKey) {
    throw new Error("Invalid stored CV key.");
  }

  const file = await readFile(path.join(process.cwd(), "storage", "cvs", cvStorageKey));
  const contentType = cvStorageKey.endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(file.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(cvFileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
