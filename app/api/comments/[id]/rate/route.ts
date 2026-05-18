import { NextResponse } from "next/server";
import {
  getCurrentOnboardedUserOrThrowApi,
  isOnboardingRequiredError,
  isVerificationRequiredError,
} from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";
import { rateCommentRecord } from "../../../../../src/server/repository";
import type { RatingType } from "../../../../../src/server/types";

function isRatingType(value: string): value is RatingType {
  return ["helpful", "matched_mode", "did_not_match_mode", "harmful"].includes(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentOnboardedUserOrThrowApi();
    const { id } = await context.params;
    const body = (await request.json()) as { ratingType?: string };

    if (!body.ratingType || !isRatingType(body.ratingType)) {
      return jsonError("Invalid rating type");
    }

    rateCommentRecord({
      commentId: id,
      ratedByUserId: user.id,
      ratingType: body.ratingType,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isVerificationRequiredError(error)) {
      return jsonError("Verify your email before rating replies", 403);
    }

    if (isOnboardingRequiredError(error)) {
      return jsonError("Complete onboarding before rating replies", 403);
    }

    return jsonError("Unauthorized", 401);
  }
}
