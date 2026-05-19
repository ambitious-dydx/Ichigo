import { FeedPage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { listFeedPosts, listNotifications, listRooms } from "../../../src/server/repository";
import { getWorkspaceNotice } from "../../../src/workspace-notices";

export const dynamic = "force-dynamic";

export default async function FeedRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { success, error } = await searchParams;

  return (
    <FeedPage
      currentUser={currentUser}
      notice={getWorkspaceNotice(success, error)}
      notifications={listNotifications(currentUser.id)}
      posts={listFeedPosts(currentUser.id)}
      rooms={listRooms(currentUser.id)}
    />
  );
}
