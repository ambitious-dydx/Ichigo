import { randomUUID } from "node:crypto";
import { getMode, modes, type ModeId } from "../modes";
import { classifyCommentAlignment, suggestModeFromContent } from "./mode-alignment";
import { getDb } from "./db";
import { DEMO_ACCOUNT } from "./seed";
import { createAvatarFallback, createSessionToken, hashPassword, hashToken } from "./security";
import type {
  AccountTokenType,
  AccountTokenView,
  AlignmentResult,
  AppHomeView,
  AuthSessionView,
  BlockedUserView,
  CommentStatus,
  CommentView,
  FeedbackFocus,
  FlaggedCommentView,
  FeedPost,
  LinkedAuthAccountView,
  ModerationOverviewView,
  NotificationView,
  NotificationPriority,
  PostDetail,
  ProductHealthView,
  ProfileView,
  RatingType,
  ReportStatus,
  ReportView,
  ReplyQualityGuardView,
  RoomMemberView,
  RoomMembershipRole,
  RoomView,
  SessionUser,
  TargetType,
  UserRole,
  Visibility,
} from "./types";

const RECENT_REPLY_GUARD_LIMIT = 8;
const REPLY_QUALITY_COOLDOWN_ACTION = "reply-quality-cooldown";
const REPLY_QUALITY_COOLDOWN_MINUTES = 30;

export class ReplyQualityCooldownError extends Error {
  cooldownEndsAt: string;

  constructor(cooldownEndsAt: string) {
    super("REPLY_QUALITY_COOLDOWN");
    this.name = "ReplyQualityCooldownError";
    this.cooldownEndsAt = cooldownEndsAt;
  }
}

export function isReplyQualityCooldownError(
  error: unknown,
): error is ReplyQualityCooldownError {
  return error instanceof ReplyQualityCooldownError;
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDate(value: string) {
  return new Date(value).toISOString();
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function getWedgeCopy(focus: FeedbackFocus | null) {
  switch (focus) {
    case "creator":
      return {
        title: "Feedback for work in progress",
        summary: "Ichigo works best when creators can choose whether they want hype, critique, comfort, or clear direction.",
      };
    case "reflection":
      return {
        title: "Reflection with clearer context",
        summary: "Use Ichigo when you need people to meet a vulnerable thought in the right tone before they react.",
      };
    case "support":
      return {
        title: "Care without tone mismatch",
        summary: "The product keeps emotionally sensitive posts from getting the wrong kind of answer first.",
      };
    default:
      return {
        title: "High-signal feedback for builders",
        summary: "Ichigo is focused first on founders, builders, and creators who need the right kind of response before a thread unfolds.",
      };
  }
}

function createUsernameBase(value: string) {
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!compact) {
    return "ichigo";
  }

  if (compact.length >= 3) {
    return compact.slice(0, 24);
  }

  return `${compact}ichigo`.slice(0, 24);
}

function buildUniqueUsername(seed: string) {
  const base = createUsernameBase(seed);

  if (!getUserByUsername(base)) {
    return base;
  }

  for (let index = 2; index <= 999; index += 1) {
    const suffix = `_${index}`;
    const candidate = `${base.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`;

    if (!getUserByUsername(candidate)) {
      return candidate;
    }
  }

  return `ichigo_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 24);
}

function mapUser(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    emailVerifiedAt: row.email_verified_at ? normalizeDate(String(row.email_verified_at)) : null,
    onboardingCompletedAt: row.onboarding_completed_at
      ? normalizeDate(String(row.onboarding_completed_at))
      : null,
    onboardingFocus: row.onboarding_focus ? (String(row.onboarding_focus) as FeedbackFocus) : null,
    onboardingGoal: String(row.onboarding_goal ?? ""),
    preferredMode: row.preferred_mode ? (String(row.preferred_mode) as ModeId) : null,
    bio: String(row.bio ?? ""),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    reputationScore: Number(row.reputation_score ?? 0),
    role: String(row.role ?? "user") as UserRole,
    createdAt: normalizeDate(String(row.created_at)),
  };
}

function mapFeedPost(row: Record<string, unknown>): FeedPost {
  return {
    id: String(row.id),
    author: {
      id: String(row.user_id),
      username: row.is_anonymous ? "Anonymous" : String(row.username),
      avatarUrl: row.is_anonymous ? null : (row.avatar_url ? String(row.avatar_url) : null),
      reputationScore: Number(row.reputation_score ?? 0),
    },
    room:
      row.room_id && row.room_name
        ? {
            id: String(row.room_id),
            name: String(row.room_name),
            visibility: String(row.room_visibility) as Visibility,
          }
        : null,
    modeId: String(row.response_mode) as ModeId,
    content: String(row.content),
    tags: parseJsonArray(row.tags ? String(row.tags) : "[]"),
    visibility: String(row.visibility) as Visibility,
    isAnonymous: Boolean(row.is_anonymous),
    commentCount: Number(row.comment_count ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    createdAt: normalizeDate(String(row.created_at)),
  };
}

function mapComment(row: Record<string, unknown>): CommentView {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    author: {
      id: String(row.user_id),
      username: String(row.username),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      reputationScore: Number(row.reputation_score ?? 0),
    },
    content: String(row.content),
    modeAlignmentScore: Number(row.mode_alignment_score ?? 0),
    alignmentClassification: String(row.alignment_classification) as AlignmentResult["classification"],
    status: String(row.status) as CommentView["status"],
    createdAt: normalizeDate(String(row.created_at)),
    ratings: {
      helpful: Number(row.helpful_count ?? 0),
      matched_mode: Number(row.matched_mode_count ?? 0),
      did_not_match_mode: Number(row.did_not_match_mode_count ?? 0),
      harmful: Number(row.harmful_count ?? 0),
    },
  };
}

function mapNotificationPriority(value: unknown): NotificationPriority {
  return value === "high" ? "high" : "default";
}

function mapFlaggedComment(row: Record<string, unknown>): FlaggedCommentView {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    postPreview: String(row.post_content).slice(0, 140),
    author: {
      id: String(row.user_id),
      username: String(row.username),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      reputationScore: Number(row.reputation_score ?? 0),
    },
    content: String(row.content),
    modeAlignmentScore: Number(row.mode_alignment_score ?? 0),
    alignmentClassification: String(row.alignment_classification) as AlignmentResult["classification"],
    status: String(row.status) as CommentStatus,
    openReportCount: Number(row.open_report_count ?? 0),
    createdAt: normalizeDate(String(row.created_at)),
  };
}

function mapAuthSession(
  row: Record<string, unknown>,
  currentSessionId?: string | null,
): AuthSessionView {
  return {
    id: String(row.id),
    userAgent: row.user_agent ? String(row.user_agent) : null,
    createdAt: normalizeDate(String(row.created_at)),
    lastSeenAt: normalizeDate(String(row.last_seen_at ?? row.created_at)),
    expiresAt: normalizeDate(String(row.expires_at)),
    isCurrent: currentSessionId ? String(row.id) === currentSessionId : false,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function roundToWhole(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value);
}

function getReplyQualityCooldownState(userId: string) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT *
      FROM rate_limits
      WHERE scope_key = ?
        AND action = ?
      LIMIT 1
    `)
    .get(userId, REPLY_QUALITY_COOLDOWN_ACTION) as Record<string, unknown> | undefined;

  if (!row) {
    return { isOnCooldown: false, cooldownEndsAt: null as string | null };
  }

  const cooldownEndsAt = normalizeDate(String(row.updated_at));

  if (new Date(cooldownEndsAt).getTime() <= Date.now()) {
    return { isOnCooldown: false, cooldownEndsAt: null as string | null };
  }

  return {
    isOnCooldown: true,
    cooldownEndsAt,
  };
}

