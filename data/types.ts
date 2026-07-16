export enum RegistrationStage {
  UNVERIFIED = "UNVERIFIED",
  VERIFIED_STUDENT = "VERIFIED_STUDENT",
  COMPLETED_QUESTIONNAIRE = "COMPLETED_QUESTIONNAIRE",
  PROFILE_PERFECTED = "PROFILE_PERFECTED"
}

// 前端历史上用 OTHER，后端用 UNKNOWN；两者都保留，映射层负责互转
export type GenderType = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

export type RoleType = "ADMIN" | "USER_STUDENT";

export interface UserProfile {
  uid: string;
  nickname: string;
  avatar: string;
  gender: GenderType;
  age: number;
  school: string;
  email: string;
  interests: string[];
  personalityTags: string[];
  activityPrefs: string[];
  phone: string;
  wechat: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  creditScore: number;
  isIdVerified: boolean;
  isSchoolVerified: boolean;
  hideSOS?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  time: string;
  endTime?: string;
  mode?: "online" | "offline";
  location: string;
  limit: number;
  joinedCount: number;
  members: string[];
  tags: string[];
  school: string;
  creatorUid: string;
  creatorName: string;
  creatorAvatar: string;
}

export interface ClassmateMatch {
  uid: string;
  nickname: string;
  avatar: string;
  school: string;
  interests: string[];
  personalityTags: string[];
  matchRate: number;
  bio: string;
  distance: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  activityId?: string;
  memberIds: string[];
  lastMessage: string;
  lastMessageTime: string;
  messages: ChatMessage[];
  unreadCount: number;
  zeroSugarEnabled: boolean;
  disconnectTimeLeft?: number;
}

export interface CreditLog {
  id: string;
  reason: string;
  change: number;
  date: string;
}

export interface Question {
  id: string;
  text: string;
  type: "single" | "multiple";
  options: string[];
}

export interface ThemeEvent {
  id: string;
  title: string;
  badge: string;
  description: string;
  image: string;
  partnerCount: number;
  activitiesCount: number;
}

export interface GroupJoinRequest {
  id: string;
  activityId: string;
  activityTitle: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string;
  ownerId: string;
  status: "pending" | "approved" | "rejected";
}

// ==================== 后端鉴权 / 用户接口数据模型（见 docs/API.md §5） ====================

/** Sa-Token 登录令牌信息 */
export interface TokenInfo {
  tokenName: string;   // 令牌名（默认 satoken，即请求头 key）
  tokenValue: string;  // 令牌值（请求头 value）
  isLogin: boolean;
  loginId: string;
  loginType: string;
  tokenTimeout: number;
  sessionTimeout: number;
  tokenSessionTimeout: number;
  tokenActiveTimeout: number;
  loginDeviceType: string;
  tag: string | null;
}

/** 后端登录 / 注册成功返回的用户信息 */
export interface UserLoginVO {
  id: string;
  phone: string;
  nickname: string;
  name: string;
  gender: GenderType;
  selfSignature: string;
  interestTags: string[];
  imageUrl: string;
  level: number;
  role: RoleType;
  reputationScore: number;
  isIdVerified: boolean;
  isSchoolVerified: boolean;
  createTime: string;
  updateTime: string;
  tokenInfo: TokenInfo;
  userSig: string;     // 腾讯云 IM 登录签名
}

/** 获取当前登录用户信息时返回，字段同 UserLoginVO 但不含 tokenInfo / userSig */
export type UserInfoVO = Omit<UserLoginVO, "tokenInfo" | "userSig">;

/** 注册请求体 */
export interface RegisterParam {
  phone: string;
  password: string;
  nickname: string;
  name: string;
  gender: GenderType;
  birthdate?: string;      // yyyy-MM-dd
  location?: string;
  selfSignature?: string;
  interestTags?: string[];
  imageUrl?: string;
}

/** 统一响应结构 Result<T> */
export interface Result<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// ==================== 帖子接口数据模型（见 docs/API.md §4、§8.7–8.12） ====================

/** 帖子状态 */
export type PostStatus = "NORMAL" | "USER_DELETED" | "VIOLATION_REMOVED" | "PENDING_REVIEW";

/** 图片 / 视频媒体项 */
export interface MediaItem {
  type: string;   // "image" / "video"
  url: string;
}

/** 分页结果 */
export interface PageResult<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

/** 帖子分类（§8.7 ForumCategoryVO） */
export interface ForumCategoryVO {
  id: number;
  name: string;
  iconUrl: string;
  description: string;
  sortOrder: number;
}

/** 帖子列表项（§8.10 PostListItemVO） */
export interface PostListItemVO {
  id: number;
  userId: number;
  userNickname: string;
  userImageUrl: string;
  categoryId: number;
  categoryName: string;
  title: string;
  content: string;
  media: MediaItem[];
  locationName: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  isTop: boolean;
  liked: boolean;
  favorited: boolean;
  createTime: string;
}

/** 帖子详情（§8.8 PostDetailVO） */
export interface PostDetailVO {
  id: number;
  userId: number;
  userNickname: string;
  userImageUrl: string;
  categoryId: number;
  categoryName: string;
  title: string;
  content: string;
  media: MediaItem[];
  locationName: string;
  longitude: number | null;
  latitude: number | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  isTop: boolean;
  status: PostStatus;
  liked: boolean;
  favorited: boolean;
  canDelete: boolean;
  createTime: string;
  updateTime: string;
}

/** 评论 / 回复（§8.11 CommentVO） */
export interface CommentVO {
  id: number;
  postId: number;
  userId: number;
  userNickname: string;
  userImageUrl: string;
  rootId: number | null;
  parentId: number | null;
  replyUserId: number | null;
  replyUserNickname: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  liked: boolean;
  canDelete: boolean;
  createTime: string;
}

/** 发帖请求体（§4.4） */
export interface CreatePostParam {
  categoryId: number;
  title: string;
  content: string;
  media?: MediaItem[];
  locationName?: string;
  longitude?: number;
  latitude?: number;
}

/** 发表评论 / 回复请求体（§4.10） */
export interface CommentParam {
  content: string;
  parentId?: number;
}
