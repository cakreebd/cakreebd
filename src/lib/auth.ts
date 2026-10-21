import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "cakree_session";
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "JOB_SEEKER" | "EMPLOYER" | "ADMIN";
  companyName: string | null;
};

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string | null;
}): SessionUser {
  let role: SessionUser["role"];
  switch (user.role) {
    case "JOB_SEEKER":
    case "EMPLOYER":
    case "ADMIN":
      role = user.role;
      break;
    default:
      throw new Error(`Unsupported account role: ${user.role}`);
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    companyName: user.companyName,
  };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionResponse(
  user: Parameters<typeof publicUser>[0],
  status = 200,
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt,
    },
  });

  const response = NextResponse.json({ user: publicUser(user) }, { status });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return publicUser(session.user);
}

export async function currentUserFromRequest(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return publicUser(session.user);
}

export async function deleteCurrentSession(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Please sign in to continue." },
    { status: 401 },
  );
}

export function roleRequiredResponse() {
  return NextResponse.json(
    { error: "This action is not available for your account type." },
    { status: 403 },
  );
}
