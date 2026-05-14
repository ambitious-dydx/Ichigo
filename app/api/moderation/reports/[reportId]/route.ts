import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";
import { updateReportStatus } from "../../../../../src/server/repository";
import type { ReportStatus } from "../../../../../src/server/types";

function isReportStatus(value: string): value is ReportStatus {
  return ["open", "reviewing", "resolved", "dismissed"].includes(value);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  try {
    const user = await getCurrentUserOrThrowApi();

    if (user.role === "user") {
      return jsonError("Forbidden", 403);
    }

    const { reportId } = await context.params;
    const body = (await request.json()) as { status?: string };

    if (!body.status || !isReportStatus(body.status)) {
      return jsonError("Invalid moderation payload");
    }

    updateReportStatus(reportId, body.status);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
