import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import { updateProfile } from "../../../../src/server/repository";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUserOrThrowApi();
    const body = (await request.json()) as { bio?: string };

    updateProfile({
      userId: user.id,
      bio: body.bio?.trim() ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
