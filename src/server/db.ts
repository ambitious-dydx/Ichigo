import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEMO_ACCOUNT, seedDatabase } from "./seed";
import { createAvatarFallback } from "./security";

const DATA_DIRECTORY = join(process.cwd(), "data");

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
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_room_id ON posts(room_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id ON auth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id, expires_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
  `);
}

function runMigrations(db: DatabaseSync) {
  ensureColumn(db, "users", "password_changed_at", "TEXT");
  ensureColumn(db, "users", "email_verified_at", "TEXT");
  ensureColumn(db, "sessions", "user_agent", "TEXT");
  ensureColumn(db, "sessions", "last_seen_at", "TEXT");
  ensureColumn(db, "sessions", "revoked_at", "TEXT");

  db.exec(`
    UPDATE users
    SET password_changed_at = COALESCE(password_changed_at, created_at)
    WHERE password_changed_at IS NULL;

    UPDATE sessions
    SET last_seen_at = COALESCE(last_seen_at, created_at)
    WHERE last_seen_at IS NULL;
  `);

  db.prepare(`
    UPDATE users
    SET username = ?, email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    DEMO_ACCOUNT.username,
    DEMO_ACCOUNT.email,
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
  runMigrations(database);
  seedIfNeeded(database);

  return database;
}

export function resetDbForTests() {
  if (database) {
    database.close();
    database = null;
  }
}
