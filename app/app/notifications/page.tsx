import { NotificationsPage } from "../../../src/components/product-app";
import { requireCurrentUser } from "../../../src/server/auth";
import { listNotifications } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function NotificationsRoute() {
  const currentUser = await requireCurrentUser();

  return <NotificationsPage notifications={listNotifications(currentUser.id)} />;
}
