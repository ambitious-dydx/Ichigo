import { ModerationPage } from "../../../src/components/product-app";
import { requireCurrentUser } from "../../../src/server/auth";
import { listModerationReports } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function ModerationRoute() {
  const currentUser = await requireCurrentUser();

  return <ModerationPage currentUser={currentUser} reports={listModerationReports()} />;
}
