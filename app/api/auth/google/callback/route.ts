import type { NextRequest } from "next/server";
import { completeGoogleAuthentication } from "../../../../../src/server/google-oauth";

export async function GET(request: NextRequest) {
  return completeGoogleAuthentication(request);
}
