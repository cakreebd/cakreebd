import { NextResponse } from "next/server";

export async function readJson(request: Request): Promise<
  | { data: unknown; response: null }
  | { data: null; response: NextResponse }
> {
  try {
    return { data: await request.json(), response: null };
  } catch {
    return {
      data: null,
      response: NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }),
    };
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "The requested item was not found.") {
  return NextResponse.json({ error: message }, { status: 404 });
}
