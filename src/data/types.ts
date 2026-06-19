export enum RegistrationStage {
  UNVERIFIED = "UNVERIFIED",
  VERIFIED_STUDENT = "VERIFIED_STUDENT",
  COMPLETED_QUESTIONNAIRE = "COMPLETED_QUESTIONNAIRE",
  PROFILE_PERFECTED = "PROFILE_PERFECTED"
}

export type GenderType = "MALE" | "FEMALE" | "OTHER";

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

export interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  school: string;
  authorName: string;
  authorAvatar: string;
  authorVerified: boolean;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  createdAt: string;
  category?: string;
  isDraft?: boolean;
}

export interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
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
