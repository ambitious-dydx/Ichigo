import { notFound } from "next/navigation";
import { RoomDetailPage } from "../../../../src/components/product-app";
import { requireOnboardedUser } from "../../../../src/server/auth";
import { getRoomDetail } from "../../../../src/server/repository";
import { getWorkspaceNotice } from "../../../../src/workspace-notices";

export const dynamic = "force-dynamic";

export default async function RoomDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { roomId } = await params;
  const { success, error } = await searchParams;
  const roomDetail = getRoomDetail(roomId, currentUser.id);

  if (!roomDetail) {
    notFound();
  }

  return (
    <RoomDetailPage
      notice={getWorkspaceNotice(success, error)}
      posts={roomDetail.posts}
      room={roomDetail.room}
    />
  );
}
