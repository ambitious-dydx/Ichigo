import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ReplyQualityCooldownError,
  clearUserRelationship,
  completeUserOnboarding,
  consumeAccountToken,
  countJoinedRooms,
  createAccountToken,
  createCommentRecord,
  createPostRecord,
  createReportRecord,
  createRoomRecord,
  createUserRecord,
  deleteCommentRecord,
  getAppHome,
  getModerationOverview,
  getPostDetail,
  listFlaggedComments,
  getReplyQualityGuard,
  getUserAuthByIdentifier,
  getUserById,
  getProductHealthSummary,
  joinRoom,
  leaveRoom,
  listBlockedUsers,
  listFeedPosts,
  listModerationReports,
  listNotifications,
  listRooms,
  rateCommentRecord,
  setUserRelationship,
  updateCommentModerationStatus,
  updateReportStatus,
} from "../src/server/repository";
import { DEMO_ACCOUNT } from "../src/server/seed";
import { hashPassword } from "../src/server/security";
import { createTestDatabaseContext, type TestDatabaseContext } from "./helpers/test-db";

describe("repository integration", () => {
  let databaseContext: TestDatabaseContext;

  beforeEach(() => {
    databaseContext = createTestDatabaseContext();
  });

  afterEach(() => {
    databaseContext.cleanup();
  });

  it("boots with seeded home data for the demo account", () => {
    const home = getAppHome(DEMO_ACCOUNT.id);

    expect(home).not.toBeNull();
    expect(home?.user.username).toBe(DEMO_ACCOUNT.username);
    expect(home?.stats.postCount).toBeGreaterThan(0);
    expect(home?.rooms.length).toBeGreaterThan(0);
    expect(home?.notifications.length).toBeGreaterThan(0);
    expect(home?.replyQualityGuard.alignedCount).toBeGreaterThanOrEqual(1);
    expect(home?.productHealth?.alignedReplyRate).toBeGreaterThan(0);

    const feed = listFeedPosts(DEMO_ACCOUNT.id);
    expect(feed.length).toBeGreaterThan(0);
  });

  it("creates users and supports case-insensitive auth lookup", () => {
    const passwordHash = hashPassword("very-secure-password");
    const user = createUserRecord({
      username: "tester_one",
      email: "Tester@Example.com",
      passwordHash,
    });

    expect(user).not.toBeNull();
    expect(user?.email).toBe("tester@example.com");

    const byEmail = getUserAuthByIdentifier("TESTER@example.com");
    const byUsername = getUserAuthByIdentifier("tester_one");

    expect(byEmail?.user.id).toBe(user?.id);
    expect(byUsername?.user.id).toBe(user?.id);
    expect(byEmail?.passwordHash).toBe(passwordHash);
  });

  it("tracks onboarding state, account tokens, and trust relationships", () => {
    const user = createUserRecord({
      username: "focus_tester",
      email: "focus@example.com",
      passwordHash: hashPassword("focus-password-123"),
    });

    expect(user?.onboardingCompletedAt).toBeNull();

    const onboardedUser = completeUserOnboarding({
      userId: user?.id ?? "",
      onboardingFocus: "founder",
      onboardingGoal: "I need better product feedback before I ship.",
      preferredMode: "advise",
    });

    expect(onboardedUser?.onboardingFocus).toBe("founder");
    expect(onboardedUser?.preferredMode).toBe("advise");
    expect(onboardedUser?.onboardingCompletedAt).not.toBeNull();

    const token = createAccountToken({
      userId: user?.id ?? "",
      type: "email_verification",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(token).toBeTruthy();
    expect(listBlockedUsers(DEMO_ACCOUNT.id)).toHaveLength(0);

    const consumed = consumeAccountToken(token, "email_verification");
    expect(consumed?.userId).toBe(user?.id);
    expect(consumeAccountToken(token, "email_verification")).toBeNull();

    expect(listFeedPosts(DEMO_ACCOUNT.id).some((post) => post.author.id === "user_ada")).toBe(true);

    setUserRelationship({
      subjectUserId: DEMO_ACCOUNT.id,
      objectUserId: "user_ada",
      relationshipType: "block",
    });

    expect(listBlockedUsers(DEMO_ACCOUNT.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "user_ada",
          type: "block",
        }),
      ]),
    );
    expect(listFeedPosts(DEMO_ACCOUNT.id).some((post) => post.author.id === "user_ada")).toBe(
      false,
    );

    clearUserRelationship({
      subjectUserId: DEMO_ACCOUNT.id,
      objectUserId: "user_ada",
      relationshipType: "block",
    });

    expect(listFeedPosts(DEMO_ACCOUNT.id).some((post) => post.author.id === "user_ada")).toBe(
      true,
    );

    expect(listFeedPosts(DEMO_ACCOUNT.id).some((post) => post.author.id === "user_mia")).toBe(
      true,
    );

    setUserRelationship({
      subjectUserId: DEMO_ACCOUNT.id,
      objectUserId: "user_mia",
      relationshipType: "mute",
    });

    expect(listBlockedUsers(DEMO_ACCOUNT.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "user_mia",
          type: "mute",
        }),
      ]),
    );
    expect(listFeedPosts(DEMO_ACCOUNT.id).some((post) => post.author.id === "user_mia")).toBe(
      false,
    );

    clearUserRelationship({
      subjectUserId: DEMO_ACCOUNT.id,
      objectUserId: "user_mia",
      relationshipType: "mute",
    });

    expect(listFeedPosts(DEMO_ACCOUNT.id).some((post) => post.author.id === "user_mia")).toBe(
      true,
    );
  });

  it("handles post, comment, rating, and notification flows", () => {
    const postId = createPostRecord({
      userId: "user_ada",
      content: "Help me choose between two product directions.",
      responseMode: "advise",
      visibility: "public",
      roomId: "room_public",
      isAnonymous: false,
      tags: ["product", "decision"],
    });

    const authorNotificationsBefore = listNotifications("user_ada").length;
    const replierNotificationsBefore = listNotifications(DEMO_ACCOUNT.id).length;

    const commentResult = createCommentRecord({
      postId,
      userId: DEMO_ACCOUNT.id,
      content: "Try comparing the next step for each option and choose the one that teaches you fastest.",
    });

    expect(commentResult.status).toBe("visible");
    expect(["match", "acceptable"]).toContain(commentResult.alignment.classification);

    const authorNotificationsAfterComment = listNotifications("user_ada");
    expect(authorNotificationsAfterComment.length).toBe(authorNotificationsBefore + 1);

    rateCommentRecord({
      commentId: commentResult.commentId,
      ratedByUserId: "user_ada",
      ratingType: "matched_mode",
    });

    const detail = getPostDetail(postId, "user_ada");
    const comment = detail?.comments.find((entry) => entry.id === commentResult.commentId);

    expect(comment?.ratings.matched_mode).toBe(1);
    expect(getUserById(DEMO_ACCOUNT.id)?.reputationScore).toBeGreaterThanOrEqual(3);

    const replierNotificationsAfterRating = listNotifications(DEMO_ACCOUNT.id);
    expect(replierNotificationsAfterRating.length).toBe(replierNotificationsBefore + 1);
    expect(
      replierNotificationsAfterRating.some((notification) =>
        notification.body.includes("matched mode"),
      ),
    ).toBe(true);
  });

  it("handles room membership and moderation report flows", () => {
    const roomId = createRoomRecord({
      name: "Testing Room",
      description: "A room for test conversations.",
      rules: "Keep replies grounded and useful.",
      visibility: "group",
      defaultModes: ["advise", "soft-truth"],
      createdBy: DEMO_ACCOUNT.id,
    });

    expect(countJoinedRooms(DEMO_ACCOUNT.id)).toBeGreaterThan(0);
    expect(listRooms(DEMO_ACCOUNT.id).find((room) => room.id === roomId)?.isMember).toBe(true);

    joinRoom(roomId, "user_ada");
    expect(listRooms("user_ada").find((room) => room.id === roomId)?.isMember).toBe(true);

    leaveRoom(roomId, "user_ada");
    expect(listRooms("user_ada").find((room) => room.id === roomId)?.isMember).toBe(false);

    const postId = createPostRecord({
      userId: "user_ada",
      content: "Tell me what to improve before launch.",
      responseMode: "soft-truth",
      visibility: "public",
      roomId: "room_public",
      isAnonymous: false,
      tags: ["launch"],
    });

    const commentResult = createCommentRecord({
      postId,
      userId: DEMO_ACCOUNT.id,
      content: "I think the hard part is that you already know the missing piece and need to act on it.",
    });

    const reportId = createReportRecord({
      targetType: "comment",
      targetId: commentResult.commentId,
      reporterId: "user_ada",
      reason: "Needs moderator review",
    });

    const reports = listModerationReports();
    expect(reports.some((report) => report.id === reportId && report.status === "open")).toBe(true);

    const detailAfterReport = getPostDetail(postId, "user_ada");
    const reportedComment = detailAfterReport?.comments.find((entry) => entry.id === commentResult.commentId);
    expect(reportedComment?.status).toBe("flagged");
    expect(listFlaggedComments().some((comment) => comment.id === commentResult.commentId)).toBe(
      true,
    );
    expect(getModerationOverview().flaggedComments).toBeGreaterThan(0);

    updateReportStatus(reportId, "resolved");
    expect(listModerationReports().find((report) => report.id === reportId)?.status).toBe("resolved");

    updateCommentModerationStatus({
      actorUserId: DEMO_ACCOUNT.id,
      commentId: commentResult.commentId,
      status: "hidden",
    });
    expect(
      getPostDetail(postId, "user_ada")?.comments.find((entry) => entry.id === commentResult.commentId)
        ?.status,
    ).toBe("hidden");
  });

  it("starts a cooldown after repeated off-tone replies and exposes product health metrics", () => {
    const postId = createPostRecord({
      userId: "user_ada",
      content: "Help me decide which of these launch paths to choose next.",
      responseMode: "advise",
      visibility: "public",
      roomId: "room_public",
      isAnonymous: false,
      tags: ["launch", "decision"],
    });

    for (let index = 0; index < 3; index += 1) {
      const result = createCommentRecord({
        postId,
        userId: DEMO_ACCOUNT.id,
        content: "Try getting more sleep and go for a walk this week.",
      });

      expect(["borderline", "violation"]).toContain(result.alignment.classification);
    }

    const guard = getReplyQualityGuard(DEMO_ACCOUNT.id);
    expect(guard.isOnCooldown).toBe(true);
    expect(guard.cooldownEndsAt).not.toBeNull();
    expect(guard.lowAlignmentCount).toBeGreaterThanOrEqual(3);

    expect(() =>
      createCommentRecord({
        postId,
        userId: DEMO_ACCOUNT.id,
        content: "Try ranking the choices by what they teach you fastest.",
      }),
    ).toThrowError(ReplyQualityCooldownError);

    const health = getProductHealthSummary();
    expect(health.totalUsers).toBeGreaterThanOrEqual(4);
    expect(health.onboardedUsers).toBeGreaterThan(0);
    expect(health.postsWithReplies).toBeGreaterThan(0);
    expect(health.modeUsage.length).toBeGreaterThan(0);
  });

  it("allows comment authors to delete their own replies", () => {
    const postId = createPostRecord({
      userId: "user_ada",
      content: "Tell me which launch path gets signal fastest.",
      responseMode: "advise",
      visibility: "public",
      roomId: "room_public",
      isAnonymous: false,
      tags: ["launch"],
    });

    const reply = createCommentRecord({
      postId,
      userId: DEMO_ACCOUNT.id,
      content: "Try the smallest test that gets real user feedback this week.",
    });

    expect(getPostDetail(postId, DEMO_ACCOUNT.id)?.comments.some((entry) => entry.id === reply.commentId)).toBe(true);

    deleteCommentRecord(reply.commentId, DEMO_ACCOUNT.id);

    expect(getPostDetail(postId, DEMO_ACCOUNT.id)?.comments.some((entry) => entry.id === reply.commentId)).toBe(false);
  });
});
