import { NextResponse } from "next/server";
import { PASSWORD_POLICY_FULL_HINT } from "../../../../src/password-policy";
import { changePassword, getCurrentUser } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  const body = (await request.json()) as {
    currentPassword?: string;
    nextPassword?: string;
    confirmPassword?: string;
  };

  if (!body.currentPassword || !body.nextPassword || !body.confirmPassword) {
    return jsonError("Current password, new password, and confirmation are required");
  }

  if (body.nextPassword !== body.confirmPassword) {
    return jsonError("Password confirmation does not match", 422);
  }

  const result = await changePassword(currentUser.id, {
    currentPassword: body.currentPassword,
    nextPassword: body.nextPassword,
  });

  if ("error" in result) {
    if (result.error === "incorrect-password") {
      return jsonError("Current password is incorrect", 401);
    }

    return jsonError(
      result.error === "same-password" ? "New password must be different" : PASSWORD_POLICY_FULL_HINT,
      422,
    );
  }

  return NextResponse.json({ success: true });
}
