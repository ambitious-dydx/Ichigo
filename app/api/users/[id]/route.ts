import { NextResponse } from "next/server";
import { getUserById } from "../../../../src/server/repository";
import { jsonError } from "../../../../src/server/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = getUserById(id);

  if (!user) {
    return jsonError("User not found", 404);
  }

  return NextResponse.json({ user });
}
