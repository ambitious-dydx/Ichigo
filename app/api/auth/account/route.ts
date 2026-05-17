import { NextResponse } from "next/server";
import { getCurrentUser, updateAccountDetails } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  const body = (await request.json()) as {
    username?: string;
    email?: string;
    bio?: string;
  };

  if (!body.username || !body.email) {
    return jsonError("Username and email are required");
  }

  const result = await updateAccountDetails(currentUser.id, {
    username: body.username,
    email: body.email,
    bio: body.bio ?? "",
  });

  if ("error" in result) {
    if (result.error === "email-exists" || result.error === "username-exists") {
      return jsonError(result.error === "email-exists" ? "Email is already in use" : "Username is already taken", 409);
    }

    return jsonError("Invalid account payload", 422);
  }

  return NextResponse.json({ user: result.user });
}
