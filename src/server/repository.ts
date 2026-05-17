import { randomUUID } from "node:crypto";
import { getMode, modes, type ModeId } from "../modes";
import { classifyCommentAlignment, suggestModeFromContent } from "./mode-alignment";
import { getDb } from "./db";
import { DEMO_ACCOUNT } from "./seed";
import { createAvatarFallback, hashPassword } from "./security";
import type {
  AlignmentResult,
  AppHomeView,
  AuthSessionView,
  CommentView,
  FeedPost,
  NotificationView,
  PostDetail,
  ProfileView,
  RatingType,
  ReportStatus,
  ReportView,
  RoomView,
  SessionUser,
  TargetType,
  UserRole,
  Visibility,
} from "./types";

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

export function listModes() {
  return modes;
}

export function getSeedCredentials() {
  return {
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
  };
}

export function createUserRecord(input: {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
}) {
  const db = getDb();
  const id = `user_${randomUUID()}`;
  const timestamp = nowIso();

  db.prepare(`
    INSERT INTO users (
      id, username, email, password_hash, password_changed_at, email_verified_at, avatar_url, bio, reputation_score, role, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.username,
    normalizeIdentifier(input.email),
    input.passwordHash,
    timestamp,
    input.emailVerifiedAt ?? null,
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
}) {
  const db = getDb();
  db.prepare(
    "UPDATE users SET username = ?, email = ?, bio = ?, updated_at = ? WHERE id = ?",
  ).run(input.username, normalizeIdentifier(input.email), input.bio, nowIso(), input.userId);

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

  return rows.map(mapFeedPost);
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

  return {
    ...post,
    status: String(row.status) as PostDetail["status"],
    responsePrompt: mode.prompt,
    responseGuidance: mode.guidance,
    comments: commentRows.map(mapComment),
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
    createNotification({
      userId: String(postRow.user_id),
      type: "new_comment",
      title: "You received a new response",
      body: `Someone replied to your ${getMode(String(postRow.response_mode) as ModeId).name} post.`,
      link: `/app/posts/${input.postId}`,
    });
  }

  return { commentId, alignment, status };
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
      FROM rooms
      JOIN users AS creators ON creators.id = rooms.created_by
      ORDER BY rooms.created_at DESC
    `)
    .all(currentUserId) as Record<string, unknown>[];

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
    INSERT INTO rooms (id, name, description, rules, default_modes, visibility, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roomId,
    input.name,
    input.description,
    input.rules,
    JSON.stringify(input.defaultModes),
    input.visibility,
    input.createdBy,
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
}) {
  const db = getDb();
  const reportId = `report_${randomUUID()}`;
  db.prepare(`
    INSERT INTO reports (id, target_type, target_id, reporter_id, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).run(reportId, input.targetType, input.targetId, input.reporterId, input.reason, nowIso());

  if (input.targetType === "comment") {
    db.prepare("UPDATE comments SET status = 'flagged', updated_at = ? WHERE id = ?").run(
      nowIso(),
      input.targetId,
    );
  }

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
    reporter: {
      id: String(row.reporter_id),
      username: String(row.username),
    },
    createdAt: normalizeDate(String(row.created_at)),
  })) satisfies ReportView[];
}

export function updateReportStatus(reportId: string, status: ReportStatus) {
  const db = getDb();
  db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, reportId);
}

export function listNotifications(userId: string) {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT *
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `)
    .all(userId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    link: String(row.link),
    isRead: Boolean(row.is_read),
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
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    `notification_${randomUUID()}`,
    input.userId,
    input.type,
    input.title,
    input.body,
    input.link,
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

  return {
    user,
    stats: {
      postCount: userPosts.length,
      roomCount: countJoinedRooms(currentUserId),
      unreadNotificationCount: countUnreadNotifications(currentUserId),
      replyCount: replies.length,
    },
    recentPosts,
    rooms,
    notifications,
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
  } satisfies ProfileView;
}

export function getSecurityView(input: {
  userId: string;
  currentSessionId: string | null;
}) {
  return {
    sessions: listUserSessions(input.userId, input.currentSessionId),
    currentSessionId: input.currentSessionId,
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
