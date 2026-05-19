import { RoomsPage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { listRooms } from "../../../src/server/repository";
import { getWorkspaceNotice } from "../../../src/workspace-notices";

export const dynamic = "force-dynamic";

export default async function RoomsRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { success, error } = await searchParams;

  return <RoomsPage notice={getWorkspaceNotice(success, error)} rooms={listRooms(currentUser.id)} />;
}
