import { notFound } from "next/navigation";
import { ProfilePage } from "../../../src/components/product-app";
import { requireCurrentUser } from "../../../src/server/auth";
import { getProfile } from "../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const currentUser = await requireCurrentUser();
  const profile = getProfile(currentUser.id);

  if (!profile) {
    notFound();
  }

  return <ProfilePage profile={profile} />;
}
