import { NextResponse } from "next/server";
import { finishOnboarding, getCurrentUser } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import type { FeedbackFocus } from "../../../../src/server/types";
import type { ModeId } from "../../../../src/modes";

function isFeedbackFocus(value: string): value is FeedbackFocus {
  return ["founder", "creator", "reflection", "support"].includes(value);
}

function isModeId(value: string): value is ModeId {
  return ["hype", "comfort", "advise", "soft-truth", "challenge", "listen"].includes(value);
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return jsonError("Unauthorized", 401);
  }

  if (!currentUser.emailVerifiedAt) {
    return jsonError("Verify your email before onboarding", 403);
  }

  const body = (await request.json()) as {
    focus?: string;
    goal?: string;
    preferredMode?: string;
  };

  if (
    !body.goal?.trim() ||
    !body.focus ||
    !isFeedbackFocus(body.focus) ||
    !body.preferredMode ||
    !isModeId(body.preferredMode)
  ) {
    return jsonError("Invalid onboarding payload", 422);
  }

  const user = await finishOnboarding({
    userId: currentUser.id,
    focus: body.focus,
    goal: body.goal.trim(),
    preferredMode: body.preferredMode,
  });

  return NextResponse.json({ user });
}
