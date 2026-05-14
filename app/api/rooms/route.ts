import { NextResponse } from "next/server";
import { getCurrentUserOrThrowApi } from "../../../src/server/auth";
import { jsonError } from "../../../src/server/http";
import { createRoomRecord, listRooms } from "../../../src/server/repository";
import type { Visibility } from "../../../src/server/types";
import type { ModeId } from "../../../src/modes";

function isVisibility(value: string): value is Visibility {
  return ["public", "followers", "group", "anonymous"].includes(value);
}

function isModeId(value: string): value is ModeId {
  return ["hype", "comfort", "advise", "soft-truth", "challenge", "listen"].includes(value);
}

export async function GET() {
  try {
    const user = await getCurrentUserOrThrowApi();
    return NextResponse.json({ rooms: listRooms(user.id) });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserOrThrowApi();
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      rules?: string;
      visibility?: string;
      defaultModes?: string[];
    };

    if (!body.name?.trim() || !body.description?.trim() || !body.visibility || !isVisibility(body.visibility)) {
      return jsonError("Invalid room payload");
    }

    const roomId = createRoomRecord({
      name: body.name.trim(),
      description: body.description.trim(),
      rules: body.rules?.trim() ?? "",
      visibility: body.visibility,
      defaultModes: Array.isArray(body.defaultModes)
        ? body.defaultModes.filter(isModeId)
        : ["advise", "comfort", "soft-truth"],
      createdBy: user.id,
    });

    return NextResponse.json({ roomId }, { status: 201 });
  } catch (error) {
    return jsonError("Unauthorized", 401);
  }
}
