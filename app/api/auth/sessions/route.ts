import { NextResponse } from "next/server";
import {
  getCurrentSessionId,
  getCurrentUser,
  signOutOtherSessions,
} from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import { getSecurityView } from "../../../../src/server/repository";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  const security = getSecurityView({
    userId: currentUser.id,
    currentSessionId: await getCurrentSessionId(),
  });

  return NextResponse.json(security);
}

export async function DELETE() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  await signOutOtherSessions();

  return NextResponse.json({ success: true });
}
