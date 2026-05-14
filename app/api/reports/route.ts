import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../src/server/auth";
import { jsonError } from "../../../src/server/http";
import { createReportRecord } from "../../../src/server/repository";
import type { TargetType } from "../../../src/server/types";

function isTargetType(value: string): value is TargetType {
  return value === "post" || value === "comment";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserOrThrowApi();
    const body = (await request.json()) as {
      targetType?: string;
      targetId?: string;
      reason?: string;
    };

    if (!body.targetId || !body.reason?.trim() || !body.targetType || !isTargetType(body.targetType)) {
      return jsonError("Invalid report payload");
    }

    const reportId = createReportRecord({
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason.trim(),
      reporterId: user.id,
    });

    return NextResponse.json({ reportId }, { status: 201 });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
