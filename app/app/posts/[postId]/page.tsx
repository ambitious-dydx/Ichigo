import { notFound } from "next/navigation";
import { PostDetailPage } from "../../../../src/components/product-app";
import { requireOnboardedUser } from "../../../../src/server/auth";
import { getPostDetail, getReplyQualityGuard } from "../../../../src/server/repository";

export default async function PostDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ fresh?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { postId } = await params;
  const { fresh, error } = await searchParams;
  const post = getPostDetail(postId, currentUser.id);
  const replyGuard = getReplyQualityGuard(currentUser.id);

  if (!post) {
    notFound();
  }

  return (
    <PostDetailPage
      currentUser={currentUser}
      isFresh={fresh === "1"}
      post={post}
      replyError={
        error === "reply-quality-cooldown" || error === "rate-limited" ? error : null
      }
      replyGuard={replyGuard}
    />
  );
}
