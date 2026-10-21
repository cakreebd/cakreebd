import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { readCv, removeCv, saveCv } from "@/lib/cv-storage";
import { prisma } from "@/lib/prisma";

const MAX_CV_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a PDF or DOCX CV file." }, { status: 400 });
  }
  const file = formData.get("cv");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a CV file to upload." }, { status: 400 });
  }
  if (file.size > MAX_CV_BYTES) {
    return NextResponse.json({ error: "CV files must be 5 MB or smaller." }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase();
  const isPdf = extension === ".pdf";
  const isDocx = extension === ".docx";
  if (!isPdf && !isDocx) {
    return NextResponse.json({ error: "Only PDF and DOCX CV files are supported." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdfSignature =
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
  const isZipSignature =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  if ((isPdf && !isPdfSignature) || (isDocx && !isZipSignature)) {
    return NextResponse.json({ error: "The file contents do not match its file type." }, { status: 400 });
  }

  const storageKey = `${randomUUID()}${extension}`;
  const contentType = isPdf
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const previous = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { cvStorageKey: true },
  });
  await saveCv(storageKey, bytes, contentType);
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { cvStorageKey: storageKey, cvFileName: path.basename(file.name).slice(0, 180) },
    });
  } catch (error) {
    await removeCv(storageKey);
    throw error;
  }
  await removeCv(previous.cvStorageKey);
  return NextResponse.json({ fileName: path.basename(file.name).slice(0, 180) }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { cvStorageKey: true, cvFileName: true },
  });
  if (!profile.cvStorageKey || !profile.cvFileName) {
    return NextResponse.json({ error: "No CV has been uploaded." }, { status: 404 });
  }
  const file = await readCv(profile.cvStorageKey);
  if (!file) return NextResponse.json({ error: "The stored CV could not be found." }, { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.contentLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(profile.cvFileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.role !== "JOB_SEEKER") return roleRequiredResponse();
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { cvStorageKey: true },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { cvStorageKey: null, cvFileName: null },
  });
  await removeCv(profile.cvStorageKey);
  return NextResponse.json({ success: true });
}
