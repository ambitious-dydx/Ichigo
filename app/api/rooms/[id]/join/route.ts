import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";
import { joinRoom } from "../../../../../src/server/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrowApi();
    const { id } = await context.params;
    joinRoom(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
