import type { ModeId } from "../modes";

export type Visibility = "public" | "followers" | "group" | "anonymous";
export type UserRole = "user" | "moderator" | "admin";
export type PostStatus = "active" | "hidden" | "archived";
export type CommentStatus = "visible" | "flagged" | "hidden";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type TargetType = "post" | "comment";
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
  bio: string;
  avatarUrl: string | null;
  reputationScore: number;
  role: UserRole;
  createdAt: string;
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
};

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

export type ReportView = {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  reporter: Pick<SessionUser, "id" | "username">;
  createdAt: string;
};

export type ProfileView = {
  user: SessionUser;
  posts: FeedPost[];
  recentComments: CommentView[];
  notifications: NotificationView[];
};

export type AlignmentResult = {
  alignmentScore: number;
  classification: AlignmentClassification;
  reason: string;
  suggestedRewrite: string | null;
};