function startReplyQualityCooldown(userId: string, strikeCount: number) {
  const db = getDb();
  const startedAt = nowIso();
  const cooldownEndsAt = new Date(
    Date.now() + REPLY_QUALITY_COOLDOWN_MINUTES * 60_000,
  ).toISOString();
  const existing = db
    .prepare(`
      SELECT id
      FROM rate_limits
      WHERE scope_key = ?
        AND action = ?
      LIMIT 1
    `)
    .get(userId, REPLY_QUALITY_COOLDOWN_ACTION) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE rate_limits
      SET window_started_at = ?, count = ?, updated_at = ?
      WHERE id = ?
    `).run(startedAt, strikeCount, cooldownEndsAt, existing.id);
  } else {
    db.prepare(`
      INSERT INTO rate_limits (id, scope_key, action, window_started_at, count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `rate_limit_${randomUUID()}`,
      userId,
      REPLY_QUALITY_COOLDOWN_ACTION,
      startedAt,
      strikeCount,
      cooldownEndsAt,
    );
  }

  return cooldownEndsAt;
}

function getRecentReplyQualityCounts(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT alignment_classification
      FROM comments
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(userId, RECENT_REPLY_GUARD_LIMIT) as Array<{ alignment_classification: string }>;

  const stats = {
    totalRecentReplies: rows.length,
    alignedCount: 0,
    lowAlignmentCount: 0,
    violationCount: 0,
  };

  for (const row of rows) {
    const classification = row.alignment_classification as AlignmentResult["classification"];

    if (classification === "match" || classification === "acceptable") {
      stats.alignedCount += 1;
    } else {
      stats.lowAlignmentCount += 1;

      if (classification === "violation") {
        stats.violationCount += 1;
      }
    }
  }

  return stats;
}

function describeReplyNotification(input: {
  responseMode: ModeId;
  alignmentClassification: AlignmentResult["classification"];
}) {
  const modeName = getMode(input.responseMode).name;

  switch (input.alignmentClassification) {
    case "match":
      return {
        type: "reply_match",
        title: "A reply met the ask",
        body: `Someone replied in the tone you asked for on your ${modeName} post.`,
        priority: "high" as NotificationPriority,
      };
    case "acceptable":
      return {
        type: "reply_acceptable",
        title: "A reply came in",
        body: `Someone replied and stayed close to the tone you set on your ${modeName} post.`,
        priority: "default" as NotificationPriority,
      };
    case "borderline":
      return {
        type: "reply_borderline",
        title: "A reply may have missed the ask",
        body: `A new reply landed, but it may not fully fit the tone you set on this ${modeName} post.`,
        priority: "high" as NotificationPriority,
      };
    case "violation":
      return {
        type: "reply_flagged",
        title: "A reply was flagged against your ask",
        body: `Ichigo flagged a new reply for breaking the contract on this ${modeName} post.`,
        priority: "high" as NotificationPriority,
      };
    default:
      return {
        type: "reply",
        title: "You received a new response",
        body: `Someone replied to your ${modeName} post.`,
        priority: "default" as NotificationPriority,
      };
  }
}

function notifyTrustTeamOfViolation(input: {
  commentId: string;
  postId: string;
  replyAuthorId: string;
}) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id
      FROM users
      WHERE role IN ('admin', 'moderator')
        AND id != ?
    `)
    .all(input.replyAuthorId) as Array<{ id: string }>;

  for (const row of rows) {
    createNotification({
      userId: row.id,
      type: "reply_violation_review",
      title: "A reply was auto-flagged",
      body: "A reply broke the stated contract for a post and may need review.",
      link: `/app/posts/${input.postId}`,
      priority: "high",
    });
  }

  logModerationEvent({
    actorUserId: input.replyAuthorId,
    action: "reply-auto-flagged",
    note: `Comment ${input.commentId} was automatically flagged for low alignment.`,
  });
}

export function getReplyQualityGuard(userId: string): ReplyQualityGuardView {
  const counts = getRecentReplyQualityCounts(userId);
  const cooldown = getReplyQualityCooldownState(userId);

  return {
    ...counts,
    isOnCooldown: cooldown.isOnCooldown,
    cooldownEndsAt: cooldown.cooldownEndsAt,
  };
}

function maybeStartReplyQualityCooldown(userId: string) {
  const guard = getReplyQualityGuard(userId);

  if (guard.isOnCooldown) {
    return guard;
  }

  const shouldCooldown =
    guard.violationCount >= 2 ||
    (guard.lowAlignmentCount >= 3 && guard.totalRecentReplies >= 3);

  if (!shouldCooldown) {
    return guard;
  }

  const cooldownEndsAt = startReplyQualityCooldown(userId, guard.lowAlignmentCount);
  createNotification({
    userId,
    type: "reply_quality_cooldown",
    title: "Replying is paused for now",
    body: `Too many recent replies missed the ask. Slow down, reread the post contract, and try again after ${REPLY_QUALITY_COOLDOWN_MINUTES} minutes.`,
    link: "/app/notifications",
    priority: "high",
  });
  createProductEvent({
    userId,
    eventName: "reply.quality_cooldown_started",
    route: "/app/notifications",
    metadata: {
      totalRecentReplies: guard.totalRecentReplies,
      lowAlignmentCount: guard.lowAlignmentCount,
      violationCount: guard.violationCount,
      cooldownMinutes: REPLY_QUALITY_COOLDOWN_MINUTES,
    },
  });

  return {
    ...guard,
    isOnCooldown: true,
    cooldownEndsAt,
  } satisfies ReplyQualityGuardView;
}

export function getProductHealthSummary(): ProductHealthView {
  const db = getDb();
  const totals = db
    .prepare(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN onboarding_completed_at IS NOT NULL THEN 1 ELSE 0 END) AS onboarded_users
      FROM users
    `)
    .get() as { total_users: number; onboarded_users: number };
  const postersRow = db
    .prepare(`
      SELECT
        COUNT(DISTINCT user_id) AS posters,
        COUNT(DISTINCT CASE WHEN post_count >= 2 THEN user_id END) AS repeat_posters
      FROM (
        SELECT user_id, COUNT(*) AS post_count
        FROM posts
        WHERE status = 'active'
        GROUP BY user_id
      )
    `)
    .get() as { posters: number; repeat_posters: number };
  const postsWithRepliesRow = db
    .prepare(`
      SELECT COUNT(DISTINCT post_id) AS count
      FROM comments
    `)
    .get() as { count: number };
  const alignedReplyRow = db
    .prepare(`
      SELECT
        COUNT(*) AS total_comments,
        SUM(CASE WHEN alignment_classification IN ('match', 'acceptable') THEN 1 ELSE 0 END) AS aligned_comments
      FROM comments
    `)
    .get() as { total_comments: number; aligned_comments: number };
  const firstReplyRow = db
    .prepare(`
      SELECT AVG(first_reply_minutes) AS average_minutes
      FROM (
        SELECT
          (julianday(MIN(comments.created_at)) - julianday(posts.created_at)) * 24 * 60 AS first_reply_minutes
        FROM posts
        JOIN comments ON comments.post_id = posts.id
        GROUP BY posts.id
      )
    `)
    .get() as { average_minutes: number | null };
  const modeRows = db
    .prepare(`
      SELECT response_mode, COUNT(*) AS count
      FROM posts
      GROUP BY response_mode
      ORDER BY count DESC, response_mode ASC
    `)
    .all() as Array<{ response_mode: string; count: number }>;

  const posters = Number(postersRow.posters ?? 0);
  const repeatPosters = Number(postersRow.repeat_posters ?? 0);
  const totalComments = Number(alignedReplyRow.total_comments ?? 0);
  const alignedComments = Number(alignedReplyRow.aligned_comments ?? 0);

  return {
    totalUsers: Number(totals.total_users ?? 0),
    onboardedUsers: Number(totals.onboarded_users ?? 0),
    posters,
    postsWithReplies: Number(postsWithRepliesRow.count ?? 0),
    alignedReplyRate: totalComments ? Math.round((alignedComments / totalComments) * 100) : 0,
    averageFirstReplyMinutes: roundToWhole(firstReplyRow.average_minutes),
    repeatPosterRate: posters ? Math.round((repeatPosters / posters) * 100) : 0,
    modeUsage: modeRows.map((row) => ({
      modeId: row.response_mode as ModeId,
      count: Number(row.count ?? 0),
    })),
  };
}

