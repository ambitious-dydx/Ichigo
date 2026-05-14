import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../src/server/auth";
import { jsonError } from "../../../../src/server/http";
import { listModerationReports } from "../../../../src/server/repository";

export async function GET() {
  try {
    const user = await getCurrentUserOrThrowApi();

    if (user.role === "user") {
      return jsonError("Forbidden", 403);
    }

    return NextResponse.json({ reports: listModerationReports() });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
