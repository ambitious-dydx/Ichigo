import { NextResponse } from "next/server";
import { requestPasswordReset } from "../../../../../src/server/auth";
import { jsonError } from "../../../../../src/server/http";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { identifier?: string };

    if (!body.identifier?.trim()) {
      return jsonError("Identifier is required");
    }

    const delivery = await requestPasswordReset(body.identifier.trim());

    return NextResponse.json(
      {
        success: true,
        previewUrl: delivery?.previewUrl ?? null,
      },
      { status: 202 },
    );
  } catch {
    return jsonError("Unable to deliver password reset email", 500);
  }
}
