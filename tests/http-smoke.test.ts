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
    password: "Test-pass-123!",
  };
}

async function registerIdentity(baseUrl: string, identity: ReturnType<typeof createIdentity>) {
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...identity,
      confirmPassword: identity.password,
    }),
  });
  const registerPayload = (await registerResponse.json()) as {
    user: { username: string; email: string };
    previewCode: string | null;
  };

  expect(registerResponse.status).toBe(201);
  expect(registerPayload.user.email).toBe(identity.email);

  return registerPayload;
}

async function verifyEmailWithCode(baseUrl: string, sessionCookie: string, code: string | null) {
  expect(code).toBeTruthy();

  const verificationResponse = await fetch(`${baseUrl}/api/auth/email-verification/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      code,
    }),
  });

  expect(verificationResponse.status).toBe(200);
}

async function loginWithPassword(baseUrl: string, identifier: string, password: string) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      identifier,
      password,
    }),
  });
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

  it("supports reply-fit analysis endpoints", async () => {
    const classifyResponse = await fetch(`${baseUrl}/api/ai/classify-comment`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        postId: "post_seed_1",
        commentContent: "You probably know the smaller bet already. Pick the path that gets you signal fastest.",
      }),
    });
    const classifyPayload = (await classifyResponse.json()) as {
      alignmentScore: number;
      classification: string;
      reason: string;
      suggestedRewrite: string | null;
    };

    expect(classifyResponse.status).toBe(200);
    expect(typeof classifyPayload.alignmentScore).toBe("number");
    expect(typeof classifyPayload.reason).toBe("string");

    const rewriteResponse = await fetch(`${baseUrl}/api/ai/rewrite-comment`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        postId: "post_seed_4",
        commentContent: "Whatever, just do anything.",
      }),
    });
    const rewritePayload = (await rewriteResponse.json()) as {
      classification: string;
      reason: string;
      suggestedRewrite: string | null;
    };

    expect(rewriteResponse.status).toBe(200);
    expect(typeof rewritePayload.classification).toBe("string");
    expect(typeof rewritePayload.reason).toBe("string");
  });

  it("allows an authenticated user to delete their own comment through the API", async () => {
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
    const sessionCookie = getSessionCookie(loginResponse);

    const createResponse = await fetch(`${baseUrl}/api/posts/post_seed_1/comments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        content: "Try the path that gets you the fastest learning with the least extra build time.",
      }),
    });
    const createPayload = (await createResponse.json()) as { commentId: string };

    expect(createResponse.status).toBe(201);
    expect(createPayload.commentId).toBeTruthy();

    const deleteResponse = await fetch(`${baseUrl}/api/comments/${createPayload.commentId}`, {
      method: "DELETE",
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(deleteResponse.status).toBe(200);

    const commentsResponse = await fetch(`${baseUrl}/api/posts/post_seed_1/comments`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    const commentsPayload = (await commentsResponse.json()) as {
      comments: Array<{ id: string }>;
    };

    expect(commentsPayload.comments.some((comment) => comment.id === createPayload.commentId)).toBe(false);
  });

  it("enforces reply-quality cooldowns through the HTTP API", async () => {
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
    const sessionCookie = getSessionCookie(loginResponse);

    for (let index = 0; index < 3; index += 1) {
      const response = await fetch(`${baseUrl}/api/posts/post_seed_4/comments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          content: "Try getting more sleep and go for a walk this week.",
        }),
      });

      expect(response.status).toBe(201);
    }

    const blockedResponse = await fetch(`${baseUrl}/api/posts/post_seed_4/comments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        content: "Try the option that teaches you fastest.",
      }),
    });
    const blockedPayload = (await blockedResponse.json()) as {
      error: string;
      cooldownEndsAt?: string;
    };

    expect(blockedResponse.status).toBe(429);
    expect(blockedPayload.error).toContain("Replying is paused");
    expect(blockedPayload.cooldownEndsAt).toBeTruthy();
  });

  it("supports registration, account updates, and password changes", async () => {
    const identity = createIdentity("tester");
    const registerPayload = await registerIdentity(baseUrl, identity);

    const verificationLoginResponse = await loginWithPassword(
      baseUrl,
      identity.email,
      identity.password,
    );
    const verificationCookie = getSessionCookie(verificationLoginResponse);
    const verificationLoginPayload = (await verificationLoginResponse.json()) as {
      previewCode: string | null;
    };

    await verifyEmailWithCode(baseUrl, verificationCookie, verificationLoginPayload.previewCode);

    const loginResponse = await loginWithPassword(baseUrl, identity.email, identity.password);
    expect(loginResponse.status).toBe(200);

    const sessionCookie = getSessionCookie(loginResponse);
    expect(sessionCookie).toBeTruthy();

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
      user: { username: string; email: string; bio: string; emailVerifiedAt: string | null };
    };

    expect(updateAccountResponse.status).toBe(200);
    expect(updateAccountPayload.user.username).toBe(nextUsername);
    expect(updateAccountPayload.user.email).toBe(nextEmail);
    expect(updateAccountPayload.user.bio).toBe(nextBio);
    expect(updateAccountPayload.user.emailVerifiedAt).toBeNull();

    const verificationRequestResponse = await fetch(
      `${baseUrl}/api/auth/email-verification/request`,
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
        },
      },
    );
    const verificationRequestPayload = (await verificationRequestResponse.json()) as {
      previewCode: string | null;
    };

    expect(verificationRequestResponse.status).toBe(202);
    await verifyEmailWithCode(baseUrl, sessionCookie ?? "", verificationRequestPayload.previewCode);

    const nextPassword = "New-test-pass-456!";
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

    const nextPasswordLoginResponse = await loginWithPassword(baseUrl, nextUsername, nextPassword);
    const nextPasswordLoginPayload = (await nextPasswordLoginResponse.json()) as {
      user: { username: string; email: string };
    };

    expect(nextPasswordLoginResponse.status).toBe(200);
    expect(nextPasswordLoginPayload.user.username).toBe(nextUsername);
  });

  it("gates the product behind onboarding and unlocks it after completion", async () => {
    const identity = createIdentity("onboard");
    const registerPayload = await registerIdentity(baseUrl, identity);
    const verificationLoginResponse = await loginWithPassword(
      baseUrl,
      identity.email,
      identity.password,
    );
    const verificationCookie = getSessionCookie(verificationLoginResponse);
    const verificationLoginPayload = (await verificationLoginResponse.json()) as {
      previewCode: string | null;
    };

    await verifyEmailWithCode(baseUrl, verificationCookie, verificationLoginPayload.previewCode);
    const loginResponse = await loginWithPassword(baseUrl, identity.email, identity.password);
    expect(loginResponse.status).toBe(200);
    const sessionCookie = getSessionCookie(loginResponse);

    const appResponse = await fetch(`${baseUrl}/app`, {
      headers: {
        Cookie: sessionCookie,
      },
      redirect: "manual",
    });

    expect(appResponse.status).toBe(307);
    expect(appResponse.headers.get("location")).toBe("/app/onboarding");

    const blockedCreatePostResponse = await fetch(`${baseUrl}/api/posts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        content: "I should not be able to post before onboarding.",
        responseMode: "advise",
        visibility: "public",
      }),
    });

    expect(blockedCreatePostResponse.status).toBe(403);

    const onboardingResponse = await fetch(`${baseUrl}/api/auth/onboarding`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        focus: "founder",
        goal: "I need sharper product feedback before I ship.",
        preferredMode: "advise",
      }),
    });
    const onboardingPayload = (await onboardingResponse.json()) as {
      user: { onboardingCompletedAt: string | null; onboardingFocus: string | null };
    };

    expect(onboardingResponse.status).toBe(200);
    expect(onboardingPayload.user.onboardingFocus).toBe("founder");
    expect(onboardingPayload.user.onboardingCompletedAt).toBeTruthy();

    const createPostResponse = await fetch(`${baseUrl}/api/posts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        content: "Now I can actually post after onboarding.",
        responseMode: "advise",
        visibility: "public",
      }),
    });

    expect(createPostResponse.status).toBe(201);
  });

  it("supports email verification and password reset lifecycle endpoints", async () => {
    const identity = createIdentity("recover");
    const registerPayload = await registerIdentity(baseUrl, identity);

    const blockedLoginResponse = await loginWithPassword(baseUrl, identity.email, identity.password);
    const blockedLoginPayload = (await blockedLoginResponse.json()) as {
      user: { email: string };
      requiresVerification: boolean;
      previewCode?: string | null;
    };

    expect(blockedLoginResponse.status).toBe(200);
    expect(blockedLoginPayload.user.email).toBe(identity.email);
    expect(blockedLoginPayload.requiresVerification).toBe(true);

    const unverifiedSessionCookie = getSessionCookie(blockedLoginResponse);
    expect(unverifiedSessionCookie).toBeTruthy();

    const verifyGateResponse = await fetch(`${baseUrl}/app`, {
      headers: {
        Cookie: unverifiedSessionCookie,
      },
      redirect: "manual",
    });

    expect(verifyGateResponse.status).toBe(307);
    expect(verifyGateResponse.headers.get("location")).toBe("/app/verify");

    const verificationLoginResponse = await loginWithPassword(
      baseUrl,
      identity.email,
      identity.password,
    );
    const verificationCookie = getSessionCookie(verificationLoginResponse);
    const verificationLoginPayload = (await verificationLoginResponse.json()) as {
      previewCode: string | null;
    };

    await verifyEmailWithCode(baseUrl, verificationCookie, verificationLoginPayload.previewCode);

    const loginResponse = await loginWithPassword(baseUrl, identity.email, identity.password);
    expect(loginResponse.status).toBe(200);
    const sessionCookie = getSessionCookie(loginResponse);

    const nextEmail = `reset.${randomUUID().replace(/-/g, "").slice(0, 8)}@example.com`;
    const accountUpdateResponse = await fetch(`${baseUrl}/api/auth/account`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        username: identity.username,
        email: nextEmail,
        bio: "Still testing recovery flows.",
      }),
    });
    const accountUpdatePayload = (await accountUpdateResponse.json()) as {
      user: { email: string; emailVerifiedAt: string | null };
    };

    expect(accountUpdateResponse.status).toBe(200);
    expect(accountUpdatePayload.user.email).toBe(nextEmail);
    expect(accountUpdatePayload.user.emailVerifiedAt).toBeNull();

    const verificationRequestResponse = await fetch(
      `${baseUrl}/api/auth/email-verification/request`,
      {
        method: "POST",
        headers: {
          Cookie: sessionCookie,
        },
      },
    );
    const verificationRequestPayload = (await verificationRequestResponse.json()) as {
      previewCode: string | null;
    };

    expect(verificationRequestResponse.status).toBe(202);
    await verifyEmailWithCode(baseUrl, sessionCookie ?? "", verificationRequestPayload.previewCode);

    const resetRequestResponse = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifier: nextEmail,
      }),
    });
    const resetRequestPayload = (await resetRequestResponse.json()) as {
      previewUrl: string | null;
    };

    expect(resetRequestResponse.status).toBe(202);
    expect(resetRequestPayload.previewUrl).toBeTruthy();
    const resetToken = resetRequestPayload.previewUrl
      ? new URL(resetRequestPayload.previewUrl).searchParams.get("token")
      : null;
    expect(resetToken).toBeTruthy();

    const nextPassword = "Reset-pass-789!";
    const resetConfirmResponse = await fetch(`${baseUrl}/api/auth/password-reset/confirm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        token: resetToken,
        nextPassword,
      }),
    });

    expect(resetConfirmResponse.status).toBe(200);

    const loginAfterResetResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        identifier: nextEmail,
        password: nextPassword,
      }),
    });

    expect(loginAfterResetResponse.status).toBe(200);
  });

  it("tracks multiple sessions and can revoke another session", async () => {
    const identity = createIdentity("session");
    const registerPayload = await registerIdentity(baseUrl, identity);
    const verificationLoginResponse = await loginWithPassword(
      baseUrl,
      identity.email,
      identity.password,
    );
    const verificationCookie = getSessionCookie(verificationLoginResponse);
    const verificationLoginPayload = (await verificationLoginResponse.json()) as {
      previewCode: string | null;
    };

    await verifyEmailWithCode(baseUrl, verificationCookie, verificationLoginPayload.previewCode);

    const firstLoginResponse = await loginWithPassword(baseUrl, identity.email, identity.password);
    expect(firstLoginResponse.status).toBe(200);
    const firstSessionCookie = getSessionCookie(firstLoginResponse);
    expect(firstSessionCookie).toBeTruthy();

    const secondLoginResponse = await loginWithPassword(baseUrl, identity.email, identity.password);

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
    expect(
      sessionsAfterRevokePayload.sessions.some((session) => session.id === revokedSession?.id),
    ).toBe(false);
    expect(
      sessionsAfterRevokePayload.sessions.some((session) => session.isCurrent),
    ).toBe(true);
  });
});
