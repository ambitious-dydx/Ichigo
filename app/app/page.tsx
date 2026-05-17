import { HomePage } from "../../src/components/product-app";
import { requireCurrentUser } from "../../src/server/auth";
import { getAppHome } from "../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function ProductIndexPage() {
  const currentUser = await requireCurrentUser();
  const home = getAppHome(currentUser.id);

  if (!home) {
    return null;
  }

  return <HomePage home={home} />;
}
