import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserOrThrowApi } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";
import { createCommentRecord, getPostDetail } from "../../../../../src/server/repository";

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
    const user = await getCurrentUserOrThrowApi();
    const { id } = await context.params;
    const body = (await request.json()) as { content?: string };

    if (!body.content?.trim()) {
      return jsonError("Comment content is required");
    }

    const result = createCommentRecord({
      postId: id,
      userId: user.id,
      content: body.content.trim(),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
