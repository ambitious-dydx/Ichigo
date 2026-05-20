import { NextResponse } from "next/server";
import {
  isCommentRateLimitError,
  submitCommentForUser,
} from "../../../../../src/server/comment-service";
import {
  getCurrentOnboardedUserOrThrowApi,
  getCurrentUser,
  isOnboardingRequiredError,
  isVerificationRequiredError,
} from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";
import {
  getPostDetail,
  isReplyQualityCooldownError,
} from "../../../../../src/server/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const post = getPostDetail(id, user?.id);

  if (!post) {
    return jsonError("Post not found", 404);
  }

  return NextResponse.json({ comments: post.comments });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentOnboardedUserOrThrowApi();
    const { id } = await context.params;
    const body = (await request.json()) as { content?: string };

    if (!body.content?.trim()) {
      return jsonError("Comment content is required");
    }

    const result = submitCommentForUser({
      postId: id,
      userId: user.id,
      content: body.content.trim(),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isCommentRateLimitError(error)) {
      return jsonError("You are replying too quickly right now. Pause for a bit, then try again.", 429);
    }

    if (isVerificationRequiredError(error)) {
      return jsonError("Verify your email before replying", 403);
    }

    if (isOnboardingRequiredError(error)) {
      return jsonError("Complete onboarding before replying", 403);
    }

    if (isReplyQualityCooldownError(error)) {
      return Response.json(
        {
          error: "Replying is paused because too many recent replies missed the ask.",
          cooldownEndsAt: error.cooldownEndsAt,
        },
        { status: 429 },
      );
    }

    return jsonError("Unauthorized", 401);
  }
}
