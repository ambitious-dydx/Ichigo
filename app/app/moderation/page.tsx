import { ModerationPage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import {
  getModerationOverview,
  listFlaggedComments,
  listModerationReports,
} from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function ModerationRoute() {
  const currentUser = await requireOnboardedUser();

  return (
    <ModerationPage
      currentUser={currentUser}
      flaggedComments={listFlaggedComments()}
      overview={getModerationOverview()}
      reports={listModerationReports()}
    />
  );
}
