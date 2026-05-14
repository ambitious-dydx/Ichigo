import { NextResponse } from "next/server";
import { registerUser } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!body.username || !body.email || !body.password || body.password.length < 8) {
    return jsonError("Invalid registration payload");
  }

  const user = await registerUser({
    username: body.username.trim(),
    email: body.email.trim(),
    password: body.password,
  });

  if (!user) {
    return jsonError("Email is already registered", 409);
  }

  return NextResponse.json({ user }, { status: 201 });
}
