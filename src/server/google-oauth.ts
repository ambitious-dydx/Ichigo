import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { establishSessionOnResponse } from "./auth";
import { findOrCreateGoogleUser } from "./repository";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_STATE_COOKIE = "ichigo_google_state";
const GOOGLE_VERIFIER_COOKIE = "ichigo_google_verifier";
const GOOGLE_COOKIE_MAX_AGE_SECONDS = 60 * 10;

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Base64Url(value: string) {
  return base64UrlEncode(createHash("sha256").update(value).digest());
}

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID ?? "";
}

function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET ?? "";
}

export function isGoogleAuthConfigured() {
  return Boolean(getGoogleClientId() && getGoogleClientSecret());
}

function createCallbackUrl(request: NextRequest) {
  return new URL("/api/auth/google/callback", request.url).toString();
}

function clearOauthCookies(response: NextResponse) {
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set(GOOGLE_VERIFIER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}

function redirectToLogin(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
}

export function beginGoogleAuthentication(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    return redirectToLogin(request, "google-unavailable");
  }

  const state = base64UrlEncode(randomBytes(32));
  const codeVerifier = base64UrlEncode(randomBytes(48));
  const challenge = sha256Base64Url(codeVerifier);
  const authorizationUrl = new URL(GOOGLE_AUTH_URL);

  authorizationUrl.searchParams.set("client_id", getGoogleClientId());
  authorizationUrl.searchParams.set("redirect_uri", createCallbackUrl(request));
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GOOGLE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  response.cookies.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GOOGLE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}

async function exchangeCodeForAccessToken(request: NextRequest, code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: createCallbackUrl(request),
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GoogleUserInfo;
}

export async function completeGoogleAuthentication(request: NextRequest) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(GOOGLE_VERIFIER_COOKIE)?.value;

  if (error) {
    const response = redirectToLogin(request, "google-cancelled");
    clearOauthCookies(response);
    return response;
  }

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    const response = redirectToLogin(request, "google-invalid-state");
    clearOauthCookies(response);
    return response;
  }

  const tokenPayload = await exchangeCodeForAccessToken(request, code, codeVerifier);

  if (!tokenPayload?.access_token) {
    const response = redirectToLogin(request, "google-exchange-failed");
    clearOauthCookies(response);
    return response;
  }

  const userInfo = await fetchGoogleUserInfo(tokenPayload.access_token);

  if (!userInfo?.sub || !userInfo.email || !userInfo.email_verified) {
    const response = redirectToLogin(request, "google-profile-unavailable");
    clearOauthCookies(response);
    return response;
  }

  const user = findOrCreateGoogleUser({
    googleAccountId: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name ?? userInfo.email.split("@")[0] ?? "ichigo",
    avatarUrl: userInfo.picture ?? null,
    emailVerifiedAt: new Date().toISOString(),
  });

  if (!user) {
    const response = redirectToLogin(request, "google-account-link-failed");
    clearOauthCookies(response);
    return response;
  }

  const response = NextResponse.redirect(new URL("/app", request.url));
  clearOauthCookies(response);
  await establishSessionOnResponse(user.id, response);

  return response;
}
