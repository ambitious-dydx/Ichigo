import { NextResponse } from "next/server";
import { signInUser } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return jsonError("Email and password are required");
  }

  const user = await signInUser(body.email.trim(), body.password);

  if (!user) {
    return jsonError("Invalid credentials", 401);
  }

  return NextResponse.json({ user });
}
