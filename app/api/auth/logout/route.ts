import { NextResponse } from "next/server";
import { signOutUser } from "../../../../src/server/auth";

export async function POST() {
  await signOutUser();

  return NextResponse.json({ success: true });
}
