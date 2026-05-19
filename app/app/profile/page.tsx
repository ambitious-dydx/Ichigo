import { notFound } from "next/navigation";
import { ProfilePage } from "../../../src/components/product-app";
import { requireOnboardedUser } from "../../../src/server/auth";
import { getProfile } from "../../../src/server/repository";
import { getWorkspaceNotice } from "../../../src/workspace-notices";

export const dynamic = "force-dynamic";

export default async function ProfileRoute({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { success, error } = await searchParams;
  const profile = getProfile(currentUser.id);

  if (!profile) {
    notFound();
  }

  return <ProfilePage notice={getWorkspaceNotice(success, error)} profile={profile} />;
}
