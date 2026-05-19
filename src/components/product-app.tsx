import Link from "next/link";
import { ComposeKickstart } from "./compose-kickstart";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_POLICY_FULL_HINT,
} from "../password-policy";
import { DismissibleStatusBanner } from "./dismissible-status-banner";
import { modes } from "../modes";
import type {
  BlockedUserView,
  AppHomeView,
  CommentView,
  FeedPost,
  FlaggedCommentView,
  ModerationOverviewView,
  NotificationView,
  PostDetail,
  ProfileView,
  RatingType,
  ReportView,
  ReplyQualityGuardView,
  RoomView,
  SecurityView,
  SessionUser,
} from "../server/types";
import {
  changePasswordAction,
  clearRelationshipAction,
  createCommentAction,
  createPostAction,
  createRoomAction,
  deletePostAction,
  joinRoomAction,
  leaveRoomAction,
  markNotificationsReadAction,
  rateCommentAction,
  reportAction,
  requestEmailVerificationAction,
  revokeSessionAction,
  setRelationshipAction,
  signOutOtherSessionsAction,
  updateCommentModerationStatusAction,
  updateAccountAction,
  updateProfileAction,
  updateReportStatusAction,
} from "../server/actions";
import { AppNavigation } from "./app-nav";
import { PasswordField } from "./password-field";
import { ReplyAssistantForm } from "./reply-assistant-form";
import { SubmitButton } from "./submit-button";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function describeVisibility(value: FeedPost["visibility"] | RoomView["visibility"]) {
  switch (value) {
    case "group":
      return "Room only";
    case "followers":
      return "Followers";
    case "anonymous":
      return "Anonymous";
    default:
      return "Public";
  }
}

const ratingLabels: Record<RatingType, string> = {
  helpful: "Helpful",
  matched_mode: "Met the ask",
  did_not_match_mode: "Missed the tone",
  harmful: "Harmful",
};

function describeAlignment(value: CommentView["alignmentClassification"]) {
  switch (value) {
    case "match":
      return "Strong fit";
    case "acceptable":
      return "Good fit";
    case "borderline":
      return "A bit off";
    case "violation":
      return "Out of bounds";
    default:
      return value;
  }
}

function describeReportStatus(value: ReportView["status"]) {
  switch (value) {
    case "open":
      return "New";
    case "reviewing":
      return "In review";
    case "resolved":
      return "Resolved";
    case "dismissed":
      return "Dismissed";
    default:
      return value;
  }
}

function describeReportTarget(value: ReportView["targetType"]) {
  return value === "comment" ? "Reply" : "Post";
}

function describeFocus(value: SessionUser["onboardingFocus"]) {
  switch (value) {
    case "creator":
      return "Creator work";
    case "reflection":
      return "Personal reflection";
    case "support":
      return "Support seeking";
    case "founder":
      return "Founder feedback";
    default:
      return "Not set";
  }
}

function formatModeLabel(modeId: string | null) {
  if (!modeId) {
    return "Not set";
  }

  return modes.find((mode) => mode.id === modeId)?.name ?? modeId;
}

function formatMinutesLabel(value: number | null) {
  if (value === null) {
    return "No replies yet";
  }

  return `${value} min`;
}

function describeReplyGuardState(guard: ReplyQualityGuardView) {
  if (guard.isOnCooldown) {
    return "Paused";
  }

  if (guard.violationCount > 0) {
    return "Needs repair";
  }

  if (guard.lowAlignmentCount > 0) {
    return "Watch it";
  }

  return "Healthy";
}

function describeReplyGuardSummary(guard: ReplyQualityGuardView) {
  if (guard.isOnCooldown) {
    return "Ichigo has paused replying because too many recent replies broke the ask.";
  }

  if (guard.lowAlignmentCount === 0) {
    return "Your recent replies are staying close to the contract people asked for.";
  }

  return "A few recent replies drifted. Slow down and reread the ask before sending the next one.";
}

type PageNotice = {
  tone: "success" | "error";
  text: string;
} | null;

type SettingsSectionId = "overview" | "account" | "security";

function formatSessionAgent(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  return userAgent.length > 88 ? `${userAgent.slice(0, 88)}...` : userAgent;
}