export function listModes() {
  return modes;
}

export function getSeedCredentials() {
  return {
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
  };
}

export function createProductEvent(input: {
  userId?: string | null;
  eventName: string;
  route?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO product_events (id, user_id, event_name, route, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `event_${randomUUID()}`,
    input.userId ?? null,
    input.eventName,
    input.route ?? null,
    JSON.stringify(input.metadata ?? {}),
    nowIso(),
  );
}

export function createAccountToken(input: {
  userId: string;
  type: AccountTokenType;
  expiresAt: string;
}) {
  const db = getDb();
  const token = createSessionToken();
  const tokenHashValue = hashToken(token);

  db.prepare(`
    INSERT INTO account_tokens (id, user_id, token_hash, type, expires_at, used_at, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
  `).run(
    `account_token_${randomUUID()}`,
    input.userId,
    tokenHashValue,
    input.type,
    input.expiresAt,
    nowIso(),
  );

  return token;
}

export function consumeAccountToken(token: string, type: AccountTokenType) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT *
      FROM account_tokens
      WHERE token_hash = ?
        AND type = ?
        AND used_at IS NULL
        AND expires_at > ?
      LIMIT 1
    `)
    .get(hashToken(token), type, nowIso()) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  db.prepare("UPDATE account_tokens SET used_at = ? WHERE id = ?").run(nowIso(), String(row.id));

  return {
    userId: String(row.user_id),
    expiresAt: normalizeDate(String(row.expires_at)),
  };
}

export function listActiveAccountTokens(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT type, expires_at
      FROM account_tokens
      WHERE user_id = ?
        AND used_at IS NULL
        AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 8
    `)
    .all(userId, nowIso()) as Array<{ type: string; expires_at: string }>;

  return rows.map((row) => ({
    type: row.type as AccountTokenType,
    token: "",
    expiresAt: normalizeDate(row.expires_at),
  })) satisfies AccountTokenView[];
}

export function logModerationEvent(input: {
  actorUserId: string;
  action: string;
  note?: string;
  reportId?: string | null;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO moderation_events (id, report_id, actor_user_id, action, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `moderation_event_${randomUUID()}`,
    input.reportId ?? null,
    input.actorUserId,
    input.action,
    input.note ?? "",
    nowIso(),
  );
}

export function hitRateLimit(input: {
  scopeKey: string;
  action: string;
  limit: number;
  windowMs: number;
}) {
  const db = getDb();
  const existing = db
    .prepare(`
      SELECT *
      FROM rate_limits
      WHERE scope_key = ?
        AND action = ?
      LIMIT 1
    `)
    .get(input.scopeKey, input.action) as Record<string, unknown> | undefined;

  const now = new Date();

  if (!existing) {
    db.prepare(`
      INSERT INTO rate_limits (id, scope_key, action, window_started_at, count, updated_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      `rate_limit_${randomUUID()}`,
      input.scopeKey,
      input.action,
      now.toISOString(),
      now.toISOString(),
    );

    return { blocked: false, remaining: Math.max(0, input.limit - 1) };
  }

  const windowStartedAt = new Date(String(existing.window_started_at));
  const elapsed = now.getTime() - windowStartedAt.getTime();

  if (elapsed > input.windowMs) {
    db.prepare(`
      UPDATE rate_limits
      SET window_started_at = ?, count = 1, updated_at = ?
      WHERE id = ?
    `).run(now.toISOString(), now.toISOString(), String(existing.id));

    return { blocked: false, remaining: Math.max(0, input.limit - 1) };
  }

  const nextCount = Number(existing.count ?? 0) + 1;

  db.prepare("UPDATE rate_limits SET count = ?, updated_at = ? WHERE id = ?").run(
    nextCount,
    now.toISOString(),
    String(existing.id),
  );

  return {
    blocked: nextCount > input.limit,
    remaining: Math.max(0, input.limit - nextCount),
  };
}

export function createUserRecord(input: {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
  onboardingFocus?: FeedbackFocus | null;
  onboardingGoal?: string;
  preferredMode?: ModeId | null;
  onboardingCompletedAt?: string | null;
}) {
  const db = getDb();
  const id = `user_${randomUUID()}`;
  const timestamp = nowIso();

  db.prepare(`
    INSERT INTO users (
      id, username, email, password_hash, password_changed_at, email_verified_at,
      onboarding_completed_at, onboarding_focus, onboarding_goal, preferred_mode,
      avatar_url, bio, reputation_score, role, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.username,
    normalizeIdentifier(input.email),
    input.passwordHash,
    timestamp,
    input.emailVerifiedAt ?? null,
    input.onboardingCompletedAt ?? null,
    input.onboardingFocus ?? null,
    input.onboardingGoal ?? "",
    input.preferredMode ?? null,
    input.avatarUrl ?? createAvatarFallback(input.username),
    "",
    0,
    "user",
    timestamp,
    timestamp,
  );

  return getUserById(id);
}

export function getUserByEmail(email: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizeIdentifier(email)) as Record<string, unknown> | undefined;

  return row ? mapUser(row) : null;
}

export function getUserByUsername(username: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE LOWER(username) = ?")
    .get(normalizeIdentifier(username)) as Record<string, unknown> | undefined;

  return row ? mapUser(row) : null;
}

export function getUserAuthByEmail(email: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(normalizeIdentifier(email)) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    user: mapUser(row),
    passwordHash: String(row.password_hash),
  };
}

export function getUserAuthByIdentifier(identifier: string) {
  const db = getDb();
  const normalized = normalizeIdentifier(identifier);
  const row = db
    .prepare("SELECT * FROM users WHERE email = ? OR LOWER(username) = ? LIMIT 1")
    .get(normalized, normalized) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    user: mapUser(row),
    passwordHash: String(row.password_hash),
  };
}

