import { HomePage } from "../../src/components/product-app";
import { requireOnboardedUser } from "../../src/server/auth";
import { getAppHome } from "../../src/server/repository";
import { getWorkspaceNotice } from "../../src/workspace-notices";

export const dynamic = "force-dynamic";

export default async function ProductIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { success, error } = await searchParams;
  const home = getAppHome(currentUser.id);

  if (!home) {
    return null;
  }

  return <HomePage home={home} notice={getWorkspaceNotice(success, error)} />;
}
