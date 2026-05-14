import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, hashToken, verifyPassword } from "./security";
import {
  createSessionRecord,
  createUserRecord,
  getSessionUserByTokenHash,
  getUserAuthByEmail,
  getUserByEmail,
  getUserById,
} from "./repository";
import { hashPassword } from "./security";

const SESSION_COOKIE_NAME = "ichigo_session";
const SESSION_TTL_DAYS = 30;

function sessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  return expiresAt;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return getSessionUserByTokenHash(hashToken(sessionToken));
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function signInUser(email: string, password: string) {
  const authRecord = getUserAuthByEmail(email);

  if (!authRecord || !verifyPassword(password, authRecord.passwordHash)) {
    return null;
  }

  await establishSession(authRecord.user.id);

  return authRecord.user;
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
}) {
  const existingUser = getUserByEmail(input.email);

  if (existingUser) {
    return null;
  }

  const user = createUserRecord({
    username: input.username,
    email: input.email,
    passwordHash: hashPassword(input.password),
  });

  if (!user) {
    return null;
  }

  await establishSession(user.id);

  return user;
}

export async function establishSession(userId: string) {
  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiryDate();
  const cookieStore = await cookies();

  createSessionRecord({
    userId,
    tokenHash: hashToken(sessionToken),
    expiresAt: expiresAt.toISOString(),
  });

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function signOutUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const { deleteSessionByTokenHash } = await import("./repository");
    deleteSessionByTokenHash(hashToken(sessionToken));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUserOrThrowApi() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