export function getUserPasswordHashById(userId: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(userId) as { password_hash: string } | undefined;

  return row ? row.password_hash : null;
}

export function getUserById(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? mapUser(row) : null;
}

export function markUserEmailVerified(userId: string, verifiedAt: string) {
  const db = getDb();
  db.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?").run(
    verifiedAt,
    nowIso(),
    userId,
  );

  return getUserById(userId);
}

export function completeUserOnboarding(input: {
  userId: string;
  onboardingFocus: FeedbackFocus;
  onboardingGoal: string;
  preferredMode: ModeId;
}) {
  const db = getDb();
  db.prepare(`
    UPDATE users
    SET onboarding_focus = ?, onboarding_goal = ?, preferred_mode = ?, onboarding_completed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.onboardingFocus,
    input.onboardingGoal.trim(),
    input.preferredMode,
    nowIso(),
    nowIso(),
    input.userId,
  );

  return getUserById(input.userId);
}

export function updateUserAvatar(userId: string, avatarUrl: string | null) {
  if (!avatarUrl) {
    return getUserById(userId);
  }

  const db = getDb();
  db.prepare("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?").run(
    avatarUrl,
    nowIso(),
    userId,
  );

  return getUserById(userId);
}

export function listLinkedAuthAccounts(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT provider, provider_email, created_at
      FROM auth_accounts
      WHERE user_id = ?
      ORDER BY created_at ASC
    `)
    .all(userId) as Array<{ provider: string; provider_email: string | null; created_at: string }>;

  return rows.map((row) => ({
    provider: row.provider,
    providerEmail: row.provider_email,
    linkedAt: normalizeDate(row.created_at),
  })) satisfies LinkedAuthAccountView[];
}

export function setUserRelationship(input: {
  subjectUserId: string;
  objectUserId: string;
  relationshipType: "block" | "mute";
}) {
  const db = getDb();

  if (input.subjectUserId === input.objectUserId) {
    return;
  }

  db.prepare(`
    INSERT OR IGNORE INTO user_relationships (
      id, subject_user_id, object_user_id, relationship_type, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    `relationship_${randomUUID()}`,
    input.subjectUserId,
    input.objectUserId,
    input.relationshipType,
    nowIso(),
  );
}

export function clearUserRelationship(input: {
  subjectUserId: string;
  objectUserId: string;
  relationshipType: "block" | "mute";
}) {
  const db = getDb();
  db.prepare(`
    DELETE FROM user_relationships
    WHERE subject_user_id = ? AND object_user_id = ? AND relationship_type = ?
  `).run(input.subjectUserId, input.objectUserId, input.relationshipType);
}

export function listBlockedUsers(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        user_relationships.object_user_id,
        user_relationships.relationship_type,
        user_relationships.created_at,
        users.username
      FROM user_relationships
      JOIN users ON users.id = user_relationships.object_user_id
      WHERE user_relationships.subject_user_id = ?
      ORDER BY user_relationships.created_at DESC
    `)
    .all(userId) as Array<{
      object_user_id: string;
      relationship_type: "block" | "mute";
      created_at: string;
      username: string;
    }>;

  return rows.map((row) => ({
    userId: row.object_user_id,
    username: row.username,
    type: row.relationship_type,
    createdAt: normalizeDate(row.created_at),
  })) satisfies BlockedUserView[];
}

export function getRelationshipIds(userId: string, relationshipType?: "block" | "mute") {
  const db = getDb();
  const rows = relationshipType
    ? (db
        .prepare(`
          SELECT object_user_id
          FROM user_relationships
          WHERE subject_user_id = ? AND relationship_type = ?
        `)
        .all(userId, relationshipType) as Array<{ object_user_id: string }>)
    : (db
        .prepare(`
          SELECT object_user_id
          FROM user_relationships
          WHERE subject_user_id = ?
        `)
        .all(userId) as Array<{ object_user_id: string }>);

  return new Set(rows.map((row) => row.object_user_id));
}

export function getUserByAuthAccount(provider: string, providerAccountId: string) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT users.*
      FROM auth_accounts
      JOIN users ON users.id = auth_accounts.user_id
      WHERE auth_accounts.provider = ? AND auth_accounts.provider_account_id = ?
      LIMIT 1
    `)
    .get(provider, providerAccountId) as Record<string, unknown> | undefined;

  return row ? mapUser(row) : null;
}

export function linkAuthAccountRecord(input: {
  userId: string;
  provider: string;
  providerAccountId: string;
  providerEmail?: string | null;
}) {
  const db = getDb();
  const timestamp = nowIso();

  db.prepare(`
    INSERT INTO auth_accounts (
      id, user_id, provider, provider_account_id, provider_email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_account_id)
    DO UPDATE SET
      user_id = excluded.user_id,
      provider_email = excluded.provider_email,
      updated_at = excluded.updated_at
  `).run(
    `account_${randomUUID()}`,
    input.userId,
    input.provider,
    input.providerAccountId,
    input.providerEmail ? normalizeIdentifier(input.providerEmail) : null,
    timestamp,
    timestamp,
  );
}

export function findOrCreateGoogleUser(input: {
  googleAccountId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
}) {
  const existingAccountUser = getUserByAuthAccount("google", input.googleAccountId);

  if (existingAccountUser) {
    if (input.emailVerifiedAt && !existingAccountUser.emailVerifiedAt) {
      markUserEmailVerified(existingAccountUser.id, input.emailVerifiedAt);
    }

    if (input.avatarUrl) {
      updateUserAvatar(existingAccountUser.id, input.avatarUrl);
    }

    return getUserById(existingAccountUser.id);
  }

  const existingEmailUser = getUserByEmail(input.email);

  if (existingEmailUser) {
    linkAuthAccountRecord({
      userId: existingEmailUser.id,
      provider: "google",
      providerAccountId: input.googleAccountId,
      providerEmail: input.email,
    });

    if (input.emailVerifiedAt && !existingEmailUser.emailVerifiedAt) {
      markUserEmailVerified(existingEmailUser.id, input.emailVerifiedAt);
    }

    if (input.avatarUrl) {
      updateUserAvatar(existingEmailUser.id, input.avatarUrl);
    }

    return getUserById(existingEmailUser.id);
  }

  const username = buildUniqueUsername(input.name || input.email.split("@")[0] || "ichigo");
  const user = createUserRecord({
    username,
    email: input.email,
    passwordHash: hashPassword(randomUUID()),
    avatarUrl: input.avatarUrl ?? createAvatarFallback(username),
    emailVerifiedAt: input.emailVerifiedAt ?? null,
  });

  if (!user) {
    return null;
  }

  linkAuthAccountRecord({
    userId: user.id,
    provider: "google",
    providerAccountId: input.googleAccountId,
    providerEmail: input.email,
  });

  return getUserById(user.id);
}

export function updateUserAccountRecord(input: {
  userId: string;
  username: string;
  email: string;
  bio: string;
  resetEmailVerification?: boolean;
}) {
  const db = getDb();
  db.prepare(`
    UPDATE users
    SET
      username = ?,
      email = ?,
      bio = ?,
      email_verified_at = CASE WHEN ? THEN NULL ELSE email_verified_at END,
      updated_at = ?
    WHERE id = ?
  `).run(
    input.username,
    normalizeIdentifier(input.email),
    input.bio,
    input.resetEmailVerification ? 1 : 0,
    nowIso(),
    input.userId,
  );

  return getUserById(input.userId);
}

export function updateUserPasswordHash(userId: string, passwordHash: string) {
  const db = getDb();
  const timestamp = nowIso();

  db.prepare(
    "UPDATE users SET password_hash = ?, password_changed_at = ?, updated_at = ? WHERE id = ?",
  ).run(passwordHash, timestamp, timestamp, userId);
}

export function createSessionRecord(input: {
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  lastSeenAt: string;
  expiresAt: string;
}) {
  const db = getDb();
  const sessionId = `session_${randomUUID()}`;

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, user_agent, last_seen_at, revoked_at, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(
    sessionId,
    input.userId,
    input.tokenHash,
    input.userAgent,
    input.lastSeenAt,
    input.expiresAt,
    nowIso(),
  );

  return sessionId;
}

export function getSessionWithUserByTokenHash(tokenHash: string) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT sessions.id AS session_id, sessions.user_agent, sessions.last_seen_at, sessions.expires_at, users.*
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.revoked_at IS NULL
        AND sessions.expires_at > ?
      LIMIT 1
    `)
    .get(tokenHash, nowIso()) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    sessionId: String(row.session_id),
    expiresAt: normalizeDate(String(row.expires_at)),
    lastSeenAt: normalizeDate(String(row.last_seen_at ?? row.created_at)),
    userAgent: row.user_agent ? String(row.user_agent) : null,
    user: mapUser(row),
  };
}

