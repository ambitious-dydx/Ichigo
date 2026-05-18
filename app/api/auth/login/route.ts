import { NextResponse } from "next/server";
import { requestEmailVerification, signInUser } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    identifier?: string;
    email?: string;
    password?: string;
  };
  const identifier = body.identifier?.trim() || body.email?.trim();

  if (!identifier || !body.password) {
    return jsonError("Identifier and password are required");
  }

  const result = await signInUser(identifier, body.password);

  if ("error" in result) {
    return jsonError("Invalid credentials", 401);
  }

  let previewUrl: string | null = null;

  if (!result.user.emailVerifiedAt) {
    try {
      const delivery = await requestEmailVerification(result.user.id);
      previewUrl = delivery.previewUrl;
    } catch {
      previewUrl = null;
    }
  }

  return NextResponse.json({
    user: result.user,
    requiresVerification: !result.user.emailVerifiedAt,
    previewUrl,
  });
}
