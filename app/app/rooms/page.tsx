import { RoomsPage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { listRooms } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function RoomsRoute() {
  const currentUser = await requireOnboardedUser();

  return <RoomsPage rooms={listRooms(currentUser.id)} />;
}
