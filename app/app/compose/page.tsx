import { ComposePage } from "../../../src/components/product-app";
import { requireCurrentUser } from "../../../src/server/auth";
import { listRooms } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function ComposeRoute() {
  const currentUser = await requireCurrentUser();

  return <ComposePage rooms={listRooms(currentUser.id)} />;
}
