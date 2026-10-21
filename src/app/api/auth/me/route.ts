import { NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  return NextResponse.json({ user: await currentUserFromRequest(request) });
}
