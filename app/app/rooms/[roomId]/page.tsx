import { notFound } from "next/navigation";
import { RoomDetailPage } from "../../../../src/components/product-app";
import { requireOnboardedUser } from "../../../../src/server/auth";
import { getRoomDetail } from "../../../../src/server/repository";

export const dynamic = "force-dynamic";

export default async function RoomDetailRoute({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const currentUser = await requireOnboardedUser();
  const { roomId } = await params;
  const roomDetail = getRoomDetail(roomId, currentUser.id);

  if (!roomDetail) {
    notFound();
  }

  return <RoomDetailPage posts={roomDetail.posts} room={roomDetail.room} />;
}