export function getSessionUserByTokenHash(tokenHash: string) {
  const session = getSessionWithUserByTokenHash(tokenHash);
  return session ? session.user : null;
}

export function touchSessionByTokenHash(input: {
  tokenHash: string;
  userAgent: string | null;
  lastSeenAt: string;
  expiresAt: string;
}) {
  const db = getDb();
  db.prepare(`
    UPDATE sessions
    SET user_agent = ?, last_seen_at = ?, expires_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(input.userAgent, input.lastSeenAt, input.expiresAt, input.tokenHash);
}

export function deleteSessionByTokenHash(tokenHash: string) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export function listUserSessions(userId: string, currentSessionId?: string | null) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT id, user_agent, created_at, last_seen_at, expires_at
      FROM sessions
      WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
      ORDER BY last_seen_at DESC, created_at DESC
    `)
    .all(userId, nowIso()) as Record<string, unknown>[];

  return rows.map((row) => mapAuthSession(row, currentSessionId));
}

export function revokeSessionById(userId: string, sessionId: string) {
  const db = getDb();
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id = ?").run(
    nowIso(),
    userId,
    sessionId,
  );
}

export function revokeOtherSessions(userId: string, currentSessionId: string) {
  const db = getDb();
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id != ?").run(
    nowIso(),
    userId,
    currentSessionId,
  );
}

export function listFeedPosts(currentUserId?: string | null) {
  const db = getDb();
  const silencedUserIds = currentUserId ? getRelationshipIds(currentUserId) : new Set<string>();
  const membershipClause = currentUserId
    ? `OR (
        posts.visibility = 'group'
        AND EXISTS (
          SELECT 1 FROM room_memberships
          WHERE room_memberships.room_id = posts.room_id
          AND room_memberships.user_id = ?
        )
      )`
    : "";

  const rows = db
    .prepare(`
      SELECT
        posts.*,
        users.username,
        users.avatar_url,
        users.reputation_score,
        rooms.name AS room_name,
        rooms.visibility AS room_visibility,
        rooms.rules AS room_rules,
        (
          SELECT COUNT(*) FROM comments
          WHERE comments.post_id = posts.id
          AND comments.status != 'hidden'
        ) AS comment_count,
        (
          SELECT COUNT(*) FROM ratings
          WHERE ratings.comment_id IN (
            SELECT comments.id FROM comments WHERE comments.post_id = posts.id
          )
        ) AS rating_count
      FROM posts
      JOIN users ON users.id = posts.user_id
      LEFT JOIN rooms ON rooms.id = posts.room_id
      WHERE posts.status = 'active'
        AND (
          posts.visibility = 'public'
          ${membershipClause}
        )
      ORDER BY posts.created_at DESC
    `)
    .all(...(currentUserId ? [currentUserId] : [])) as Record<string, unknown>[];

  return rows
    .map(mapFeedPost)
    .filter((post) => !silencedUserIds.has(post.author.id));
}

export function listPostsByUser(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        posts.*,
        users.username,
        users.avatar_url,
        users.reputation_score,
        rooms.name AS room_name,
        rooms.visibility AS room_visibility,
        (
          SELECT COUNT(*) FROM comments
          WHERE comments.post_id = posts.id
          AND comments.status != 'hidden'
        ) AS comment_count,
        (
          SELECT COUNT(*) FROM ratings
          WHERE ratings.comment_id IN (
            SELECT comments.id FROM comments WHERE comments.post_id = posts.id
          )
        ) AS rating_count
      FROM posts
      JOIN users ON users.id = posts.user_id
      LEFT JOIN rooms ON rooms.id = posts.room_id
      WHERE posts.user_id = ?
        AND posts.status = 'active'
      ORDER BY posts.created_at DESC
    `)
    .all(userId) as Record<string, unknown>[];

  return rows.map(mapFeedPost);
}

export function getPostDetail(postId: string, currentUserId?: string | null) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT
        posts.*,
        users.username,
        users.avatar_url,
        users.reputation_score,
        rooms.name AS room_name,
        rooms.visibility AS room_visibility,
        (
          SELECT COUNT(*) FROM comments
          WHERE comments.post_id = posts.id
          AND comments.status != 'hidden'
        ) AS comment_count,
        (
          SELECT COUNT(*) FROM ratings
          WHERE ratings.comment_id IN (
            SELECT comments.id FROM comments WHERE comments.post_id = posts.id
          )
        ) AS rating_count
      FROM posts
      JOIN users ON users.id = posts.user_id
      LEFT JOIN rooms ON rooms.id = posts.room_id
      WHERE posts.id = ?
      LIMIT 1
    `)
    .get(postId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  const visibility = String(row.visibility) as Visibility;
  const canSee =
    visibility === "public" ||
    (currentUserId && visibility === "group" && row.room_id
      ? Boolean(
          db
            .prepare(
              "SELECT 1 FROM room_memberships WHERE room_id = ? AND user_id = ? LIMIT 1",
            )
            .get(String(row.room_id), currentUserId),
        )
      : false) ||
    String(row.user_id) === currentUserId;

  if (!canSee) {
    return null;
  }

  const silencedUserIds = currentUserId ? getRelationshipIds(currentUserId) : new Set<string>();
  const commentRows = db
    .prepare(`
      SELECT
        comments.*,
        users.username,
        users.avatar_url,
        users.reputation_score,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'helpful' THEN 1 ELSE 0 END), 0) AS helpful_count,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'matched_mode' THEN 1 ELSE 0 END), 0) AS matched_mode_count,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'did_not_match_mode' THEN 1 ELSE 0 END), 0) AS did_not_match_mode_count,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'harmful' THEN 1 ELSE 0 END), 0) AS harmful_count
      FROM comments
      JOIN users ON users.id = comments.user_id
      LEFT JOIN ratings ON ratings.comment_id = comments.id
      WHERE comments.post_id = ?
      GROUP BY comments.id
      ORDER BY comments.created_at ASC
    `)
    .all(postId) as Record<string, unknown>[];

  const mode = getMode(String(row.response_mode) as ModeId);
  const post = mapFeedPost(row);
  const comments = commentRows
    .map(mapComment)
    .filter((comment) => !silencedUserIds.has(comment.author.id));
  const alignmentSummary = comments.reduce(
    (summary, comment) => {
      summary.total += 1;
      summary.averageScore += comment.modeAlignmentScore;

      if (comment.alignmentClassification === "match") {
        summary.matches += 1;
      } else if (comment.alignmentClassification === "acceptable") {
        summary.acceptable += 1;
      } else if (comment.alignmentClassification === "borderline") {
        summary.borderline += 1;
      } else {
        summary.violations += 1;
      }

      return summary;
    },
    {
      total: 0,
      matches: 0,
      acceptable: 0,
      borderline: 0,
      violations: 0,
      averageScore: 0,
    },
  );

  if (alignmentSummary.total > 0) {
    alignmentSummary.averageScore = Math.round(
      alignmentSummary.averageScore / alignmentSummary.total,
    );
  }

  return {
    ...post,
    status: String(row.status) as PostDetail["status"],
    responsePrompt: mode.prompt,
    responseGuidance: mode.guidance,
    roomRules: row.room_rules ? String(row.room_rules) : null,
    alignmentSummary,
    comments,
  } satisfies PostDetail;
}

