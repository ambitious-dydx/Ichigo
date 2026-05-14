import { FeedPage } from "../../../src/components/product-app";
import { requireCurrentUser } from "../../../src/server/auth";
import { listFeedPosts, listNotifications, listRooms } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function FeedRoute() {
  const currentUser = await requireCurrentUser();

  return (
    <FeedPage
      currentUser={currentUser}
      notifications={listNotifications(currentUser.id)}
      posts={listFeedPosts(currentUser.id)}
      rooms={listRooms(currentUser.id)}
    />
  );
}
