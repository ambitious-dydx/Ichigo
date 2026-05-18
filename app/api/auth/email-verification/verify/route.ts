import { NextResponse } from "next/server";
import { verifyEmailToken } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };

  if (!body.token?.trim()) {
    return jsonError("Verification token is required");
  }

  const result = await verifyEmailToken(body.token.trim());

  if ("error" in result) {
    return jsonError("Invalid verification token", 422);
  }

  return NextResponse.json({ user: result.user });
}