export function createPostRecord(input: {
  userId: string;
  content: string;
  responseMode: ModeId;
  visibility: Visibility;
  roomId: string | null;
  isAnonymous: boolean;
  tags: string[];
}) {
  const db = getDb();
  const postId = `post_${randomUUID()}`;
  const timestamp = nowIso();

  db.prepare(`
    INSERT INTO posts (
      id, user_id, content, response_mode, visibility, room_id, is_anonymous, status, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    postId,
    input.userId,
    input.content,
    input.responseMode,
    input.visibility,
    input.roomId,
    input.isAnonymous ? 1 : 0,
    JSON.stringify(input.tags),
    timestamp,
    timestamp,
  );

  return postId;
}

export function deletePostRecord(postId: string, currentUserId: string) {
  const db = getDb();
  db.prepare("DELETE FROM posts WHERE id = ? AND user_id = ?").run(postId, currentUserId);
}

export function createCommentRecord(input: {
  postId: string;
  userId: string;
  content: string;
}) {
  const db = getDb();
  const replyGuardBefore = getReplyQualityGuard(input.userId);

  if (replyGuardBefore.isOnCooldown && replyGuardBefore.cooldownEndsAt) {
    throw new ReplyQualityCooldownError(replyGuardBefore.cooldownEndsAt);
  }

  const postRow = db
    .prepare(`
      SELECT posts.*, rooms.rules
      FROM posts
      LEFT JOIN rooms ON rooms.id = posts.room_id
      WHERE posts.id = ?
    `)
    .get(input.postId) as Record<string, unknown> | undefined;

  if (!postRow) {
    throw new Error("Post not found");
  }

  const alignment = classifyCommentAlignment({
    postContent: String(postRow.content),
    responseMode: String(postRow.response_mode) as ModeId,
    commentContent: input.content,
    roomRules: postRow.rules ? String(postRow.rules) : undefined,
  });

  const commentId = `comment_${randomUUID()}`;
  const timestamp = nowIso();
  const status = alignment.classification === "violation" ? "flagged" : "visible";

  db.prepare(`
    INSERT INTO comments (
      id, post_id, user_id, content, mode_alignment_score, alignment_classification, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commentId,
    input.postId,
    input.userId,
    input.content,
    alignment.alignmentScore,
    alignment.classification,
    status,
    timestamp,
    timestamp,
  );

  if (String(postRow.user_id) !== input.userId) {
    const replyNotification = describeReplyNotification({
      responseMode: String(postRow.response_mode) as ModeId,
      alignmentClassification: alignment.classification,
    });

    createNotification({
      userId: String(postRow.user_id),
      type: replyNotification.type,
      title: replyNotification.title,
      body: replyNotification.body,
      link: `/app/posts/${input.postId}`,
      priority: replyNotification.priority,
    });
  }

  if (alignment.classification === "borderline" || alignment.classification === "violation") {
    createNotification({
      userId: input.userId,
      type: "reply_alignment_warning",
      title:
        alignment.classification === "violation"
          ? "This reply broke the contract"
          : "This reply is drifting off-tone",
      body:
        alignment.classification === "violation"
          ? "Ichigo flagged this reply. Re-read the ask before you reply again."
          : "Ichigo thinks this reply is edging away from what the post asked for.",
      link: `/app/posts/${input.postId}`,
      priority: alignment.classification === "violation" ? "high" : "default",
    });
  }

  if (alignment.classification === "violation") {
    notifyTrustTeamOfViolation({
      commentId,
      postId: input.postId,
      replyAuthorId: input.userId,
    });
  }

  const replyGuardAfter = maybeStartReplyQualityCooldown(input.userId);

  return { commentId, alignment, status, replyGuard: replyGuardAfter };
}

export function updateCommentRecord(input: {
  commentId: string;
  userId: string;
  content: string;
}) {
  const db = getDb();
  const commentRow = db
    .prepare(`
      SELECT comments.*, posts.content AS post_content, posts.response_mode, rooms.rules
      FROM comments
      JOIN posts ON posts.id = comments.post_id
      LEFT JOIN rooms ON rooms.id = posts.room_id
      WHERE comments.id = ?
    `)
    .get(input.commentId) as Record<string, unknown> | undefined;

  if (!commentRow || String(commentRow.user_id) !== input.userId) {
    throw new Error("Comment not found");
  }

  const alignment = classifyCommentAlignment({
    postContent: String(commentRow.post_content),
    responseMode: String(commentRow.response_mode) as ModeId,
    commentContent: input.content,
    roomRules: commentRow.rules ? String(commentRow.rules) : undefined,
  });

  db.prepare(`
    UPDATE comments
    SET content = ?, mode_alignment_score = ?, alignment_classification = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.content,
    alignment.alignmentScore,
    alignment.classification,
    alignment.classification === "violation" ? "flagged" : "visible",
    nowIso(),
    input.commentId,
  );

  return alignment;
}

export function deleteCommentRecord(commentId: string, currentUserId: string) {
  const db = getDb();
  db.prepare("DELETE FROM comments WHERE id = ? AND user_id = ?").run(commentId, currentUserId);
}

export function rateCommentRecord(input: {
  commentId: string;
  ratedByUserId: string;
  ratingType: RatingType;
}) {
  const db = getDb();
  const comment = db
    .prepare("SELECT user_id, post_id FROM comments WHERE id = ?")
    .get(input.commentId) as { user_id: string; post_id: string } | undefined;

  if (!comment) {
    throw new Error("Comment not found");
  }

  db.prepare(`
    INSERT OR IGNORE INTO ratings (id, comment_id, rated_by_user_id, rating_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `rating_${randomUUID()}`,
    input.commentId,
    input.ratedByUserId,
    input.ratingType,
    nowIso(),
  );

  updateUserReputation(comment.user_id);

  if (comment.user_id !== input.ratedByUserId) {
    createNotification({
      userId: comment.user_id,
      type: "rating",
      title: "Your response was rated",
      body: `Someone marked your reply as ${input.ratingType.replaceAll("_", " ")}.`,
      link: `/app/posts/${comment.post_id}`,
    });
  }
}

function updateUserReputation(userId: string) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(
        CASE ratings.rating_type
          WHEN 'matched_mode' THEN 3
          WHEN 'helpful' THEN 2
          WHEN 'did_not_match_mode' THEN -2
          WHEN 'harmful' THEN -5
          ELSE 0
        END
      ), 0) AS reputation
      FROM comments
      LEFT JOIN ratings ON ratings.comment_id = comments.id
      WHERE comments.user_id = ?
    `)
    .get(userId) as { reputation: number };

  db.prepare("UPDATE users SET reputation_score = ?, updated_at = ? WHERE id = ?").run(
    Number(row.reputation ?? 0),
    nowIso(),
    userId,
  );
}

export function listRooms(currentUserId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        rooms.*,
        creators.username AS created_by_username,
        (
          SELECT COUNT(*) FROM room_memberships WHERE room_memberships.room_id = rooms.id
        ) AS member_count,
        (
          SELECT COUNT(*) FROM posts WHERE posts.room_id = rooms.id
        ) AS post_count,
        EXISTS(
          SELECT 1 FROM room_memberships
          WHERE room_memberships.room_id = rooms.id
          AND room_memberships.user_id = ?
        ) AS is_member
        ,
        (
          SELECT room_memberships.role
          FROM room_memberships
          WHERE room_memberships.room_id = rooms.id
            AND room_memberships.user_id = ?
          LIMIT 1
        ) AS membership_role
      FROM rooms
      JOIN users AS creators ON creators.id = rooms.created_by
      ORDER BY rooms.created_at DESC
    `)
    .all(currentUserId, currentUserId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    rules: String(row.rules ?? ""),
    visibility: String(row.visibility) as Visibility,
    defaultModes: parseJsonArray(String(row.default_modes)) as ModeId[],
    createdAt: normalizeDate(String(row.created_at)),
    createdBy: {
      id: String(row.created_by),
      username: String(row.created_by_username),
    },
    memberCount: Number(row.member_count ?? 0),
    postCount: Number(row.post_count ?? 0),
    isMember: Boolean(row.is_member),
    membershipRole: row.membership_role
      ? (String(row.membership_role) as RoomMembershipRole)
      : "none",
    canModerate: ["owner", "moderator"].includes(String(row.membership_role ?? "")),
  })) satisfies RoomView[];
}

