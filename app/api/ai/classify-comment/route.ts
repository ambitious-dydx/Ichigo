import { NextResponse } from "next/server";
import { analyzeCommentFitWithGemini } from "../../../../src/server/gemini-fit";
import { jsonError } from "../../../../src/server/http";
import {
  classifyCommentForPost,
  getCommentFitContext,
} from "../../../../src/server/repository";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    postId?: string;
    commentContent?: string;
    deep?: boolean;
  };

  if (!body.postId || !body.commentContent?.trim()) {
    return jsonError("postId and commentContent are required");
  }

  try {
    const heuristic = classifyCommentForPost({
      postId: body.postId,
      commentContent: body.commentContent.trim(),
    });
    const shouldUseGemini = Boolean(body.deep) || heuristic.classification === "borderline";
    const result = shouldUseGemini
      ? await analyzeCommentFitWithGemini({
          context: getCommentFitContext(body.postId),
          commentContent: body.commentContent.trim(),
          heuristic,
        })
      : {
          result: heuristic,
          provider: "heuristic" as const,
          model: null,
        };

    return NextResponse.json({
      ...result.result,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    return jsonError("Post not found", 404);
  }
}
