import { revalidatePath } from "next/cache";
import {
  createCommentRecord,
  createProductEvent,
  hitRateLimit,
} from "./repository";

export class CommentRateLimitError extends Error {
  constructor() {
    super("COMMENT_RATE_LIMITED");
    this.name = "CommentRateLimitError";
  }
}

export function isCommentRateLimitError(
  error: unknown,
): error is CommentRateLimitError {
  return error instanceof CommentRateLimitError;
}

export function submitCommentForUser(input: {
  userId: string;
  postId: string;
  content: string;
}) {
  const rateLimit = hitRateLimit({
    scopeKey: input.userId,
    action: "create-comment",
    limit: 24,
    windowMs: 60 * 60 * 1000,
  });

  if (rateLimit.blocked) {
    throw new CommentRateLimitError();
  }

  const result = createCommentRecord(input);

  createProductEvent({
    userId: input.userId,
    eventName: "comment.created",
    route: `/app/posts/${input.postId}`,
    metadata: {
      alignment: result.alignment.classification,
      score: result.alignment.alignmentScore,
      status: result.status,
    },
  });

  revalidatePath(`/app/posts/${input.postId}`);
  revalidatePath("/app/feed");
  revalidatePath("/app");
  revalidatePath("/app/profile");

  return result;
}
