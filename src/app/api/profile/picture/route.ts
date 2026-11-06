import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  currentUserFromRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  readProfilePicture,
  removeProfilePicture,
  saveProfilePicture,
} from "@/lib/profile-picture-storage";
import { prisma } from "@/lib/prisma";

const MAX_PROFILE_PICTURE_BYTES = 3 * 1024 * 1024;

function getImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: "png", contentType: "image/png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }
  return null;
}

export async function GET(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { profilePictureStorageKey: true },
  });
  if (!profile.profilePictureStorageKey) {
    return NextResponse.json({ error: "No profile picture has been uploaded." }, { status: 404 });
  }

  const picture = await readProfilePicture(profile.profilePictureStorageKey);
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

export async function POST(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP profile picture." }, { status: 400 });
  }
  const file = formData.get("picture");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a profile picture to upload." }, { status: 400 });
  }
  if (file.size > MAX_PROFILE_PICTURE_BYTES) {
    return NextResponse.json({ error: "Profile pictures must be 3 MB or smaller." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageType = getImageType(bytes);
  if (!imageType) {
    return NextResponse.json({ error: "Only valid JPEG, PNG, or WebP images are supported." }, { status: 400 });
  }

  const storageKey = `${randomUUID()}.${imageType.extension}`;
  const previous = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { profilePictureStorageKey: true },
  });
  await saveProfilePicture(storageKey, bytes, imageType.contentType);
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePictureStorageKey: storageKey },
    });
  } catch (error) {
    await removeProfilePicture(storageKey);
    throw error;
  }
  await removeProfilePicture(previous.profilePictureStorageKey);
  return NextResponse.json({ profilePictureUrl: "/api/profile/picture" }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await currentUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { profilePictureStorageKey: true },
  });
  if (!profile.profilePictureStorageKey) {
    return NextResponse.json({ error: "No profile picture has been uploaded." }, { status: 404 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { profilePictureStorageKey: null },
  });
  await removeProfilePicture(profile.profilePictureStorageKey);
  return NextResponse.json({ profilePictureUrl: null });
}
