import { NextResponse } from "next/server";
import { getCurrentUser, verifyEmailCode } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  const body = (await request.json()) as { code?: string; token?: string };
  const code = body.code?.trim() || body.token?.trim();

  if (!code) {
    return jsonError("Verification code is required");
  }

  const result = await verifyEmailCode(currentUser.id, code);

  if ("error" in result) {
    return jsonError("Invalid verification code", 422);
  }

  return NextResponse.json({ user: result.user });
}
