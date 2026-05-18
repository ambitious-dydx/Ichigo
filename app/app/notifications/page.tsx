import { NotificationsPage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { listNotifications } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function NotificationsRoute() {
  const currentUser = await requireOnboardedUser();

  return <NotificationsPage notifications={listNotifications(currentUser.id)} />;
}
