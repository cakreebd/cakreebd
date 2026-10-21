import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  roleRequiredResponse,
  unauthorizedResponse,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_DIRECTORY = path.join(process.cwd(), "storage", "cvs");

async function removeStoredCv(storageKey: string | null) {
  if (!storageKey || path.basename(storageKey) !== storageKey) return;
  try {
    await unlink(path.join(CV_DIRECTORY, storageKey));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

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

  await mkdir(CV_DIRECTORY, { recursive: true });
  const storageKey = `${randomUUID()}${extension}`;
  await writeFile(path.join(CV_DIRECTORY, storageKey), bytes, { flag: "wx" });
  const previous = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { cvStorageKey: true },
  });
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { cvStorageKey: storageKey, cvFileName: path.basename(file.name).slice(0, 180) },
    });
  } catch (error) {
    await removeStoredCv(storageKey);
    throw error;
  }
  await removeStoredCv(previous.cvStorageKey);
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
  if (path.basename(profile.cvStorageKey) !== profile.cvStorageKey) {
    throw new Error("Invalid stored CV key.");
  }
  const file = await readFile(path.join(CV_DIRECTORY, profile.cvStorageKey));
  const contentType = profile.cvStorageKey.endsWith(".pdf")
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(file.byteLength),
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
  await removeStoredCv(profile.cvStorageKey);
  return NextResponse.json({ success: true });
}
