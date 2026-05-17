import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { cache } from "react";
import { createSessionToken, hashPassword, hashToken, verifyPassword } from "./security";
import type { SessionUser } from "./types";
import {
  createSessionRecord,
  createUserRecord,
  getSessionWithUserByTokenHash,
  getUserAuthByIdentifier,
  getUserByEmail,
  getUserByUsername,
  getUserPasswordHashById,
  revokeOtherSessions,
  revokeSessionById,
  touchSessionByTokenHash,
  updateUserAccountRecord,
  updateUserPasswordHash,
} from "./repository";

const SESSION_COOKIE_NAME = "ichigo_session";
const SESSION_TTL_DAYS = 30;
const SESSION_REFRESH_WINDOW_DAYS = 7;
const SESSION_ACTIVITY_REFRESH_HOURS = 12;

type AuthState = {
  sessionId: string;
  tokenHash: string;
  user: SessionUser;
} | null;

type RegisterError =
  | "invalid-email"
  | "invalid-username"
  | "weak-password"
  | "email-exists"
  | "username-exists";

type AccountUpdateError = RegisterError;

type PasswordChangeError = "incorrect-password" | "weak-password" | "same-password";

function now() {
  return new Date();
}

function nowIso() {
  return now().toISOString();
}

function sessionExpiryDate(fromDate = now()) {
  const expiresAt = new Date(fromDate);
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  return expiresAt;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUsername(value: string) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(value);
}

function isStrongEnoughPassword(value: string) {
  return value.length >= 8;
}

async function getRequestUserAgent() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.trim() ?? "";

  return userAgent ? userAgent.slice(0, 240) : null;
}

async function syncSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

function setResponseSessionCookie(response: NextResponse, sessionToken: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

async function issueSession(userId: string) {
  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiryDate();
  const userAgent = await getRequestUserAgent();

  createSessionRecord({
    userId,
    tokenHash: hashToken(sessionToken),
    userAgent,
    lastSeenAt: nowIso(),
    expiresAt: expiresAt.toISOString(),
  });

  return { sessionToken, expiresAt };
}

const readCurrentAuthState = cache(async (): Promise<AuthState> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashToken(sessionToken);
  const session = getSessionWithUserByTokenHash(tokenHash);

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const expiresAt = new Date(session.expiresAt);
  const lastSeenAt = new Date(session.lastSeenAt);
  const refreshWindowMs = SESSION_REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const activityWindowMs = SESSION_ACTIVITY_REFRESH_HOURS * 60 * 60 * 1000;
  const shouldRefresh =
    expiresAt.getTime() - Date.now() <= refreshWindowMs ||
    Date.now() - lastSeenAt.getTime() >= activityWindowMs;

  if (shouldRefresh) {
    const nextExpiry = sessionExpiryDate();
    const userAgent = await getRequestUserAgent();

    touchSessionByTokenHash({
      tokenHash,
      userAgent,
      lastSeenAt: nowIso(),
      expiresAt: nextExpiry.toISOString(),
    });
    await syncSessionCookie(sessionToken, nextExpiry);
  }

  return {
    sessionId: session.sessionId,
    tokenHash,
    user: session.user,
  };
});

export async function getCurrentAuthState() {
  return readCurrentAuthState();
}

export async function getCurrentUser() {
  const state = await readCurrentAuthState();
  return state?.user ?? null;
}

export async function getCurrentSessionId() {
  const state = await readCurrentAuthState();
  return state?.sessionId ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function signInUser(identifier: string, password: string) {
  const authRecord = getUserAuthByIdentifier(identifier);

  if (!authRecord || !verifyPassword(password, authRecord.passwordHash)) {
    return { error: "invalid-credentials" as const };
  }

  await establishSession(authRecord.user.id);

  return { user: authRecord.user };
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
}) {
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  if (!isValidUsername(username)) {
    return { error: "invalid-username" as const };
  }

  if (!isValidEmail(email)) {
    return { error: "invalid-email" as const };
  }

  if (!isStrongEnoughPassword(input.password)) {
    return { error: "weak-password" as const };
  }

  if (getUserByEmail(email)) {
    return { error: "email-exists" as const };
  }

  if (getUserByUsername(username)) {
    return { error: "username-exists" as const };
  }

  const user = createUserRecord({
    username,
    email,
    passwordHash: hashPassword(input.password),
  });

  if (!user) {
    return { error: "email-exists" as const };
  }

  await establishSession(user.id);

  return { user };
}

export async function updateAccountDetails(
  userId: string,
  input: {
    username: string;
    email: string;
    bio: string;
  },
) {
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  if (!isValidUsername(username)) {
    return { error: "invalid-username" as const };
  }

  if (!isValidEmail(email)) {
    return { error: "invalid-email" as const };
  }

  const existingByEmail = getUserByEmail(email);
  if (existingByEmail && existingByEmail.id !== userId) {
    return { error: "email-exists" as const };
  }

  const existingByUsername = getUserByUsername(username);
  if (existingByUsername && existingByUsername.id !== userId) {
    return { error: "username-exists" as const };
  }

  const user = updateUserAccountRecord({
    userId,
    username,
    email,
    bio: input.bio.trim(),
  });

  return { user };
}

export async function changePassword(
  userId: string,
  input: {
    currentPassword: string;
    nextPassword: string;
  },
) {
  const currentHash = getUserPasswordHashById(userId);

  if (!currentHash || !verifyPassword(input.currentPassword, currentHash)) {
    return { error: "incorrect-password" as const };
  }

  if (!isStrongEnoughPassword(input.nextPassword)) {
    return { error: "weak-password" as const };
  }

  if (verifyPassword(input.nextPassword, currentHash)) {
    return { error: "same-password" as const };
  }

  updateUserPasswordHash(userId, hashPassword(input.nextPassword));

  const currentState = await readCurrentAuthState();
  if (currentState?.user.id === userId) {
    revokeOtherSessions(userId, currentState.sessionId);
  }

  return { success: true as const };
}

export async function establishSession(userId: string) {
  const { sessionToken, expiresAt } = await issueSession(userId);
  await syncSessionCookie(sessionToken, expiresAt);
}

export async function establishSessionOnResponse(userId: string, response: NextResponse) {
  const { sessionToken, expiresAt } = await issueSession(userId);
  setResponseSessionCookie(response, sessionToken, expiresAt);

  return response;
}

export async function signOutUser() {
  const state = await readCurrentAuthState();
  const cookieStore = await cookies();

  if (state) {
    revokeSessionById(state.user.id, state.sessionId);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function signOutOtherSessions() {
  const state = await readCurrentAuthState();

  if (!state) {
    return;
  }

  revokeOtherSessions(state.user.id, state.sessionId);
}

export async function revokeUserSession(sessionId: string) {
  const state = await readCurrentAuthState();

  if (!state) {
    return;
  }

  if (state.sessionId === sessionId) {
    await signOutUser();
    return;
  }

  revokeSessionById(state.user.id, sessionId);
}

export async function getCurrentUserOrThrowApi() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
