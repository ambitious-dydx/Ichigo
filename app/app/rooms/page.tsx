import { RoomsPage } from "../../../src/components/product-app";
import { requireCurrentUser } from "../../../src/server/auth";
import { listRooms } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function RoomsRoute() {
  const currentUser = await requireCurrentUser();

  return <RoomsPage rooms={listRooms(currentUser.id)} />;
}
