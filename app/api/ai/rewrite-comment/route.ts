import { NextResponse } from "next/server";
import { jsonError } from "../../../../src/server/http";
import { classifyCommentForPost } from "../../../../src/server/repository";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    postId?: string;
    commentContent?: string;
  };

  if (!body.postId || !body.commentContent?.trim()) {
    return jsonError("postId and commentContent are required");
  }

  try {
    const result = classifyCommentForPost({
      postId: body.postId,
      commentContent: body.commentContent.trim(),
    });

    return NextResponse.json({
      suggestedRewrite: result.suggestedRewrite,
      classification: result.classification,
      reason: result.reason,
    });
  } catch (error) {
    return jsonError("Post not found", 404);
  }
}
