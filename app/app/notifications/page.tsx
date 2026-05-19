import { NotificationsPage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { listNotifications } from "../../../src/server/repository";
import { getWorkspaceNotice } from "../../../src/workspace-notices";

export const dynamic = "force-dynamic";

export default async function NotificationsRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { success, error } = await searchParams;

  return (
    <NotificationsPage
      notice={getWorkspaceNotice(success, error)}
      notifications={listNotifications(currentUser.id)}
    />
  );
}