export function getRoomDetail(roomId: string, currentUserId: string) {
  const room = listRooms(currentUserId).find((entry) => entry.id === roomId) ?? null;

  if (!room) {
    return null;
  }

  const posts = listFeedPosts(currentUserId).filter((post) => post.room?.id === roomId);

  return { room, posts };
}

export function joinRoom(roomId: string, userId: string) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO room_memberships (id, room_id, user_id, role, created_at)
    VALUES (?, ?, ?, 'member', ?)
  `).run(`membership_${randomUUID()}`, roomId, userId, nowIso());
}

export function leaveRoom(roomId: string, userId: string) {
  const db = getDb();
  db.prepare("DELETE FROM room_memberships WHERE room_id = ? AND user_id = ?").run(roomId, userId);
}

export function createRoomRecord(input: {
  name: string;
  description: string;
  rules: string;
  visibility: Visibility;
  defaultModes: ModeId[];
  createdBy: string;
}) {
  const db = getDb();
  const roomId = `room_${randomUUID()}`;
  const timestamp = nowIso();

  db.prepare(`
    INSERT INTO rooms (id, name, description, rules, default_modes, visibility, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roomId,
    input.name,
    input.description,
    input.rules,
    JSON.stringify(input.defaultModes),
    input.visibility,
    input.createdBy,
    timestamp,
    timestamp,
  );

  joinRoom(roomId, input.createdBy);

  return roomId;
}

export function createReportRecord(input: {
  targetType: TargetType;
  targetId: string;
  reporterId: string;
  reason: string;
  moderatorNote?: string;
}) {
  const db = getDb();
  const reportId = `report_${randomUUID()}`;
  db.prepare(`
    INSERT INTO reports (id, target_type, target_id, reporter_id, reason, status, moderator_note, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    reportId,
    input.targetType,
    input.targetId,
    input.reporterId,
    input.reason,
    input.moderatorNote ?? "",
    nowIso(),
  );

  if (input.targetType === "comment") {
    db.prepare("UPDATE comments SET status = 'flagged', updated_at = ? WHERE id = ?").run(
      nowIso(),
      input.targetId,
    );
  }

  logModerationEvent({
    actorUserId: input.reporterId,
    action: "report-created",
    note: input.reason,
    reportId,
  });

  return reportId;
}

export function listModerationReports() {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT reports.*, users.username
      FROM reports
      JOIN users ON users.id = reports.reporter_id
      ORDER BY reports.created_at DESC
    `)
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    targetType: String(row.target_type) as TargetType,
    targetId: String(row.target_id),
    reason: String(row.reason),
    status: String(row.status) as ReportStatus,
    moderatorNote: String(row.moderator_note ?? ""),
    reporter: {
      id: String(row.reporter_id),
      username: String(row.username),
    },
    createdAt: normalizeDate(String(row.created_at)),
  })) satisfies ReportView[];
}

