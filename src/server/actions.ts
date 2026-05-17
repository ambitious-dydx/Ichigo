"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ModeId } from "../modes";
import {
  changePassword,
  getCurrentSessionId,
  registerUser,
  requireCurrentUser,
  revokeUserSession,
  signInUser,
  signOutOtherSessions,
  signOutUser,
  updateAccountDetails,
} from "./auth";
import {
  createCommentRecord,
  createPostRecord,
  createReportRecord,
  createRoomRecord,
  deleteCommentRecord,
  deletePostRecord,
  joinRoom,
  leaveRoom,
  markNotificationsRead,
  rateCommentRecord,
  updateProfile,
  updateReportStatus,
} from "./repository";
import type { RatingType, ReportStatus, Visibility } from "./types";

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

  redirect("/app");
}

export async function registerAction(formData: FormData) {
  const username = asString(formData.get("username"));
  const email = asString(formData.get("email"));
  const password = asString(formData.get("password"));

  if (!username || !email || password.length < 8) {
    redirect("/register?error=invalid-input");
  }

  const result = await registerUser({ username, email, password });

  if ("error" in result) {
    redirect(`/register?error=${result.error}`);
  }

  redirect("/app");
}

export async function logoutAction() {
  await signOutUser();
  redirect("/");
}

export async function createPostAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const content = asString(formData.get("content"));
  const responseMode = asString(formData.get("responseMode"));
  const visibility = asString(formData.get("visibility"));
  const roomId = asString(formData.get("roomId"));
  const tags = parseTags(asString(formData.get("tags")));
  const isAnonymous = asBoolean(formData.get("isAnonymous"));

  if (!content || !isModeId(responseMode) || !isVisibility(visibility)) {
    redirect("/app/compose?error=invalid-post");
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

  revalidatePath("/app/feed");
  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect(`/app/posts/${postId}`);
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
  const currentUser = await requireCurrentUser();
  const postId = asString(formData.get("postId"));
  const content = asString(formData.get("content"));

  if (!postId || !content) {
    return;
  }

  createCommentRecord({
    postId,
    userId: currentUser.id,
    content,
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
  const currentUser = await requireCurrentUser();
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
  const currentUser = await requireCurrentUser();
  const targetType = asString(formData.get("targetType"));
  const targetId = asString(formData.get("targetId"));
  const reason = asString(formData.get("reason"));

  if (!targetId || !reason || (targetType !== "post" && targetType !== "comment")) {
    return;
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
  const currentUser = await requireCurrentUser();
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
  const currentUser = await requireCurrentUser();
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
  const currentUser = await requireCurrentUser();
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
  const currentUser = await requireCurrentUser();
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

  if (!reportId || !isReportStatus(status)) {
    return;
  }

  updateReportStatus(reportId, status);
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
