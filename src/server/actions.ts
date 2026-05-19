"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ModeId } from "../modes";
import {
  changePassword,
  finishOnboarding,
  getCurrentSessionId,
  requestEmailVerification,
  requestPasswordReset,
  registerUser,
  requireCurrentUser,
  requireOnboardedUser,
  resetPasswordWithToken,
  revokeUserSession,
  signInUser,
  signOutOtherSessions,
  signOutUser,
  updateAccountDetails,
  verifyEmailToken,
} from "./auth";
import {
  clearUserRelationship,
  createProductEvent,
  createCommentRecord,
  createPostRecord,
  createReportRecord,
  createRoomRecord,
  deleteCommentRecord,
  deletePostRecord,
  hitRateLimit,
  joinRoom,
  leaveRoom,
  markNotificationsRead,
  rateCommentRecord,
  setUserRelationship,
  updateCommentModerationStatus,
  updateProfile,
  updateReportStatus,
  isReplyQualityCooldownError,
} from "./repository";
import type { CommentStatus, FeedbackFocus, RatingType, ReportStatus, Visibility } from "./types";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function isModeId(value: string): value is ModeId {
  return ["hype", "comfort", "advise", "soft-truth", "challenge", "listen"].includes(value);
}

function isVisibility(value: string): value is Visibility {
  return ["public", "followers", "group", "anonymous"].includes(value);
}

function isRatingType(value: string): value is RatingType {
  return ["helpful", "matched_mode", "did_not_match_mode", "harmful"].includes(value);
}

function isReportStatus(value: string): value is ReportStatus {
  return ["open", "reviewing", "resolved", "dismissed"].includes(value);
}

function isCommentStatus(value: string): value is CommentStatus {
  return ["visible", "flagged", "hidden"].includes(value);
}

function isFeedbackFocus(value: string): value is FeedbackFocus {
  return ["founder", "creator", "reflection", "support"].includes(value);
}

function guardRateLimit(userId: string, action: string, limit: number, windowMs: number) {
  return hitRateLimit({
    scopeKey: userId,
    action,
    limit,
    windowMs,
  });
}

export async function loginAction(formData: FormData) {
  const identifier = asString(formData.get("identifier")) || asString(formData.get("email"));
  const password = asString(formData.get("password"));

  if (!identifier || !password) {
    redirect("/login?error=missing-fields");
  }

  const result = await signInUser(identifier, password);

  if ("error" in result) {
    redirect("/login?error=invalid-credentials");
  }

  if (!result.user.emailVerifiedAt) {
    let delivery;

    try {
      delivery = await requestEmailVerification(result.user.id);
    } catch {
      redirect("/app/verify?error=delivery-failed");
    }

    const previewParam = delivery.previewUrl
      ? `&preview=${encodeURIComponent(delivery.previewUrl)}`
      : "";
    redirect(`/app/verify?success=verification-link-created${previewParam}`);
  }

  redirect(result.user.onboardingCompletedAt ? "/app" : "/app/onboarding");
}

export async function registerAction(formData: FormData) {
  const username = asString(formData.get("username"));
  const email = asString(formData.get("email"));
  const password = asString(formData.get("password"));
  const confirmPassword = asString(formData.get("confirmPassword"));

  if (!username || !email || !password || !confirmPassword) {
    redirect("/register?error=invalid-input");
  }

  if (password !== confirmPassword) {
    redirect("/register?error=password-mismatch");
  }

  const result = await registerUser({ username, email, password });

  if ("error" in result) {
    redirect(`/register?error=${result.error}`);
  }

  let delivery;

  try {
    delivery = await requestEmailVerification(result.user.id);
  } catch {
    redirect("/login?error=verification-email-failed");
  }

  const previewParam = delivery.previewUrl
    ? `&preview=${encodeURIComponent(delivery.previewUrl)}`
    : "";
  redirect(`/login?success=verification-email-sent${previewParam}`);
}

export async function logoutAction() {
  await signOutUser();
  redirect("/");
}

