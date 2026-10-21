import { NextResponse } from "next/server";
import { deleteCurrentSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  await deleteCurrentSession(request);
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
