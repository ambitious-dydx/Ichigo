import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countJoinedRooms,
  createCommentRecord,
  createPostRecord,
  createReportRecord,
  createRoomRecord,
  createUserRecord,
  getAppHome,
  getPostDetail,
  getUserAuthByIdentifier,
  getUserById,
  joinRoom,
  leaveRoom,
  listFeedPosts,
  listModerationReports,
  listNotifications,
  listRooms,
  rateCommentRecord,
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

    updateReportStatus(reportId, "resolved");
    expect(listModerationReports().find((report) => report.id === reportId)?.status).toBe("resolved");
  });
});
