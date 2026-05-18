import { SettingsPage } from "../../../src/components/product-app";
import { getCurrentSessionId, requireOnboardedUser } from "../../../src/server/auth";
import { getSecurityView } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function SettingsRoute() {
  const currentUser = await requireOnboardedUser();
  const security = getSecurityView({
    userId: currentUser.id,
    currentSessionId: await getCurrentSessionId(),
  });

  return <SettingsPage currentUser={currentUser} security={security} />;
}