export async function createPostAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const content = asString(formData.get("content"));
  const responseMode = asString(formData.get("responseMode"));
  const visibility = asString(formData.get("visibility"));
  const roomId = asString(formData.get("roomId"));
  const tags = parseTags(asString(formData.get("tags")));
  const isAnonymous = asBoolean(formData.get("isAnonymous"));

  if (!content || !isModeId(responseMode) || !isVisibility(visibility)) {
    redirect("/app/compose?error=invalid-post");
  }

  const rateLimit = guardRateLimit(currentUser.id, "create-post", 8, 60 * 60 * 1000);

  if (rateLimit.blocked) {
    redirect("/app/compose?error=rate-limited");
  }

  const postId = createPostRecord({
    userId: currentUser.id,
    content,
    responseMode,
    visibility,
    roomId: roomId || null,
    isAnonymous,
    tags,
  });
  createProductEvent({
    userId: currentUser.id,
    eventName: "post.created",
    route: "/app/compose",
    metadata: { responseMode, visibility, roomId: roomId || null },
  });

  revalidatePath("/app/feed");
  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect(`/app/posts/${postId}?fresh=1`);
}

export async function deletePostAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const postId = asString(formData.get("postId"));

  if (!postId) {
    return;
  }

  deletePostRecord(postId, currentUser.id);
  revalidatePath("/app/feed");
  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect("/app/feed");
}

export async function createCommentAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const postId = asString(formData.get("postId"));
  const content = asString(formData.get("content"));

  if (!postId || !content) {
    return;
  }

  const rateLimit = guardRateLimit(currentUser.id, "create-comment", 24, 60 * 60 * 1000);

  if (rateLimit.blocked) {
    redirect(`/app/posts/${postId}?error=rate-limited`);
  }

  let result;

  try {
    result = createCommentRecord({
      postId,
      userId: currentUser.id,
      content,
    });
  } catch (error) {
    if (isReplyQualityCooldownError(error)) {
      redirect(`/app/posts/${postId}?error=reply-quality-cooldown`);
    }

    throw error;
  }
  createProductEvent({
    userId: currentUser.id,
    eventName: "comment.created",
    route: `/app/posts/${postId}`,
    metadata: {
      alignment: result.alignment.classification,
      score: result.alignment.alignmentScore,
      status: result.status,
    },
  });

  revalidatePath(`/app/posts/${postId}`);
  revalidatePath("/app/feed");
  revalidatePath("/app");
  revalidatePath("/app/profile");
}

export async function updateCommentAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const postId = asString(formData.get("postId"));
  const commentId = asString(formData.get("commentId"));
  const content = asString(formData.get("content"));

  if (!commentId || !content) {
    return;
  }

  const { updateCommentRecord } = await import("./repository");
  updateCommentRecord({
    commentId,
    userId: currentUser.id,
    content,
  });

  revalidatePath(`/app/posts/${postId}`);
  revalidatePath("/app");
}

export async function deleteCommentAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const postId = asString(formData.get("postId"));
  const commentId = asString(formData.get("commentId"));

  if (!commentId) {
    return;
  }

  deleteCommentRecord(commentId, currentUser.id);
  revalidatePath(`/app/posts/${postId}`);
  revalidatePath("/app");
  revalidatePath("/app/profile");
}

export async function rateCommentAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const postId = asString(formData.get("postId"));
  const commentId = asString(formData.get("commentId"));
  const ratingType = asString(formData.get("ratingType"));

  if (!commentId || !isRatingType(ratingType)) {
    return;
  }

  rateCommentRecord({
    commentId,
    ratedByUserId: currentUser.id,
    ratingType,
  });

  revalidatePath(`/app/posts/${postId}`);
  revalidatePath("/app/feed");
  revalidatePath("/app");
  revalidatePath("/app/profile");
}

export async function reportAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const targetType = asString(formData.get("targetType"));
  const targetId = asString(formData.get("targetId"));
  const reason = asString(formData.get("reason"));

  if (!targetId || !reason || (targetType !== "post" && targetType !== "comment")) {
    return;
  }

  const rateLimit = guardRateLimit(currentUser.id, "create-report", 12, 60 * 60 * 60 * 1000);

  if (rateLimit.blocked) {
    redirect("/app/notifications?error=report-rate-limited");
  }

  createReportRecord({
    targetType,
    targetId,
    reporterId: currentUser.id,
    reason,
  });

  revalidatePath("/app/moderation");
}

export async function createRoomAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const name = asString(formData.get("name"));
  const description = asString(formData.get("description"));
  const rules = asString(formData.get("rules"));
  const visibility = asString(formData.get("visibility"));
  const defaultModes = formData
    .getAll("defaultModes")
    .map((entry) => asString(entry))
    .filter(isModeId);

  if (!name || !description || !isVisibility(visibility)) {
    redirect("/app/rooms?error=invalid-room");
  }

  const rateLimit = guardRateLimit(currentUser.id, "create-room", 4, 24 * 60 * 60 * 1000);

  if (rateLimit.blocked) {
    redirect("/app/rooms?error=rate-limited");
  }

  createRoomRecord({
    name,
    description,
    rules,
    visibility,
    defaultModes: defaultModes.length ? defaultModes : modesDefault(),
    createdBy: currentUser.id,
  });

  revalidatePath("/app");
  revalidatePath("/app/rooms");
  redirect("/app/rooms");
}

