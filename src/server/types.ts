import type { ModeId } from "../modes";

export type Visibility = "public" | "followers" | "group" | "anonymous";
export type UserRole = "user" | "moderator" | "admin";
export type PostStatus = "active" | "hidden" | "archived";
export type CommentStatus = "visible" | "flagged" | "hidden";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type TargetType = "post" | "comment";
export type FeedbackFocus = "founder" | "creator" | "reflection" | "support";
export type AccountTokenType = "email_verification" | "password_reset";
export type NotificationPriority = "high" | "default";
export type RoomMembershipRole = "owner" | "moderator" | "member" | "none";
export type RatingType =
  | "helpful"
  | "matched_mode"
  | "did_not_match_mode"
  | "harmful";
export type AlignmentClassification =
  | "match"
  | "acceptable"
  | "borderline"
  | "violation";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  emailVerifiedAt: string | null;
  bio: string;
  avatarUrl: string | null;
  reputationScore: number;
  role: UserRole;
  onboardingCompletedAt: string | null;
  onboardingFocus: FeedbackFocus | null;
  onboardingGoal: string;
  preferredMode: ModeId | null;
  createdAt: string;
};

export type LinkedAuthAccountView = {
  provider: string;
  providerEmail: string | null;
  linkedAt: string;
};

export type BlockedUserView = {
  userId: string;
  username: string;
  type: "block" | "mute";
  createdAt: string;
};

export type AccountTokenView = {
  type: AccountTokenType;
  token: string;
  expiresAt: string;
};

export type AuthSessionView = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type FeedPost = {
  id: string;
  author: Pick<SessionUser, "id" | "username" | "avatarUrl" | "reputationScore">;
  room: {
    id: string;
    name: string;
    visibility: Visibility;
  } | null;
  modeId: ModeId;
  content: string;
  tags: string[];
  visibility: Visibility;
  isAnonymous: boolean;
  commentCount: number;
  ratingCount: number;
  createdAt: string;
};

export type CommentView = {
  id: string;
  postId: string;
  author: Pick<SessionUser, "id" | "username" | "avatarUrl" | "reputationScore">;
  content: string;
  modeAlignmentScore: number;
  alignmentClassification: AlignmentClassification;
  status: CommentStatus;
  createdAt: string;
  ratings: {
    helpful: number;
    matched_mode: number;
    did_not_match_mode: number;
    harmful: number;
  };
};

export type PostDetail = FeedPost & {
  status: PostStatus;
  responsePrompt: string;
  responseGuidance: string;
  roomRules: string | null;
  alignmentSummary: {
    total: number;
    matches: number;
    acceptable: number;
    borderline: number;
    violations: number;
    averageScore: number;
  };
  comments: CommentView[];
};

export type RoomView = {
  id: string;
  name: string;
  description: string;
  rules: string;
  visibility: Visibility;
  defaultModes: ModeId[];
  createdAt: string;
  createdBy: Pick<SessionUser, "id" | "username">;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  membershipRole: RoomMembershipRole;
  canModerate: boolean;
};

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
};

export type ReplyQualityGuardView = {
  totalRecentReplies: number;
  alignedCount: number;
  lowAlignmentCount: number;
  violationCount: number;
  isOnCooldown: boolean;
  cooldownEndsAt: string | null;
};

export type ProductHealthView = {
  totalUsers: number;
  onboardedUsers: number;
  posters: number;
  postsWithReplies: number;
  alignedReplyRate: number;
  averageFirstReplyMinutes: number | null;
  repeatPosterRate: number;
  modeUsage: Array<{
    modeId: ModeId;
    count: number;
  }>;
};

export type RoomMemberView = {
  userId: string;
  username: string;
  role: RoomMembershipRole;
  joinedAt: string;
};

export type ReportView = {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  moderatorNote: string;
  reporter: Pick<SessionUser, "id" | "username">;
  createdAt: string;
};

export type FlaggedCommentView = {
  id: string;
  postId: string;
  postPreview: string;
  author: Pick<SessionUser, "id" | "username" | "avatarUrl" | "reputationScore">;
  content: string;
  modeAlignmentScore: number;
  alignmentClassification: AlignmentClassification;
  status: CommentStatus;
  openReportCount: number;
  createdAt: string;
};

export type ModerationOverviewView = {
  openReports: number;
  reviewingReports: number;
  flaggedComments: number;
  hiddenComments: number;
  repeatOffenders: number;
  autoFlaggedComments: number;
};

export type ProfileView = {
  user: SessionUser;
  posts: FeedPost[];
  recentComments: CommentView[];
  notifications: NotificationView[];
  blockedUsers: BlockedUserView[];
};

export type AppHomeView = {
  user: SessionUser;
  stats: {
    postCount: number;
    roomCount: number;
    unreadNotificationCount: number;
    replyCount: number;
  };
  wedge: {
    title: string;
    summary: string;
  };
  insights: {
    firstPostComplete: boolean;
    firstReplyComplete: boolean;
    matchedReplyRate: number;
    activeModeCount: number;
  };
  recentPosts: FeedPost[];
  rooms: RoomView[];
  notifications: NotificationView[];
  replyQualityGuard: ReplyQualityGuardView;
  productHealth: ProductHealthView | null;
};

export type SecurityView = {
  sessions: AuthSessionView[];
  currentSessionId: string | null;
  linkedAccounts: LinkedAuthAccountView[];
  availableTokens: AccountTokenView[];
};

export type AlignmentResult = {
  alignmentScore: number;
  classification: AlignmentClassification;
  reason: string;
  suggestedRewrite: string | null;
};
