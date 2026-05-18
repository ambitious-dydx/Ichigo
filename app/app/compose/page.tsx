import { ComposePage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { listRooms } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function ComposeRoute() {
  const currentUser = await requireOnboardedUser();

  return <ComposePage currentUser={currentUser} rooms={listRooms(currentUser.id)} />;
}
