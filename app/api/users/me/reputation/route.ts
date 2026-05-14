import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrowApi();

    return NextResponse.json({
      reputationScore: user.reputationScore,
      role: user.role,
    });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
