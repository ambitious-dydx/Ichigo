import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import { deleteCommentRecord, updateCommentRecord } from "../../../../src/server/repository";

export async function PATCH(
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

    const alignment = updateCommentRecord({
      commentId: id,
      userId: user.id,
      content: body.content.trim(),
    });

    return NextResponse.json({ alignment });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrowApi();
    const { id } = await context.params;

    deleteCommentRecord(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
