import { NextResponse } from "next/server";
import {
  getCurrentSessionId,
  getCurrentUser,
  revokeUserSession,
} from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  const { sessionId } = await params;

  if (!sessionId) {
    return jsonError("Session id is required");
  }

  const currentSessionId = await getCurrentSessionId();
  await revokeUserSession(sessionId);

  return NextResponse.json({
    success: true,
    signedOutCurrentSession: currentSessionId === sessionId,
  });
}
