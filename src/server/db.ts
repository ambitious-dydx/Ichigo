import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEMO_ACCOUNT, seedDatabase } from "./seed";
import { createAvatarFallback, hashPassword, verifyPassword } from "./security";

const DATA_DIRECTORY = join(process.cwd(), "data");
const LEGACY_DEMO_PASSWORD = "ichigo-demo";

let database: DatabaseSync | null = null;

function resolveDatabasePath() {
  const configuredPath = process.env.ICHIGO_DB_PATH?.trim();

  if (configuredPath) {
    return isAbsolute(configuredPath) ? configuredPath : join(process.cwd(), configuredPath);
  }

  return join(DATA_DIRECTORY, "ichigo.sqlite");
}

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;

  if (!rows.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function initializeSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_changed_at TEXT,
      email_verified_at TEXT,
      onboarding_completed_at TEXT,
      onboarding_focus TEXT,
      onboarding_goal TEXT NOT NULL DEFAULT '',
      preferred_mode TEXT,
      avatar_url TEXT,
      bio TEXT NOT NULL DEFAULT '',
      reputation_score INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      provider_email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (provider, provider_account_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      last_seen_at TEXT,
      revoked_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      rules TEXT NOT NULL DEFAULT '',
      default_modes TEXT NOT NULL DEFAULT '[]',
      visibility TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS room_memberships (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL,
      UNIQUE (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      response_mode TEXT NOT NULL,
      visibility TEXT NOT NULL,
      room_id TEXT,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      mode_alignment_score INTEGER NOT NULL DEFAULT 0,
      alignment_classification TEXT NOT NULL DEFAULT 'acceptable',
      status TEXT NOT NULL DEFAULT 'visible',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      rated_by_user_id TEXT NOT NULL,
      rating_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (comment_id, rated_by_user_id, rating_type),
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      FOREIGN KEY (rated_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      moderator_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_relationships (
      id TEXT PRIMARY KEY,
      subject_user_id TEXT NOT NULL,
      object_user_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (subject_user_id, object_user_id, relationship_type),
      FOREIGN KEY (subject_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (object_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_name TEXT NOT NULL,
      route TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_events (
      id TEXT PRIMARY KEY,
      report_id TEXT,
      actor_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      scope_key TEXT NOT NULL,
      action TEXT NOT NULL,
      window_started_at TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE (scope_key, action)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_room_id ON posts(room_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id ON auth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id, expires_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_account_tokens_user_id ON account_tokens(user_id, type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_relationships_subject ON user_relationships(subject_user_id, relationship_type);
    CREATE INDEX IF NOT EXISTS idx_product_events_user_id ON product_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_events_name ON product_events(event_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_moderation_events_report_id ON moderation_events(report_id, created_at DESC);
  `);
}

function runMigrations(db: DatabaseSync) {
  ensureColumn(db, "users", "password_changed_at", "TEXT");
  ensureColumn(db, "users", "email_verified_at", "TEXT");
  ensureColumn(db, "users", "onboarding_completed_at", "TEXT");
  ensureColumn(db, "users", "onboarding_focus", "TEXT");
  ensureColumn(db, "users", "onboarding_goal", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "users", "preferred_mode", "TEXT");
  ensureColumn(db, "sessions", "user_agent", "TEXT");
  ensureColumn(db, "sessions", "last_seen_at", "TEXT");
  ensureColumn(db, "sessions", "revoked_at", "TEXT");
  ensureColumn(db, "rooms", "updated_at", "TEXT");
  ensureColumn(db, "reports", "moderator_note", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "notifications", "priority", "TEXT NOT NULL DEFAULT 'default'");

  db.exec(`
    UPDATE users
    SET password_changed_at = COALESCE(password_changed_at, created_at)
    WHERE password_changed_at IS NULL;

    UPDATE sessions
    SET last_seen_at = COALESCE(last_seen_at, created_at)
    WHERE last_seen_at IS NULL;

    UPDATE rooms
    SET updated_at = COALESCE(updated_at, created_at)
    WHERE updated_at IS NULL;
  `);

  const demoUser = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(DEMO_ACCOUNT.id) as
    | { password_hash: string }
    | undefined;
  const shouldUpgradeLegacyDemoPassword =
    demoUser?.password_hash ? verifyPassword(LEGACY_DEMO_PASSWORD, demoUser.password_hash) : false;

  db.prepare(`
    UPDATE users
    SET
      username = ?,
      email = ?,
      password_hash = CASE
        WHEN ? = 1 THEN ?
        ELSE password_hash
      END,
      avatar_url = ?,
      onboarding_focus = COALESCE(onboarding_focus, 'founder'),
      onboarding_goal = CASE
        WHEN COALESCE(onboarding_goal, '') = '' THEN 'I need stronger feedback on product and launch decisions.'
        ELSE onboarding_goal
      END,
      preferred_mode = COALESCE(preferred_mode, 'advise'),
      onboarding_completed_at = COALESCE(onboarding_completed_at, created_at),
      email_verified_at = COALESCE(email_verified_at, created_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    DEMO_ACCOUNT.username,
    DEMO_ACCOUNT.email,
    shouldUpgradeLegacyDemoPassword ? 1 : 0,
    hashPassword(DEMO_ACCOUNT.password),
    createAvatarFallback(DEMO_ACCOUNT.username),
    DEMO_ACCOUNT.id,
  );

  db.prepare(`
    UPDATE notifications
    SET body = ?
    WHERE id = 'notification_seed_2'
  `).run(`${DEMO_ACCOUNT.username} commented on your Comfort Me post.`);
}

function seedIfNeeded(db: DatabaseSync) {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };

  if (countRow.count === 0) {
    seedDatabase(db);
  }
}

export function getDb() {
  if (database) {
    return database;
  }

  const databasePath = resolveDatabasePath();
  const directory = dirname(databasePath);

  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }

  database = new DatabaseSync(databasePath);
  initializeSchema(database);
  seedIfNeeded(database);
  runMigrations(database);

  return database;
}

export function resetDbForTests() {
  if (database) {
    database.close();
    database = null;
  }
}