function modesDefault() {
  return ["advise", "comfort", "soft-truth"] as ModeId[];
}

export async function joinRoomAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const roomId = asString(formData.get("roomId"));

  if (!roomId) {
    return;
  }

  joinRoom(roomId, currentUser.id);
  revalidatePath("/app");
  revalidatePath("/app/rooms");
  revalidatePath(`/app/rooms/${roomId}`);
}

export async function leaveRoomAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const roomId = asString(formData.get("roomId"));

  if (!roomId) {
    return;
  }

  leaveRoom(roomId, currentUser.id);
  revalidatePath("/app");
  revalidatePath("/app/rooms");
  revalidatePath(`/app/rooms/${roomId}`);
}

export async function updateProfileAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const bio = asString(formData.get("bio"));

  updateProfile({
    userId: currentUser.id,
    bio,
  });

  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath("/app/settings/account");
}

export async function updateReportStatusAction(formData: FormData) {
  const currentUser = await requireCurrentUser();

  if (currentUser.role === "user") {
    redirect("/app/feed");
  }

  const reportId = asString(formData.get("reportId"));
  const status = asString(formData.get("status"));
  const moderatorNote = asString(formData.get("moderatorNote"));

  if (!reportId || !isReportStatus(status)) {
    return;
  }

  updateReportStatus(reportId, status, moderatorNote);
  revalidatePath("/app/moderation");
}

export async function updateCommentModerationStatusAction(formData: FormData) {
  const currentUser = await requireCurrentUser();

  if (currentUser.role === "user") {
    redirect("/app/feed");
  }

  const commentId = asString(formData.get("commentId"));
  const status = asString(formData.get("status"));

  if (!commentId || !isCommentStatus(status)) {
    return;
  }

  updateCommentModerationStatus({
    actorUserId: currentUser.id,
    commentId,
    status,
  });
  revalidatePath("/app/moderation");
}

export async function markNotificationsReadAction() {
  const currentUser = await requireCurrentUser();
  markNotificationsRead(currentUser.id);
  revalidatePath("/app");
  revalidatePath("/app/notifications");
}

export async function updateAccountAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const username = asString(formData.get("username"));
  const email = asString(formData.get("email"));
  const bio = asString(formData.get("bio"));

  if (!username || !email) {
    redirect("/app/settings/account?error=invalid-input");
  }

  const result = await updateAccountDetails(currentUser.id, { username, email, bio });

  if ("error" in result) {
    redirect(`/app/settings/account?error=${result.error}`);
  }

  if (result.user && !result.user.emailVerifiedAt) {
    let delivery;

    try {
      delivery = await requestEmailVerification(currentUser.id);
    } catch {
      redirect("/app/settings/account?success=account-saved-verification-failed");
    }

    const previewParam = delivery.previewUrl
      ? `&preview=${encodeURIComponent(delivery.previewUrl)}`
      : "";
    redirect(`/app/settings/account?success=account-saved${previewParam}`);
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/account");
  redirect("/app/settings/account?success=account-saved");
}

export async function changePasswordAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const currentPassword = asString(formData.get("currentPassword"));
  const nextPassword = asString(formData.get("nextPassword"));
  const confirmPassword = asString(formData.get("confirmPassword"));

  if (!currentPassword || !nextPassword || !confirmPassword) {
    redirect("/app/settings/security?error=missing-fields");
  }

  if (nextPassword !== confirmPassword) {
    redirect("/app/settings/security?error=password-mismatch");
  }

  const result = await changePassword(currentUser.id, { currentPassword, nextPassword });

  if ("error" in result) {
    redirect(`/app/settings/security?error=${result.error}`);
  }

  revalidatePath("/app/settings/security");
  redirect("/app/settings/security?success=password-changed");
}

export async function signOutOtherSessionsAction() {
  await requireCurrentUser();
  await signOutOtherSessions();
  revalidatePath("/app/settings/security");
  redirect("/app/settings/security?success=other-sessions-signed-out");
}

