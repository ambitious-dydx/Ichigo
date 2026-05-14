import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import { getRoomDetail } from "../../../../src/server/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrowApi();
    const { id } = await context.params;
    const roomDetail = getRoomDetail(id, user.id);

    if (!roomDetail) {
      return jsonError("Room not found", 404);
    }

    return NextResponse.json(roomDetail);
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
