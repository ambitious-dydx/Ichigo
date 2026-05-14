import Image from "next/image";
import Link from "next/link";
import ichigoLogo from "../../assets/logo/refined/ichigo-logo-transparent-v2.png";
import { modes } from "../modes";
import type {
  CommentView,
  FeedPost,
  NotificationView,
  PostDetail,
  ProfileView,
  RatingType,
  ReportView,
  RoomView,
  SessionUser,
} from "../server/types";
import {
  createCommentAction,
  createPostAction,
  createRoomAction,
  deletePostAction,
  joinRoomAction,
  leaveRoomAction,
  logoutAction,
  markNotificationsReadAction,
  rateCommentAction,
  reportAction,
  updateProfileAction,
  updateReportStatusAction,
} from "../server/actions";
import { SubmitButton } from "./submit-button";
import { ThemeToggle } from "./theme-toggle";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function describeVisibility(value: FeedPost["visibility"] | RoomView["visibility"]) {
  switch (value) {
    case "group":
      return "Group";
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
  matched_mode: "Matched mode",
  did_not_match_mode: "Did not match",
  harmful: "Harmful",
};

export function ProductShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: SessionUser;
}) {
  return (
    <div className="product-shell">
      <aside className="app-sidebar">
        <Link className="brand" href="/">
          <Image src={ichigoLogo} alt="Ichigo logo" priority width={44} height={44} />
          <span>Ichigo</span>
        </Link>

        <nav className="app-nav">
          <Link className="app-nav-link" href="/app/feed">
            Feed
          </Link>
          <Link className="app-nav-link" href="/app/compose">
            Compose
          </Link>
          <Link className="app-nav-link" href="/app/rooms">
            Rooms
          </Link>
          <Link className="app-nav-link" href="/app/notifications">
            Notifications
          </Link>
          <Link className="app-nav-link" href="/app/profile">
            Profile
          </Link>
          {currentUser.role !== "user" ? (
            <Link className="app-nav-link" href="/app/moderation">
              Moderation
            </Link>
          ) : null}
        </nav>

        <section className="sidebar-card panel">
          <p className="sidebar-label">Signed in</p>
          <h3>{currentUser.username}</h3>
          <p>{currentUser.bio || "Add a profile note so rooms know how you tend to respond."}</p>
        </section>

        <section className="sidebar-card panel">
          <p className="sidebar-label">Reputation</p>
          <div className="sidebar-metric-row">
            <div>
              <strong>{currentUser.reputationScore}</strong>
              <span>alignment score</span>
            </div>
            <div>
              <strong>{currentUser.role}</strong>
              <span>account role</span>
            </div>
          </div>
        </section>

        <form action={logoutAction}>
          <SubmitButton className="button button-secondary sidebar-button" pendingLabel="Signing out...">
            Sign out
          </SubmitButton>
        </form>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">Full-stack application</p>
            <h2>Context-first feedback system</h2>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <Link className="button button-secondary" href="/app/compose">
              New post
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

export function FeedPage({
  currentUser,
  posts,
  rooms,
  notifications,
}: {
  currentUser: SessionUser;
  posts: FeedPost[];
  rooms: RoomView[];
  notifications: NotificationView[];
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>Feed</h1>
            <p>
              Every post below carries explicit context. The selected mode is a visible
              social rule, not hidden emotional guesswork.
            </p>
          </div>
          <Link className="button button-primary" href="/app/compose">
            Create post
          </Link>
        </div>

        <div className="stack-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showDelete={post.author.id === currentUser.id} />
          ))}
        </div>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Principle</p>
          <h3>Content plus context</h3>
          <p>
            Conventional social media distributes content and leaves context implicit.
            Ichigo turns context into the first-class object that shapes the reply.
          </p>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Your rooms</p>
          <div className="mini-room-list">
            {rooms.slice(0, 4).map((room) => (
              <Link key={room.id} className="mini-room-card" href={`/app/rooms/${room.id}`}>
                <strong>{room.name}</strong>
                <span>
                  {room.memberCount} members · {room.postCount} posts
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel support-card">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Latest notifications</p>
              <h3>Activity around your context</h3>
            </div>
            <Link className="inline-link" href="/app/notifications">
              View all
            </Link>
          </div>
          <div className="notification-list">
            {notifications.slice(0, 4).map((notification) => (
              <Link key={notification.id} className="notification-card" href={notification.link}>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function ComposePage({ rooms }: { rooms: RoomView[] }) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>Compose</h1>
            <p>
              A post is not just content. Write what happened, then make the response
              context explicit before anyone replies.
            </p>
          </div>
        </div>

        <form action={createPostAction} className="panel editor-panel form-grid">
          <div>
            <label className="input-label" htmlFor="content">
              Post content
            </label>
            <textarea id="content" className="composer-textarea" name="content" rows={8} required />
          </div>

          <div className="mode-choice-grid">
            {modes.map((mode) => (
              <label key={mode.id} className="mode-option radio-option">
                <input defaultChecked={mode.id === "soft-truth"} name="responseMode" type="radio" value={mode.id} />
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
                <option value="group">Group room</option>
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
            <input className="text-input" id="tags" name="tags" placeholder="founder, launch, advice" type="text" />
          </div>

          <label className="checkbox-row">
            <input name="isAnonymous" type="checkbox" />
            <span>Post anonymously while still preserving response context and moderation tracking.</span>
          </label>

          <div className="form-actions">
            <SubmitButton className="button button-primary" pendingLabel="Publishing...">
              Publish post
            </SubmitButton>
            <Link className="button button-secondary" href="/app/feed">
              Back to feed
            </Link>
          </div>
        </form>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Mode guidance</p>
          <div className="mode-guidance-list">
            {modes.map((mode) => (
              <article key={mode.id} className="guidance-row">
                <span className="legend-dot" style={{ background: mode.accent }} />
                <div>
                  <strong>{mode.name}</strong>
                  <p>{mode.prompt}</p>
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
  post,
}: {
  currentUser: SessionUser;
  post: PostDetail;
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>Thread</h1>
            <p>
              The selected response mode remains visible through the entire thread, so the
              emotional contract does not disappear after publishing.
            </p>
          </div>
        </div>

        <PostCard post={post} showDelete={post.author.id === currentUser.id} />

        <section className="panel editor-panel">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Add response</p>
              <h3>{post.responsePrompt}</h3>
            </div>
            <span>{post.responseGuidance}</span>
          </div>

          <form action={createCommentAction} className="inline-form-stack">
            <input name="postId" type="hidden" value={post.id} />
            <textarea
              className="composer-textarea"
              name="content"
              placeholder="Reply in a way that respects the selected mode."
              rows={5}
              required
            />
            <SubmitButton className="button button-primary" pendingLabel="Posting reply...">
              Post reply
            </SubmitButton>
          </form>
        </section>

        <div className="stack-list">
          {post.comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} currentUser={currentUser} postId={post.id} />
          ))}
        </div>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Mode guidance</p>
          <h3>{post.responsePrompt}</h3>
          <p>{post.responseGuidance}</p>
        </section>
      </aside>
    </div>
  );
}

export function RoomsPage({ rooms }: { rooms: RoomView[] }) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>Rooms</h1>
            <p>
              Rooms let Ichigo layer community rules on top of post-level context. The room
              can guide the range of modes, but the post still declares its own contract.
            </p>
          </div>
        </div>

        <div className="room-grid">
          {rooms.map((room) => (
            <article key={room.id} className="panel room-card">
              <div className="panel-title-row">
                <div>
                  <p className="sidebar-label">{describeVisibility(room.visibility)}</p>
                  <h3>{room.name}</h3>
                </div>
                <Link className="inline-link" href={`/app/rooms/${room.id}`}>
                  Open room
                </Link>
              </div>
              <p>{room.description}</p>
              <div className="room-meta">
                <span>{room.memberCount} members</span>
                <span>{room.postCount} posts</span>
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
              <form action={room.isMember ? leaveRoomAction : joinRoomAction}>
                <input name="roomId" type="hidden" value={room.id} />
                <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                  {room.isMember ? "Leave room" : "Join room"}
                </SubmitButton>
              </form>
            </article>
          ))}
        </div>
      </section>

      <aside className="support-column">
        <form action={createRoomAction} className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Create room</p>
              <h3>Scoped feedback space</h3>
            </div>
          </div>

          <input className="text-input" name="name" placeholder="Room name" required type="text" />
          <textarea
            className="composer-textarea compact-textarea"
            name="description"
            placeholder="What kind of community is this room for?"
            rows={4}
            required
          />
          <textarea
            className="composer-textarea compact-textarea"
            name="rules"
            placeholder="Room rules and emotional boundaries"
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
      </aside>
    </div>
  );
}

export function RoomDetailPage({
  room,
  posts,
}: {
  room: RoomView;
  posts: FeedPost[];
}) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <p className="eyebrow">{describeVisibility(room.visibility)} room</p>
            <h1>{room.name}</h1>
            <p>{room.description}</p>
          </div>
        </div>

        <section className="panel support-card">
          <p className="sidebar-label">Room rules</p>
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

        <div className="stack-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Room stats</p>
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
      </aside>
    </div>
  );
}

export function NotificationsPage({ notifications }: { notifications: NotificationView[] }) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>Notifications</h1>
            <p>Replies, ratings, and context-sensitive signals land here.</p>
          </div>
          <form action={markNotificationsReadAction}>
            <SubmitButton className="button button-secondary" pendingLabel="Updating...">
              Mark all as read
            </SubmitButton>
          </form>
        </div>

        <div className="notification-list">
          {notifications.map((notification) => (
            <Link key={notification.id} className="notification-card panel" href={notification.link}>
              <div className="panel-title-row">
                <strong>{notification.title}</strong>
                <span>{formatTime(notification.createdAt)}</span>
              </div>
              <p>{notification.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProfilePage({ profile }: { profile: ProfileView }) {
  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>{profile.user.username}</h1>
            <p>
              Reputation rewards mode-aligned responses, not volume alone. Your profile is a
              public record of how well you respect other people’s context.
            </p>
          </div>
        </div>

        <section className="panel editor-panel form-grid">
          <div className="panel-title-row">
            <div>
              <p className="sidebar-label">Profile</p>
              <h3>Update your responder context</h3>
            </div>
          </div>
          <form action={updateProfileAction} className="inline-form-stack">
            <textarea className="composer-textarea compact-textarea" defaultValue={profile.user.bio} name="bio" rows={4} />
            <SubmitButton className="button button-primary" pendingLabel="Saving...">
              Save profile
            </SubmitButton>
          </form>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Your posts</p>
          <div className="stack-list">
            {profile.posts.map((post) => (
              <PostCard key={post.id} post={post} showDelete />
            ))}
          </div>
        </section>
      </section>

      <aside className="support-column">
        <section className="panel support-card">
          <p className="sidebar-label">Recent comments</p>
          <div className="stack-list">
            {profile.recentComments.map((comment) => (
              <article key={comment.id} className="reply-card">
                <span>
                  {comment.alignmentClassification} · {comment.modeAlignmentScore}
                </span>
                <p>{comment.content}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel support-card">
          <p className="sidebar-label">Recent notifications</p>
          <div className="notification-list">
            {profile.notifications.slice(0, 4).map((notification) => (
              <Link key={notification.id} className="notification-card" href={notification.link}>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

export function ModerationPage({
  currentUser,
  reports,
}: {
  currentUser: SessionUser;
  reports: ReportView[];
}) {
  if (currentUser.role === "user") {
    return (
      <div className="empty-state panel">
        <h1>Restricted</h1>
        <p>The moderation dashboard is available to moderators and admins only.</p>
      </div>
    );
  }

  return (
    <div className="workspace-grid">
      <section className="content-column">
        <div className="page-header">
          <div>
            <h1>Moderation</h1>
            <p>
              Response modes never override safety. This queue surfaces reports that need
              human judgment beyond automated alignment checks.
            </p>
          </div>
        </div>

        <div className="stack-list">
          {reports.map((report) => (
            <article key={report.id} className="panel moderation-card">
              <div className="panel-title-row">
                <div>
                  <p className="sidebar-label">
                    {report.targetType} · {report.status}
                  </p>
                  <h3>{report.reason}</h3>
                </div>
                <span>{formatTime(report.createdAt)}</span>
              </div>
              <p>Reporter: {report.reporter.username}</p>
              <div className="moderation-actions">
                {(["open", "reviewing", "resolved", "dismissed"] as const).map((status) => (
                  <form key={status} action={updateReportStatusAction}>
                    <input name="reportId" type="hidden" value={report.id} />
                    <input name="status" type="hidden" value={status} />
                    <SubmitButton className="button button-secondary" pendingLabel="Updating...">
                      {status}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PostCard({
  post,
  showDelete = false,
}: {
  post: FeedPost;
  showDelete?: boolean;
}) {
  const mode = modes.find((entry) => entry.id === post.modeId)!;

  return (
    <article className="post-card panel">
      <div className="post-meta">
        <div>
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
      <div className="post-subtext">
        <span>{post.room ? `Room: ${post.room.name}` : "Open feed post"}</span>
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
          Open thread
        </Link>

        {showDelete ? (
          <form action={deletePostAction}>
            <input name="postId" type="hidden" value={post.id} />
            <SubmitButton className="button button-secondary subtle-button" pendingLabel="Deleting...">
              Delete
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
    <article className="reply-card panel comment-card">
      <div className="panel-title-row">
        <div>
          <strong>{comment.author.username}</strong>
          <span>
            {comment.alignmentClassification} · alignment {comment.modeAlignmentScore}
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
          placeholder="Report reason if this violates mode or safety"
          type="text"
        />
        <SubmitButton className="button button-secondary subtle-button" pendingLabel="Reporting...">
          Report
        </SubmitButton>
      </form>
    </article>
  );
}
