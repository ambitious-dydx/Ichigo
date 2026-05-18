import { NextResponse } from "next/server";
import {
  getCurrentOnboardedUserOrThrowApi,
  isOnboardingRequiredError,
  isVerificationRequiredError,
} from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";
import { leaveRoom } from "../../../../../src/server/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentOnboardedUserOrThrowApi();
    const { id } = await context.params;
    leaveRoom(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isVerificationRequiredError(error)) {
      return jsonError("Verify your email before leaving rooms", 403);
    }

    if (isOnboardingRequiredError(error)) {
      return jsonError("Complete onboarding before leaving rooms", 403);
    }

    return jsonError("Unauthorized", 401);
  }
}