export function listFlaggedComments() {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        comments.*,
        posts.content AS post_content,
        users.username,
        users.avatar_url,
        users.reputation_score,
        (
          SELECT COUNT(*)
          FROM reports
          WHERE reports.target_type = 'comment'
            AND reports.target_id = comments.id
            AND reports.status IN ('open', 'reviewing')
        ) AS open_report_count
      FROM comments
      JOIN posts ON posts.id = comments.post_id
      JOIN users ON users.id = comments.user_id
      WHERE comments.status = 'flagged'
      ORDER BY open_report_count DESC, comments.created_at DESC
    `)
    .all() as Record<string, unknown>[];

  return rows.map(mapFlaggedComment);
}

export function getModerationOverview(): ModerationOverviewView {
  const db = getDb();
  const reportCounts = db
    .prepare(`
      SELECT
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_reports,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing_reports
      FROM reports
    `)
    .get() as { open_reports: number; reviewing_reports: number };
  const commentCounts = db
    .prepare(`
      SELECT
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged_comments,
        SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) AS hidden_comments,
        COUNT(DISTINCT CASE WHEN status = 'flagged' THEN user_id END) AS repeat_offenders,
        SUM(
          CASE
            WHEN status = 'flagged'
             AND NOT EXISTS (
               SELECT 1
               FROM reports
               WHERE reports.target_type = 'comment'
                 AND reports.target_id = comments.id
                 AND reports.status IN ('open', 'reviewing')
             )
            THEN 1
            ELSE 0
          END
        ) AS auto_flagged_comments
      FROM comments
    `)
    .get() as {
      flagged_comments: number;
      hidden_comments: number;
      repeat_offenders: number;
      auto_flagged_comments: number;
    };

  return {
    openReports: Number(reportCounts.open_reports ?? 0),
    reviewingReports: Number(reportCounts.reviewing_reports ?? 0),
    flaggedComments: Number(commentCounts.flagged_comments ?? 0),
    hiddenComments: Number(commentCounts.hidden_comments ?? 0),
    repeatOffenders: Number(commentCounts.repeat_offenders ?? 0),
    autoFlaggedComments: Number(commentCounts.auto_flagged_comments ?? 0),
  };
}

export function updateReportStatus(reportId: string, status: ReportStatus, moderatorNote?: string) {
  const db = getDb();
  db.prepare("UPDATE reports SET status = ?, moderator_note = ? WHERE id = ?").run(
    status,
    moderatorNote ?? "",
    reportId,
  );
}

export function updateCommentModerationStatus(input: {
  actorUserId: string;
  commentId: string;
  status: CommentStatus;
}) {
  const db = getDb();
  const comment = db
    .prepare(`
      SELECT post_id, user_id
      FROM comments
      WHERE id = ?
      LIMIT 1
    `)
    .get(input.commentId) as { post_id: string; user_id: string } | undefined;

  if (!comment) {
    throw new Error("Comment not found");
  }

  db.prepare("UPDATE comments SET status = ?, updated_at = ? WHERE id = ?").run(
    input.status,
    nowIso(),
    input.commentId,
  );

  createNotification({
    userId: comment.user_id,
    type: "moderation_update",
    title:
      input.status === "hidden"
        ? "One of your replies was hidden"
        : input.status === "visible"
          ? "One of your replies was restored"
          : "One of your replies is still under review",
    body:
      input.status === "hidden"
        ? "A moderator removed one of your replies after review."
        : input.status === "visible"
          ? "A moderator restored one of your replies after review."
          : "A moderator kept one of your replies flagged for further review.",
    link: `/app/posts/${comment.post_id}`,
    priority: input.status === "hidden" ? "high" : "default",
  });

  logModerationEvent({
    actorUserId: input.actorUserId,
    action: `comment-status-${input.status}`,
    note: `Comment ${input.commentId} moved to ${input.status}.`,
  });
}

export function listNotifications(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT *
      FROM notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, CASE priority WHEN 'high' THEN 0 ELSE 1 END ASC, created_at DESC
      LIMIT 20
    `)
    .all(userId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    link: String(row.link),
    isRead: Boolean(row.is_read),
    priority: mapNotificationPriority(row.priority),
    createdAt: normalizeDate(String(row.created_at)),
  })) satisfies NotificationView[];
}

export function markNotificationsRead(userId: string) {
  const db = getDb();
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
}

export function countUnreadNotifications(userId: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0")
    .get(userId) as { count: number };

  return Number(row.count ?? 0);
}

export function countJoinedRooms(userId: string) {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM room_memberships WHERE user_id = ?")
    .get(userId) as { count: number };

  return Number(row.count ?? 0);
}

export function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  priority?: NotificationPriority;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link, is_read, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    `notification_${randomUUID()}`,
    input.userId,
    input.type,
    input.title,
    input.body,
    input.link,
    input.priority ?? "default",
    nowIso(),
  );
}

export function getAppHome(currentUserId: string) {
  const user = getUserById(currentUserId);

  if (!user) {
    return null;
  }

  const recentPosts = listFeedPosts(currentUserId).slice(0, 4);
  const rooms = listRooms(currentUserId).filter((room) => room.isMember).slice(0, 4);
  const notifications = listNotifications(currentUserId).slice(0, 4);
  const userPosts = listPostsByUser(currentUserId);
  const replies = listUserComments(currentUserId);
  const matchedReplies = replies.filter((comment) =>
    ["match", "acceptable"].includes(comment.alignmentClassification),
  );
  const activeModes = new Set(userPosts.map((post) => post.modeId));
  const wedge = getWedgeCopy(user.onboardingFocus);
  const replyQualityGuard = getReplyQualityGuard(currentUserId);
  const productHealth = user.role === "admin" ? getProductHealthSummary() : null;

  return {
    user,
    stats: {
      postCount: userPosts.length,
      roomCount: countJoinedRooms(currentUserId),
      unreadNotificationCount: countUnreadNotifications(currentUserId),
      replyCount: replies.length,
    },
    wedge,
    insights: {
      firstPostComplete: userPosts.length > 0,
      firstReplyComplete: replies.length > 0,
      matchedReplyRate: replies.length
        ? Math.round((matchedReplies.length / replies.length) * 100)
        : 0,
      activeModeCount: activeModes.size,
    },
    recentPosts,
    rooms,
    notifications,
    replyQualityGuard,
    productHealth,
  } satisfies AppHomeView;
}

export function getProfile(currentUserId: string) {
  const user = getUserById(currentUserId);

  if (!user) {
    return null;
  }

  const posts = listPostsByUser(currentUserId);
  const postDetails = posts.slice(0, 5);
  const allComments = listUserComments(currentUserId);

  return {
    user,
    posts: postDetails,
    recentComments: allComments.slice(0, 6),
    notifications: listNotifications(currentUserId),
    blockedUsers: listBlockedUsers(currentUserId),
  } satisfies ProfileView;
}

export function getSecurityView(input: {
  userId: string;
  currentSessionId: string | null;
}) {
  return {
    sessions: listUserSessions(input.userId, input.currentSessionId),
    currentSessionId: input.currentSessionId,
    linkedAccounts: listLinkedAuthAccounts(input.userId),
    availableTokens: listActiveAccountTokens(input.userId),
  };
}

export function updateProfile(input: { userId: string; bio: string }) {
  const db = getDb();
  db.prepare("UPDATE users SET bio = ?, updated_at = ? WHERE id = ?").run(
    input.bio,
    nowIso(),
    input.userId,
  );
}

export function listUserComments(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        comments.*,
        users.username,
        users.avatar_url,
        users.reputation_score,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'helpful' THEN 1 ELSE 0 END), 0) AS helpful_count,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'matched_mode' THEN 1 ELSE 0 END), 0) AS matched_mode_count,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'did_not_match_mode' THEN 1 ELSE 0 END), 0) AS did_not_match_mode_count,
        COALESCE(SUM(CASE WHEN ratings.rating_type = 'harmful' THEN 1 ELSE 0 END), 0) AS harmful_count
      FROM comments
      JOIN users ON users.id = comments.user_id
      LEFT JOIN ratings ON ratings.comment_id = comments.id
      WHERE comments.user_id = ?
      GROUP BY comments.id
      ORDER BY comments.created_at DESC
    `)
    .all(userId) as Record<string, unknown>[];

  return rows.map(mapComment);
}

export function suggestMode(content: string) {
  return suggestModeFromContent(content);
}

export function classifyCommentForPost(input: {
  postId: string;
  commentContent: string;
}) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT posts.content, posts.response_mode, rooms.rules
      FROM posts
      LEFT JOIN rooms ON rooms.id = posts.room_id
      WHERE posts.id = ?
    `)
    .get(input.postId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error("Post not found");
  }

  return classifyCommentAlignment({
    postContent: String(row.content),
    responseMode: String(row.response_mode) as ModeId,
    commentContent: input.commentContent,
    roomRules: row.rules ? String(row.rules) : undefined,
  });
}
