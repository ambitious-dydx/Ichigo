import type { NextRequest } from "next/server";
import { beginGoogleAuthentication } from "../../../../src/server/google-oauth";

export async function GET(request: NextRequest) {
  return beginGoogleAuthentication(request);
}