export async function revokeSessionAction(formData: FormData) {
  await requireCurrentUser();
  const sessionId = asString(formData.get("sessionId"));

  if (!sessionId) {
    redirect("/app/settings/security?error=invalid-session");
  }

  const currentSessionId = await getCurrentSessionId();
  await revokeUserSession(sessionId);

  if (currentSessionId && currentSessionId === sessionId) {
    redirect("/login?success=session-ended");
  }

  revalidatePath("/app/settings/security");
  redirect("/app/settings/security?success=session-revoked");
}

export async function completeOnboardingAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const focus = asString(formData.get("focus"));
  const goal = asString(formData.get("goal"));
  const preferredMode = asString(formData.get("preferredMode"));

  if (!isFeedbackFocus(focus) || !goal || !isModeId(preferredMode)) {
    redirect("/app/onboarding?error=invalid-input");
  }

  await finishOnboarding({
    userId: currentUser.id,
    focus,
    goal,
    preferredMode,
  });

  revalidatePath("/app");
  revalidatePath("/app/feed");
  revalidatePath("/app/compose");
  redirect("/app");
}

export async function requestEmailVerificationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const redirectTo = asString(formData.get("redirectTo")) || "/app/settings/account";

  let delivery;

  try {
    delivery = await requestEmailVerification(currentUser.id);
  } catch {
    redirect(`${redirectTo}?error=delivery-failed`);
  }

  const previewParam = delivery.previewUrl
    ? `&preview=${encodeURIComponent(delivery.previewUrl)}`
    : "";
  redirect(`${redirectTo}?success=verification-link-created${previewParam}`);
}

export async function verifyEmailAction(formData: FormData) {
  const token = asString(formData.get("token"));

  if (!token) {
    redirect("/app/settings/account?error=invalid-token");
  }

  const result = await verifyEmailToken(token);

  if ("error" in result) {
    redirect("/app/settings/account?error=invalid-token");
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/account");
  redirect("/app/settings/account?success=email-verified");
}

export async function requestPasswordResetAction(formData: FormData) {
  const identifier = asString(formData.get("identifier"));

  if (!identifier) {
    redirect("/forgot-password?error=missing-fields");
  }

  let delivery = null;

  try {
    delivery = await requestPasswordReset(identifier);
  } catch {
    redirect("/forgot-password?error=delivery-failed");
  }

  if (!delivery) {
    redirect("/forgot-password?success=reset-sent");
  }

  const previewParam = delivery.previewUrl
    ? `&preview=${encodeURIComponent(delivery.previewUrl)}`
    : "";
  redirect(`/forgot-password?success=reset-sent${previewParam}`);
}

export async function resetPasswordAction(formData: FormData) {
  const token = asString(formData.get("token"));
  const nextPassword = asString(formData.get("nextPassword"));
  const confirmPassword = asString(formData.get("confirmPassword"));

  if (!token || !nextPassword || !confirmPassword) {
    redirect("/reset-password?error=missing-fields");
  }

  if (nextPassword !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=password-mismatch`);
  }

  const result = await resetPasswordWithToken({ token, nextPassword });

  if ("error" in result) {
    redirect(
      `/reset-password${token ? `?token=${encodeURIComponent(token)}&` : "?"}error=${result.error}`,
    );
  }

  redirect("/login?success=password-reset");
}

export async function setRelationshipAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const objectUserId = asString(formData.get("objectUserId"));
  const relationshipType = asString(formData.get("relationshipType"));
  const returnTo = asString(formData.get("returnTo"));

  if (!objectUserId || (relationshipType !== "block" && relationshipType !== "mute")) {
    return;
  }

  setUserRelationship({
    subjectUserId: currentUser.id,
    objectUserId,
    relationshipType,
  });

  revalidatePath("/app/feed");
  revalidatePath("/app/profile");
  revalidatePath("/app/settings/account");

  if (returnTo) {
    redirect(returnTo);
  }
}

export async function clearRelationshipAction(formData: FormData) {
  const currentUser = await requireOnboardedUser();
  const objectUserId = asString(formData.get("objectUserId"));
  const relationshipType = asString(formData.get("relationshipType"));
  const returnTo = asString(formData.get("returnTo"));

  if (!objectUserId || (relationshipType !== "block" && relationshipType !== "mute")) {
    return;
  }

  clearUserRelationship({
    subjectUserId: currentUser.id,
    objectUserId,
    relationshipType,
  });

  revalidatePath("/app/feed");
  revalidatePath("/app/profile");
  revalidatePath("/app/settings/account");

  if (returnTo) {
    redirect(returnTo);
  }
}
