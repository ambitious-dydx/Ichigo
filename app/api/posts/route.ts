import { NextResponse } from "next/server";
import {
  getCurrentOnboardedUserOrThrowApi,
  isOnboardingRequiredError,
  isVerificationRequiredError,
} from "../../../src/server/auth";
import { jsonError } from "../../../src/server/http";
import { createPostRecord } from "../../../src/server/repository";
import type { Visibility } from "../../../src/server/types";
import type { ModeId } from "../../../src/modes";

function isModeId(value: string): value is ModeId {
  return ["hype", "comfort", "advise", "soft-truth", "challenge", "listen"].includes(value);
}

function isVisibility(value: string): value is Visibility {
  return ["public", "followers", "group", "anonymous"].includes(value);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentOnboardedUserOrThrowApi();
    const body = (await request.json()) as {
      content?: string;
      responseMode?: string;
      visibility?: string;
      roomId?: string | null;
      isAnonymous?: boolean;
      tags?: string[];
    };

    if (
      !body.content?.trim() ||
      !body.responseMode ||
      !isModeId(body.responseMode) ||
      !body.visibility ||
      !isVisibility(body.visibility)
    ) {
      return jsonError("Invalid post payload");
    }

    const postId = createPostRecord({
      userId: user.id,
      content: body.content.trim(),
      responseMode: body.responseMode,
      visibility: body.visibility,
      roomId: body.roomId ?? null,
      isAnonymous: Boolean(body.isAnonymous),
      tags: Array.isArray(body.tags) ? body.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    });

    return NextResponse.json({ postId }, { status: 201 });
  } catch (error) {
    if (isVerificationRequiredError(error)) {
      return jsonError("Verify your email before posting", 403);
    }

    if (isOnboardingRequiredError(error)) {
      return jsonError("Complete onboarding before posting", 403);
    }

    return jsonError("Unauthorized", 401);
  }
}
