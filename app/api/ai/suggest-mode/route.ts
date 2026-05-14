import { NextResponse } from "next/server";
import { jsonError } from "../../../../src/server/http";
import { suggestMode } from "../../../../src/server/repository";

export async function POST(request: Request) {
  const body = (await request.json()) as { content?: string };

  if (!body.content?.trim()) {
    return jsonError("content is required");
  }

  return NextResponse.json({ mode: suggestMode(body.content.trim()) });
}
