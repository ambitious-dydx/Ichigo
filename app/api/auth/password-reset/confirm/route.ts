import { NextResponse } from "next/server";
import { PASSWORD_POLICY_FULL_HINT } from "../../../../../src/password-policy";
import { resetPasswordWithToken } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    token?: string;
    nextPassword?: string;
  };

  if (!body.token?.trim() || !body.nextPassword) {
    return jsonError("Reset token and next password are required");
  }

  const result = await resetPasswordWithToken({
    token: body.token.trim(),
    nextPassword: body.nextPassword,
  });

  if ("error" in result) {
    return jsonError(
      result.error === "weak-password" ? PASSWORD_POLICY_FULL_HINT : "Invalid reset token",
      422,
    );
  }

  return NextResponse.json({ success: true });
}
