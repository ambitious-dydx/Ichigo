import type { DatabaseSync } from "node:sqlite";
import { modes } from "../modes";
import { createAvatarFallback, hashPassword } from "./security";

function nowMinus(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function seedDatabase(db: DatabaseSync) {
  const demoPasswordHash = hashPassword("ichigo-demo");

  const users = [
    {
      id: "user_daniel",
      username: "Daniel",
      email: "daniel@ichigo.local",
      bio: "Founder building emotionally intentional social products.",
      role: "admin",
      reputation: 48,
    },
    {
      id: "user_mia",
      username: "Mia",
      email: "mia@ichigo.local",
      bio: "Community builder who values softness without vagueness.",
      role: "user",
      reputation: 36,
    },
    {
      id: "user_theo",
      username: "Theo",
      email: "theo@ichigo.local",
      bio: "Builder who prefers direct accountability.",
      role: "moderator",
      reputation: 42,
    },
    {
      id: "user_ada",
      username: "Ada",
      email: "ada@ichigo.local",
      bio: "Product thinker who likes practical next steps.",
      role: "user",
      reputation: 31,
    },
  ] as const;

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, username, email, password_hash, avatar_url, bio, reputation_score, role, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of users) {
    insertUser.run(
      user.id,
      user.username,
      user.email,
      demoPasswordHash,
      createAvatarFallback(user.username),
      user.bio,
      user.reputation,
      user.role,
      nowMinus(720),
      nowMinus(30),
    );
  }

  const rooms = [
    {
      id: "room_founders",
      name: "Founders Circle",
      description: "A private room for founders sharing product doubts, launches, and hard truths.",
      rules: "Use challenge, advise, and soft truth with care. No dunking.",
      visibility: "group",
      defaultModes: ["advise", "soft-truth", "challenge"],
      createdBy: "user_daniel",
    },
    {
      id: "room_creators",
      name: "Creator Lab",
      description: "A room for creators who need emotionally appropriate feedback on public work.",
      rules: "Respect the selected mode before offering critique.",
      visibility: "group",
      defaultModes: ["hype", "advise", "comfort"],
      createdBy: "user_mia",
    },
    {
      id: "room_public",
      name: "Open Commons",
      description: "Public mode-shaped feedback across builders, students, and creators.",
      rules: "Response modes are visible social rules. Follow them.",
      visibility: "public",
      defaultModes: modes.map((mode) => mode.id),
      createdBy: "user_theo",
    },
  ] as const;

  const insertRoom = db.prepare(`
    INSERT INTO rooms (
      id, name, description, rules, default_modes, visibility, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const room of rooms) {
    insertRoom.run(
      room.id,
      room.name,
      room.description,
      room.rules,
      JSON.stringify(room.defaultModes),
      room.visibility,
      room.createdBy,
      nowMinus(680),
    );
  }

  const insertMembership = db.prepare(`
    INSERT INTO room_memberships (id, room_id, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  [
    ["membership_daniel_founders", "room_founders", "user_daniel", "owner"],
    ["membership_theo_founders", "room_founders", "user_theo", "moderator"],
    ["membership_ada_founders", "room_founders", "user_ada", "member"],
    ["membership_mia_creators", "room_creators", "user_mia", "owner"],
    ["membership_daniel_creators", "room_creators", "user_daniel", "member"],
    ["membership_ada_public", "room_public", "user_ada", "member"],
    ["membership_theo_public", "room_public", "user_theo", "member"],
    ["membership_mia_public", "room_public", "user_mia", "member"],
  ].forEach(([id, roomId, userId, role]) => {
    insertMembership.run(id, roomId, userId, role, nowMinus(650));
  });

  const posts = [
    {
      id: "post_seed_1",
      userId: "user_daniel",
      content:
        "I think the product idea is strong, but I may still be working like a document writer instead of a founder who ships.",
      responseMode: "soft-truth",
      visibility: "public",
      roomId: "room_public",
      isAnonymous: 0,
      status: "active",
      tags: ["founder", "product", "shipping"],
      createdAt: nowMinus(140),
    },
    {
      id: "post_seed_2",
      userId: "user_mia",
      content:
        "Today felt heavier than it should have. I am not asking for solutions first, just a gentler room.",
      responseMode: "comfort",
      visibility: "group",
      roomId: "room_creators",
      isAnonymous: 0,
      status: "active",
      tags: ["mental-health", "community"],
      createdAt: nowMinus(90),
    },
    {
      id: "post_seed_3",
      userId: "user_theo",
      content:
        "I have delayed launching my portfolio for three months. Give me pressure, not sympathy.",
      responseMode: "challenge",
      visibility: "group",
      roomId: "room_founders",
      isAnonymous: 0,
      status: "active",
      tags: ["accountability", "launch"],
      createdAt: nowMinus(55),
    },
    {
      id: "post_seed_4",
      userId: "user_ada",
      content:
        "I have three directions for my side project and not enough time for all of them. Help me narrow the decision.",
      responseMode: "advise",
      visibility: "public",
      roomId: "room_public",
      isAnonymous: 0,
      status: "active",
      tags: ["strategy", "decision"],
      createdAt: nowMinus(25),
    },
  ] as const;

  const insertPost = db.prepare(`
    INSERT INTO posts (
      id, user_id, content, response_mode, visibility, room_id, is_anonymous, status, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const post of posts) {
    insertPost.run(
      post.id,
      post.userId,
      post.content,
      post.responseMode,
      post.visibility,
      post.roomId,
      post.isAnonymous,
      post.status,
      JSON.stringify(post.tags),
      post.createdAt,
      post.createdAt,
    );
  }

  const comments = [
    {
      id: "comment_seed_1",
      postId: "post_seed_1",
      userId: "user_ada",
      content:
        "I think the hard truth is that your instinct is right. Documentation is helping you think, but it may also be delaying contact with real users.",
      score: 91,
      classification: "match",
      createdAt: nowMinus(120),
    },
    {
      id: "comment_seed_2",
      postId: "post_seed_2",
      userId: "user_daniel",
      content:
        "That sounds heavy. You do not need to turn it into a lesson tonight for it to deserve care.",
      score: 88,
      classification: "match",
      createdAt: nowMinus(78),
    },
    {
      id: "comment_seed_3",
      postId: "post_seed_3",
      userId: "user_mia",
      content:
        "Set a launch date in public and remove one polish task. You need a constraint, not another week.",
      score: 86,
      classification: "match",
      createdAt: nowMinus(44),
    },
    {
      id: "comment_seed_4",
      postId: "post_seed_4",
      userId: "user_theo",
      content:
        "Choose the option that teaches you fastest in seven days, not the one that sounds most impressive.",
      score: 84,
      classification: "acceptable",
      createdAt: nowMinus(18),
    },
  ] as const;

  const insertComment = db.prepare(`
    INSERT INTO comments (
      id, post_id, user_id, content, mode_alignment_score, alignment_classification, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const comment of comments) {
    insertComment.run(
      comment.id,
      comment.postId,
      comment.userId,
      comment.content,
      comment.score,
      comment.classification,
      "visible",
      comment.createdAt,
      comment.createdAt,
    );
  }

  const insertRating = db.prepare(`
    INSERT INTO ratings (id, comment_id, rated_by_user_id, rating_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  [
    ["rating_seed_1", "comment_seed_1", "user_daniel", "matched_mode", nowMinus(119)],
    ["rating_seed_2", "comment_seed_1", "user_mia", "helpful", nowMinus(118)],
    ["rating_seed_3", "comment_seed_2", "user_mia", "matched_mode", nowMinus(77)],
    ["rating_seed_4", "comment_seed_3", "user_theo", "matched_mode", nowMinus(43)],
    ["rating_seed_5", "comment_seed_4", "user_ada", "helpful", nowMinus(17)],
  ].forEach(([id, commentId, ratedByUserId, ratingType, createdAt]) => {
    insertRating.run(id, commentId, ratedByUserId, ratingType, createdAt);
  });

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    [
      "notification_seed_1",
      "user_daniel",
      "response_helped",
      "Someone matched your mode",
      "Ada responded to your Soft Truth post with a mode-aligned reply.",
      "/app/posts/post_seed_1",
      0,
      nowMinus(115),
    ],
    [
      "notification_seed_2",
      "user_mia",
      "new_comment",
      "You received a new response",
      "Daniel commented on your Comfort Me post.",
      "/app/posts/post_seed_2",
      0,
      nowMinus(76),
    ],
  ].forEach(([id, userId, type, title, body, link, isRead, createdAt]) => {
    insertNotification.run(id, userId, type, title, body, link, isRead, createdAt);
  });

  const insertReport = db.prepare(`
    INSERT INTO reports (id, target_type, target_id, reporter_id, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertReport.run(
    "report_seed_1",
    "comment",
    "comment_seed_4",
    "user_daniel",
    "Slightly generic for the advice request. Not harmful, but worth review.",
    "reviewing",
    nowMinus(10),
  );
}
