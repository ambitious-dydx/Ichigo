import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserOrThrowApi } from "../../../../src/server/auth";
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
    const user = await getCurrentUserOrThrowApi();
    const { id } = await context.params;
    deletePostRecord(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