function StatusBanner({ notice }: { notice: PageNotice }) {
  if (!notice) {
    return null;
  }

  return (
    <DismissibleStatusBanner clearKeys={["success", "error", "preview"]} text={notice.text} tone={notice.tone} />
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-intro-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}

function SettingsSubnav({ active }: { active: SettingsSectionId }) {
  const items: Array<{
    id: SettingsSectionId;
    href: string;
    label: string;
    description: string;
  }> = [
    {
      id: "overview",
      href: "/app/settings",
      label: "Overview",
      description: "At a glance",
    },
    {
      id: "account",
      href: "/app/settings/account",
      label: "Account",
      description: "Identity",
    },
    {
      id: "security",
      href: "/app/settings/security",
      label: "Security",
      description: "Sessions",
    },
  ];

  return (
    <nav aria-label="Settings sections" className="settings-subnav">
      {items.map((item) => (
        <Link
          key={item.id}
          className={`settings-subnav-link${active === item.id ? " active" : ""}`}
          href={item.href}
        >
          <span>{item.label}</span>
          <strong>{item.description}</strong>
        </Link>
      ))}
    </nav>
  );
}

function EmptyPanel({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="panel empty-panel">
      <p className="sidebar-label">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function WorkspaceLinkCard({
  href,
  title,
  meta,
  description,
}: {
  href: string;
  title: string;
  meta: string;
  description: string;
}) {
  return (
    <Link className="home-link-card card-shell" href={href}>
      <div className="home-link-topline">
        <strong>{title}</strong>
        <span className="home-link-meta">{meta}</span>
      </div>
      <div className="card-body">
        <p>{description}</p>
      </div>
    </Link>
  );
}

function MiniRoomLinkCard({ room }: { room: RoomView }) {
  return (
    <Link className="mini-room-card" href={`/app/rooms/${room.id}`}>
      <div className="mini-room-card-head">
        <strong>{room.name}</strong>
        <span className="card-footer-note">Room</span>
      </div>
      <span>
        {room.memberCount} members · {room.postCount} posts
      </span>
    </Link>
  );
}

function NotificationLinkCard({
  notification,
  detailed = false,
}: {
  notification: NotificationView;
  detailed?: boolean;
}) {
  return (
    <Link
      className={`notification-card card-shell${detailed ? " panel" : ""}`}
      href={notification.link}
    >
      {detailed ? (
        <div className="panel-title-row">
          <strong>{notification.title}</strong>
          <span>{formatTime(notification.createdAt)}</span>
        </div>
      ) : (
        <div className="mini-room-card-head">
          <strong>{notification.title}</strong>
          <span className="card-footer-note">{formatTime(notification.createdAt)}</span>
        </div>
      )}
      <div className="card-body">
        <p>{notification.body}</p>
      </div>
      {detailed ? (
        <div className="card-footer">
          <span className="card-footer-note">{notification.isRead ? "Seen" : "Unread"}</span>
          {notification.priority === "high" ? <span className="tag-pill">Priority</span> : null}
        </div>
      ) : null}
    </Link>
  );
}

export function ProductShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: SessionUser;
}) {
  const hasVerifiedEmail = Boolean(currentUser.emailVerifiedAt);
  const hasCompletedOnboarding = Boolean(currentUser.onboardingCompletedAt);
  const hasUnlockedApp = hasVerifiedEmail && hasCompletedOnboarding;
  const settingsHref = hasUnlockedApp ? "/app/settings" : "/app/settings/account";

  return (
    <div className="product-shell">
      <header className="app-topbar">
        <AppNavigation currentUser={currentUser} />
      </header>

      <div className="app-main">{children}</div>

      <footer className="app-shell-footer">
        <p className="app-shell-footer-legal">© 2026 Ichigo. Context first.</p>

        <div className="app-shell-footer-links">
          {hasUnlockedApp ? (
            <>
              <Link className="inline-link" href="/app/feed">
                Feed
              </Link>
              <Link className="inline-link" href="/app/compose">
                Write
              </Link>
              <Link className="inline-link" href="/app/rooms">
                Rooms
              </Link>
            </>
          ) : hasVerifiedEmail ? (
            <Link className="inline-link" href="/app/onboarding">
              Continue setup
            </Link>
          ) : (
            <Link className="inline-link" href="/app/verify">
              Verify email
            </Link>
          )}
          <Link className="inline-link" href={settingsHref}>
            Settings
          </Link>
        </div>

        <div className="app-shell-footer-status">
          <strong>{currentUser.username}</strong>
          <span>{currentUser.role}</span>
        </div>
      </footer>
    </div>
  );
}

export function HomePage({ home, notice }: { home: AppHomeView; notice: PageNotice }) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          actions={
            <Link className="button button-primary" href="/app/compose">
              Start a post
            </Link>
          }
          eyebrow="Workspace"
          description={home.wedge.summary}
          title="Home"
        />

        <StatusBanner notice={notice} />

        <section className="stats-grid">
          <article className="panel stat-card card-shell">
            <p className="sidebar-label">Posts</p>
            <strong>{home.stats.postCount}</strong>
            <span>published from your account</span>
          </article>
          <article className="panel stat-card card-shell">
            <p className="sidebar-label">Rooms</p>
            <strong>{home.stats.roomCount}</strong>
            <span>spaces you belong to</span>
          </article>
          <article className="panel stat-card card-shell">
            <p className="sidebar-label">Unread</p>
            <strong>{home.stats.unreadNotificationCount}</strong>
            <span>updates waiting for you</span>
          </article>
          <article className="panel stat-card card-shell">
            <p className="sidebar-label">Replies</p>
            <strong>{home.stats.replyCount}</strong>
            <span>responses you have written</span>
          </article>
        </section>

        <section className="settings-overview-grid">
          <article className="panel settings-overview-card card-shell">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Your wedge</p>
                <h3>{home.wedge.title}</h3>
              </div>
              <span className="tag-pill">{describeFocus(home.user.onboardingFocus)}</span>
            </div>
            <div className="card-body">
              <p>{home.user.onboardingGoal || home.wedge.summary}</p>
              <div className="settings-stat-list">
                <div className="settings-stat-row">
                  <span>Preferred mode</span>
                  <strong>{formatModeLabel(home.user.preferredMode)}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Matched replies</span>
                  <strong>{home.insights.matchedReplyRate}%</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Modes used</span>
                  <strong>{home.insights.activeModeCount}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="panel settings-overview-card card-shell">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Core loop</p>
                <h3>What happens next</h3>
              </div>
              <span className="tag-pill">
                {home.insights.firstPostComplete && home.insights.firstReplyComplete
                  ? "In motion"
                  : "Still warming up"}
              </span>
            </div>
            <div className="card-body">
              <p>Ichigo becomes useful when you ask clearly, get replies back, and learn which tones produce signal instead of noise.</p>
              <div className="settings-stat-list">
                <div className="settings-stat-row">
                  <span>First post</span>
                  <strong>{home.insights.firstPostComplete ? "Done" : "Still waiting"}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>First reply written</span>
                  <strong>{home.insights.firstReplyComplete ? "Done" : "Still waiting"}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Unread right now</span>
                  <strong>{home.stats.unreadNotificationCount}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="panel settings-overview-card card-shell">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Reply health</p>
                <h3>How your replies are landing</h3>
              </div>
              <span className="tag-pill">{describeReplyGuardState(home.replyQualityGuard)}</span>
            </div>
            <div className="card-body">
              <p>{describeReplyGuardSummary(home.replyQualityGuard)}</p>
              <div className="settings-stat-list">
                <div className="settings-stat-row">
                  <span>Recent replies checked</span>
                  <strong>{home.replyQualityGuard.totalRecentReplies}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Aligned</span>
                  <strong>{home.replyQualityGuard.alignedCount}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Needs adjustment</span>
                  <strong>{home.replyQualityGuard.lowAlignmentCount}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Violations</span>
                  <strong>{home.replyQualityGuard.violationCount}</strong>
                </div>
              </div>
            </div>
            <div className="card-footer">
              <span className="card-footer-note">
                {home.replyQualityGuard.isOnCooldown && home.replyQualityGuard.cooldownEndsAt
                  ? `Paused until ${formatTime(home.replyQualityGuard.cooldownEndsAt)}`
                  : "Keep matching the ask before adding speed."}
              </span>
            </div>
          </article>

          {home.productHealth ? (
            <article className="panel settings-overview-card card-shell">
              <div className="panel-title-row">
                <div>
                  <p className="sidebar-label">Product health</p>
                  <h3>What the MVP is actually doing</h3>
                </div>
                <span className="tag-pill">Admin</span>
              </div>
              <div className="card-body">
                <p>
                  This is the operator read on whether Ichigo is producing replies, return loops,
                  and repeat posting instead of just page views.
                </p>
                <div className="settings-stat-list">
                  <div className="settings-stat-row">
                    <span>Onboarded users</span>
                    <strong>
                      {home.productHealth.onboardedUsers}/{home.productHealth.totalUsers}
                    </strong>
                  </div>
                  <div className="settings-stat-row">
                    <span>Posts with replies</span>
                    <strong>{home.productHealth.postsWithReplies}</strong>
                  </div>
                  <div className="settings-stat-row">
                    <span>Aligned reply rate</span>
                    <strong>{home.productHealth.alignedReplyRate}%</strong>
                  </div>
                  <div className="settings-stat-row">
                    <span>First reply speed</span>
                    <strong>{formatMinutesLabel(home.productHealth.averageFirstReplyMinutes)}</strong>
                  </div>
                  <div className="settings-stat-row">
                    <span>Repeat poster rate</span>
                    <strong>{home.productHealth.repeatPosterRate}%</strong>
                  </div>
                </div>
                <div className="tag-row compact-tag-row">
                  {home.productHealth.modeUsage.slice(0, 5).map((entry) => (
                    <span key={entry.modeId} className="tag-pill">
                      {formatModeLabel(entry.modeId)} · {entry.count}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ) : null}
        </section>

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Go next</p>
              <h3>Move through Ichigo</h3>
            </div>
          </div>
          <div className="home-link-grid">
            <WorkspaceLinkCard
              description="See the conversations already in motion."
              href="/app/feed"
              meta={`${home.recentPosts.length} current`}
              title="Feed"
            />

            <WorkspaceLinkCard
              description="Start with the post, then set the tone."
              href="/app/compose"
              meta="new post"
              title="Write"
            />

            <WorkspaceLinkCard
              description="Go where shared context already exists."
              href="/app/rooms"
              meta={`${home.stats.roomCount} joined`}
              title="Rooms"
            />

            <WorkspaceLinkCard
              description="Catch up on replies, ratings, and signals."
              href="/app/notifications"
              meta={`${home.stats.unreadNotificationCount} unread`}
              title="Activity"
            />

            <WorkspaceLinkCard
              description="See how your voice is reading across the app."
              href="/app/profile"
              meta={`${home.stats.replyCount} replies`}
              title="Profile"
            />

            <WorkspaceLinkCard
              description="Update your account and protect access."
              href="/app/settings"
              meta="account"
              title="Settings"
            />

            {home.user.role !== "user" ? (
              <WorkspaceLinkCard
                description="Reports and review."
                href="/app/moderation"
                meta="moderation"
                title="Safety"
              />
            ) : null}
          </div>
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Today</p>
          <h3>Stay close to the conversations where context matters most.</h3>
          <p>
            The fastest way to make Ichigo feel different is to post something real,
            then judge the replies by whether they fit the ask you actually made.
          </p>
        </section>

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Your rooms</p>
              <h3>Where the conversation already has context</h3>
            </div>
            <Link className="inline-link" href="/app/rooms">
              See all
            </Link>
          </div>
          <div className="mini-room-list">
            {home.rooms.map((room) => (
              <MiniRoomLinkCard key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Recent activity</p>
              <h3>What needs you now</h3>
            </div>
            <Link className="inline-link" href="/app/notifications">
              View all
            </Link>
          </div>
          <div className="notification-list">
            {home.notifications.map((notification) => (
              <NotificationLinkCard key={notification.id} notification={notification} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function SettingsPage({
  currentUser,
  security,
}: {
  currentUser: SessionUser;
  security: SecurityView;
}) {
  const otherSessions = security.sessions.filter((session) => !session.isCurrent).length;

  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          eyebrow="Settings"
          description="Manage how your account is identified, how your sessions behave, and where you want to make trust explicit."
          title="Overview"
        />

        <SettingsSubnav active="overview" />

        <section className="settings-overview-grid">
          <article className="panel settings-overview-card card-shell">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Account</p>
                <h3>Identity and contact</h3>
              </div>
              <span className="tag-pill">
                {currentUser.emailVerifiedAt ? "Verified" : "Needs verification"}
              </span>
            </div>
            <div className="card-body">
              <p>
                Keep your public identity and your account details aligned. This is the layer
                people read before they decide how to trust your voice.
              </p>
              <div className="settings-stat-list">
                <div className="settings-stat-row">
                  <span>Username</span>
                  <strong>@{currentUser.username}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Email</span>
                  <strong>{currentUser.email}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Starting wedge</span>
                  <strong>{describeFocus(currentUser.onboardingFocus)}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Preferred mode</span>
                  <strong>{formatModeLabel(currentUser.preferredMode)}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Bio</span>
                  <strong>{currentUser.bio ? "Present" : "Still empty"}</strong>
                </div>
              </div>
            </div>
            <div className="settings-overview-actions card-footer">
              <Link className="button button-primary" href="/app/settings/account">
                Manage account
              </Link>
              <Link className="button button-secondary" href="/app/profile">
                Open profile
              </Link>
            </div>
          </article>

          <article className="panel settings-overview-card card-shell">
              <div className="panel-title-row">
                <div>
                  <p className="sidebar-label">Security</p>
                  <h3>Sessions and password</h3>
                </div>
              <span className="tag-pill">{security.sessions.length} active</span>
            </div>
            <div className="card-body">
              <p>
                Review where you are signed in, close access you do not recognize, and
                keep the account under your control.
              </p>
              <div className="settings-stat-list">
                <div className="settings-stat-row">
                  <span>Current device</span>
                  <strong>{security.sessions.some((session) => session.isCurrent) ? "Tracked" : "Unknown"}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Other sessions</span>
                  <strong>{otherSessions}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Linked providers</span>
                  <strong>{security.linkedAccounts.length}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Pending tokens</span>
                  <strong>{security.availableTokens.length}</strong>
                </div>
              </div>
            </div>
            <div className="settings-overview-actions card-footer">
              <Link className="button button-primary" href="/app/settings/security">
                Open security
              </Link>
              <Link className="button button-secondary" href="/app/notifications">
                View activity
              </Link>
            </div>
          </article>
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Identity</p>
          <h3>Keep the identity behind your posts and replies clear.</h3>
          <p>
            Your name, bio, and access are part of how people decide whether to trust your voice.
          </p>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">At a glance</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Joined</span>
              <strong>{currentUser.createdAt.slice(0, 10)}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Role</span>
              <strong>{currentUser.role}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Focus</span>
              <strong>{describeFocus(currentUser.onboardingFocus)}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Reputation</span>
              <strong>{currentUser.reputationScore}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Trust state</p>
          <h3>{currentUser.emailVerifiedAt ? "Your email is already verified." : "Verify the account before you rely on it."}</h3>
          <p>
            {currentUser.emailVerifiedAt
              ? "That keeps recovery and account ownership simpler when you need it."
              : "A verified email makes recovery and ownership much easier when something goes wrong."}
          </p>
        </section>
      </aside>
    </div>
  );
}

export function AccountSettingsPage({
  blockedUsers,
  currentUser,
  notice,
  security,
  verificationPreviewUrl,
}: {
  blockedUsers: BlockedUserView[];
  currentUser: SessionUser;
  notice: PageNotice;
  security: SecurityView;
  verificationPreviewUrl: string | null;
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          eyebrow="Settings"
          description="Keep your name, contact, and personal context accurate. This is the identity layer behind every post and reply."
          title="Account"
        />

        <SettingsSubnav active="account" />

        <StatusBanner notice={notice} />

        <section className="settings-overview-grid">
          <article className="panel settings-overview-card card-shell">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Verification</p>
                <h3>{currentUser.emailVerifiedAt ? "Email confirmed" : "Confirm this email"}</h3>
              </div>
              <span className="tag-pill">
                {currentUser.emailVerifiedAt ? "Verified" : "Pending"}
              </span>
            </div>
            <div className="card-body">
              <p>
                {currentUser.emailVerifiedAt
                  ? "This account already has a verified email attached to it."
                  : verificationPreviewUrl
                    ? "SMTP is not active for this environment, so Ichigo is exposing a local verification link instead."
                    : "Ichigo will send a verification email to this address."}
              </p>
              <div className="settings-stat-list">
                <div className="settings-stat-row">
                  <span>Current email</span>
                  <strong>{currentUser.email}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Linked providers</span>
                  <strong>{security.linkedAccounts.length}</strong>
                </div>
                <div className="settings-stat-row">
                  <span>Open verification items</span>
                  <strong>
                    {
                      security.availableTokens.filter((token) => token.type === "email_verification")
                        .length
                    }
                  </strong>
                </div>
              </div>
            </div>
            <div className="settings-overview-actions card-footer">
              {!currentUser.emailVerifiedAt ? (
                <form action={requestEmailVerificationAction}>
                  <SubmitButton className="button button-primary" pendingLabel="Generating...">
                    Generate verification link
                  </SubmitButton>
                </form>
              ) : null}

              {verificationPreviewUrl ? (
                <Link className="button button-secondary" href={verificationPreviewUrl}>
                  Open verification link
                </Link>
              ) : null}
            </div>
          </article>

          <article className="panel settings-overview-card card-shell">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Trust controls</p>
                <h3>Blocked and muted people</h3>
              </div>
              <span className="tag-pill">{blockedUsers.length}</span>
            </div>
            <div className="card-body">
              <p>
                Keep this list short. Use it when someone consistently breaks the tone, the room, or your boundaries.
              </p>
              {blockedUsers.length ? (
                <div className="session-list">
                  {blockedUsers.map((entry) => (
                    <article key={`${entry.type}-${entry.userId}`} className="session-card card-shell">
                      <div className="panel-title-row">
                        <div>
                          <strong>{entry.username}</strong>
                          <div className="settings-meta">
                            <span>{entry.type === "block" ? "Blocked" : "Muted"}</span>
                            <span>Since {formatTime(entry.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <form action={clearRelationshipAction} className="card-footer">
                        <input name="objectUserId" type="hidden" value={entry.userId} />
                        <input name="relationshipType" type="hidden" value={entry.type} />
                        <input name="returnTo" type="hidden" value="/app/settings/account" />
                        <SubmitButton className="button button-secondary subtle-button" pendingLabel="Updating...">
                          {entry.type === "block" ? "Unblock user" : "Unmute user"}
                        </SubmitButton>
                      </form>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="support-copy">No one is blocked or muted right now.</p>
              )}
            </div>
          </article>
        </section>

        <section className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Public identity</p>
              <h3>Update your account details</h3>
            </div>
          </div>

          <form action={updateAccountAction} className="inline-form-stack">
            <div>
              <label className="input-label" htmlFor="account-username">
                Username
              </label>
              <input
                className="text-input"
                defaultValue={currentUser.username}
                id="account-username"
                name="username"
                type="text"
                required
              />
            </div>

            <div>
              <label className="input-label" htmlFor="account-email">
                Email
              </label>
              <input
                className="text-input"
                defaultValue={currentUser.email}
                id="account-email"
                name="email"
                type="email"
                required
              />
            </div>

            <div>
              <label className="input-label" htmlFor="account-bio">
                Bio
              </label>
              <textarea
                className="composer-textarea compact-textarea"
                defaultValue={currentUser.bio}
                id="account-bio"
                name="bio"
                rows={4}
              />
            </div>

            <div className="form-actions">
              <SubmitButton className="button button-primary" pendingLabel="Saving...">
                Save account
              </SubmitButton>
              <Link className="button button-secondary" href="/app/settings">
                Back to settings
              </Link>
            </div>
          </form>
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">At a glance</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Username</span>
              <strong>@{currentUser.username}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Email</span>
              <strong>{currentUser.email}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Bio</span>
              <strong>{currentUser.bio ? "Added" : "Empty"}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Preferred mode</span>
              <strong>{formatModeLabel(currentUser.preferredMode)}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Keep it clear</p>
          <h3>Keep your username stable and your bio honest.</h3>
          <p>
            Ichigo works better when people can learn how you tend to respond before the
            conversation gets tense.
          </p>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Connected accounts</p>
          {security.linkedAccounts.length ? (
            <div className="settings-stat-list">
              {security.linkedAccounts.map((account) => (
                <div key={`${account.provider}-${account.linkedAt}`} className="settings-stat-row">
                  <span>{account.provider}</span>
                  <strong>{account.providerEmail ?? "Linked"}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p>No external sign-in methods are linked yet.</p>
          )}
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Need security?</p>
          <h3>Need to control devices or password instead?</h3>
          <p>That belongs in security, not here.</p>
          <Link className="inline-link" href="/app/settings/security">
            Go to security
          </Link>
        </section>
      </aside>
    </div>
  );
}

export function SecurityPage({
  security,
  notice,
}: {
  security: SecurityView;
  notice: PageNotice;
}) {
  const otherSessions = security.sessions.filter((session) => !session.isCurrent);

  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          eyebrow="Settings"
          description="Control your password, review active sessions, and close access you no longer trust."
          title="Security"
        />

        <SettingsSubnav active="security" />

        <StatusBanner notice={notice} />

        <section className="settings-grid settings-security-grid">
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Active sessions</p>
            <h3>{security.sessions.length}</h3>
            <p>All current signed-in devices or browsers.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Other devices</p>
            <h3>{otherSessions.length}</h3>
            <p>Sessions that are not this current browser.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Linked accounts</p>
            <h3>{security.linkedAccounts.length}</h3>
            <p>External providers tied to this account.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Open recovery items</p>
            <h3>{security.availableTokens.length}</h3>
            <p>Verification or reset tokens still active in this environment.</p>
          </article>
        </section>

        <section className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Password</p>
              <h3>Change your password</h3>
            </div>
          </div>

          <form action={changePasswordAction} className="inline-form-stack">
            <PasswordField
              className="text-input"
              name="currentPassword"
              placeholder="Current password"
              required
            />
            <PasswordField
              className="text-input"
              minLength={PASSWORD_MIN_LENGTH}
              name="nextPassword"
              pattern={PASSWORD_PATTERN}
              placeholder="New password"
              required
              title={PASSWORD_POLICY_FULL_HINT}
            />
            <PasswordField
              className="text-input"
              minLength={PASSWORD_MIN_LENGTH}
              name="confirmPassword"
              pattern={PASSWORD_PATTERN}
              placeholder="Confirm new password"
              required
              title={PASSWORD_POLICY_FULL_HINT}
            />
            <p className="support-copy">{PASSWORD_POLICY_FULL_HINT}</p>
            <SubmitButton className="button button-primary" pendingLabel="Updating...">
              Update password
            </SubmitButton>
          </form>
        </section>

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Sessions</p>
              <h3>Where you are signed in</h3>
            </div>
            {otherSessions.length ? (
              <form action={signOutOtherSessionsAction}>
                <SubmitButton className="button button-secondary" pendingLabel="Closing sessions...">
                  Sign out other sessions
                </SubmitButton>
              </form>
            ) : null}
          </div>

          <div className="session-list">
            {security.sessions.map((session) => (
              <article key={session.id} className="session-card card-shell">
                <div className="panel-title-row">
                  <div>
                    <strong>{formatSessionAgent(session.userAgent)}</strong>
                    <div className="settings-meta">
                      <span>{session.isCurrent ? "Current session" : "Active session"}</span>
                      <span>Seen {formatTime(session.lastSeenAt)}</span>
                    </div>
                  </div>
                  {session.isCurrent ? <span className="tag-pill">Current</span> : null}
                </div>

                <div className="card-body">
                  <div className="session-facts">
                    <span>Started {formatTime(session.createdAt)}</span>
                    <span>Expires {formatTime(session.expiresAt)}</span>
                  </div>
                </div>

                <form action={revokeSessionAction} className="card-footer">
                  <input name="sessionId" type="hidden" value={session.id} />
                  <SubmitButton className="button button-secondary subtle-button" pendingLabel="Closing...">
                    {session.isCurrent ? "Sign out here" : "Close session"}
                  </SubmitButton>
                </form>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Session hygiene</p>
          <h3>Check in here after a new device, a shared browser, or anything that feels off.</h3>
          <p>
            You should never have to guess where your account is still open.
          </p>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Quick actions</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Current browser</span>
              <strong>1</strong>
            </div>
            <div className="settings-stat-row">
              <span>Other sessions</span>
              <strong>{otherSessions.length}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Recommended</span>
              <strong>{otherSessions.length ? "Review them" : "No action"}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Linked sign-in</p>
          {security.linkedAccounts.length ? (
            <div className="settings-stat-list">
              {security.linkedAccounts.map((account) => (
                <div key={`${account.provider}-${account.linkedAt}`} className="settings-stat-row">
                  <span>{account.provider}</span>
                  <strong>{account.providerEmail ?? "Linked"}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p>No external sign-in methods are linked to this account yet.</p>
          )}
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Recovery state</p>
          {security.availableTokens.length ? (
            <div className="settings-stat-list">
              {security.availableTokens.map((token) => (
                <div key={`${token.type}-${token.expiresAt}`} className="settings-stat-row">
                  <span>{token.type === "email_verification" ? "Email verification" : "Password reset"}</span>
                  <strong>Expires {formatTime(token.expiresAt)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p>No open verification or recovery tokens right now.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

export function FeedPage({
  currentUser,
  notice,
  posts,
  rooms,
  notifications,
}: {
  currentUser: SessionUser;
  notice: PageNotice;
  posts: FeedPost[];
  rooms: RoomView[];
  notifications: NotificationView[];
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          actions={
            <Link className="button button-primary" href="/app/compose">
              Start a post
            </Link>
          }
          eyebrow="Workspace"
          description="Every post here makes the ask visible, so people do less guessing."
          title="Feed"
        />

        <StatusBanner notice={notice} />

        <div className="stack-list">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              relationshipReturnTo="/app/feed"
              showDelete={post.author.id === currentUser.id}
              viewerUserId={currentUser.id}
            />
          ))}
        </div>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Why it works</p>
          <h3>{currentUser.onboardingGoal || "The ask stays attached to the post."}</h3>
          <p>
            People do not have to guess what kind of response belongs here. The mode keeps the thread honest about what would actually help.
          </p>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Your rooms</p>
          <div className="mini-room-list">
            {rooms.slice(0, 4).map((room) => (
              <MiniRoomLinkCard key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Recent activity</p>
              <h3>What moved since you last checked</h3>
            </div>
            <Link className="inline-link" href="/app/notifications">
              View all
            </Link>
          </div>
          <div className="notification-list">
            {notifications.slice(0, 4).map((notification) => (
              <NotificationLinkCard key={notification.id} notification={notification} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function ComposePage({
  currentUser,
  rooms,
}: {
  currentUser: SessionUser;
  rooms: RoomView[];
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          eyebrow="Compose"
          description="Start with what you want to say. Then choose how you want people to respond."
          title="Write a post"
        />

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Your starting point</p>
              <h3>{currentUser.onboardingGoal || "Make the ask explicit before the thread begins."}</h3>
            </div>
            <span className="tag-pill">{formatModeLabel(currentUser.preferredMode)}</span>
          </div>
          <p>
            The strongest posts here do two things clearly: they say what is happening,
            and they say how people should meet it.
          </p>
        </section>

        <ComposeKickstart
          focus={currentUser.onboardingFocus}
          preferredMode={currentUser.preferredMode}
        />

        <form action={createPostAction} className="panel editor-panel form-grid">
          <div>
            <label className="input-label" htmlFor="content">
              What do you want to say?
            </label>
            <textarea
              id="content"
              className="composer-textarea"
              name="content"
              placeholder="What are you trying to decide, make, understand, or get through?"
              rows={8}
              required
            />
          </div>

          <div className="mode-choice-grid">
            {modes.map((mode) => (
              <label key={mode.id} className="mode-option radio-option" data-mode={mode.id}>
                <input
                  defaultChecked={mode.id === (currentUser.preferredMode ?? "soft-truth")}
                  name="responseMode"
                  type="radio"
                  value={mode.id}
                />
                <span className="legend-dot" style={{ background: mode.accent }} />
                <div>
                  <strong>{mode.name}</strong>
                  <p>{mode.guidance}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="form-row">
            <div>
              <label className="input-label" htmlFor="visibility">
                Visibility
              </label>
              <select className="text-input" defaultValue="public" id="visibility" name="visibility">
                <option value="public">Public</option>
                <option value="group">Room only</option>
                <option value="followers">Followers</option>
                <option value="anonymous">Anonymous</option>
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="roomId">
                Room
              </label>
              <select className="text-input" defaultValue="" id="roomId" name="roomId">
                <option value="">No room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label" htmlFor="tags">
              Tags
            </label>
            <input className="text-input" id="tags" name="tags" placeholder="founder, launch, relationships" type="text" />
          </div>

          <label className="checkbox-row">
            <input name="isAnonymous" type="checkbox" />
            <span>Post anonymously while keeping the mode and safety trail intact.</span>
          </label>

          <div className="form-actions">
            <SubmitButton className="button button-primary" pendingLabel="Publishing...">
              Post it
            </SubmitButton>
            <Link className="button button-secondary" href="/app/feed">
              Back to feed
            </Link>
          </div>
        </form>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Pick the mode that fits</p>
          <div className="mode-guidance-list">
            {modes.map((mode) => (
              <article key={mode.id} className="guidance-row">
                <span className="legend-dot" style={{ background: mode.accent }} />
                <div>
                  <strong>{mode.name}</strong>
                  <p>{mode.shortLabel}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function PostDetailPage({
  currentUser,
  isFresh = false,
  notice,
  post,
  replyError,
  replyGuard,
}: {
  currentUser: SessionUser;
  isFresh?: boolean;
  notice: PageNotice;
  post: PostDetail;
  replyError: "reply-quality-cooldown" | "rate-limited" | null;
  replyGuard: ReplyQualityGuardView;
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          eyebrow="Thread"
          description="The ask stays visible as the conversation unfolds."
          title="Conversation"
        />

        <StatusBanner notice={notice} />

        {isFresh && post.author.id === currentUser.id ? (
          <div className="status-banner">
            Your tone is set. Replies to this thread will be read against the contract you just chose.
          </div>
        ) : null}

        {replyError === "reply-quality-cooldown" || replyGuard.isOnCooldown ? (
          <div className="status-banner status-banner-error">
            Replying is paused for now.
            {replyGuard.cooldownEndsAt
              ? ` You can try again after ${formatTime(replyGuard.cooldownEndsAt)}.`
              : " Let the cooldown finish, then try again."}
          </div>
        ) : null}

        {replyError === "rate-limited" ? (
          <div className="status-banner status-banner-error">
            You are replying too quickly right now. Pause for a bit, then try again.
          </div>
        ) : null}

        <PostCard
          post={post}
          relationshipReturnTo={`/app/posts/${post.id}`}
          showDelete={post.author.id === currentUser.id}
          viewerUserId={currentUser.id}
        />

        <section className="panel editor-panel">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Write a reply</p>
              <h3>Reply with the contract in view</h3>
            </div>
            <span>{post.responseGuidance}</span>
          </div>
          <ReplyAssistantForm
            cooldownEndsAt={replyGuard.isOnCooldown ? replyGuard.cooldownEndsAt : null}
            postId={post.id}
            responseGuidance={post.responseGuidance}
            responsePrompt={post.responsePrompt}
          />
        </section>

        <div className="stack-list">
          {post.comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} currentUser={currentUser} postId={post.id} />
          ))}
        </div>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">This post is asking for</p>
          <h3>{post.responsePrompt}</h3>
          <p>{post.responseGuidance}</p>
        </section>

        {post.roomRules ? (
          <section className="panel support-card">
            <p className="sidebar-label">Room rules</p>
            <h3>Shared context around this thread</h3>
            <p>{post.roomRules}</p>
          </section>
        ) : null}

        <section className="panel support-card">
          <p className="sidebar-label">Reply quality</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Total replies</span>
              <strong>{post.alignmentSummary.total}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Good fits</span>
              <strong>{post.alignmentSummary.matches + post.alignmentSummary.acceptable}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Average score</span>
              <strong>{post.alignmentSummary.averageScore}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Violations</span>
              <strong>{post.alignmentSummary.violations}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Your current reply state</p>
          <h3>{describeReplyGuardState(replyGuard)}</h3>
          <p>{describeReplyGuardSummary(replyGuard)}</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Aligned recently</span>
              <strong>{replyGuard.alignedCount}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Needs adjustment</span>
              <strong>{replyGuard.lowAlignmentCount}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Cooldown</span>
              <strong>
                {replyGuard.isOnCooldown && replyGuard.cooldownEndsAt
                  ? formatTime(replyGuard.cooldownEndsAt)
                  : "Clear"}
              </strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

export function RoomsPage({ notice, rooms }: { notice: PageNotice; rooms: RoomView[] }) {
  const joinedRooms = rooms.filter((room) => room.isMember);
  const publicRooms = rooms.filter((room) => room.visibility === "public");

  return (
    <div className="workspace-grid rooms-page-shell">
      <section className="content-column rooms-content-column">
        <PageIntro
          actions={
            <a className="button button-primary" href="#create-room">
              Create a room
            </a>
          }
          eyebrow="Spaces"
          description="Rooms gather people around a shared kind of conversation. Each post still gets to choose its own mode."
          title="Rooms"
        />

        <StatusBanner notice={notice} />

        <section className="settings-grid room-summary-grid">
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Total rooms</p>
            <h3>{rooms.length}</h3>
            <p>All available spaces across the app.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Joined</p>
            <h3>{joinedRooms.length}</h3>
            <p>Rooms you currently belong to.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Public</p>
            <h3>{publicRooms.length}</h3>
            <p>Rooms anyone can step into.</p>
          </article>
        </section>

        {rooms.length ? (
          <div className="room-grid room-grid-rooms">
            {rooms.map((room) => (
              <article key={room.id} className="panel room-card room-card-shell card-shell">
                <div className="panel-title-row room-card-header">
                  <div className="room-card-heading">
                    <p className="sidebar-label">{describeVisibility(room.visibility)}</p>
                    <h3>{room.name}</h3>
                  </div>
                  <span className="tag-pill room-card-status">
                    {room.isMember ? "Joined" : "Open"}
                  </span>
                </div>
                <div className="card-body">
                  <p>{room.description}</p>
                  <div className="room-meta">
                    <span>{room.memberCount} members</span>
                    <span>{room.postCount} posts</span>
                    <span>By {room.createdBy.username}</span>
                  </div>
                  <div className="tag-row">
                    {room.defaultModes.map((modeId) => {
                      const mode = modes.find((entry) => entry.id === modeId)!;

                      return (
                        <span key={modeId} className="pill" style={{ background: mode.accent }}>
                          {mode.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="room-card-actions card-footer">
                  <Link className="button button-secondary" href={`/app/rooms/${room.id}`}>
                    Open room
                  </Link>
                  <form action={room.isMember ? leaveRoomAction : joinRoomAction}>
                    <input name="roomId" type="hidden" value={room.id} />
                    <input name="returnTo" type="hidden" value="/app/rooms" />
                    <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                      {room.isMember ? "Leave room" : "Join room"}
                    </SubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel
            eyebrow="No rooms yet"
            text="Create the first room, set the tone, and give people a place to gather around a shared context."
            title="No rooms yet"
          />
        )}
      </section>

      <aside className="support-column rooms-support-column">
        <form
          action={createRoomAction}
          className="panel editor-panel form-grid room-create-panel"
          id="create-room"
        >
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Create room</p>
              <h3>Make a room people can feel</h3>
            </div>
          </div>

          <input className="text-input" name="name" placeholder="Room name" required type="text" />
          <textarea
            className="composer-textarea compact-textarea"
            name="description"
            placeholder="Who is this room for, and what kind of posts belong here?"
            rows={4}
            required
          />
          <textarea
            className="composer-textarea compact-textarea"
            name="rules"
            placeholder="What kind of tone, care, or boundaries should people keep here?"
            rows={4}
          />
          <select className="text-input" defaultValue="group" name="visibility">
            <option value="group">Group</option>
            <option value="public">Public</option>
          </select>
          <div className="checkbox-grid">
            {modes.map((mode) => (
              <label key={mode.id} className="checkbox-row">
                <input defaultChecked={["advise", "comfort", "soft-truth"].includes(mode.id)} name="defaultModes" type="checkbox" value={mode.id} />
                <span>{mode.name}</span>
              </label>
            ))}
          </div>
          <SubmitButton className="button button-primary" pendingLabel="Creating...">
            Create room
          </SubmitButton>
        </form>

        <section className="panel support-card">
          <p className="sidebar-label">What makes a good room</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Clear purpose</span>
              <strong>Who it serves</strong>
            </div>
            <div className="settings-stat-row">
              <span>Explicit rules</span>
              <strong>How people reply</strong>
            </div>
            <div className="settings-stat-row">
              <span>Mode defaults</span>
              <strong>What tone is normal</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

export function RoomDetailPage({
  notice,
  room,
  posts,
}: {
  notice: PageNotice;
  room: RoomView;
  posts: FeedPost[];
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          actions={
            <form action={room.isMember ? leaveRoomAction : joinRoomAction}>
              <input name="roomId" type="hidden" value={room.id} />
              <input name="returnTo" type="hidden" value={`/app/rooms/${room.id}`} />
              <SubmitButton className="button button-primary" pendingLabel="Updating...">
                {room.isMember ? "Leave room" : "Join room"}
              </SubmitButton>
            </form>
          }
          eyebrow={`${describeVisibility(room.visibility)} room`}
          description={room.description}
          title={room.name}
        />

        <StatusBanner notice={notice} />

        <section className="settings-grid room-detail-summary-grid">
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Members</p>
            <h3>{room.memberCount}</h3>
            <p>People currently inside the room.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Posts</p>
            <h3>{room.postCount}</h3>
            <p>Current threads tied to this space.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Default modes</p>
            <h3>{room.defaultModes.length}</h3>
            <p>The tones this room normalizes first.</p>
          </article>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">What this room asks for</p>
          <h3>{room.rules}</h3>
          <div className="tag-row">
            {room.defaultModes.map((modeId) => {
              const mode = modes.find((entry) => entry.id === modeId)!;

              return (
                <span key={modeId} className="pill" style={{ background: mode.accent }}>
                  {mode.name}
                </span>
              );
            })}
          </div>
        </section>

        {posts.length ? (
          <div className="stack-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            eyebrow="No threads yet"
            text="The first post will set the pace for how this room sounds and what belongs here."
            title="No threads in this room yet"
          />
        )}
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Room snapshot</p>
          <div className="sidebar-metric-row">
            <div>
              <strong>{room.memberCount}</strong>
              <span>members</span>
            </div>
            <div>
              <strong>{room.postCount}</strong>
              <span>posts</span>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Ownership</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Created by</span>
              <strong>{room.createdBy.username}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Visibility</span>
              <strong>{describeVisibility(room.visibility)}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Your status</span>
              <strong>{room.isMember ? "Member" : "Not joined"}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

export function NotificationsPage({
  notice,
  notifications,
}: {
  notice: PageNotice;
  notifications: NotificationView[];
}) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const priorityCount = notifications.filter((notification) => notification.priority === "high").length;

  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          actions={
            <form action={markNotificationsReadAction}>
              <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                Mark all as seen
              </SubmitButton>
            </form>
          }
          eyebrow="Inbox"
          description="Replies, ratings, and other movement around your posts show up here."
          title="Activity"
        />

        <StatusBanner notice={notice} />

        {notifications.length ? (
          <div className="notification-list">
            {notifications.map((notification) => (
              <NotificationLinkCard detailed key={notification.id} notification={notification} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            eyebrow="Quiet for now"
            text="Replies, ratings, and moderation updates will appear here as people respond to you."
            title="No activity yet"
          />
        )}
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">At a glance</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Total</span>
              <strong>{notifications.length}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Unread</span>
              <strong>{unreadCount}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Priority</span>
              <strong>{priorityCount}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">What this page is for</p>
          <h3>This is where replies, ratings, and follow-through come back to you.</h3>
          <p>It is less a feed to browse and more a place to catch what changed around your posts.</p>
        </section>
      </aside>
    </div>
  );
}

export function ProfilePage({ notice, profile }: { notice: PageNotice; profile: ProfileView }) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          actions={
            <>
              <Link className="button button-secondary" href="/app/settings/account">
                Edit account
              </Link>
              <Link className="button button-primary" href="/app/compose">
                Write a post
              </Link>
            </>
          }
          eyebrow="Profile"
          description="Your profile shows how you tend to show up and how well your replies fit the moment."
          title={profile.user.username}
        />

        <StatusBanner notice={notice} />

        <section className="settings-grid profile-summary-grid">
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Reputation</p>
            <h3>{profile.user.reputationScore}</h3>
            <p>How your participation is reading across the app.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Recent posts</p>
            <h3>{profile.posts.length}</h3>
            <p>Current posts visible from your profile.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Recent replies</p>
            <h3>{profile.recentComments.length}</h3>
            <p>Your latest visible replies across the app.</p>
          </article>
        </section>

        <section className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Profile</p>
              <h3>Tell people how you show up</h3>
            </div>
          </div>
          <form action={updateProfileAction} className="inline-form-stack">
            <textarea className="composer-textarea compact-textarea" defaultValue={profile.user.bio} name="bio" rows={4} />
            <SubmitButton className="button button-primary" pendingLabel="Saving...">
              Save changes
            </SubmitButton>
          </form>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Posts</p>
          {profile.posts.length ? (
            <div className="stack-list">
              {profile.posts.map((post) => (
                <PostCard key={post.id} post={post} showDelete />
              ))}
            </div>
          ) : (
            <EmptyPanel
              eyebrow="Nothing public yet"
              text="Your posts will collect here once you publish one."
              title="No posts yet"
            />
          )}
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">At a glance</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Email</span>
              <strong>{profile.user.email}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Joined</span>
              <strong>{profile.user.createdAt.slice(0, 10)}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Role</span>
              <strong>{profile.user.role}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Focus</span>
              <strong>{describeFocus(profile.user.onboardingFocus)}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Recent replies</p>
          {profile.recentComments.length ? (
            <div className="stack-list">
              {profile.recentComments.map((comment) => (
                <article key={comment.id} className="reply-card">
                  <span>
                    {describeAlignment(comment.alignmentClassification)} · {comment.modeAlignmentScore}
                  </span>
                  <p>{comment.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="support-copy">Your replies will show here once you start responding to posts.</p>
          )}
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Recent notifications</p>
          {profile.notifications.length ? (
            <div className="notification-list">
              {profile.notifications.slice(0, 4).map((notification) => (
                <NotificationLinkCard key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <p className="support-copy">No recent notifications to surface here.</p>
          )}
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Trust controls</p>
          {profile.blockedUsers.length ? (
            <div className="session-list">
              {profile.blockedUsers.map((entry) => (
                <article key={`${entry.type}-${entry.userId}`} className="session-card card-shell">
                  <div className="panel-title-row">
                    <div>
                      <strong>{entry.username}</strong>
                      <div className="settings-meta">
                        <span>{entry.type === "block" ? "Blocked" : "Muted"}</span>
                        <span>Since {formatTime(entry.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <form action={clearRelationshipAction} className="card-footer">
                    <input name="objectUserId" type="hidden" value={entry.userId} />
                    <input name="relationshipType" type="hidden" value={entry.type} />
                    <input name="returnTo" type="hidden" value="/app/profile" />
                    <SubmitButton className="button button-secondary subtle-button" pendingLabel="Updating...">
                      {entry.type === "block" ? "Unblock user" : "Unmute user"}
                    </SubmitButton>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <p className="support-copy">No one is blocked or muted from your account.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

export function ModerationPage({
  flaggedComments,
  currentUser,
  overview,
  reports,
}: {
  flaggedComments: FlaggedCommentView[];
  currentUser: SessionUser;
  overview: ModerationOverviewView;
  reports: ReportView[];
}) {
  if (currentUser.role === "user") {
    return (
      <div className="empty-state panel">
        <h1>Moderators only</h1>
        <p>This area is reserved for people reviewing safety reports.</p>
      </div>
    );
  }

  return (
    <div className="workspace-grid">
      <section className="content-column">
        <PageIntro
          eyebrow="Trust"
          description="Modes shape tone, but they never excuse harm. This is where posts and replies that need a human call are reviewed."
          title="Safety"
        />

        <section className="settings-grid profile-summary-grid">
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Open reports</p>
            <h3>{overview.openReports}</h3>
            <p>Items waiting for a first moderation pass.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Flagged replies</p>
            <h3>{overview.flaggedComments}</h3>
            <p>Replies still sitting in the queue.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Auto-flagged</p>
            <h3>{overview.autoFlaggedComments}</h3>
            <p>Replies Ichigo caught before anyone reported them.</p>
          </article>
          <article className="panel settings-card card-shell">
            <p className="sidebar-label">Repeat offenders</p>
            <h3>{overview.repeatOffenders}</h3>
            <p>Accounts with flagged replies still unresolved.</p>
          </article>
        </section>

        {flaggedComments.length ? (
          <section className="panel support-card">
            <div className="panel-title-row">
              <div>
                <p className="sidebar-label">Auto-flagged queue</p>
                <h3>Replies that need a moderation call</h3>
              </div>
            </div>
            <div className="stack-list">
              {flaggedComments.map((comment) => (
                <article key={comment.id} className="panel moderation-card card-shell">
                  <div className="panel-title-row">
                    <div>
                      <p className="sidebar-label">
                        {describeAlignment(comment.alignmentClassification)} · {comment.modeAlignmentScore}/100
                      </p>
                      <h3>{comment.author.username}</h3>
                    </div>
                    <span>{formatTime(comment.createdAt)}</span>
                  </div>
                  <div className="card-body">
                    <p>{comment.content}</p>
                    <p className="support-copy">Post context: {comment.postPreview}</p>
                    <div className="settings-stat-list">
                      <div className="settings-stat-row">
                        <span>Open reports</span>
                        <strong>{comment.openReportCount}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="moderation-actions card-footer">
                    <Link className="button button-secondary" href={`/app/posts/${comment.postId}`}>
                      Open thread
                    </Link>
                    <form action={updateCommentModerationStatusAction}>
                      <input name="commentId" type="hidden" value={comment.id} />
                      <input name="status" type="hidden" value="visible" />
                      <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                        Restore
                      </SubmitButton>
                    </form>
                    <form action={updateCommentModerationStatusAction}>
                      <input name="commentId" type="hidden" value={comment.id} />
                      <input name="status" type="hidden" value="hidden" />
                      <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                        Hide reply
                      </SubmitButton>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {reports.length ? (
          <div className="stack-list">
            {reports.map((report) => (
              <article key={report.id} className="panel moderation-card card-shell">
                <div className="panel-title-row">
                  <div>
                    <p className="sidebar-label">
                      {describeReportTarget(report.targetType)} · {describeReportStatus(report.status)}
                    </p>
                    <h3>{report.reason}</h3>
                  </div>
                  <span>{formatTime(report.createdAt)}</span>
                </div>
                <div className="card-body">
                  <p>Reported by {report.reporter.username}</p>
                  {report.moderatorNote ? (
                    <p className="support-copy">Moderator note: {report.moderatorNote}</p>
                  ) : null}
                </div>
                <form action={updateReportStatusAction} className="inline-form-stack">
                  <input name="reportId" type="hidden" value={report.id} />
                  <input
                    name="status"
                    type="hidden"
                    value={report.status === "open" ? "reviewing" : report.status}
                  />
                  <textarea
                    className="composer-textarea compact-textarea"
                    defaultValue={report.moderatorNote}
                    name="moderatorNote"
                    placeholder="Add a note for the moderation record."
                    rows={3}
                  />
                  <SubmitButton className="button button-secondary subtle-button" pendingLabel="Saving...">
                    Save note
                  </SubmitButton>
                </form>
                <div className="moderation-actions card-footer">
                  {(["open", "reviewing", "resolved", "dismissed"] as const).map((status) => (
                    <form key={status} action={updateReportStatusAction}>
                      <input name="reportId" type="hidden" value={report.id} />
                      <input name="status" type="hidden" value={status} />
                      <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                        {describeReportStatus(status)}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel
            eyebrow="Queue clear"
            text="There are no open moderation items right now."
            title="Nothing to review"
          />
        )}
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">At a glance</p>
          <div className="settings-stat-list">
            <div className="settings-stat-row">
              <span>Total reports</span>
              <strong>{reports.length}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Open</span>
              <strong>{overview.openReports}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Reviewing</span>
              <strong>{overview.reviewingReports}</strong>
            </div>
            <div className="settings-stat-row">
              <span>Hidden replies</span>
              <strong>{overview.hiddenComments}</strong>
            </div>
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Principle</p>
          <h3>Context shapes tone. It never overrides safety.</h3>
          <p>
            The moderation layer exists to protect people when a thread stops honoring
            the social contract around it.
          </p>
        </section>
      </aside>
    </div>
  );
}

function PostCard({
  post,
  relationshipReturnTo,
  showDelete = false,
  viewerUserId,
}: {
  post: FeedPost;
  relationshipReturnTo?: string;
  showDelete?: boolean;
  viewerUserId?: string;
}) {
  const mode = modes.find((entry) => entry.id === post.modeId)!;

  return (
    <article className="post-card panel card-shell" data-mode={post.modeId}>
      <div className="post-meta">
        <div className="post-meta-copy">
          <strong>{post.author.username}</strong>
          <span>
            {describeVisibility(post.visibility)} · {formatTime(post.createdAt)}
          </span>
        </div>
        <span className="mode-chip" style={{ background: mode.accent }}>
          {mode.name}
        </span>
      </div>

      <p className="post-body">{post.content}</p>
      <div className="post-context">
        <strong>This post wants</strong>
        <p>{mode.prompt}</p>
      </div>
      <div className="post-subtext">
        <span>{post.room ? `Room: ${post.room.name}` : "Posted to the main feed"}</span>
        <span>{post.commentCount} comments</span>
        <span>{post.ratingCount} ratings</span>
      </div>

      <div className="tag-row">
        {post.tags.map((tag) => (
          <span key={tag} className="tag-pill">
            #{tag}
          </span>
        ))}
      </div>

      <div className="post-footer">
        <Link className="inline-link" href={`/app/posts/${post.id}`}>
          View thread
        </Link>

        {viewerUserId && viewerUserId !== post.author.id ? (
          <div className="comment-actions-grid">
            <form action={setRelationshipAction}>
              <input name="objectUserId" type="hidden" value={post.author.id} />
              <input name="relationshipType" type="hidden" value="mute" />
              <input
                name="returnTo"
                type="hidden"
                value={relationshipReturnTo ?? `/app/posts/${post.id}`}
              />
              <SubmitButton className="button button-secondary subtle-button" pendingLabel="Saving...">
                Mute author
              </SubmitButton>
            </form>
            <form action={setRelationshipAction}>
              <input name="objectUserId" type="hidden" value={post.author.id} />
              <input name="relationshipType" type="hidden" value="block" />
              <input
                name="returnTo"
                type="hidden"
                value={relationshipReturnTo ?? `/app/posts/${post.id}`}
              />
              <SubmitButton className="button button-secondary subtle-button" pendingLabel="Saving...">
                Block author
              </SubmitButton>
            </form>
          </div>
        ) : null}

        {showDelete ? (
          <form action={deletePostAction}>
            <input name="postId" type="hidden" value={post.id} />
            <SubmitButton className="button button-secondary subtle-button" pendingLabel="Deleting...">
              Delete post
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function CommentCard({
  comment,
  currentUser,
  postId,
}: {
  comment: CommentView;
  currentUser: SessionUser;
  postId: string;
}) {
  return (
    <article className="reply-card panel comment-card card-shell">
      <div className="panel-title-row">
        <div className="comment-meta-copy">
          <strong>{comment.author.username}</strong>
          <span>
            {describeAlignment(comment.alignmentClassification)} · score {comment.modeAlignmentScore}
          </span>
        </div>
        <span>{formatTime(comment.createdAt)}</span>
      </div>

      <p>{comment.content}</p>

      <div className="rating-chip-row">
        {(
          Object.entries(comment.ratings) as Array<[RatingType, number]>
        ).map(([key, count]) => (
          <span key={key} className="tag-pill">
            {ratingLabels[key]}: {count}
          </span>
        ))}
      </div>

      <div className="comment-actions-grid">
        {(["matched_mode", "helpful", "did_not_match_mode", "harmful"] as const).map((ratingType) => (
          <form key={ratingType} action={rateCommentAction}>
            <input name="postId" type="hidden" value={postId} />
            <input name="commentId" type="hidden" value={comment.id} />
            <input name="ratingType" type="hidden" value={ratingType} />
            <SubmitButton className="button button-secondary subtle-button" pendingLabel="Saving...">
              {ratingLabels[ratingType]}
            </SubmitButton>
          </form>
        ))}
      </div>

      <form action={reportAction} className="report-form">
        <input name="targetType" type="hidden" value="comment" />
        <input name="targetId" type="hidden" value={comment.id} />
        <input
          className="text-input"
          name="reason"
          placeholder="Why does this need review?"
          type="text"
        />
        <SubmitButton className="button button-secondary subtle-button" pendingLabel="Reporting...">
          Send report
        </SubmitButton>
      </form>

      {comment.author.id !== currentUser.id ? (
        <div className="comment-actions-grid">
          <form action={setRelationshipAction}>
            <input name="objectUserId" type="hidden" value={comment.author.id} />
            <input name="relationshipType" type="hidden" value="mute" />
            <input name="returnTo" type="hidden" value={`/app/posts/${postId}`} />
            <SubmitButton className="button button-secondary subtle-button" pendingLabel="Saving...">
              Mute author
            </SubmitButton>
          </form>
          <form action={setRelationshipAction}>
            <input name="objectUserId" type="hidden" value={comment.author.id} />
            <input name="relationshipType" type="hidden" value="block" />
            <input name="returnTo" type="hidden" value={`/app/posts/${postId}`} />
            <SubmitButton className="button button-secondary subtle-button" pendingLabel="Saving...">
              Block author
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </article>
  );
}
