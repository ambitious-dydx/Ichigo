import { NextResponse } from "next/server";
import { PASSWORD_POLICY_FULL_HINT } from "../../../../src/password-policy";
import { registerUser, requestEmailVerification } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };

  if (
    !body.username ||
    !body.email ||
    !body.password ||
    !body.confirmPassword
  ) {
    return jsonError("Invalid registration payload");
  }

  if (body.password !== body.confirmPassword) {
    return jsonError("Password confirmation does not match", 422);
  }

  const result = await registerUser({
    username: body.username.trim(),
    email: body.email.trim(),
    password: body.password,
  });

  if ("error" in result) {
    if (result.error === "email-exists" || result.error === "username-exists") {
      return jsonError(
        result.error === "email-exists" ? "Email is already registered" : "Username is already taken",
        409,
      );
    }

    if (
      result.error === "invalid-email" ||
      result.error === "invalid-username" ||
      result.error === "weak-password"
    ) {
      return jsonError(
        result.error === "weak-password" ? PASSWORD_POLICY_FULL_HINT : "Invalid registration payload",
        422,
      );
    }
  }

  let previewUrl: string | null = null;

  try {
    const delivery = await requestEmailVerification(result.user.id);
    previewUrl = delivery.previewUrl;
  } catch {
    previewUrl = null;
  }

  return NextResponse.json(
    {
      user: result.user,
      previewUrl,
    },
    { status: 201 },
  );
}
