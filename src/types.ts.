import { User as FirebaseUser } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  publicKey?: string;
  lastSeen?: any;
  username?: string;
  bio?: string;
  role?: string;
  followersCount?: number;
  followingCount?: number;
  isPremium?: boolean;
  isVerified?: boolean;
  stealthMode?: boolean;
  premiumSettings?: {
    bubbleColor?: string;
    chatWallpaper?: string;
  };
  theme?: 'light' | 'dark';
  notificationSettings?: {
    messages: boolean;
    lives: boolean;
    browserEnabled: boolean;
  };
  customIcons?: {
    home?: string;
    search?: string;
    ai?: string;
    add?: string;
    reels?: string;
    profile?: string;
  };
  profileCustomization?: {
    bgColor?: string;
    fontFamily?: string;
    textColor?: string;
  };
  privacySettings?: {
    showFollowers?: boolean;
    showFollowing?: boolean;
    showPostCount?: boolean;
    showLastSeen?: boolean;
    anonymousStats?: boolean;
  };
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorRecoveryCodes?: string[];
}

export interface Chat {
  id: string;
  participants: string[];
  type: 'private' | 'group' | 'channel' | 'saved' | 'direct';
  name?: string;
  description?: string;
  photoURL?: string;
  creatorId?: string;
  admins?: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  lastSenderId?: string;
  lastSenderName?: string;
  isLocked?: boolean;
  passcode?: string;
  disappearingTimer?: number;
  updatedAt: any;
  themeColor?: string;
  backgroundUrl?: string;
  backgroundOpacity?: number;
  avatarUrl?: string;
  avatarZoom?: number;
  avatarPanX?: number;
  avatarPanY?: number;
  avatarFilter?: string;
  unreadCount?: Record<string, number>;
  reactionSettings?: {
    mode: 'all' | 'some' | 'none';
    enabledReactions?: string[];
  };
  otherUser?: UserProfile;
  archivedBy?: string[];
  mutedBy?: string[];
  permissions?: Record<string, boolean>;
  customLink?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  createdAt: any;
  isEncrypted?: boolean;
  encryptionData?: any;
  iv?: string;
  reactions?: Record<string, string[]>;
  disappearingTimer?: number;
  readAt?: any;
  replyTo?: any;
  deletedBy?: string[];
  isEdited?: boolean;
  selfDestruct?: boolean;
  timer?: number;
  transcription?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'livestream';
  fileUrl?: string;
  streamId?: string;
  audioDuration?: number;
  senderIsPremium?: boolean;
}

export interface CallSession {
  id: string;
  chatId: string;
  title: string;
  active: boolean;
  startedAt: any;
  smartBoardEnabled?: boolean;
  hostId?: string;
}

export interface CallParticipant {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  isMuted: boolean;
  isMutedByAdmin?: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  globalVolume: number;
  role: 'owner' | 'admin' | 'member';
  joinedAt: any;
  isSharingScreen?: boolean;
  canDraw?: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'create_post' | 'like_post' | 'comment_post' | 'create_reel' | 'start_live' | 'follow_user';
  description: string;
  createdAt: any;
}

