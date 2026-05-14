import { notFound } from "next/navigation";
import { PostDetailPage } from "../../../../src/components/product-app";
import { requireCurrentUser } from "../../../../src/server/auth";
import { getPostDetail } from "../../../../src/server/repository";

export default async function PostDetailRoute({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { postId } = await params;
  const post = getPostDetail(postId, currentUser.id);

  if (!post) {
    notFound();
  }

  return <PostDetailPage currentUser={currentUser} post={post} />;
}
