import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_ACCOUNT } from "../src/server/seed";
import { createTestDatabaseContext, type TestDatabaseContext } from "./helpers/test-db";
import { startTestServer } from "./helpers/test-server";

function getSessionCookie(response: Response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

function createIdentity(prefix: string) {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);

  return {
    username: `${prefix}_${suffix}`.slice(0, 24),
    email: `${prefix}.${suffix}@example.com`,
    password: "test-pass-123",
  };
}

describe("http smoke", () => {
  let databaseContext: TestDatabaseContext;
  let baseUrl = "";
  let stopServer: (() => Promise<void>) | null = null;

  beforeAll(async () => {
    databaseContext = createTestDatabaseContext();
    const server = await startTestServer(databaseContext.dbPath);
    baseUrl = server.baseUrl;
    stopServer = server.stop;
  });

  afterAll(async () => {
    if (stopServer) {
      await stopServer();
    }

    databaseContext.cleanup();
  });

  it("serves login and protects the app shell", async () => {
    const loginResponse = await fetch(`${baseUrl}/login`);
    const loginHtml = await loginResponse.text();

    expect(loginResponse.status).toBe(200);
    expect(loginHtml).toContain("Pick up where you left off.");

    const protectedResponse = await fetch(`${baseUrl}/app`, { redirect: "manual" });
    expect(protectedResponse.status).toBe(307);
    expect(protectedResponse.headers.get("location")).toBe("/login");
  });

  it("supports login, session lookup, feed reads, and authenticated post creation", async () => {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifier: DEMO_ACCOUNT.email,
        password: DEMO_ACCOUNT.password,
      }),
    });

    expect(loginResponse.status).toBe(200);

    const sessionCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
    expect(sessionCookie).toBeTruthy();

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: sessionCookie ?? "",
      },
    });
    const mePayload = (await meResponse.json()) as {
      user: { id: string; username: string; email: string } | null;
    };

    expect(meResponse.status).toBe(200);
    expect(mePayload.user?.email).toBe(DEMO_ACCOUNT.email);

    const feedResponse = await fetch(`${baseUrl}/api/posts/feed`, {
      headers: {
        Cookie: sessionCookie ?? "",
      },
    });
    const feedPayload = (await feedResponse.json()) as {
      posts: Array<{ id: string; content: string }>;
    };

    expect(feedResponse.status).toBe(200);
    expect(feedPayload.posts.length).toBeGreaterThan(0);

    const postContent = "Smoke test post for Ichigo HTTP coverage.";
    const createPostResponse = await fetch(`${baseUrl}/api/posts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie ?? "",
      },
      body: JSON.stringify({
        content: postContent,
        responseMode: "advise",
        visibility: "public",
        roomId: "room_public",
        tags: ["smoke", "http"],
      }),
    });

    expect(createPostResponse.status).toBe(201);

    const feedAfterCreateResponse = await fetch(`${baseUrl}/api/posts/feed`, {
      headers: {
        Cookie: sessionCookie ?? "",
      },
    });
    const feedAfterCreatePayload = (await feedAfterCreateResponse.json()) as {
      posts: Array<{ id: string; content: string }>;
    };

    expect(
      feedAfterCreatePayload.posts.some((post) => post.content === postContent),
    ).toBe(true);
  });

  it("supports registration, account updates, and password changes", async () => {
    const identity = createIdentity("tester");
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(identity),
    });
    const registerPayload = (await registerResponse.json()) as {
      user: { username: string; email: string };
    };

    expect(registerResponse.status).toBe(201);
    expect(registerPayload.user.email).toBe(identity.email);

    const sessionCookie = getSessionCookie(registerResponse);
    expect(sessionCookie).toBeTruthy();

    const meAfterRegisterResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const meAfterRegisterPayload = (await meAfterRegisterResponse.json()) as {
      user: { username: string; email: string } | null;
    };

    expect(meAfterRegisterPayload.user?.username).toBe(identity.username);

    const nextUsername = createIdentity("updated").username;
    const nextEmail = `updated.${randomUUID().replace(/-/g, "").slice(0, 8)}@example.com`;
    const nextBio = "Building calmer conversations with clearer asks.";
    const updateAccountResponse = await fetch(`${baseUrl}/api/auth/account`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        username: nextUsername,
        email: nextEmail,
        bio: nextBio,
      }),
    });
    const updateAccountPayload = (await updateAccountResponse.json()) as {
      user: { username: string; email: string; bio: string };
    };

    expect(updateAccountResponse.status).toBe(200);
    expect(updateAccountPayload.user.username).toBe(nextUsername);
    expect(updateAccountPayload.user.email).toBe(nextEmail);
    expect(updateAccountPayload.user.bio).toBe(nextBio);

    const nextPassword = "new-test-pass-456";
    const changePasswordResponse = await fetch(`${baseUrl}/api/auth/password`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        currentPassword: identity.password,
        nextPassword,
        confirmPassword: nextPassword,
      }),
    });

    expect(changePasswordResponse.status).toBe(200);

    const oldPasswordLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifier: nextEmail,
        password: identity.password,
      }),
    });

    expect(oldPasswordLoginResponse.status).toBe(401);

    const nextPasswordLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifier: nextUsername,
        password: nextPassword,
      }),
    });
    const nextPasswordLoginPayload = (await nextPasswordLoginResponse.json()) as {
      user: { username: string; email: string };
    };

    expect(nextPasswordLoginResponse.status).toBe(200);
    expect(nextPasswordLoginPayload.user.username).toBe(nextUsername);
  });

  it("tracks multiple sessions and can revoke another session", async () => {
    const identity = createIdentity("session");
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(identity),
    });

    expect(registerResponse.status).toBe(201);
    const firstSessionCookie = getSessionCookie(registerResponse);
    expect(firstSessionCookie).toBeTruthy();

    const secondLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifier: identity.email,
        password: identity.password,
      }),
    });

    expect(secondLoginResponse.status).toBe(200);
    const secondSessionCookie = getSessionCookie(secondLoginResponse);
    expect(secondSessionCookie).toBeTruthy();
    expect(secondSessionCookie).not.toBe(firstSessionCookie);

    const sessionsResponse = await fetch(`${baseUrl}/api/auth/sessions`, {
      headers: {
        Cookie: secondSessionCookie,
      },
    });
    const sessionsPayload = (await sessionsResponse.json()) as {
      sessions: Array<{ id: string; isCurrent: boolean }>;
      currentSessionId: string | null;
    };

    expect(sessionsResponse.status).toBe(200);
    expect(sessionsPayload.sessions.length).toBeGreaterThanOrEqual(2);

    const revokedSession = sessionsPayload.sessions.find((session) => !session.isCurrent);
    expect(revokedSession).toBeTruthy();

    const revokeResponse = await fetch(
      `${baseUrl}/api/auth/sessions/${revokedSession?.id ?? ""}`,
      {
        method: "DELETE",
        headers: {
          Cookie: secondSessionCookie,
        },
      },
    );
    const revokePayload = (await revokeResponse.json()) as {
      success: boolean;
      signedOutCurrentSession: boolean;
    };

    expect(revokeResponse.status).toBe(200);
    expect(revokePayload.success).toBe(true);
    expect(revokePayload.signedOutCurrentSession).toBe(false);

    const revokedSessionMeResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: firstSessionCookie,
      },
    });
    const revokedSessionMePayload = (await revokedSessionMeResponse.json()) as {
      user: { id: string } | null;
    };

    expect(revokedSessionMeResponse.status).toBe(200);
    expect(revokedSessionMePayload.user).toBeNull();

    const sessionsAfterRevokeResponse = await fetch(`${baseUrl}/api/auth/sessions`, {
      headers: {
        Cookie: secondSessionCookie,
      },
    });
    const sessionsAfterRevokePayload = (await sessionsAfterRevokeResponse.json()) as {
      sessions: Array<{ id: string; isCurrent: boolean }>;
    };

    expect(sessionsAfterRevokeResponse.status).toBe(200);
    expect(sessionsAfterRevokePayload.sessions).toHaveLength(1);
    expect(sessionsAfterRevokePayload.sessions[0]?.isCurrent).toBe(true);
  });
});
