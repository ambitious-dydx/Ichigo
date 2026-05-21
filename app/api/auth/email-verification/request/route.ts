import { NextResponse } from "next/server";
import { getCurrentUser, requestEmailVerification } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return jsonError("Unauthorized", 401);
    }

    const delivery = await requestEmailVerification(currentUser.id);

    return NextResponse.json(
      {
        success: true,
        previewCode: delivery.previewCode,
      },
      { status: 202 },
    );
  } catch {
    return jsonError("Unable to deliver verification email", 500);
  }
}
