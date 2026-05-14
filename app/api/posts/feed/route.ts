import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../src/server/auth";
import { listFeedPosts } from "../../../../src/server/repository";

export async function GET() {
  const user = await getCurrentUser();
  const posts = listFeedPosts(user?.id);

  return NextResponse.json({ posts });
}
