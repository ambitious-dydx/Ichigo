import { NextResponse } from "next/server";
import {
  getCurrentOnboardedUserOrThrowApi,
  getCurrentUser,
  isOnboardingRequiredError,
  isVerificationRequiredError,
} from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import { deletePostRecord, getPostDetail } from "../../../../src/server/repository";

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

  return NextResponse.json({ post });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentOnboardedUserOrThrowApi();
    const { id } = await context.params;
    deletePostRecord(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isVerificationRequiredError(error)) {
      return jsonError("Verify your email before deleting posts", 403);
    }

    if (isOnboardingRequiredError(error)) {
      return jsonError("Complete onboarding before deleting posts", 403);
    }

    return jsonError("Unauthorized", 401);
  }
}
