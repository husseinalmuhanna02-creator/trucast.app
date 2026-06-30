// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Home, 
  Search, 
  PlusSquare, 
  User, 
  Users,
  LogOut, 
  Image as ImageIcon, 
  Send, 
  Heart, 
  MessageCircle, 
  Share2, 
  Reply,
  MoreHorizontal,
  X,
  AlertCircle,
  Sparkles,
  Maximize2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minimize2,
  Grid,
  Edit2,
  Check,
  CornerDownRight,
  Bookmark,
  Play,
  PlayCircle,
  Settings,
  Mail,
  Plus,
  Tv,
  Bell,
  Pause,
  StopCircle,
  Shield,
  PieChart,
  Info,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Sun,
  Moon,
  Film,
  TrendingUp,
  Flag,
  Menu,
  Paperclip,
  Mic,
  MessageSquare,
  Folder,
  FolderPlus,
  MousePointer2,
  Pin,
  Copy,
  ArrowDown,
  ArrowRight,
  MoreVertical,
  Video,
  Volume2,
  VolumeX,
  Pen,
  Smile,
  ShieldCheck,
  ShieldAlert,
  Key,
  BarChart2,
  Link,
  ChevronDown,
  ChevronUp,
  Hash,
  UserPlus,
  Radio,
  Hourglass,
  Timer,
  Palette,
  PhoneOff,
  PhoneCall,
  PhoneForwarded,
  MicOff,
  VideoOff,
  Volume1,
  PenLine,
  Type,
  Eraser,
  RotateCcw,
  Twitter,
  Instagram,
  Github,
  Zap,
  AlertTriangle,
  Square,
  Monitor,
  Smartphone,
  History,
  CheckCircle2,
  RefreshCw,
  Gem,
  Ghost,
  Flame,
  Crown,
  BadgeCheck,
  ShieldCheck as ShieldVerified,
  Languages,
  Wallpaper,
  LockKeyhole,
  Delete,
  Undo,
  Redo,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscriptionService, PREMIUM_PACKAGE } from './services/subscriptionService';
import { transcriptionService } from './services/transcriptionService';
import { GifPicker } from './components/GifPicker';
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  getDocs,
  where,
  setDoc,
  writeBatch,
  getDocFromServer,
  Timestamp,
  increment,
  limit,
  arrayUnion,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
}

interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Global state for errors and loading that should be shown in the UI
let globalErrorSetter: ((info: FirestoreErrorInfo | null) => void) | null = null;
let globalLoadingSetter: ((active: boolean) => void) | null = null;

export const setGlobalLoading = (active: boolean) => {
  if (globalLoadingSetter) globalLoadingSetter(active);
};

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    code: error?.code || error?.name || 'unknown',
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  
  // Detailed logging for developers
  console.group('🔥 Firestore Diagnostic Error');
  console.error('Operation:', operationType);
  console.error('Path:', path);
  console.error('Error Code:', errInfo.code);
  console.error('Error Message:', errInfo.error);
  console.error('Auth User:', auth.currentUser?.uid || 'Not Authenticated');
  
  // Defensive logging to prevent circular structure errors during stringification by platform loggers
  try {
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      const safeError = {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        ...Object.keys(error).reduce((acc: any, key) => {
          const val = error[key];
          if (typeof val !== 'object' || val === null) acc[key] = val;
          return acc;
        }, {})
      };
      console.error('Raw Error (Sanitized):', safeError);
    } else {
      console.error('Raw Error:', error);
    }
  } catch (e) {
    console.error('Raw Error (Stringified):', String(error));
  }
  
  console.groupEnd();
  
  if (globalErrorSetter) {
    globalErrorSetter(errInfo);
  }
}

function FirestoreErrorBanner({ error, onDismiss }: { error: FirestoreErrorInfo, onDismiss: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-4 right-4 z-[1000] bg-zinc-900 border border-red-500/50 p-5 rounded-[32px] shadow-2xl flex items-center justify-between gap-6 backdrop-blur-2xl"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h4 className="font-black text-white text-base">خطأ في قواعد البيانات</h4>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-[9px] font-black bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 uppercase">
              CODE: {error.code}
            </span>
            <span className="text-[9px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700 uppercase">
              OP: {error.operationType}
            </span>
            <span className="text-[9px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700 uppercase">
              {error.path || 'Global'}
            </span>
          </div>
          <p className="text-xs mt-2 text-zinc-400 font-medium line-clamp-1 italic">{error.error}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onDismiss}
          className="p-3 hover:bg-zinc-800 rounded-2xl text-zinc-500 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </motion.div>
  );
}

// --- Loader Components ---
function TopLoadingBar({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 origin-left z-[2000]"
          transition={{ 
            scaleX: { duration: 2, ease: "linear", repeat: Infinity },
            opacity: { duration: 0.3 }
          }}
        />
      )}
    </AnimatePresence>
  );
}

// --- Skeleton Components ---
function PostSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden mb-8 animate-pulse">
      <div className="p-5 flex items-center gap-3.5">
        <div className="w-11 h-11 bg-zinc-800 rounded-full" />
        <div className="space-y-2">
          <div className="w-24 h-4 bg-zinc-800 rounded-lg" />
          <div className="w-16 h-3 bg-zinc-800 rounded-lg opacity-50" />
        </div>
      </div>
      <div className="px-5 pb-5 space-y-3">
        <div className="w-full h-4 bg-zinc-800 rounded-lg" />
        <div className="w-2/3 h-4 bg-zinc-800 rounded-lg" />
        <div className="w-full h-64 bg-zinc-800 rounded-2xl mt-4" />
      </div>
      <div className="px-5 py-4 border-t border-zinc-800/50 flex gap-6">
        <div className="w-12 h-6 bg-zinc-800 rounded-lg" />
        <div className="w-12 h-6 bg-zinc-800 rounded-lg" />
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-24 h-24 md:w-32 md:h-32 bg-zinc-800 rounded-full mb-6" />
      <div className="w-48 h-8 bg-zinc-800 rounded-lg mb-2" />
      <div className="w-32 h-4 bg-zinc-800 rounded-lg mb-10" />
      <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-10">
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-zinc-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-1 w-full max-w-lg">
        {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-zinc-800 rounded-xl" />)}
      </div>
    </div>
  );
}

function UserListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
          <div className="w-12 h-12 bg-zinc-800 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="w-32 h-4 bg-zinc-800 rounded-lg" />
            <div className="w-24 h-3 bg-zinc-800 rounded-lg opacity-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Types ---
interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface Poll {
  question: string;
  options: PollOption[];
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string; // Legacy
  caption?: string; 
  mediaUrl?: string; 
  mediaType?: 'image' | 'video';
  imageUrl?: string; // Legacy
  createdAt: Timestamp | any;
  likesCount?: number;
  poll?: Poll;
  gifUrl?: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: any;
  parentId?: string;
  isPinned?: boolean;
  likesCount?: number;
  gifUrl?: string;
}

interface Like {
  userId: string;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  publicKey?: string;
  lastSeen?: any;
  username?: string;
  bio?: string;
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
}

interface Chat {
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
}

export const FILTER_MAP: Record<string, string> = {
  none: 'none',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(80%)',
  brightness: 'brightness(130%)',
  warm: 'sepia(30%) saturate(140%) brightness(110%)',
  cool: 'saturate(90%) hue-rotate(15deg)',
  contrast: 'contrast(150%) brightness(95%)',
};

export const getAvatarStyle = (chat: Chat | undefined | null) => {
  if (!chat) return {};
  const styles: React.CSSProperties = {};
  
  const scale = chat.avatarZoom || 1;
  const x = chat.avatarPanX || 0;
  const y = chat.avatarPanY || 0;
  if (scale !== 1 || x !== 0 || y !== 0) {
    styles.transform = `scale(${scale}) translate(${x}px, ${y}px)`;
    styles.transformOrigin = 'center center';
  }
  
  if (chat.avatarFilter && chat.avatarFilter !== 'none') {
    styles.filter = FILTER_MAP[chat.avatarFilter] || 'none';
  }
  return styles;
};

interface Message {
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
  type?: 'text' | 'image' | 'video' | 'audio' | 'file';
  fileUrl?: string;
  audioDuration?: number;
}

interface CallSession {
  id: string;
  chatId: string;
  title: string;
  active: boolean;
  startedAt: any;
  smartBoardEnabled?: boolean;
}

interface CallParticipant {
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
}

interface WhiteboardElementData {
  id: string;
  type: 'path' | 'text';
  d?: string;
  color: string;
  width: number;
  text?: string;
  x?: number;
  y?: number;
  creatorId: string;
  createdAt: any;
}

interface Folder {
  id: string;
  userId: string;
  name: string;
  createdAt: any;
}

interface LivePoll {
  question: string;
  options: {
    id: string;
    text: string;
    votes: number;
  }[];
  votedUserIds?: { [userId: string]: string };
  isActive: boolean;
  createdAt: any;
}

interface LiveStream {
  id: string;
  hostId: string;
  hostName: string;
  hostPhoto: string;
  title: string;
  status: 'active' | 'ended';
  startedAt: any;
  endedAt?: any;
  viewerCount: number;
  cameraEnabled?: boolean;
  micEnabled?: boolean;
  moderatorIds?: string[];
  moderators?: { uid: string; name: string; photo?: string }[];
  blockedIds?: string[];
  blockedUsers?: { uid: string; name: string; photo?: string }[];
  mutedIds?: string[];
  mutedUsers?: { uid: string; name: string; photo?: string }[];
  guestInvite?: {
    targetUid: string;
    targetName: string;
    targetPhoto?: string;
    status: 'pending' | 'accepted' | 'declined';
  } | null;
  guest?: {
    uid: string;
    name: string;
    photo?: string;
    camEnabled: boolean;
    micEnabled: boolean;
  } | null;
  pkBattle?: {
    opponentStreamId: string;
    opponentName: string;
    opponentPhoto?: string;
    pointsHost: number;
    pointsOpponent: number;
    timeLeft: number;
    status: 'active' | 'ended';
  } | null;
  poll?: LivePoll | null;
  pinnedComment?: {
    id: string;
    userName: string;
    userPhoto?: string;
    text: string;
    userId: string;
  } | null;
}

// --- Utils ---
async function sanitizeMedia(file: File): Promise<File> {
  // Only process images for EXIF stripping in browser
  if (!file.type.startsWith('image/')) {
    console.log('🎞️ Video metadata stripping is handled by Cloudinary during upload.');
    return file; 
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const sanitizedFile = new File([blob], file.name, { type: file.type });
              console.log('🛡️ Image metadata (EXIF) stripped successfully.');
              resolve(sanitizedFile);
            } else {
              resolve(file);
            }
          }, file.type);
        } else {
          resolve(file);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Anonymizes potentially sensitive data by using a non-reversible hashing/transformation
 * if it were to be stored. Currently used as a policy safeguard.
 * TruCast Policy: No IP logging, no location tracking.
 */
function anonymizeData(data: string): string {
  // Simple obfuscation for dev view if needed, though we avoid storing sensitive data entirely.
  // In a real scenario, this would be a cryptographic hash if the data must be stored but not readable.
  return `TRU_${btoa(data).substring(0, 12)}...`;
}

// --- Badge Components ---
function VerifiedBadge({ isVerified, size = "sm" }: { isVerified?: boolean, size?: "sm" | "md" }) {
  if (!isVerified) return null;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5 ml-1 shadow-sm" title="حساب موثق">
      <BadgeCheck className={iconSize} />
    </div>
  );
}

function PremiumBadge({ isPremium, size = "sm" }: { isPremium?: boolean, size?: "sm" | "md" }) {
  if (!isPremium) return null;
  const badgeSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <span className={`${badgeSize} select-none ml-1 cursor-default`} title="عضو متميز (💠)">
      💠
    </span>
  );
}

// --- Premium Components ---
function PremiumSubscriptionModal({ 
  user, 
  onClose, 
  onSuccess 
}: { 
  user: UserProfile, 
  onClose: () => void, 
  onSuccess: () => void 
  }) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    const success = await subscriptionService.purchasePremium(user?.uid);
    setLoading(false);
    if (success) {
      alert("تهانينا! أنت الآن عضو متميز في TruCast.");
      onSuccess();
      onClose();
    } else {
      alert("فشلت عملية الشراء. حاول مرة أخرى.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="relative h-48 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col items-center justify-center text-center p-6">
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-20 h-20 bg-white/20 rounded-3xl backdrop-blur-md flex items-center justify-center mb-4 border border-white/30"
          >
            <Crown className="w-12 h-12 text-yellow-300" />
          </motion.div>
          <h2 className="text-2xl font-black text-white">TruCast Premium</h2>
          <p className="text-white/80 text-sm font-bold mt-1">حرية أكبر، خصوصية أعمق</p>
        </div>

        <div className="p-8 space-y-5">
          <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <span className="text-xl">💠</span>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">شارة الماسة الحصرية</h4>
                <p className="text-zinc-500 text-xs">احصل على شارة الماسة المتوهجة (💠) بجوار اسمك لتمييز حضورك في المنصة.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">الردود الذكية (AI Smart Replies)</h4>
                <p className="text-zinc-500 text-xs">احصل على اقتراحات ذكية وفورية للرد على التعليقات مدعومة بالذكاء الاصطناعي.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Ghost className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">وضع التخفي المطلق</h4>
                <p className="text-zinc-500 text-xs">أخفِ حالة القراءة (الصح الأزرق) وحالة الكتابة.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                <LockKeyhole className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Chat Vault</h4>
                <p className="text-zinc-500 text-xs">قفل المحادثات بكلمات مرور سرية.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Languages className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Transcribe Pro</h4>
                <p className="text-zinc-500 text-xs">تحويل الرسائل الصوتية إلى نص بضغطة واحدة.</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 p-4 rounded-3xl border border-zinc-700/50 flex items-center justify-between">
            <div>
              <p className="text-white font-black text-lg">{PREMIUM_PACKAGE.price}</p>
              <p className="text-zinc-500 text-[10px] font-bold">تجديد تلقائي شهرياً</p>
            </div>
            <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">
              Sandbox Mode
            </div>
          </div>

          <button 
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-4 bg-white text-black font-black rounded-3xl hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "اشترك الآن وتجمل"
            )}
          </button>
          
          <p className="text-center text-zinc-600 text-[9px] font-bold">
            هذه عملية شراء وهمية لبيئة الاختبار فقط. لن يتم خصم أي مبالغ حقيقية.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChatPasscodeModal({ 
  onCorrect, 
  onCancel,
  chatName
}: { 
  onCorrect: () => void, 
  onCancel: () => void,
  chatName?: string
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "1234") { // Mock passcode for demo
      onCorrect();
    } else {
      setError(true);
      setPasscode("");
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-[40px] w-full max-w-sm p-8 text-center"
      >
        <div className="w-16 h-16 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <LockKeyhole className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">المحادثة مقفلة</h3>
        <p className="text-zinc-500 text-xs font-bold mb-8">أدخل كلمة المرور للدخول إلى {chatName || "المحادثة"}</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  passcode.length > i 
                    ? "bg-white border-white scale-125" 
                    : error ? "border-red-500 scale-90" : "border-zinc-700 bg-transparent"
                }`} 
              />
            ))}
          </div>

          <input 
            autoFocus
            type="password"
            maxLength={4}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ""))}
            className="sr-only"
          />

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "X"].map((num, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (num === "X") setPasscode(passcode.slice(0, -1));
                  else if (num !== "" && passcode.length < 4) setPasscode(passcode + num);
                }}
                className={`h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90 ${
                  num === "" ? "opacity-0 pointer-events-none" : "bg-zinc-800/50 hover:bg-zinc-800 text-white"
                }`}
              >
                {num === "X" ? <Delete className="w-6 h-6" /> : num}
              </button>
            ))}
          </div>

          <div className="pt-4">
            <button 
              type="button"
              onClick={onCancel} 
              className="text-zinc-600 font-bold hover:text-white transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

const formatPostDate = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 0 ? "الآن" : `منذ ${diffInMinutes} دقيقة`;
    }
    return `منذ ${Math.floor(diffInHours)} ساعة`;
  } else {
    return date.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

// --- E2EE Utilities ---

async function generateEncryptionKeys() {
  const keys = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keys;
}

async function exportPublicKeyStr(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

async function exportPrivateKeyStr(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("pkcs8", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

async function importPublicKeyFromStr(pem: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

async function importPrivateKeyFromStr(pem: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

async function encryptWithAES(text: string) {
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const exportedKey = await window.crypto.subtle.exportKey("raw", key);
  return {
    encryptedText: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    rawKey: exportedKey
  };
}

async function decryptWithAES(encryptedText: string, ivBase64: string, rawKey: ArrayBuffer) {
  const key = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    true,
    ["decrypt"]
  );
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

async function encryptAESKeyWithRSA(rawAESKey: ArrayBuffer, rsaPublicKey: CryptoKey) {
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    rawAESKey
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function decryptAESKeyWithRSA(encryptedAESKey: string, rsaPrivateKey: CryptoKey) {
  const data = Uint8Array.from(atob(encryptedAESKey), c => c.charCodeAt(0));
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    rsaPrivateKey,
    data
  );
  return decrypted; // raw AES key
}

const NAV_ICONS: Record<string, any> = {
  Home, 
  Search, 
  PlusSquare, 
  User, 
  Users,
  ImageIcon, 
  Heart, 
  MessageCircle, 
  Sparkles,
  Grid,
  Edit2,
  Bookmark,
  Play,
  Settings,
  Mail,
  Plus,
  Tv,
  Bell,
  Shield,
  Clock,
  Lock,
  Eye,
  Camera,
  Film,
  TrendingUp,
  Menu,
  Paperclip,
  Mic,
  MessageSquare,
  Video,
  Smile,
  Hash,
  Palette,
  Timer,
  Radio,
  Send
};

const PROFILE_COLORS = [
  { name: 'افتراضي', value: 'bg-zinc-950', text: 'text-white' },
  { name: 'أزرق ملكي', value: 'bg-blue-900', text: 'text-blue-50' },
  { name: 'بنفسجي عميق', value: 'bg-purple-950', text: 'text-purple-50' },
  { name: 'زمردي', value: 'bg-emerald-950', text: 'text-emerald-50' },
  { name: 'أحمر داكن', value: 'bg-rose-950', text: 'text-rose-50' },
  { name: 'برتقالي مخملي', value: 'bg-orange-950', text: 'text-orange-50' },
  { name: 'رمادي صلب', value: 'bg-zinc-800', text: 'text-zinc-100' },
  { name: 'أسود مطلق', value: 'bg-black', text: 'text-zinc-400' },
  { name: 'فجر بارد', value: 'bg-gradient-to-br from-zinc-900 to-blue-900', text: 'text-white' },
  { name: 'غسق بنفسجي', value: 'bg-gradient-to-br from-zinc-900 to-purple-900', text: 'text-white' },
  { name: 'طاقة حمراء', value: 'bg-gradient-to-br from-zinc-900 to-red-900', text: 'text-white' },
  { name: 'كثيب رملي', value: 'bg-amber-950', text: 'text-amber-50' },
];

const PROFILE_FONTS = [
  { name: 'Inter (افتراضي)', value: 'font-sans' },
  { name: 'Mono (تقني)', value: 'font-mono' },
  { name: 'Serif (كلاسيكي)', value: 'font-serif' },
  { name: 'Black (عريض جداً)', value: 'font-black' },
  { name: 'Arabic Mono (خط مهني)', value: 'font-mono tracking-tight' },
];

// --- Cloudinary Chunked/Signed Upload Helper ---
async function uploadFileInChunks(
  file: File, 
  config: { signature: string, timestamp: string, cloud_name: string, api_key: string }, 
  onProgress?: (p: number) => void
): Promise<string> {
  const { signature, timestamp, cloud_name, api_key } = config;
  const CHUNK_SIZE = 6000000; // 6MB as requested
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  // Ensure the ID is safe and unique
  const uniqueId = 'tru_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
  
  console.log(`☁️ Chunked upload: ${file.name} | Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB | Chunks: ${totalChunks}`);
  
  let finalUrl = '';

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('file', chunkBlob);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp);
    formData.append('api_key', api_key);
    formData.append('folder', 'trucast');

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // Using 'auto' allows Cloudinary to handle both images and videos
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`;
      
      xhr.open('POST', uploadUrl);
      
      // Essential headers for Cloudinary signed chunking
      xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
      xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${file.size}`);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const resp = JSON.parse(xhr.responseText || '{}');
          if (i === totalChunks - 1) {
            finalUrl = resp.secure_url || resp.url;
          }
          console.log(`✅ Chunk ${i + 1}/${totalChunks} OK`);
          resolve(true);
        } else {
          let msg = xhr.statusText || 'Error';
          try { 
            const err = JSON.parse(xhr.responseText);
            msg = err.error?.message || msg;
          } catch(e) {}
          console.error(`❌ Chunk ${i + 1} failed (${xhr.status}):`, msg);
          reject(new Error(`فشل رفع الجزء ${i + 1} من الفيديو: ${msg}`));
        }
      };
      
      xhr.onerror = () => {
        console.error(`❌ Network error on chunk ${i + 1}`);
        reject(new Error('انقطع الاتصال أثناء رفع الفيديو. تأكد من ثبات الإنترنت.'));
      };
      
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadedSoFar = start + e.loaded;
            const percentage = Math.round((uploadedSoFar / file.size) * 100);
            // Cap at 99% until the last response confirms success
            onProgress(Math.min(percentage, 99));
          }
        };
      }
      
      xhr.send(formData);
    });
  }
  
  if (onProgress) onProgress(100);
  console.log('✨ Large upload complete!');
  return finalUrl;
}

// --- Cloudinary Signed Upload ---
async function uploadToCloudinarySigned(file: File, onProgress?: (p: number) => void): Promise<string> {
  const sanitizedFile = await sanitizeMedia(file);
  const isVideo = sanitizedFile.type.startsWith('video/');
  const isLarge = sanitizedFile.size > 20 * 1024 * 1024; // > 20MB

  console.log(`☁️ Fetching signature for media upload: ${sanitizedFile.name} (${(sanitizedFile.size / (1024 * 1024)).toFixed(2)}MB)`);
  
  const signatureRes = await fetch('/api/cloudinary-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: 'trucast' })
  });

  if (!signatureRes.ok) {
    const err = await signatureRes.json().catch(() => ({}));
    throw new Error(err.error || 'فشل جلب تصريح الرفع من الخادم');
  }

  const config = await signatureRes.json();
  const { signature, timestamp, cloud_name, api_key } = config;

  // IF Video OR Large file, use chunked upload
  if (isVideo || isLarge) {
    return uploadFileInChunks(sanitizedFile, { signature, timestamp, cloud_name, api_key }, onProgress);
  }

  // Fallback for small images: standard direct-to-Cloudinary upload
  const resourceType = 'auto'; 
  const formData = new FormData();
  formData.append('file', sanitizedFile);
  formData.append('api_key', api_key);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', 'trucast');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`;
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        const err = JSON.parse(xhr.responseText || '{}');
        reject(new Error(`فشل رفع الملف: ${err.error?.message || xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('خطأ في الشبكة أثناء الرفع.'));
    xhr.send(formData);
  });
}

// --- Components ---

function FullscreenViewer({ 
  mediaUrl,
  mediaType = 'image', 
  onClose 
}: { 
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  onClose: () => void 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="w-8 h-8 text-white" />
      </button>
      
      {mediaType === 'video' ? (
        <motion.video 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          src={mediaUrl} 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
          controls
          autoPlay
        />
      ) : (
        <motion.img 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          src={mediaUrl} 
          alt="Full view" 
          className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
        />
      )}
    </motion.div>
  );
}

let currentRouterState: any = null;
function useLocation() {
  return { state: currentRouterState };
}

function CommentsComponent({ 
  postId, 
  collectionPath = 'posts',
  currentUser, 
  postOwnerId,
  onNavigateToUser,
  onClose
}: { 
  postId: string; 
  collectionPath?: 'posts' | 'reels';
  currentUser: FirebaseUser | null; 
  postOwnerId: string;
  onNavigateToUser: (uid: string) => void;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [sessionLikedComments, setSessionLikedComments] = useState<Record<string, boolean>>({});
  
  const [postContext, setPostContext] = useState<{ content?: string; mediaUrl?: string; imageUrl?: string; videoUrl?: string; thumbnailUrl?: string; userName?: string; userPhoto?: string } | null>(null);
  const [showContextPreview, setShowContextPreview] = useState(true);

  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const [smartRepliesError, setSmartRepliesError] = useState<string | null>(null);

  const isPremium = userProfile?.isPremium === true;

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    const userRef = doc(db, 'users', currentUser?.uid);
    getDoc(userRef).then((snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    }).catch(err => console.log("Error loading user profile in comments:", err));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !isPremium) {
      setSmartReplies([]);
      return;
    }

    const sourceText = replyTo ? replyTo.content : postContext?.content;
    if (!sourceText) {
      setSmartReplies([]);
      return;
    }

    let isMounted = true;
    setSmartRepliesLoading(true);
    setSmartRepliesError(null);

    fetch('/api/gemini/suggest-replies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commentText: sourceText }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch smart replies');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSmartReplies(data.replies || []);
        }
      })
      .catch((err) => {
        console.log("Error fetching smart replies:", err);
        if (isMounted) {
          setSmartRepliesError(err.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setSmartRepliesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [replyTo?.id, postContext?.content, currentUser, isPremium]);

  const commentsListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const docRef = doc(db, collectionPath, postId);
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        setPostContext(snap.data());
      }
    }).catch(err => console.log("Error loading context:", err));
  }, [postId, collectionPath]);

  useEffect(() => {
    if (commentsListRef.current) {
      commentsListRef.current.scrollTo({
        top: commentsListRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [comments.length]);

  useEffect(() => {
    const commentsRef = collection(db, collectionPath, postId, 'comments');
    const q = query(commentsRef, orderBy('isPinned', 'desc'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `${collectionPath}/${postId}/comments`));
    return unsub;
  }, [postId, collectionPath]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newComment]);

  const sanitizeText = (text: string): string => {
    if (!text) return "";
    let sanitized = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "")
      .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, "")
      .replace(/<applet[^>]*>[\s\S]*?<\/applet>/gi, "")
      .replace(/<meta[^>]*>/gi, "")
      .replace(/<link[^>]*>/gi, "");

    sanitized = sanitized.replace(/on\w+\s*=\s*(['"][^'"]*['"]|\S+)/gi, "");
    sanitized = sanitized.replace(/javascript:\s*/gi, "");
    sanitized = sanitized.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return sanitized.trim();
  };

  const handleAddComment = async () => {
    if ((!newComment.trim() && !selectedGifUrl) || !currentUser) return;
    const commentText = sanitizeText(newComment.trim());
    const path = `${collectionPath}/${postId}/comments`;
    setNewComment("");
    const prevGifUrl = selectedGifUrl;
    setSelectedGifUrl(null);
    const prevReplyTo = replyTo;
    setReplyTo(null);
    try {
      await addDoc(collection(db, path), {
        userId: currentUser?.uid,
        userName: currentUser.displayName || "مستخدم",
        userPhoto: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
        content: commentText,
        gifUrl: prevGifUrl || null,
        parentId: prevReplyTo?.id || null,
        likesCount: 0,
        isPinned: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      setNewComment(commentText);
      setSelectedGifUrl(prevGifUrl);
      setReplyTo(prevReplyTo);
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    if (!currentUser) console.log("No user");
    const path = `${collectionPath}/${postId}/comments/${comment.id}/likes/${currentUser?.uid}`;
    const commentRef = doc(db, collectionPath, postId, 'comments', comment.id);
    
    // Toggle session state immediately for instant feedback
    const isCurrentlyLiked = sessionLikedComments[comment.id];
    setSessionLikedComments(prev => ({ ...prev, [comment.id]: !isCurrentlyLiked }));

    setGlobalLoading(true);
    try {
      const likeDoc = await getDoc(doc(db, path));
      if (likeDoc.exists()) {
        await deleteDoc(doc(db, path));
        await updateDoc(commentRef, { likesCount: increment(-1) });
      } else {
        await setDoc(doc(db, path), { userId: currentUser?.uid, createdAt: serverTimestamp() });
        await updateDoc(commentRef, { likesCount: increment(1) });
      }
    } catch (e) {
      // Revert session state on error
      setSessionLikedComments(prev => ({ ...prev, [comment.id]: isCurrentlyLiked }));
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
    const path = `${collectionPath}/${postId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, path));
      setActiveMenu(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const handlePinComment = async (comment: Comment) => {
    const path = `${collectionPath}/${postId}/comments/${comment.id}`;
    try {
      await updateDoc(doc(db, path), { isPinned: !comment.isPinned });
      setActiveMenu(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editValue.trim()) return;
    const sanitizedEdit = sanitizeText(editValue.trim());
    if (!sanitizedEdit) {
      alert("التعليق فارغ أو غير صالح!");
      return;
    }
    const path = `${collectionPath}/${postId}/comments/${editingComment.id}`;
    try {
      await updateDoc(doc(db, path), { content: sanitizedEdit, updatedAt: serverTimestamp() });
      setEditingComment(null);
      setEditValue("");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleCopyComment = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("تم نسخ التعليق");
    setActiveMenu(null);
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = currentUser?.uid === comment.userId;
    const isPostOwner = currentUser?.uid === postOwnerId;
    const replies = comments.filter(c => c.parentId === comment.id);
    const isExpanded = expandedReplies[comment.id];
    
    // Check liked status (optimistic or from data)
    const isLiked = sessionLikedComments[comment.id] !== undefined 
      ? sessionLikedComments[comment.id] 
      : (comment.likesCount ? comment.likesCount > 0 : false);

    return (
      <motion.div 
        key={comment.id} 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className={`flex gap-3.5 ${isReply ? 'mr-12 py-1.5' : 'py-4'} group/comment animate-in fade-in slide-in-from-bottom-3 duration-500 relative rounded-2xl px-2 -mx-2 hover:bg-zinc-900/10 transition-colors`}
        onContextMenu={(e) => {
          e.preventDefault();
          setActiveMenu(comment.id);
        }}
      >
        {isReply && (
          <div className="absolute top-0 right-[-1.75rem] bottom-0 w-[1.5px] bg-gradient-to-b from-indigo-500/30 via-zinc-800/40 to-transparent rounded-full" />
        )}
        <div 
          onClick={() => onNavigateToUser(comment.userId)}
          className="shrink-0 cursor-pointer relative"
        >
          <img 
            src={comment.userPhoto} 
            className={`${isReply ? 'w-7 h-7' : 'w-9 h-9'} rounded-full border-2 border-zinc-900 object-cover shadow-lg group-hover/comment:scale-110 transition-transform duration-300`} 
            alt="" 
          />
          {comment.userId === postOwnerId && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full p-0.5 border-2 border-zinc-950 shadow-md">
              <Check className="w-2 h-2 text-white font-bold" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 text-right" dir="rtl">
              <div 
                className="flex items-center gap-2 mb-0.5 flex-wrap"
                onClick={() => onNavigateToUser(comment.userId)}
              >
                <span className="text-zinc-100 font-bold text-[13px] cursor-pointer hover:underline">{comment.userName}</span>
                
                {comment.isPinned && (
                  <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-black uppercase tracking-tighter bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                    <Pin className="w-2.5 h-2.5 rotate-45" />
                    مثبت
                  </div>
                )}
                
                {comment.userId === postOwnerId && (
                  <span className="text-[9px] text-blue-400 font-black uppercase tracking-tighter bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/15">صاحب المنشور</span>
                )}
                
                {currentUser?.uid === comment.userId && (
                  <span className="text-[9px] text-zinc-400 font-black uppercase tracking-tighter bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/40">أنت</span>
                )}
              </div>
              
              {comment.content && (
                <p className="text-zinc-300 text-[13.5px] leading-relaxed whitespace-pre-wrap font-medium">
                  {comment.content}
                </p>
              )}

              {comment.gifUrl && (
                <div className="mt-2.5 max-w-[220px] rounded-2xl overflow-hidden border border-zinc-900/50 bg-zinc-900 shadow-md">
                  <img 
                    src={comment.gifUrl} 
                    alt="GIF" 
                    className="w-full h-auto object-cover max-h-[160px] select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 text-[11px] font-black text-zinc-500 mt-2.5">
                <span className="text-zinc-600">{formatPostDate(comment.createdAt)}</span>
                <button 
                  onClick={() => {
                    setReplyTo(comment);
                    setNewComment(`@${comment.userName} `);
                  }}
                  className="hover:text-zinc-300 transition-colors uppercase tracking-tight font-extrabold"
                >
                  رد
                </button>
                {(comment.likesCount ?? 0) > 0 && (
                  <span className="text-zinc-400">{comment.likesCount} إعجاب</span>
                )}
              </div>
            </div>

            {/* Interaction Buttons beside comment */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleLikeComment(comment)}
                className="mt-1 text-zinc-600 hover:text-red-500 transition-all active:scale-75 group/like p-1 rounded-full hover:bg-zinc-900/40"
              >
                <Heart className={`w-4 h-4 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover/like:scale-125'}`} />
              </button>
              
              <button 
                onClick={() => setActiveMenu(comment.id)}
                className="mt-1 text-zinc-600 hover:text-white transition-colors p-1 rounded-full hover:bg-zinc-900/40"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {activeMenu === comment.id && (
              <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setActiveMenu(null)}>
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 240 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-sm bg-zinc-900 border-t border-x md:border border-zinc-800 rounded-t-[32px] md:rounded-[32px] p-6 pb-12 md:pb-6 space-y-2 overflow-hidden shadow-2xl"
                >
                  <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />
                  
                  {/* Logic-based Menu Options */}
                  
                  {/* 1. Edit (Only for Author) */}
                  {isOwner && (
                    <button 
                      onClick={() => {
                        setEditingComment(comment);
                        setEditValue(comment.content);
                        setActiveMenu(null);
                      }}
                      className="w-full flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl text-white font-bold transition-all"
                    >
                      <span>تعديل التعليق</span>
                      <Edit2 className="w-5 h-5 text-zinc-500" />
                    </button>
                  )}

                  {/* 2. Copy (For Everyone) */}
                  <button 
                    onClick={() => handleCopyComment(comment.content)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl text-white font-bold transition-all"
                  >
                    <span>نسخ</span>
                    <Copy className="w-5 h-5 text-zinc-500" />
                  </button>

                  {/* 3. Share to Story (For Everyone) */}
                  <button 
                    onClick={() => {
                      currentRouterState = { sharedComment: comment };
                      setActiveMenu(null);
                      if (onClose) onClose();
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: { tab: 'create-story' } }));
                    }}
                    className="w-full flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl text-white font-bold transition-all"
                  >
                    <span>مشاركة في القصة</span>
                    <PlusSquare className="w-5 h-5 text-zinc-500" />
                  </button>

                  {/* 4. Share to Reels (For Everyone) */}
                  <button 
                    onClick={() => {
                      currentRouterState = { sharedComment: comment };
                      setActiveMenu(null);
                      if (onClose) onClose();
                      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: { tab: 'create-reel' } }));
                    }}
                    className="w-full flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl text-white font-bold transition-all"
                  >
                    <span>مشاركة في ريلز</span>
                    <PlayCircle className="w-5 h-5 text-zinc-500" />
                  </button>

                  {/* 5. Pin (Only for Post Owner) */}
                  {isPostOwner && (
                    <button 
                      onClick={() => handlePinComment(comment)}
                      className={`w-full flex items-center justify-between p-4 ${comment.isPinned ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800/40 text-white'} hover:bg-opacity-80 rounded-2xl font-bold transition-all`}
                    >
                      <span>{comment.isPinned ? "إلغاء التثبيت" : "تثبيت التعليق"}</span>
                      <Pin className="w-5 h-5" />
                    </button>
                  )}

                  {/* 6. Delete (For Author OR Post Owner) */}
                  {(isOwner || isPostOwner) && (
                    <button 
                      onClick={() => handleDeleteComment(comment.id)}
                      className="w-full flex items-center justify-between p-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl font-bold transition-all"
                    >
                      <span>حذف التعليق</span>
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  {/* 7. Report (For Everyone except Author) */}
                  {!isOwner && (
                    <button 
                      onClick={() => { alert("تم استلام بلاغك، سنراجع التعليق"); setActiveMenu(null); }}
                      className="w-full flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl text-red-400 font-bold transition-all"
                    >
                      <span>إبلاغ</span>
                      <AlertTriangle className="w-5 h-5" />
                    </button>
                  )}

                  <button 
                    onClick={() => setActiveMenu(null)}
                    className="w-full py-4 text-zinc-500 font-black hover:text-white transition-colors border-t border-zinc-800/50 mt-2"
                  >
                    إلغاء
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {replies.length > 0 && (
            <div className="mt-3">
              {!isExpanded ? (
                <button 
                  onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: true }))}
                  className="flex items-center gap-3 text-zinc-600 hover:text-zinc-400 text-[11px] font-black transition-all pl-2"
                >
                  <div className="w-10 h-[1px] bg-zinc-800" />
                  <span>عرض الردود ({replies.length})</span>
                </button>
              ) : (
                <div className="relative">
                  <div className="absolute top-0 right-[-1.5rem] bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/10 via-zinc-800/30 to-transparent rounded-full" />
                  <div>
                    {replies.map(reply => renderComment(reply, true))}
                  </div>
                  <button 
                    onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: false }))}
                    className="flex items-center gap-3 text-zinc-600 hover:text-zinc-400 text-[11px] font-black transition-all pl-2 mt-2"
                  >
                    <div className="w-10 h-[1px] bg-zinc-800" />
                    <span>إخفاء الردود</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Filter to only show root level comments in the list, then they will render their replies
  const rootComments = comments.filter(c => !c.parentId);
  const pinnedComments = rootComments.filter(c => c.isPinned);
  const unpinnedComments = rootComments.filter(c => !c.isPinned);

  // Dynamic sorting based on sortBy
  const sortedUnpinned = [...unpinnedComments].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.likesCount ?? 0) - (a.likesCount ?? 0);
    } else {
      const timeA = a.createdAt?.seconds ?? 0;
      const timeB = b.createdAt?.seconds ?? 0;
      return timeB - timeA;
    }
  });

  const sortedComments = [...pinnedComments, ...sortedUnpinned];

  return (
    <>
      <div className="fixed inset-0 z-[200] flex flex-col justify-end">
        {/* Blurred Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Bottom Sheet Container */}
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.y > 150 || velocity.y > 600) {
              onClose();
            }
          }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="relative w-full max-w-2xl mx-auto h-[85vh] bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Swipe Handle */}
          <div className="flex justify-center p-3 shrink-0 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1 bg-zinc-800 rounded-full" />
          </div>

          {/* Post Context Mini Preview */}
          {postContext && (
            <div className="mx-6 mb-2 bg-zinc-900/30 border border-zinc-800/60 rounded-2xl overflow-hidden transition-all duration-300">
              <div 
                onClick={() => setShowContextPreview(!showContextPreview)}
                className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 select-none transition-colors"
                dir="rtl"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img 
                      src={postContext.userPhoto || 'https://ui-avatars.com/api/?name=User'} 
                      className="w-6 h-6 rounded-full object-cover border border-zinc-800" 
                      alt="" 
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 border border-zinc-950">
                      <Check className="w-1.5 h-1.5 text-white" />
                    </div>
                  </div>
                  <span className="text-[12px] text-zinc-300 font-bold">نقاش حول منشور <strong className="text-white">@{postContext.userName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-bold">{showContextPreview ? "إخفاء المنشور" : "عرض المنشور"}</span>
                  <ChevronLeft className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${showContextPreview ? '-rotate-90' : 'rotate-180'}`} />
                </div>
              </div>

              {showContextPreview && (
                <div className="px-4 pb-3 flex gap-3 text-right" dir="rtl">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-[12.5px] leading-relaxed line-clamp-2 whitespace-pre-wrap font-medium">
                      {postContext.content || "لا يوجد نص في هذا المنشور"}
                    </p>
                  </div>
                  {(postContext.mediaUrl || postContext.imageUrl || postContext.videoUrl || postContext.thumbnailUrl) && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-800 shrink-0 bg-black relative">
                      <img 
                        src={postContext.mediaUrl || postContext.imageUrl || postContext.thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"} 
                        className="w-full h-full object-cover" 
                        alt="" 
                        referrerPolicy="no-referrer"
                      />
                      {(postContext.videoUrl || collectionPath === 'reels') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="w-4 h-4 text-white fill-white animate-pulse" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-2 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/20 backdrop-blur-md shrink-0">
            {/* Sort Switcher */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/60 p-1 rounded-xl" dir="rtl">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all ${
                  sortBy === 'newest' 
                    ? 'bg-zinc-800 text-white shadow' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                الأحدث
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all ${
                  sortBy === 'popular' 
                    ? 'bg-zinc-800 text-white shadow' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                الأكثر تفاعلاً
              </button>
            </div>

            <div className="flex flex-col text-right" dir="rtl">
              <h3 className="text-white font-black text-lg">التعليقات</h3>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">TruCast • {comments.length} تعليق</span>
            </div>

            <button 
              onClick={onClose}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comments List */}
          <div 
            ref={commentsListRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar"
          >
            {sortedComments.length > 0 ? (
              sortedComments.map(comment => renderComment(comment))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 opacity-30">
                <MessageSquare className="w-16 h-16 text-zinc-500 mb-4" />
                <p className="font-bold text-zinc-400">لا توجد نقاشات بعد.</p>
              </div>
            )}
          </div>

          {/* Input Area (Pinned to Bottom of Sheet) */}
          <div className="p-4 pb-8 bg-zinc-950 border-t border-zinc-900 shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
            {replyTo && (
              <div className="mb-3 px-4 py-2.5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                <p className="text-blue-400 text-[11px] font-black">جاري الرد على <span className="text-white">@{replyTo.userName}</span></p>
                <button onClick={() => { setReplyTo(null); setNewComment(""); }} className="p-1 hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            )}

            {selectedGifUrl && (
              <div className="mb-3 relative inline-block rounded-2xl overflow-hidden border border-zinc-900/50 bg-zinc-900 shadow-md">
                <img src={selectedGifUrl} alt="Selected GIF" className="max-h-24 object-cover rounded-2xl select-none" />
                <button
                  type="button"
                  onClick={() => setSelectedGifUrl(null)}
                  className="absolute top-1.5 left-1.5 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* AI Smart Replies / Suggestions */}
            {currentUser && (
              isPremium ? (
                // Premium User: Show Smart Replies UI
                <div className="mb-3" dir="rtl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                    <span className="text-[11px] text-zinc-400 font-extrabold">الردود الذكية المقترحة ✨</span>
                    {smartRepliesLoading && (
                      <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin ml-2" />
                    )}
                  </div>
                  
                  {smartRepliesLoading ? (
                    <div className="flex gap-2">
                      <div className="h-7 w-20 bg-zinc-900/50 border border-zinc-800/40 rounded-full animate-pulse" />
                      <div className="h-7 w-24 bg-zinc-900/50 border border-zinc-800/40 rounded-full animate-pulse" />
                      <div className="h-7 w-16 bg-zinc-900/50 border border-zinc-800/40 rounded-full animate-pulse" />
                    </div>
                  ) : smartReplies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto no-scrollbar py-0.5">
                      {smartReplies.map((reply, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setNewComment(reply);
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                            }
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 hover:from-violet-600/20 hover:to-indigo-600/20 border border-violet-500/20 hover:border-violet-500/45 text-zinc-100 hover:text-white text-[11px] font-bold rounded-full transition-all active:scale-95"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-600 font-semibold">لا توجد اقتراحات كافية للرد حالياً.</p>
                  )}
                </div>
              ) : (
                // Standard User: Show Premium promo banner
                <div className="mb-3 px-4 py-3 bg-gradient-to-r from-violet-950/40 via-indigo-950/40 to-zinc-950 border border-violet-500/15 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2" dir="rtl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400 animate-pulse shrink-0" />
                    <span className="text-zinc-300 text-[11px] font-bold text-right leading-normal">
                      اشترك في <strong className="text-violet-400">TruCast Premium</strong> لفتح ميزة الردود الذكية بالذكاء الاصطناعي!
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-premium-modal'));
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] font-extrabold rounded-xl shrink-0 transition-all active:scale-95 shadow-lg shadow-violet-900/20"
                  >
                    ترقية
                  </button>
                </div>
              )
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleAddComment();
              }}
              className="flex items-center gap-3 w-full"
            >
              <div className="flex-1 flex items-center gap-3 bg-zinc-900 border border-zinc-800/50 rounded-[28px] pl-2 pr-4 transition-all focus-within:border-zinc-700/50 group shadow-inner">
                <button 
                  type="button"
                  onClick={() => setShowGifPicker(true)}
                  className="p-1 text-zinc-500 hover:text-white transition-colors shrink-0"
                  title="إدراج صورة GIF"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded-md hover:border-violet-500 hover:text-violet-400">GIF</span>
                </button>
                <textarea 
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder={replyTo ? `رد على ${replyTo.userName}...` : "أضف تعليقاً..."}
                  rows={1}
                  className="flex-1 bg-transparent border-none text-white text-[14px] outline-none resize-none py-3 scrollbar-hide font-medium max-h-32"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim() && !selectedGifUrl}
                  className={`send-comment-button w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                    (newComment.trim() || selectedGifUrl) ? 'bg-blue-600 text-white scale-100' : 'bg-zinc-800 text-zinc-600 scale-90'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingComment && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-white">تعديل التعليق</h3>
                <button onClick={() => setEditingComment(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <textarea 
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-3xl p-4 text-white focus:border-blue-500 outline-none resize-none font-medium"
                />
                <button 
                  onClick={handleUpdateComment}
                  className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl shadow-xl shadow-blue-900/40 transition-all active:scale-95"
                >
                  حفظ التعديلات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGifPicker && (
          <GifPicker 
            onSelect={(url) => {
              setSelectedGifUrl(url);
              setShowGifPicker(false);
            }} 
            onClose={() => setShowGifPicker(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}


function PostCard({ 
  post, 
  currentUser,
  onViewMedia,
  onNavigateToUser
}: { 
  post: Post; 
  currentUser: FirebaseUser | null;
  onViewMedia: (url: string, type: 'image' | 'video') => void;
  onNavigateToUser: (uid: string) => void;
}) {
  const [likes, setLikes] = useState<string[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isMovingToFolder, setIsMovingToFolder] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [pollCopied, setPollCopied] = useState(false);
  const lastTapRef = useRef<number>(0);

  const triggerHeartEffect = (clientX: number, clientY: number, containerRect: DOMRect) => {
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;

    const newHeart = {
      id: Date.now() + Math.random(),
      x,
      y
    };
    setHearts(prev => [...prev, newHeart]);

    if (!isLiked) {
      handleLike();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerHeartEffect(e.clientX, e.clientY, rect);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.touches.length > 0) {
        triggerHeartEffect(e.touches[0].clientX, e.touches[0].clientY, rect);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const renderContentWithHashtags = (text: string) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.startsWith('#') && word.length > 1) {
        return (
          <span key={i} className="text-blue-400 font-semibold hover:underline cursor-pointer transition-colors duration-150">
            {word}
          </span>
        );
      } else if (word.startsWith('@') && word.length > 1) {
        return (
          <span key={i} className="text-indigo-400 font-semibold hover:underline cursor-pointer transition-colors duration-150">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  useEffect(() => {
    // Fetch Folders when menu is open or moving to folder
    if (!currentUser || (!showMenu && !isMovingToFolder)) return;
    const q = query(
      collection(db, 'folders'),
      where('userId', '==', currentUser?.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Folder)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'folders'));
    return unsub;
  }, [currentUser, showMenu, isMovingToFolder]);

  useEffect(() => {
    // Fetch real author data from 'users' collection
    if (post.userId) {
      const userRef = doc(db, 'users', post.userId);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setAuthor(docSnap.data() as any);
        }
      });
      return () => unsubUser();
    }
  }, [post.userId]);

  useEffect(() => {
    // Listen to likes
    const likesRef = collection(db, 'posts', post.id, 'likes');
    const unsubLikes = onSnapshot(likesRef, (snapshot) => {
      const userIds = snapshot.docs.map(doc => doc.id);
      setLikes(userIds);
      setIsLiked(userIds.includes(currentUser?.uid || ""));
    }, (err) => handleFirestoreError(err, OperationType.GET, `posts/${post.id}/likes`));

    // Listen to comments count
    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const unsubComments = onSnapshot(commentsRef, (snapshot) => {
      setCommentsCount(snapshot.docs.length);
    }, (err) => handleFirestoreError(err, OperationType.GET, `posts/${post.id}/comments`));

    // Check if favorited
    if (currentUser) {
      const favId = `${currentUser?.uid}_${post.id}`;
      const favRef = doc(db, 'favorites', favId);
      const unsubFav = onSnapshot(favRef, (docSnap) => {
        setIsFavorited(docSnap.exists());
      }, (err) => handleFirestoreError(err, OperationType.GET, `favorites/${favId}`));
      return () => {
        unsubLikes();
        unsubComments();
        unsubFav();
      };
    }

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [post.id, currentUser]);
  
  const handleLike = async () => {
    if (!currentUser) console.log("No user");
    const likeRef = doc(db, 'posts', post.id, 'likes', currentUser?.uid);
    const postRef = doc(db, 'posts', post.id);
    setGlobalLoading(true);
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, {
          userId: currentUser?.uid,
          createdAt: serverTimestamp()
        });
        await updateDoc(postRef, { likesCount: increment(1) });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `posts/${post.id}/likes/${currentUser?.uid}`);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!currentUser) {
      alert("يجب تسجيل الدخول للتصويت!");
      return;
    }
    if (!post.poll) return;

    const postRef = doc(db, 'posts', post.id);
    
    // Build updated options list
    const updatedOptions = post.poll.options.map(opt => {
      let votes = opt.votes ? [...opt.votes] : [];
      if (opt.id === optionId) {
        if (votes.includes(currentUser?.uid)) {
          // Remove vote
          votes = votes.filter(uid => uid !== currentUser?.uid);
        } else {
          // Add vote
          votes.push(currentUser?.uid);
        }
      } else {
        // Remove vote from other options if single choice
        votes = votes.filter(uid => uid !== currentUser?.uid);
      }
      return { ...opt, votes };
    });

    try {
      await updateDoc(postRef, {
        poll: {
          ...post.poll,
          options: updatedOptions
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}`);
    }
  };

  const handleFavorite = async () => {
    if (!currentUser) console.log("No user");
    const favId = `${currentUser?.uid}_${post.id}`;
    const path = `favorites/${favId}`;
    setGlobalLoading(true);
    try {
      const favRef = doc(db, 'favorites', favId);
      if (isFavorited) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, {
          userId: currentUser?.uid,
          postId: post.id,
          createdAt: serverTimestamp(),
          postContent: post.content || post.caption || "",
          postImageUrl: post.mediaUrl || post.imageUrl || null,
          postAuthorName: post.userName
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleTwitterShare = () => {
    const text = post.caption || post.content || "";
    const url = window.location.origin + "?post=" + post.id;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: "spring", damping: 22, stiffness: 95 }}
      className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-[32px] overflow-hidden mb-8 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.6)] hover:border-zinc-700/60 transition-all duration-500 group/card relative"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between relative bg-gradient-to-b from-zinc-950/20 to-transparent">
        <div 
          onClick={() => onNavigateToUser(post.userId)}
          className="flex items-center gap-3.5 cursor-pointer group/author"
        >
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 rounded-full opacity-60 group-hover/author:opacity-100 transition-opacity blur-[1px] duration-300" />
            <img 
              src={author?.photoURL || post.userPhoto} 
              alt={author?.displayName || post.userName} 
              className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-950 relative z-10 transition-transform duration-300 group-hover/author:scale-105" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-[15px] group-hover/author:text-blue-400 transition-colors flex items-center gap-1">
                {author?.displayName || post.userName}
                <VerifiedBadge isVerified={author?.isVerified} />
                <PremiumBadge isPremium={author?.isPremium} />
              </h4>
              {post.userId === currentUser?.uid && (
                <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-500/20 tracking-widest">أنت</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 px-0.5">
              <span className="text-zinc-500 text-[11px] font-medium">{formatPostDate(post.createdAt)}</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">MEMBER</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2.5 rounded-2xl transition-all duration-300 ${showMenu ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.95, y: -10, filter: "blur(4px)" }}
                className="absolute left-0 mt-3 w-56 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 rounded-3xl shadow-2xl z-[50] overflow-hidden"
              >
                <div className="p-2.5 space-y-1">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + '?post=' + post.id);
                      alert("تم نسخ رابط المنشور!");
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-[20px] text-zinc-300 hover:text-white transition-all text-sm font-bold group/item text-right"
                  >
                    <div className="flex items-center gap-3">
                      <Share2 className="w-5 h-5 text-zinc-500 group-hover/item:text-blue-400" />
                      <span>نسخ الرابط</span>
                    </div>
                  </button>
                  {currentUser?.uid === post.userId && (
                    <button 
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-red-500/10 rounded-[20px] text-red-500 transition-all text-sm font-bold text-right"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-5 h-5" />
                        <span>حذف المنشور</span>
                      </div>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-[20px] text-zinc-300 hover:text-white transition-all text-sm font-bold text-right"
                  >
                    <div className="flex items-center gap-3">
                      <Info className="w-5 h-5 text-zinc-500" />
                      <span>إبلاغ</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      setIsMovingToFolder(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-blue-600/10 rounded-[20px] text-blue-500 transition-all text-sm font-bold text-right"
                  >
                    <div className="flex items-center gap-3">
                      <FolderPlus className="w-5 h-5" />
                      <span>{isFavorited ? 'نقل إلى مجلد' : 'أضف لمجلد'}</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showDeleteConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl"
                >
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trash2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">حذف المنشور</h3>
                    <p className="text-zinc-400 font-medium mb-8">هل أنت متأكد من رغبتك في حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.</p>
                    
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'posts', post.id));
                            setShowDeleteConfirm(false);
                          } catch (error) {
                            handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
                          }
                        }}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-red-600/20"
                      >
                        حذف نهائي
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-all"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Folder Selection Modal */}
          <AnimatePresence>
            {isMovingToFolder && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setIsMovingToFolder(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
                    <h3 className="text-white text-xl font-black">اختر مجلداً</h3>
                    <button onClick={() => setIsMovingToFolder(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar">
                    <button 
                      onClick={async () => {
                        const favId = `${currentUser?.uid}_${post.id}`;
                        const favRef = doc(db, 'favorites', favId);
                        if (isFavorited) {
                          await updateDoc(favRef, { folderId: null });
                        } else {
                          await handleFavorite();
                        }
                        setIsMovingToFolder(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/50 rounded-3xl text-zinc-300 hover:text-white transition-all font-bold text-right group"
                    >
                      <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Grid className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black">جميع المحفوظات</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">General Collection</p>
                      </div>
                    </button>
                    {folders.map(folder => (
                      <button 
                        key={folder.id}
                        onClick={async () => {
                          const favId = `${currentUser?.uid}_${post.id}`;
                          const favRef = doc(db, 'favorites', favId);
                          if (isFavorited) {
                            await updateDoc(favRef, { folderId: folder.id });
                          } else {
                            await setDoc(favRef, {
                              userId: currentUser!.uid,
                              postId: post.id,
                              createdAt: serverTimestamp(),
                              postContent: post.content || post.caption || "",
                              postImageUrl: post.mediaUrl || post.imageUrl || null,
                              postAuthorName: post.userName,
                              folderId: folder.id
                            });
                          }
                          setIsMovingToFolder(false);
                        }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/50 rounded-3xl text-zinc-300 hover:text-white transition-all font-bold text-right group"
                      >
                        <div className="w-12 h-12 bg-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:text-amber-400 transition-all">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black">{folder.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Custom Folder</p>
                        </div>
                      </button>
                    ))}
                    {folders.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 opacity-30">
                        <Folder className="w-12 h-12 mb-4" />
                        <p className="text-zinc-500 text-center font-bold">لا يوجد مجلدات بعد.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Area */}
      <div className={`px-6 pb-4 ${!(post.mediaUrl || post.imageUrl) ? 'pt-2 pb-10' : ''}`}>
        <p className={`${!(post.mediaUrl || post.imageUrl) ? 'text-lg md:text-xl font-medium leading-relaxed' : 'text-[15px] leading-relaxed'} text-zinc-100 whitespace-pre-wrap selection:bg-blue-500/30`}>
          {renderContentWithHashtags(post.caption || post.content)}
        </p>
      </div>

      {/* Poll Section */}
      {post.poll && (() => {
        const totalVotes = post.poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);
        const userVotedOption = post.poll.options.find(opt => opt.votes?.includes(currentUser?.uid || ""));
        const hasVoted = !!userVotedOption;

        return (
          <div className="px-6 pb-6 mt-1">
            <div className="p-5 bg-zinc-950/40 border border-zinc-800/80 rounded-3xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl mt-0.5 shrink-0">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-white text-sm md:text-base leading-snug break-words">
                      {post.poll.question}
                    </h5>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                      إستطلاع رأي • {totalVotes} {totalVotes === 1 ? 'صوت' : 'أصوات'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.origin + '?post=' + post.id);
                      setPollCopied(true);
                      setTimeout(() => setPollCopied(false), 2000);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 border ${
                    pollCopied 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title="مشاركة استطلاع الرأي"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{pollCopied ? "تم النسخ!" : "مشاركة"}</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {post.poll.options.map((opt) => {
                  const votesCount = opt.votes?.length || 0;
                  const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                  const isSelected = opt.votes?.includes(currentUser?.uid || "");

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleVote(opt.id)}
                      className={`w-full text-right relative overflow-hidden rounded-2xl border transition-all duration-300 group/opt cursor-pointer block ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/5'
                          : 'border-zinc-800/60 hover:border-zinc-700/80 bg-zinc-900/20 hover:bg-zinc-900/40'
                      }`}
                    >
                      {/* Progress Bar background */}
                      {hasVoted && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: "spring", damping: 20, stiffness: 80 }}
                          style={{ originX: 1 }}
                          className={`absolute inset-y-0 right-0 ${
                            isSelected ? 'bg-blue-500/10' : 'bg-zinc-800/40'
                          }`}
                        />
                      )}

                      {/* Label and Content */}
                      <div className="relative z-10 px-4 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 scale-90 animate-in zoom-in-50 duration-200">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <span className={`text-xs md:text-sm font-bold truncate ${
                            isSelected ? 'text-blue-400 font-black' : 'text-zinc-300 group-hover/opt:text-white transition-colors'
                          }`}>
                            {opt.text}
                          </span>
                        </div>

                        {hasVoted && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs md:text-sm font-black ${
                              isSelected ? 'text-blue-400' : 'text-zinc-400'
                            }`}>
                              {pct}%
                            </span>
                            <span className="text-[10px] text-zinc-600 font-bold">
                              ({votesCount})
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* GIF Rendering */}
      {post.gifUrl && (
        <div className="px-6 pb-5">
          <div 
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            className="relative overflow-hidden bg-zinc-950 rounded-2xl border border-zinc-800/40 shadow-inner select-none max-w-[320px]"
          >
            <img 
              src={post.gifUrl} 
              alt="Post GIF" 
              className="w-full h-auto object-cover max-h-[300px] select-none pointer-events-none" 
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Media Rendering */}
      {(post.mediaUrl || post.imageUrl) && (
        <div className="px-6 pb-5">
          <div 
            onClick={() => {
              const url = post.mediaUrl || post.imageUrl!;
              const type = post.mediaType || 'image';
              onViewMedia(url, type as 'image' | 'video');
            }}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            className="relative group cursor-pointer aspect-auto overflow-hidden bg-zinc-950 rounded-2xl border border-zinc-800/40 shadow-inner select-none"
          >
            {post.mediaType === 'video' ? (
              <div className="relative flex items-center justify-center">
                <video 
                  src={post.mediaUrl} 
                  className="w-full h-auto object-contain max-h-[500px] rounded-2xl shadow-2xl" 
                  controls={false}
                  autoPlay
                  muted
                  loop
                  playsInline 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-md p-2.5 rounded-full border border-white/10 opacity-80 group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden">
                <img 
                  src={post.mediaUrl || post.imageUrl} 
                  alt="Post content" 
                  className="w-full h-auto object-contain max-h-[550px] bg-zinc-950 group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )}
            
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-300" />
            
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 duration-300">
              <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg">
                <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">عرض كامل</span>
              </div>
            </div>

            {/* Floating Hearts for Double Tap */}
            <AnimatePresence>
              {hearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  initial={{ scale: 0, opacity: 0, rotate: -15 + Math.random() * 30 }}
                  animate={{ 
                    scale: [0, 1.6, 1.2, 1.4, 0], 
                    opacity: [0, 1, 1, 0.8, 0],
                    y: -100,
                    rotate: -25 + Math.random() * 50
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  onAnimationComplete={() => {
                    setHearts(prev => prev.filter(h => h.id !== heart.id));
                  }}
                  className="absolute pointer-events-none z-40 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                  style={{
                    left: heart.x - 40,
                    top: heart.y - 40,
                  }}
                >
                  <Heart className="w-20 h-20 fill-red-500 stroke-white stroke-[2.5px]" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-zinc-800/30 bg-zinc-900/20">
        <div className="flex items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className={`flex items-center gap-2 transition-all group ${isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-red-400'}`}
          >
            <div className={`p-2 rounded-xl transition-colors ${isLiked ? 'bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]' : 'bg-transparent group-hover:bg-zinc-800/60'}`}>
              <motion.div
                animate={isLiked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart className={`w-5 h-5 transition-transform ${isLiked ? 'fill-current' : ''}`} />
              </motion.div>
            </div>
            <span className="text-xs font-bold">{likes.length || post.likesCount || 0}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-2 transition-all group ${showComments ? 'text-blue-500' : 'text-zinc-500 hover:text-blue-400'}`}
          >
            <div className={`p-2 rounded-xl transition-colors ${showComments ? 'bg-blue-500/10' : 'bg-transparent group-hover:bg-zinc-800/60'}`}>
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">{commentsCount}</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + '?post=' + post.id);
              alert("تم نسخ رابط المنشور!");
            }}
            className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-all group"
            title="نسخ رابط المنشور"
          >
            <div className="p-2 rounded-xl bg-transparent group-hover:bg-zinc-800/60 transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold hidden sm:inline">مشاركة</span>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTwitterShare}
            className="flex items-center gap-2 text-zinc-500 hover:text-sky-400 transition-all group"
            title="مشاركة على X"
          >
            <div className="p-2 rounded-xl bg-transparent group-hover:bg-zinc-800/60 transition-colors">
              <Twitter className="w-5 h-5" />
            </div>
          </motion.button>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFavorite}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${isFavorited ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-500 hover:text-amber-500 hover:bg-zinc-800/60'}`}
        >
          <Bookmark className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
          <span className="text-xs font-bold hidden sm:inline">{isFavorited ? 'محفوظ' : 'حفظ'}</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentsComponent 
            postId={post.id} 
            currentUser={currentUser} 
            postOwnerId={post.userId}
            onNavigateToUser={onNavigateToUser}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AIImageGen({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    onDirtyChange(prompt.length > 0 || generatedImage !== null);
  }, [prompt, generatedImage, onDirtyChange]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        }
      });
      
      let foundUrl = null;
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            foundUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      setGeneratedImage(foundUrl);
    } catch (e: any) {
      console.error("AI Generation Error:", e instanceof Error ? e.message : String(e));
      alert("حدث خطأ أثناء توليد الصورة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-black text-white">توليد الصور بالذكاء الاصطناعي</h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div>
          <label className="block text-zinc-400 text-sm font-bold mb-3">ماذا تريد أن ترسم؟</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:border-blue-500 transition-colors min-h-[120px] outline-none"
            placeholder="مثلاً: رائد فضاء يركب حصان في الفضاء بواقعية شديدة..."
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-sm font-bold mb-3">أبعاد الصورة</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: '1:1', label: 'مربع (1:1)', icon: <Square className="w-4 h-4" /> },
              { id: '16:9', label: 'أفقي (16:9)', icon: <Monitor className="w-4 h-4" /> },
              { id: '9:16', label: 'طولي (9:16)', icon: <Smartphone className="w-4 h-4" /> },
            ].map(attr => (
              <button
                key={attr.id}
                onClick={() => setAspectRatio(attr.id as any)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                  aspectRatio === attr.id 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {attr.icon}
                <span className="text-[10px] font-black uppercase tracking-tighter">{attr.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>ابدأ التوليد</span>
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {generatedImage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">الصورة المولدة</h3>
              <button 
                onClick={() => setGeneratedImage(null)}
                className="text-zinc-500 hover:text-white"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <img 
              src={generatedImage} 
              alt="AI Generated" 
              className={`w-full h-auto rounded-2xl border border-zinc-800 ${
                aspectRatio === '16:9' ? 'aspect-video object-cover' : 
                aspectRatio === '9:16' ? 'aspect-[9/16] object-cover' : 'aspect-square object-cover'
              }`} 
            />
            <div className="mt-4 flex gap-3">
              <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors">
                تحميل الصورة
              </button>
              <button className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors">
                مشاركة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/** ---------------------------------------------------------------------------
 * LIVE STREAM SCREEN
 * -------------------------------------------------------------------------- */
const LiveStreamScreen = ({ 
  currentUser, 
  userProfile,
  streamId,
  isHost,
  onClose,
  onNavigateToUser,
  onShareCommentToStory
}: { 
  currentUser: FirebaseUser | null, 
  userProfile: UserProfile | null,
  streamId?: string,
  isHost: boolean,
  onClose: () => void,
  onNavigateToUser: (uid: string) => void,
  onShareCommentToStory?: (comment: any) => void
}) => {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [hostStreamId, setHostStreamId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLive, setIsLive] = useState(isHost);

  // --- Advanced Live Moderation & Feature States ---
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'users' | 'moderators' | 'blocked' | 'muted'>('users');
  const [selectedCommentForOptions, setSelectedCommentForOptions] = useState<any | null>(null);
  const [showInviteGuestModal, setShowInviteGuestModal] = useState(false);
  const [showPKModal, setShowPKModal] = useState(false);
  const [showPollCreateModal, setShowPollCreateModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pkTimeLeft, setPkTimeLeft] = useState(180);
  const [hearts, setHearts] = useState<{ id: number; color: string; style: any }[]>([]);
  const [localStream, setLocalStreamState] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const setLocalStream = (s: MediaStream | null) => {
    localStreamRef.current = s;
    setLocalStreamState(s);
  };
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const isTogglingRef = useRef<boolean>(false);

  // Beauty/Smooth Filter states and refs
  const [isBeautyMode, setIsBeautyMode] = useState(false);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawVideoRef = useRef<HTMLVideoElement | null>(null);
  const beautyStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Virtual Background states and refs
  const [virtualBackgroundActive, setVirtualBackgroundActive] = useState(false);
  const [virtualBgUrl, setVirtualBgUrl] = useState<string | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [isSegmenterLoaded, setIsSegmenterLoaded] = useState(false);
  const lastResultsRef = useRef<any>(null);
  const selfieSegmentationRef = useRef<any>(null);
  const [showBgSettings, setShowBgSettings] = useState(false);

  // Live Stream Visual Filters
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [showFilterSettings, setShowFilterSettings] = useState(false);

  const getFilterString = (beauty: boolean, filterName: string) => {
    let parts: string[] = [];
    if (beauty) {
      parts.push('brightness(1.15) contrast(0.92) blur(1.0px)');
    }
    switch (filterName) {
      case 'mono':
        parts.push('grayscale(100%) contrast(120%)');
        break;
      case 'cinematic':
        parts.push('contrast(125%) saturate(120%) sepia(12%) brightness(105%)');
        break;
      case 'warm':
        parts.push('sepia(25%) saturate(135%) brightness(105%)');
        break;
      case 'vintage':
        parts.push('sepia(45%) contrast(110%) brightness(95%) saturate(80%)');
        break;
      case 'cyberpunk':
        parts.push('hue-rotate(130deg) saturate(160%) contrast(115%)');
        break;
      default:
        break;
    }
    return parts.length > 0 ? parts.join(' ') : 'none';
  };

  const LIVE_FILTERS = [
    { id: 'none', label: 'لا يوجد', class: 'bg-zinc-800' },
    { id: 'mono', label: 'أبيض وأسود', class: 'bg-zinc-800 saturate-0 grayscale' },
    { id: 'cinematic', label: 'سينمائي', class: 'bg-zinc-800 contrast-[1.25] saturate-[1.2] sepia-[0.12] brightness-[1.05]' },
    { id: 'warm', label: 'دافئ', class: 'bg-zinc-800 sepia-[0.25] saturate-[1.35] brightness-[1.05]' },
    { id: 'vintage', label: 'ريترو', class: 'bg-zinc-800 sepia-[0.45] contrast-[1.1] brightness-[0.95] saturate-[0.8]' },
    { id: 'cyberpunk', label: 'سايبربانك', class: 'bg-zinc-800 hue-rotate-[130deg] saturate-[1.5] contrast-[1.15]' }
  ];

  // Real-time preview states and refs for modal
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pendingBgUrl, setPendingBgUrl] = useState<string | null>(null);
  const pendingBgImageRef = useRef<HTMLImageElement | null>(null);
  const previewAnimationFrameIdRef = useRef<number | null>(null);

  // Load SelfieSegmentation script dynamically when active or settings modal is open
  useEffect(() => {
    if (virtualBackgroundActive || showBgSettings) {
      const scriptId = 'mediapipe-selfie-segmentation';
      const existingScript = document.getElementById(scriptId);

      const initSegmentation = () => {
        if (!selfieSegmentationRef.current && (window as any).SelfieSegmentation) {
          try {
            const selfieSegmentation = new (window as any).SelfieSegmentation({
              locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            });
            selfieSegmentation.setOptions({
              modelSelection: 1, // 1 for landscape/faster (ideal for mobiles/webcams)
            });
            selfieSegmentation.onResults((results: any) => {
              lastResultsRef.current = results;
            });
            selfieSegmentationRef.current = selfieSegmentation;
            setIsSegmenterLoaded(true);
            if (rawStreamRef.current) {
              applyBeautyProcessing(rawStreamRef.current, isBeautyMode, virtualBackgroundActive, bgImageRef.current);
            }
          } catch (e) {
            console.error("Error creating SelfieSegmentation instance:", e);
          }
        }
      };

      if (!existingScript) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
        script.async = true;
        script.onload = () => {
          initSegmentation();
        };
        script.onerror = (err) => {
          console.error("Failed to load SelfieSegmentation script:", err);
        };
        document.body.appendChild(script);
      } else {
        initSegmentation();
      }
    }
  }, [virtualBackgroundActive, showBgSettings]);

  // Sync pending background with active background when settings modal opens
  useEffect(() => {
    if (showBgSettings) {
      setPendingBgUrl(virtualBgUrl);
      pendingBgImageRef.current = bgImageRef.current;
    }
  }, [showBgSettings]);

  // Render a real-time preview of the selected background relative to the user inside the modal
  useEffect(() => {
    if (!showBgSettings) {
      if (previewAnimationFrameIdRef.current) {
        cancelAnimationFrame(previewAnimationFrameIdRef.current);
        previewAnimationFrameIdRef.current = null;
      }
      return;
    }

    let active = true;
    const renderPreview = () => {
      if (!active) return;

      const canvasEl = previewCanvasRef.current;
      const videoEl = rawVideoRef.current;

      if (canvasEl && videoEl && videoEl.readyState >= 2) {
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
          if (canvasEl.width !== 320 || canvasEl.height !== 180) {
            canvasEl.width = 320;
            canvasEl.height = 180;
          }

          ctx.save();
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

          const results = lastResultsRef.current;
          const bgImg = pendingBgImageRef.current;

          if (bgImg) {
            if (results) {
              // Draw the background segmentation mask
              ctx.drawImage(results.segmentationMask, 0, 0, canvasEl.width, canvasEl.height);

              // Composite the camera feed only where the mask is
              ctx.globalCompositeOperation = 'source-in';
              ctx.filter = getFilterString(isBeautyMode, selectedFilter);
              ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
              ctx.filter = 'none';

              // Composite the virtual background behind the user
              ctx.globalCompositeOperation = 'destination-over';
              ctx.drawImage(bgImg, 0, 0, canvasEl.width, canvasEl.height);
            } else {
              // Fallback preview: draw background and standard camera feed dimmed
              ctx.drawImage(bgImg, 0, 0, canvasEl.width, canvasEl.height);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

              ctx.filter = getFilterString(isBeautyMode, selectedFilter);
              ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
              ctx.filter = 'none';
            }
          } else {
            // No background selected - standard camera feed preview
            ctx.filter = getFilterString(isBeautyMode, selectedFilter);
            ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
            ctx.filter = 'none';
          }

          ctx.restore();
        }
      }

      previewAnimationFrameIdRef.current = requestAnimationFrame(renderPreview);
    };

    renderPreview();

    return () => {
      active = false;
      if (previewAnimationFrameIdRef.current) {
        cancelAnimationFrame(previewAnimationFrameIdRef.current);
        previewAnimationFrameIdRef.current = null;
      }
    };
  }, [showBgSettings, pendingBgUrl, isBeautyMode, selectedFilter]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPendingBgUrl(dataUrl);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      img.onload = () => {
        pendingBgImageRef.current = img;
      };
    };
    reader.readAsDataURL(file);
  };

  const selectPresetBg = (url: string) => {
    setPendingBgUrl(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      pendingBgImageRef.current = img;
    };
  };

  const disableVirtualBackground = () => {
    setVirtualBackgroundActive(false);
    setVirtualBgUrl(null);
    bgImageRef.current = null;
    setPendingBgUrl(null);
    pendingBgImageRef.current = null;
    applyBeautyProcessing(rawStreamRef.current, isBeautyMode, false, null);
  };

  const handleApplyPendingBg = () => {
    if (pendingBgUrl && pendingBgImageRef.current) {
      setVirtualBgUrl(pendingBgUrl);
      bgImageRef.current = pendingBgImageRef.current;
      setVirtualBackgroundActive(true);
      applyBeautyProcessing(rawStreamRef.current, isBeautyMode, true, pendingBgImageRef.current);
      setShowBgSettings(false);
    }
  };

  const applyBeautyProcessing = (
    rawStream: MediaStream | null, 
    beautyActive: boolean, 
    bgActive: boolean = virtualBackgroundActive, 
    customBgImg: HTMLImageElement | null = bgImageRef.current
  ) => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (beautyStreamRef.current) {
      try {
        beautyStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.error("Error stopping beautyStream tracks:", e);
      }
      beautyStreamRef.current = null;
    }
    if (rawVideoRef.current) {
      try {
        rawVideoRef.current.srcObject = null;
        rawVideoRef.current.pause();
      } catch (e) {
        console.error("Error cleaning rawVideoRef:", e);
      }
    }

    if (!rawStream) {
      setLocalStream(null);
      return;
    }

    // We need offscreen video and canvas processing if beauty active, background is active, settings modal is open (for preview), or visual filter is active
    const needsProcessing = (beautyActive || bgActive || showBgSettings || selectedFilter !== 'none') && !isScreenSharing;

    if (needsProcessing) {
      if (!rawVideoRef.current) {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        rawVideoRef.current = video;
      }
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      const videoEl = rawVideoRef.current;
      const canvasEl = canvasRef.current;

      videoEl.srcObject = rawStream;
      videoEl.play().catch(err => console.error("Error playing offscreen beauty video:", err));

      const ctx = canvasEl.getContext('2d');
      if (ctx) {
        const render = () => {
          if (videoEl.paused || videoEl.ended) {
            animationFrameIdRef.current = requestAnimationFrame(render);
            return;
          }

          if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
            canvasEl.width = videoEl.videoWidth || 640;
            canvasEl.height = videoEl.videoHeight || 480;
          }

          const results = lastResultsRef.current;

          if (bgActive && customBgImg) {
            ctx.save();
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

            if (results) {
              // Draw the background segmentation mask
              ctx.drawImage(results.segmentationMask, 0, 0, canvasEl.width, canvasEl.height);

              // Composite the camera feed only where the mask is
              ctx.globalCompositeOperation = 'source-in';
              ctx.filter = getFilterString(beautyActive, selectedFilter);
              ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
              ctx.filter = 'none';

              // Composite the virtual background behind the user
              ctx.globalCompositeOperation = 'destination-over';
              ctx.drawImage(customBgImg, 0, 0, canvasEl.width, canvasEl.height);
            } else {
              // Fallback during load: draw background dimmed, and user on top
              ctx.drawImage(customBgImg, 0, 0, canvasEl.width, canvasEl.height);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

              ctx.filter = getFilterString(beautyActive, selectedFilter);
              ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
              ctx.filter = 'none';
            }

            ctx.restore();
          } else {
            // Only Beauty or Filter active
            ctx.filter = getFilterString(beautyActive, selectedFilter);
            ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
            ctx.filter = 'none';
          }

          // Request next segmentation frame if virtual background active or background settings modal is open
          const shouldRunSegmentation = bgActive || showBgSettings;
          if (shouldRunSegmentation && selfieSegmentationRef.current) {
            selfieSegmentationRef.current.send({ image: videoEl }).catch((err: any) => {
              console.warn("Segmentation loop send error:", err);
            });
          }

          animationFrameIdRef.current = requestAnimationFrame(render);
        };
        render();
      }

      const capturedStream = canvasEl.captureStream(30);
      const videoTracks = capturedStream.getVideoTracks();
      const audioTracks = rawStream.getAudioTracks();

      const combinedStream = new MediaStream([
        ...videoTracks,
        ...audioTracks
      ]);

      beautyStreamRef.current = combinedStream;
      setLocalStream(combinedStream);
    } else {
      setLocalStream(rawStream);
    }
  };

  useEffect(() => {
    if (isHost && rawStreamRef.current) {
      applyBeautyProcessing(rawStreamRef.current, isBeautyMode, virtualBackgroundActive, bgImageRef.current);
    }
  }, [isBeautyMode, virtualBackgroundActive, isScreenSharing, selectedFilter, isHost]);

  useEffect(() => {
    if (isHost) {
      startLocalStream(facingMode);
    }
  }, [isHost]);

  // Auto-generate streamId in Firestore and state upon mounting/starting as host
  useEffect(() => {
    if (isHost && !hostStreamId) {
      const initLiveStream = async () => {
        try {
          const liveRef = await addDoc(collection(db, "lives"), {
            hostId: currentUser?.uid || "unknown",
            hostName: userProfile?.displayName || currentUser?.displayName || "مستخدم",
            hostPhoto: userProfile?.photoURL || currentUser?.photoURL || "",
            title: "بث مباشر جديد",
            status: 'active',
            startedAt: serverTimestamp(),
            viewerCount: 1,
            cameraEnabled: true,
            micEnabled: isMicEnabled
          });
          setHostStreamId(liveRef.id);
          setIsLive(true);
          setStream({
            id: liveRef.id,
            hostId: currentUser?.uid || "unknown",
            hostName: userProfile?.displayName || currentUser?.displayName || "مستخدم",
            hostPhoto: userProfile?.photoURL || currentUser?.photoURL || "",
            title: "بث مباشر جديد",
            status: 'active',
            startedAt: Timestamp.now(),
            viewerCount: 1,
            cameraEnabled: true,
            micEnabled: isMicEnabled
          });
        } catch (err) {
          console.error("Error auto-starting live stream:", err);
        }
      };
      initLiveStream();
    }
  }, [isHost, hostStreamId, currentUser, userProfile]);

  // Keep video element in sync with the local camera stream
  useEffect(() => {
    if (videoRef.current) {
      if (localStream) {
        if (videoRef.current.srcObject !== localStream) {
          videoRef.current.srcObject = localStream;
        }
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [localStream, isLive]);

  const startLocalStream = async (mode: 'user' | 'environment' = 'user') => {
    try {
      // 1. Thoroughly stop and clear existing tracks
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.error("Error stopping raw stream track:", e);
          }
        });
        rawStreamRef.current = null;
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (beautyStreamRef.current) {
        beautyStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.error("Error stopping beautyStream track:", e);
          }
        });
        beautyStreamRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.error("Error stopping local track:", e);
          }
        });
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const activeStream = videoRef.current.srcObject as MediaStream;
        activeStream.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.error("Error stopping videoRef track:", e);
          }
        });
        videoRef.current.srcObject = null;
      }
      setLocalStream(null);

      // 2. Add a solid delay to allow camera hardware to fully release
      await new Promise(resolve => setTimeout(resolve, 350));

      // 3. Request stream with ideal constraints first, falling back to exact
      let streamToUse: MediaStream | null = null;
      
      try {
        // Try exact facing mode first to force toggle on mobile
        streamToUse = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        });
      } catch (exactErr) {
        console.warn("Exact facingMode constraint failed, trying with ideal facingMode:", exactErr);
        try {
          streamToUse = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: mode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: true
          });
        } catch (idealErr) {
          console.warn("Ideal facingMode constraint failed, falling back to basic stream:", idealErr);
          streamToUse = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        }
      }

      if (streamToUse) {
        streamToUse.getVideoTracks().forEach(track => {
          track.enabled = isCameraEnabled;
        });
        streamToUse.getAudioTracks().forEach(track => {
          track.enabled = isMicEnabled;
        });
        rawStreamRef.current = streamToUse;
        applyBeautyProcessing(streamToUse, isBeautyMode, virtualBackgroundActive, bgImageRef.current);
      }
    } catch (e: any) {
      console.error("Camera access failed permanently:", e);
      let errorMsg = "تعذر الوصول إلى الكاميرا.";
      if (e.name === 'NotReadableError') {
        errorMsg += " الكاميرا قيد الاستخدام من قبل تطبيق آخر أو لم يتم تحريرها بعد.";
      } else if (e.name === 'NotAllowedError') {
        errorMsg += " يرجى منح صلاحيات الكاميرا والميكروفون.";
      }
      alert(errorMsg);
    }
  };

  const toggleCameraFacing = async () => {
    if (isTogglingRef.current) {
      console.warn("Camera toggle already in progress, ignoring click.");
      return;
    }
    isTogglingRef.current = true;
    setIsToggling(true);
    try {
      const newMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newMode);
      await startLocalStream(newMode);
    } catch (err) {
      console.error("Error toggling camera facing:", err);
    } finally {
      isTogglingRef.current = false;
      setIsToggling(false);
    }
  };

  const toggleCameraOnOff = async () => {
    const nextState = !isCameraEnabled;
    setIsCameraEnabled(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    if (stream?.id && isHost) {
      try {
        await updateDoc(doc(db, "lives", stream.id), {
          cameraEnabled: nextState
        });
      } catch (err) {
        console.error("Error updating cameraEnabled state in Firestore:", err);
      }
    }
  };

  const toggleMicOnOff = async () => {
    const nextState = !isMicEnabled;
    setIsMicEnabled(nextState);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
    if (stream?.id && isHost) {
      try {
        await updateDoc(doc(db, "lives", stream.id), {
          micEnabled: nextState
        });
      } catch (err) {
        console.error("Error updating micEnabled state in Firestore:", err);
      }
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      } catch (err) {
        console.error("Error stopping screen share tracks:", err);
      }
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    
    // Restore the camera stream
    await startLocalStream(facingMode);
  };

  const toggleScreenShare = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert('مشاركة الشاشة غير مدعومة في متصفحك الحالي.');
      return;
    }

    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      setIsCameraEnabled(true);

      const screenTrack = screenStream.getVideoTracks()[0];

      // Auto revert when user stops sharing via system UI
      screenTrack.onended = async () => {
        await stopScreenShare();
      };

      // Get current mic/audio track from rawStreamRef to keep audio going
      const audioTracks = rawStreamRef.current ? rawStreamRef.current.getAudioTracks() : [];
      
      // Stop existing camera track if any
      if (rawStreamRef.current) {
        rawStreamRef.current.getVideoTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
      }

      // Create a brand new combined MediaStream for screen sharing
      const newStream = new MediaStream([screenTrack, ...audioTracks]);
      rawStreamRef.current = newStream;

      // Update the local stream with the new screen-sharing stream
      setLocalStream(newStream);

      // Trigger applyBeautyProcessing which will bypass rendering if isScreenSharing is true
      applyBeautyProcessing(newStream, isBeautyMode, virtualBackgroundActive, bgImageRef.current);

    } catch (err) {
      console.error("Error starting screen share:", err);
      setIsScreenSharing(false);
    }
  };

  // Safe stream unmount cleanup
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (beautyStreamRef.current) {
        try {
          beautyStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        } catch (e) {
          console.error("Error stopping beautyStream tracks:", e);
        }
      }
      if (rawStreamRef.current) {
        try {
          rawStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        } catch (e) {
          console.error("Error stopping rawStream tracks:", e);
        }
      }
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        } catch (err) {
          console.error("Error stopping tracks during unmount:", err);
        }
      }
      if (screenStreamRef.current) {
        try {
          screenStreamRef.current.getTracks().forEach(track => {
            track.stop();
          });
        } catch (err) {
          console.error("Error stopping screenStream during unmount:", err);
        }
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const activeStream = videoRef.current.srcObject as MediaStream;
          activeStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        } catch (err) {
          console.error("Error stopping videoRef tracks during unmount:", err);
        }
      }
      if (selfieSegmentationRef.current) {
        try {
          selfieSegmentationRef.current.close();
        } catch (e) {
          console.error("Error closing selfie segmentation:", e);
        }
        selfieSegmentationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const activeId = streamId || hostStreamId;
    if (!activeId) return;

    const unsub = onSnapshot(doc(db, "lives", activeId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as LiveStream;
        if (currentUser && data.blockedIds?.includes(currentUser?.uid)) {
          alert("🚫 تم حظرك من هذا البث بواسطة المضيف أو المشرفين.");
          onClose();
          return;
        }
        setStream({ ...data, id: snapshot.id } as LiveStream);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `lives/${activeId}`);
    });
    return () => unsub();
  }, [streamId, hostStreamId, currentUser]);

  useEffect(() => {
    const activeId = streamId || hostStreamId;
    if (!activeId) return;
    const q = query(collection(db, "lives", activeId, "comments"), orderBy("createdAt", "asc"), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `lives/${activeId}/comments`);
    });
    return () => unsub();
  }, [streamId, hostStreamId]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleStartLive = async (title: string) => {
    if (!currentUser || !userProfile) return;
    setGlobalLoading(true);
    try {
      const liveRef = await addDoc(collection(db, "lives"), {
        hostId: currentUser?.uid,
        hostName: userProfile.displayName || "مستخدم",
        hostPhoto: userProfile.photoURL || "",
        title: title || "بث مباشر جديد",
        status: 'active',
        startedAt: serverTimestamp(),
        viewerCount: 1,
        cameraEnabled: false,
        micEnabled: isMicEnabled
      });
      setIsLive(true);
      setHostStreamId(liveRef.id);
      setStream({
        id: liveRef.id,
        hostId: currentUser?.uid,
        hostName: userProfile.displayName || "مستخدم",
        hostPhoto: userProfile.photoURL || "",
        title: title || "بث مباشر جديد",
        status: 'active',
        startedAt: Timestamp.now(),
        viewerCount: 1,
        cameraEnabled: false,
        micEnabled: isMicEnabled
      });

      // Send notifications to all followers (chunked for batches of up to 500)
      try {
        const followersSnap = await getDocs(collection(db, "users", currentUser?.uid, "followers"));
        if (!followersSnap.empty) {
          const docs = followersSnap.docs;
          const chunkSize = 400; // conservative batch limit
          for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach(followerDoc => {
              const followerId = followerDoc.id;
              const notifRef = doc(collection(db, "users", followerId, "notifications"));
              batch.set(notifRef, {
                title: "بث مباشر جديد 🔴",
                body: `بدأ المذيع ${userProfile.displayName || "مستخدم"} بثاً مباشراً جديداً: ${title || "بدون عنوان"}`,
                type: "live_start",
                streamId: liveRef.id,
                hostId: currentUser?.uid,
                hostName: userProfile.displayName || "مستخدم",
                hostPhoto: userProfile.photoURL || "",
                read: false,
                createdAt: serverTimestamp()
              });
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.error("Error sending start live notifications to followers:", err);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "lives");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleEndLive = async () => {
    setGlobalLoading(true);
    try {
      if (stream?.id && isHost) {
        await updateDoc(doc(db, "lives", stream.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Error ending live stream in Firestore:", e);
      handleFirestoreError(e, OperationType.UPDATE, "lives");
    } finally {
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        } catch (err) {
          console.error("Error stopping localStream tracks:", err);
        }
      }
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const activeStream = videoRef.current.srcObject as MediaStream;
          activeStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          videoRef.current.srcObject = null;
        } catch (err) {
          console.error("Error stopping videoRef tracks:", err);
        }
      }
      setLocalStream(null);
      setGlobalLoading(false);
      onClose();
    }
  };

  const handleSendComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const activeId = streamId || hostStreamId || stream?.id || 'test_local_stream';
    if (!newComment.trim() || !currentUser || isSending) return;

    if (stream?.mutedIds?.includes(currentUser?.uid)) {
      alert("⚠️ عذراً، لقد تم كتمك من الكتابة في هذا البث.");
      return;
    }

    const commentText = newComment.trim();
    setIsSending(true);

    try {
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: currentUser?.uid,
        userName: userProfile?.displayName || currentUser.displayName || "مستخدم",
        userPhoto: userProfile?.photoURL || currentUser.photoURL || "",
        text: commentText,
        createdAt: serverTimestamp()
      });
      setNewComment("");
    } catch (err: any) {
      console.error("Error occurred while sending live comment:", err);
      alert("Error sending comment: " + err.message);
      handleFirestoreError(err, OperationType.WRITE, `lives/${activeId}/comments`);
    } finally {
      setIsSending(false);
      setNewComment("");
      try {
        const setComment = setNewComment;
        setComment("");
      } catch (e) {}
    }
  };

  // --- Advanced Live Moderation & Feature Helpers ---

  const currentUserId = currentUser?.uid;
  const isUserModerator = stream?.moderatorIds?.includes(currentUserId || "") || isHost;

  const handleMuteUser = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        mutedIds: arrayUnion(uid),
        mutedUsers: arrayUnion({ uid, name, photo })
      });
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "النظام 🛡️",
        userPhoto: "",
        text: `🚫 تم كتم المستخدم @${name} من قبل الإدارة.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Mute error:", err);
    }
  };

  const handleUnmuteUser = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        mutedIds: arrayRemove(uid),
        mutedUsers: arrayRemove({ uid, name, photo })
      });
    } catch (err) {
      console.error("Unmute error:", err);
    }
  };

  const handlePinComment = async (commentId: string, userName: string, text: string, userId: string, userPhoto: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        pinnedComment: {
          id: commentId,
          userName,
          text,
          userId,
          userPhoto
        }
      });
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "النظام 📌",
        userPhoto: "",
        text: `📌 تم تثبيت تعليق من @${userName}: "${text}"`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Pin comment error:", err);
    }
  };

  const handleUnpinComment = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        pinnedComment: null
      });
    } catch (err) {
      console.error("Unpin comment error:", err);
    }
  };

  const handleBlockUser = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        blockedIds: arrayUnion(uid),
        blockedUsers: arrayUnion({ uid, name, photo })
      });
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "النظام 🛡️",
        userPhoto: "",
        text: `🚷 تم حظر المستخدم @${name} وإخراجه من البث.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Block error:", err);
    }
  };

  const handleUnblockUser = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        blockedIds: arrayRemove(uid),
        blockedUsers: arrayRemove({ uid, name, photo })
      });
    } catch (err) {
      console.error("Unblock error:", err);
    }
  };

  const handleSetModerator = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        moderatorIds: arrayUnion(uid),
        moderators: arrayUnion({ uid, name, photo })
      });
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "النظام 🛡️",
        userPhoto: "",
        text: `👑 تم تعيين @${name} مشرفاً للبث المباشر.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Set moderator error:", err);
    }
  };

  const handleRemoveModerator = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        moderatorIds: arrayRemove(uid),
        moderators: arrayRemove({ uid, name, photo })
      });
    } catch (err) {
      console.error("Remove moderator error:", err);
    }
  };

  // --- Guest System ---
  const handleInviteGuest = async (uid: string, name: string, photo: string = "") => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        guestInvite: {
          targetUid: uid,
          targetName: name,
          targetPhoto: photo,
          status: 'pending'
        }
      });
      setShowInviteGuestModal(false);
    } catch (err) {
      console.error("Guest invite error:", err);
    }
  };

  const handleAcceptGuestInvite = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId || !currentUser) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        "guestInvite.status": "accepted",
        guest: {
          uid: currentUser?.uid,
          name: userProfile?.displayName || currentUser.displayName || "ضيف",
          photo: userProfile?.photoURL || currentUser.photoURL || "",
          camEnabled: true,
          micEnabled: true
        }
      });
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "النظام 🛡️",
        userPhoto: "",
        text: `🎙️ انضم الضيف @${userProfile?.displayName || "مستمع"} إلى البث المشترك.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Accept guest error:", err);
    }
  };

  const handleDeclineGuestInvite = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        "guestInvite.status": "declined"
      });
    } catch (err) {
      console.error("Decline guest error:", err);
    }
  };

  const handleToggleGuestCamera = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId || !stream?.guest) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        "guest.camEnabled": !stream.guest.camEnabled
      });
    } catch (err) {
      console.error("Toggle guest cam error:", err);
    }
  };

  const handleToggleGuestMic = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId || !stream?.guest) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        "guest.micEnabled": !stream.guest.micEnabled
      });
    } catch (err) {
      console.error("Toggle guest mic error:", err);
    }
  };

  const handleKickGuest = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        guest: null,
        guestInvite: null
      });
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "النظام 🛡️",
        userPhoto: "",
        text: `⚠️ غادر الضيف البث المشترك.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Kick guest error:", err);
    }
  };

  // --- PK Battle System ---
  const handleStartPKBattle = async (opponent: { name: string; photo: string }) => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        pkBattle: {
          opponentStreamId: "opponent_" + Date.now(),
          opponentName: opponent.name,
          opponentPhoto: opponent.photo,
          pointsHost: 100,
          pointsOpponent: 100,
          timeLeft: 180,
          status: 'active'
        }
      });
      setShowPKModal(false);
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "تحدي TruCast ⚔️",
        userPhoto: "",
        text: `🔥 بدأ تحدي البث المباشر (PK Battle) مع @${opponent.name}! ادعم المذيع الآن بنقاط التفاعل!`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("PK start error:", err);
    }
  };

  const handleSupportSide = async (side: 'host' | 'opponent') => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId || !stream?.pkBattle) return;
    
    const color = side === 'host' ? '#ef4444' : '#3b82f6';
    const id = Date.now() + Math.random();
    const style = {
      left: `${30 + Math.random() * 40}%`,
      bottom: '30%',
      transform: 'scale(1)',
    };
    setHearts(prev => [...prev, { id, color, style }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 1500);

    try {
      if (side === 'host') {
        await updateDoc(doc(db, "lives", activeId), {
          "pkBattle.pointsHost": increment(50)
        });
      } else {
        await updateDoc(doc(db, "lives", activeId), {
          "pkBattle.pointsOpponent": increment(50)
        });
      }
    } catch (err) {
      console.error("Support error:", err);
    }
  };

  const handleEndPKBattle = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        pkBattle: null
      });
    } catch (err) {
      console.error("End PK error:", err);
    }
  };

  // --- Live Poll Core Handlers ---
  const handleCreatePoll = async (question: string, optionsTexts: string[]) => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;

    const filteredOptions = optionsTexts.filter(t => t.trim() !== "");
    if (filteredOptions.length < 2) {
      alert("⚠️ يجب إدخال خيارين على الأقل للتصويت.");
      return;
    }

    const poll: LivePoll = {
      question: question.trim() || "تصويت جديد",
      options: filteredOptions.map((text, idx) => ({
        id: String(idx),
        text: text.trim(),
        votes: 0
      })),
      isActive: true,
      createdAt: new Date().toISOString(),
      votedUserIds: {}
    };

    try {
      await updateDoc(doc(db, "lives", activeId), { poll });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lives/${activeId}`);
    }
  };

  const handleVotePoll = async (optionId: string) => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId || !currentUser?.uid) return;

    const docRef = doc(db, "lives", activeId);
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists()) return;
        const data = snap.data() as LiveStream;
        const poll = data.poll;
        if (!poll || !poll.isActive) return;

        // Verify the user hasn't voted yet
        if (poll.votedUserIds && poll.votedUserIds[currentUser?.uid]) {
          return; // Voted already
        }

        const votedUserIds = { ...(poll.votedUserIds || {}) };
        votedUserIds[currentUser?.uid] = optionId;

        const updatedOptions = poll.options.map((opt: any) => {
          if (opt.id === optionId) {
            return { ...opt, votes: (opt.votes || 0) + 1 };
          }
          return opt;
        });

        transaction.update(docRef, {
          "poll.votedUserIds": votedUserIds,
          "poll.options": updatedOptions
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lives/${activeId}`);
    }
  };

  const handleEndPoll = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        "poll.isActive": false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lives/${activeId}`);
    }
  };

  const handleDeletePoll = async () => {
    const activeId = streamId || hostStreamId || stream?.id;
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "lives", activeId), {
        poll: null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lives/${activeId}`);
    }
  };

  if (isHost && !isLive) {
    return (
      <div className="fixed inset-0 z-[110] bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-blue-600/20 rounded-[32px] flex items-center justify-center text-blue-500 animate-pulse">
              <Radio className="w-12 h-12" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black mb-2">بدء بث مباشر</h2>
            <p className="text-zinc-500 font-bold">شارك لحظاتك مع متابعيك في الوقت الفعلي</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text"
              placeholder="عنوان البث..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStartLive((e.target as HTMLInputElement).value);
              }}
            />
            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black">إلغاء</button>
              <button 
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  handleStartLive(input.value);
                }}
                className="flex-[2] py-4 bg-blue-600 rounded-2xl font-black shadow-xl shadow-blue-900/20"
              >
                انطلق الآن
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 w-full h-[100dvh] bg-black z-[9999] overflow-hidden overscroll-none flex flex-col font-sans text-white"
    >
      {/* 1. طبقة الفيديو (الخلفية) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden flex flex-col sm:flex-row bg-zinc-950">
        {stream?.pkBattle?.status === 'active' ? (
          <div className="w-full h-full flex flex-col md:flex-row">
            {/* Host half */}
            <div className="flex-1 relative h-1/2 md:h-full border-b md:border-b-0 md:border-l border-zinc-800 flex items-center justify-center overflow-hidden">
              {isHost ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <div className="relative">
                    <img 
                      src={stream?.hostPhoto || `https://ui-avatars.com/api/?name=${stream?.hostName || 'M'}&background=random`} 
                      className="w-20 h-20 rounded-full border-2 border-red-500 shadow-lg object-cover"
                      alt=""
                    />
                  </div>
                  <span className="text-sm font-black text-white mt-2">@{stream?.hostName} (المضيف)</span>
                </div>
              )}
              {/* Point gauge / floating indicator */}
              <div className="absolute bottom-4 left-4 z-10 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg">
                <span className="text-xs font-black text-red-400">{stream?.pkBattle?.pointsHost} pt</span>
              </div>
            </div>

            {/* Opponent half */}
            <div className="flex-1 relative h-1/2 md:h-full flex items-center justify-center overflow-hidden bg-zinc-900/50">
              <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" style={{ backgroundImage: `url(${stream?.pkBattle?.opponentPhoto})` }} />
              <div className="relative z-10 text-center flex flex-col items-center justify-center p-4">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-blue-500/10 blur-md animate-pulse" />
                  <img 
                    src={stream?.pkBattle?.opponentPhoto || `https://ui-avatars.com/api/?name=${stream?.pkBattle?.opponentName || 'O'}&background=random`} 
                    className="w-20 h-20 rounded-full border-2 border-blue-500 object-cover shadow-2xl relative z-10 animate-pulse"
                    alt=""
                  />
                </div>
                <span className="text-sm font-black text-white mt-2">@{stream?.pkBattle?.opponentName} (المنافس)</span>
                <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full font-black text-white mt-1 animate-pulse">PK BATTLE</span>
              </div>
              {/* Point gauge / floating indicator */}
              <div className="absolute bottom-4 right-4 z-10 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg">
                <span className="text-xs font-black text-blue-400">{stream?.pkBattle?.pointsOpponent} pt</span>
              </div>
            </div>
          </div>
        ) : stream?.guest ? (
          /* Guest Co-host Split Screen Layout */
          <div className="w-full h-full flex flex-col">
            {/* Host screen */}
            <div className="flex-1 relative border-b border-zinc-800 flex items-center justify-center overflow-hidden">
              {isHost ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <img 
                    src={stream?.hostPhoto || `https://ui-avatars.com/api/?name=${stream?.hostName || 'M'}&background=random`} 
                    className="w-20 h-20 rounded-full border-2 border-blue-500 object-cover"
                    alt=""
                  />
                  <span className="text-sm font-black text-white mt-2">@{stream?.hostName} (المضيف)</span>
                </div>
              )}
            </div>

            {/* Guest screen */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-900/50">
              <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-110" style={{ backgroundImage: `url(${stream.guest.photo})` }} />
              
              <div className="relative z-10 text-center flex flex-col items-center justify-center p-4">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-emerald-500/10 blur-md animate-pulse" />
                  <img 
                    src={stream.guest.photo || `https://ui-avatars.com/api/?name=${stream.guest.name}&background=random`} 
                    className="w-20 h-20 rounded-full border-2 border-emerald-500 object-cover shadow-2xl relative z-10"
                    alt=""
                  />
                </div>
                <span className="text-sm font-black text-white mt-2">@{stream.guest.name} (الضيف)</span>
                
                {/* Status badges */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${stream.guest.camEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {stream.guest.camEnabled ? 'الكاميرا مفعّلة' : 'الكاميرا مغلقة'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${stream.guest.micEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {stream.guest.micEnabled ? 'المايك مفعّل' : 'المايك مكتوم'}
                  </span>
                </div>

                {/* Host controls over Guest */}
                {isHost && (
                  <div className="flex gap-2 mt-4 z-20 pointer-events-auto">
                    <button 
                      onClick={handleToggleGuestCamera}
                      className="p-2.5 bg-black/60 hover:bg-black/95 rounded-full border border-white/10 transition-colors cursor-pointer"
                      title="تبديل الكاميرا"
                    >
                      <Video className={`w-4 h-4 ${stream.guest.camEnabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    </button>
                    <button 
                      onClick={handleToggleGuestMic}
                      className="p-2.5 bg-black/60 hover:bg-black/95 rounded-full border border-white/10 transition-colors cursor-pointer"
                      title="تبديل المايك"
                    >
                      <Mic className={`w-4 h-4 ${stream.guest.micEnabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    </button>
                    <button 
                      onClick={handleKickGuest}
                      className="p-2.5 bg-red-600/20 hover:bg-red-600 rounded-full border border-red-500/30 transition-colors cursor-pointer group"
                      title="إنهاء الاستضافة"
                    >
                      <X className="w-4 h-4 text-red-400 group-hover:text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Single Stream Mode */
          <>
            {isHost ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 z-0 flex items-center justify-center">
                {stream?.hostPhoto && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                    style={{ backgroundImage: `url(${stream.hostPhoto})` }}
                  />
                )}
                <div className="text-center space-y-4 relative z-10 px-4">
                  <div className="relative inline-block mb-4">
                    <div className="absolute -inset-4 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
                    <img 
                      src={stream?.hostPhoto || `https://ui-avatars.com/api/?name=${stream?.hostName}&background=random`} 
                      className="w-28 h-28 rounded-full object-cover border-4 border-blue-500/40 shadow-2xl relative z-10 animate-pulse" 
                      alt="" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <Radio className="w-12 h-12 text-blue-500 animate-pulse mx-auto" />
                  <p className="text-blue-400 font-black tracking-wide text-lg">البث المباشر نشط الآن</p>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs mx-auto">أنت الآن تشاهد بث المذيع المباشر وتتفاعل معه في الوقت الفعلي</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fallback layout for host when camera is off */}
      {isHost && !isCameraEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm text-zinc-400 z-10">
          <VideoOff className="w-16 h-16 text-zinc-600 mb-3 animate-pulse" />
          <p className="font-black text-sm">الكاميرا مغلقة</p>
          <p className="text-xs text-zinc-500 mt-1">قم بتشغيل الكاميرا من الزر في الأعلى للبدء</p>
        </div>
      )}

      {/* 2. طبقة الأزرار العلوية */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-50 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Live Status Header with profile photo */}
          <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/10 shadow-lg select-none">
            <img 
              src={stream?.hostPhoto || `https://ui-avatars.com/api/?name=${stream?.hostName}&background=random`} 
              className="w-8 h-8 rounded-full border border-white/20 object-cover" 
              alt="" 
              referrerPolicy="no-referrer"
            />
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white max-w-[100px] truncate">@{stream?.hostName || "المذيع"}</span>
                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                  مباشر
                </span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-zinc-300">
                <Eye className="w-2.5 h-2.5 text-zinc-400" />
                <span>{stream?.viewerCount || viewerCount || 0}</span>
              </div>
            </div>
          </div>
          {stream?.micEnabled === false && (
            <div className="bg-amber-600/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border border-amber-500/30 animate-pulse shadow-lg">
              <MicOff className="w-3 h-3" />
              الميكروفون مغلق
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap pointer-events-auto text-white items-center">
          {isHost && isLive && (
            <>
              <button 
                onClick={() => {
                  setShowBgSettings(!showBgSettings);
                  setShowFilterSettings(false);
                }} 
                className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                  virtualBackgroundActive 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/10' 
                    : 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-emerald-400 text-white'
                }`}
                title="الخلفية الافتراضية"
              >
                <Wallpaper className="w-5 h-5 animate-pulse" />
              </button>

              {/* Visual Filters (تأثيرات الفلاتر البصرية) */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowFilterSettings(!showFilterSettings);
                    setShowBgSettings(false);
                  }} 
                  className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                    selectedFilter !== 'none' || showFilterSettings
                      ? 'border-violet-500 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 shadow-lg shadow-violet-500/10' 
                      : 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-violet-400 text-white'
                  }`}
                  title="فلاتر البث البصرية"
                >
                  <Palette className="w-5 h-5" />
                  {selectedFilter !== 'none' && (
                    <span className="absolute -top-1.5 -right-1.5 bg-violet-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-zinc-950 scale-90">
                      نشط
                    </span>
                  )}
                </button>

                {showFilterSettings && (
                  <div className="absolute top-14 left-0 md:right-0 md:left-auto mt-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-2xl z-[100] animate-in fade-in slide-in-from-top-3 duration-200 min-w-[300px]">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-[11px] font-black text-zinc-300">تأثيرات الفلاتر البصرية</span>
                      <button 
                        onClick={() => setShowFilterSettings(false)} 
                        className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {LIVE_FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedFilter(f.id);
                          }}
                          className={`flex flex-col items-center gap-1.5 p-1 rounded-xl border transition-all cursor-pointer ${
                            selectedFilter === f.id
                              ? 'border-violet-500 bg-violet-500/20'
                              : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-full aspect-video rounded-lg ${f.class} flex items-center justify-center text-[10px] font-black text-white/90 overflow-hidden shadow-inner`}>
                            <span>Aa</span>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-200">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsBeautyMode(!isBeautyMode)} 
                className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                  isBeautyMode 
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 shadow-lg shadow-purple-500/10' 
                    : 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-purple-400 text-white'
                }`}
                title={isBeautyMode ? "إلغاء وضع التجميل" : "تفعيل وضع التجميل"}
              >
                <Sparkles className="w-5 h-5 animate-pulse" />
              </button>
              <button 
                onClick={toggleScreenShare} 
                className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                  isScreenSharing 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 shadow-lg shadow-indigo-500/10' 
                    : 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-indigo-400 text-white'
                }`}
                title={isScreenSharing ? "إيقاف مشاركة الشاشة" : "مشاركة الشاشة"}
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button 
                onClick={toggleMicOnOff} 
                className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                  isMicEnabled 
                    ? 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-blue-400 text-white' 
                    : 'border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                }`}
                title={isMicEnabled ? "كتم الميكروفون" : "تشغيل الميكروفون"}
              >
                {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleCameraOnOff} 
                className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                  isCameraEnabled 
                    ? 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-blue-400 text-white' 
                    : 'border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                }`}
                title={isCameraEnabled ? "إغلاق الكاميرا" : "تشغيل الكاميرا"}
              >
                {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleCameraFacing} 
                disabled={isToggling}
                className={`p-3 bg-black/40 backdrop-blur-md border rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-90 relative group ${
                  isToggling 
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                    : 'border-white/10 hover:bg-black/60 hover:border-white/20 hover:text-blue-400'
                }`}
                title="تبديل الكاميرا"
              >
                <RefreshCw className={`w-5 h-5 transition-transform duration-300 ${isToggling ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 ${isToggling ? 'block' : 'hidden'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 bg-blue-500 ${isToggling ? 'block' : 'hidden'}`}></span>
                </span>
              </button>
            </>
          )}
          <button 
            onClick={() => setShowConfirmClose(true)} 
            className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-black/60 hover:text-red-400 transition-all active:scale-95"
            title="إغلاق البث"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* تراكب التصويت المباشر (Live Poll Overlay) */}
      {/* ========================================== */}
      {stream?.poll && (
        <div className="absolute top-24 right-4 left-4 md:left-auto md:w-80 z-40 bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl text-right animate-in fade-in slide-in-from-top-4 duration-300 text-white" dir="rtl">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full text-[9px] font-black">
              <BarChart2 className="w-3.5 h-3.5 animate-pulse text-purple-400" />
              <span>{stream.poll.isActive ? 'تصويت مباشر نشط 📊' : 'انتهى التصويت 📊'}</span>
            </div>
            {(isHost || isUserModerator) && (
              <div className="flex gap-1.5">
                {stream.poll.isActive && (
                  <button
                    onClick={handleEndPoll}
                    className="text-[9px] font-black bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    إنهاء
                  </button>
                )}
                <button
                  onClick={handleDeletePoll}
                  className="text-[9px] font-black bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  حذف
                </button>
              </div>
            )}
          </div>

          <h4 className="text-xs font-black text-zinc-100 mb-3 leading-relaxed">
            {stream.poll.question}
          </h4>

          {/* Options list */}
          <div className="space-y-2.5">
            {(() => {
              const totalVotes = stream.poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0);
              const userVotedOptionId = currentUser?.uid ? stream.poll.votedUserIds?.[currentUser?.uid] : undefined;
              const hasVoted = !!userVotedOptionId;
              const isPollClosed = !stream.poll.isActive;
              const showResults = hasVoted || isPollClosed;

              return stream.poll.options.map((opt) => {
                const percentage = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                const isSelected = userVotedOptionId === opt.id;

                if (!showResults) {
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleVotePoll(opt.id)}
                      className="w-full text-right px-3.5 py-2.5 bg-zinc-900 hover:bg-purple-600/20 border border-zinc-800 hover:border-purple-500/40 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer text-zinc-200 hover:text-white flex justify-between items-center shadow-md"
                    >
                      <span>{opt.text}</span>
                      <span className="w-5 h-5 rounded-full border border-white/20 hover:border-purple-500/60 flex items-center justify-center text-[8px] text-zinc-400 bg-black/40">
                        {opt.id === "0" ? "أ" : opt.id === "1" ? "ب" : opt.id === "2" ? "ج" : "د"}
                      </span>
                    </button>
                  );
                }

                return (
                  <div key={opt.id} className="relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40 p-3 flex flex-col gap-1 shadow-sm">
                    {/* Background Progress Fill */}
                    <div 
                      className={`absolute top-0 bottom-0 right-0 transition-all duration-1000 ${
                        isSelected ? 'bg-purple-500/25' : 'bg-white/5'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    
                    <div className="flex justify-between items-center relative z-10 text-xs font-bold text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        {opt.text}
                        {isSelected && (
                          <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-black">
                            اختيارك
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-black text-zinc-400 font-mono">
                        {percentage}% ({opt.votes || 0} صوت)
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/5 text-[10px] text-zinc-400">
            <span>إجمالي الأصوات: {stream.poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0)}</span>
            {currentUser?.uid && stream.poll.votedUserIds?.[currentUser?.uid] && (
              <span className="text-purple-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-purple-400" />
                تم تسجيل صوتك
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. طبقة الدردشة السفلية */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end max-h-[50vh] pointer-events-auto">
        {/* Stream Host Info Banner */}
        <div className="flex items-center gap-2.5 mb-2 px-1">
          <img 
            src={stream?.hostPhoto || `https://ui-avatars.com/api/?name=${stream?.hostName || 'host'}&background=random`} 
            className="w-9 h-9 rounded-full border border-white/20 object-cover" 
            alt="" 
            referrerPolicy="no-referrer"
          />
          <div className="text-right">
            <p className="font-bold text-xs text-white drop-shadow">{stream?.title || "بث مباشر جديد"}</p>
            <p className="text-[10px] text-zinc-300 drop-shadow">بث بواسطة {stream?.hostName || "المذيع"}</p>
          </div>
        </div>

        {/* Pinned Comment Overlay */}
        {stream?.pinnedComment && (
          <div className="flex gap-2.5 items-start bg-blue-950/50 backdrop-blur-md border border-blue-500/30 rounded-2xl p-3 mb-2 px-3 relative animate-in fade-in duration-300" dir="rtl">
            <div className="absolute top-1.5 left-2 flex items-center gap-1.5">
              <span className="text-[8px] bg-blue-500/25 text-blue-300 px-1.5 py-0.5 rounded-full font-black flex items-center gap-1">
                📌 تعليق مثبت
              </span>
              {(isHost || isUserModerator) && (
                <button
                  type="button"
                  onClick={handleUnpinComment}
                  className="text-zinc-400 hover:text-red-400 p-0.5 hover:bg-white/5 rounded transition-colors cursor-pointer"
                  title="إلغاء التثبيت"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <img 
              src={stream.pinnedComment.userPhoto || `https://ui-avatars.com/api/?name=${stream.pinnedComment.userName}&background=random`} 
              className="w-7 h-7 rounded-full flex-shrink-0 border border-blue-500/20 object-cover" 
              alt="" 
              referrerPolicy="no-referrer" 
            />
            <div className="flex-1 text-right pl-12">
              <p className="text-[10px] font-black text-blue-300 mb-0.5 flex items-center justify-end gap-1">
                {stream?.moderatorIds?.includes(stream.pinnedComment.userId) && <Shield className="w-2.5 h-2.5 text-emerald-400" />}
                {stream.pinnedComment.userId === stream?.hostId && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                @{stream.pinnedComment.userName}
              </p>
              <p className="text-xs font-semibold leading-relaxed text-zinc-100">{stream.pinnedComment.text}</p>
            </div>
          </div>
        )}

        {/* Chat Comments Area */}
        <div className="overflow-y-auto px-1 space-y-2.5 custom-scrollbar flex flex-col justify-end max-h-[25vh]">
          <div className="space-y-2.5">
            {comments.map((comment) => (
              <div 
                key={comment.id} 
                onClick={() => {
                  setSelectedCommentForOptions(comment);
                }}
                className="flex gap-2.5 items-start animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-colors"
                title="اضغط لخيارات التعليق والإشراف"
              >
                <img 
                  src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.userName}&background=random`} 
                  className="w-7 h-7 rounded-full flex-shrink-0 border border-white/10 object-cover" 
                  alt="" 
                  referrerPolicy="no-referrer" 
                />
                <div className="bg-black/45 backdrop-blur-sm border border-white/10 rounded-2xl p-2.5 max-w-[85%] shadow-md">
                  <p className="text-[10px] font-black text-blue-400 mb-0.5 text-right flex items-center justify-end gap-1">
                    {stream?.moderatorIds?.includes(comment.userId) && <Shield className="w-2.5 h-2.5 text-emerald-400" />}
                    {comment.userId === stream?.hostId && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                    @{comment.userName}
                  </p>
                  <p className="text-xs font-semibold leading-relaxed text-zinc-100 text-right">{comment.text}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </div>

        {/* PK Battle Support Panel */}
        {stream?.pkBattle?.status === 'active' && (
          <div className="bg-zinc-950/85 backdrop-blur-sm border border-zinc-800 rounded-2xl p-3 mt-3 space-y-2 shadow-xl animate-in fade-in duration-300" dir="rtl">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-black text-red-400">@{stream.hostName} ({stream.pkBattle.pointsHost} pt)</span>
              <span className="font-mono text-zinc-400">الوقت: {pkTimeLeft} ثانية</span>
              <span className="font-black text-blue-400">@{stream.pkBattle.opponentName} ({stream.pkBattle.pointsOpponent} pt)</span>
            </div>
            <div className="relative w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
              <div 
                className="bg-red-500 h-full transition-all duration-300" 
                style={{ width: `${(stream.pkBattle.pointsHost / (stream.pkBattle.pointsHost + stream.pkBattle.pointsOpponent || 1)) * 100}%` }}
              />
              <div className="bg-blue-500 h-full flex-1 transition-all duration-300" />
            </div>
            <div className="flex gap-1.5 pt-1">
              <button 
                type="button"
                onClick={() => handleSupportSide('host')}
                className="flex-1 py-1.5 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 active:scale-95 rounded-lg text-[9px] font-black text-red-400 cursor-pointer shadow-sm text-center"
              >
                دعم المضيف ❤️
              </button>
              <button 
                type="button"
                onClick={() => handleSupportSide('opponent')}
                className="flex-1 py-1.5 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 active:scale-95 rounded-lg text-[9px] font-black text-blue-400 cursor-pointer shadow-sm text-center"
              >
                دعم المنافس 💙
              </button>
            </div>
          </div>
        )}

        {/* Actions Bar (لوحة التحكم السريعة للبث والتحكم) */}
        {(isHost || isUserModerator) && (
          <div className="flex gap-2 mt-3" dir="rtl">
            <button
              type="button"
              onClick={() => {
                setSettingsTab('moderators');
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[9px] font-black text-white cursor-pointer active:scale-95"
            >
              <Settings className="w-3 h-3 text-blue-400" />
              إعدادات البث
            </button>

            {isHost && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (stream?.guest) {
                      handleKickGuest();
                    } else {
                      setShowInviteGuestModal(true);
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-xl text-[9px] font-black cursor-pointer active:scale-95 ${
                    stream?.guest 
                      ? 'bg-red-600/20 border-red-500/30 text-red-400' 
                      : 'bg-zinc-900/80 border-zinc-800 text-white'
                  }`}
                >
                  <Users className="w-3 h-3 text-emerald-400" />
                  {stream?.guest ? 'طرد الضيف' : 'دعوة ضيف 🎙️'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (stream?.pkBattle?.status === 'active') {
                      handleEndPKBattle();
                    } else {
                      setShowPKModal(true);
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-xl text-[9px] font-black cursor-pointer active:scale-95 ${
                    stream?.pkBattle?.status === 'active'
                      ? 'bg-red-600/20 border-red-500/30 text-red-400 animate-pulse'
                      : 'bg-zinc-900/80 border-zinc-800 text-white'
                  }`}
                >
                  <Radio className="w-3 h-3 text-purple-400" />
                  {stream?.pkBattle?.status === 'active' ? 'إنهاء التحدي' : 'تحدي PK ⚔️'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (stream?.poll) {
                      setShowPollCreateModal(true);
                    } else {
                      setPollQuestion("");
                      setPollOptions(["", ""]);
                      setShowPollCreateModal(true);
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-xl text-[9px] font-black cursor-pointer active:scale-95 ${
                    stream?.poll?.isActive
                      ? 'bg-purple-600/20 border-purple-500/30 text-purple-400 animate-pulse'
                      : 'bg-zinc-900/80 border-zinc-800 text-white'
                  }`}
                >
                  <BarChart2 className="w-3 h-3 text-amber-400" />
                  {stream?.poll ? (stream.poll.isActive ? 'إدارة التصويت 📊' : 'رؤية نتائج التصويت 📊') : 'إنشاء تصويت 📊'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Form with input and send button */}
        <form 
          onSubmit={handleSendComment}
          className="mt-4 w-full flex gap-2 bg-black/60 backdrop-blur-md border border-white/25 rounded-2xl px-4 focus-within:border-blue-500/50 transition-all shadow-xl"
        >
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="ارسل تعليقاً..." 
            disabled={isSending}
            className="flex-1 bg-transparent py-3 text-xs sm:text-sm font-semibold outline-none text-white placeholder:text-zinc-500 disabled:opacity-50 text-right"
          />
          <button 
            type="submit" 
            disabled={isSending || !newComment.trim()}
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                  navigator.vibrate(10);
                } catch (e) {
                  console.debug("navigator.vibrate failed/blocked", e);
                }
              }
            }}
            className={`send-comment-button transition-all flex items-center justify-center cursor-pointer p-1.5 rounded-xl ${
              isSending || !newComment.trim() 
                ? 'text-zinc-600 cursor-not-allowed scale-95' 
                : 'text-blue-500 hover:scale-110 hover:text-blue-400 active:scale-90'
            }`}
            aria-label="إرسال"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : (
              <Send className="w-4 h-4 transform -rotate-45" />
            )}
          </button>
        </form>
      </div>

      {/* Helper Modals */}
      {showBgSettings && (
        <div className="absolute inset-x-4 bottom-24 z-[110] bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <Wallpaper className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-sm text-white font-sans text-right w-full">الخلفية الافتراضية الذكية</h3>
            </div>
            <button 
              type="button"
              onClick={() => setShowBgSettings(false)}
              className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* Real-time Preview Thumbnail */}
            <div className="flex flex-col gap-2 bg-zinc-900/40 border border-zinc-800/40 p-3 rounded-2xl">
              <span className="text-xs font-bold text-zinc-400 text-right">معاينة مباشرة في الوقت الفعلي</span>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <canvas 
                  ref={previewCanvasRef} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[9px] font-black text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>معاينة مباشرة</span>
                </div>

                {!pendingBgUrl && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-zinc-300 bg-black/60 px-3 py-1.5 rounded-xl border border-white/5">اختر خلفية أدناه لبدء المعاينة الذكية</span>
                  </div>
                )}
              </div>

              {pendingBgUrl && (
                <div className="flex gap-2.5 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingBgUrl(null);
                      pendingBgImageRef.current = null;
                    }}
                    className="flex-1 py-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-all active:scale-[0.98]"
                  >
                    إعادة تعيين المعاينة
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPendingBg}
                    className="flex-[2] py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white shadow-lg shadow-emerald-950/30 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <span>تطبيق الخلفية كبث مباشر</span>
                  </button>
                </div>
              )}
            </div>

            {/* Toggle State */}
            <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/40">
              <span className="text-xs font-semibold text-zinc-300">تفعيل الخلفية الافتراضية</span>
              <button
                type="button"
                onClick={() => {
                  if (virtualBackgroundActive) {
                    disableVirtualBackground();
                  } else {
                    if (pendingBgUrl) {
                      handleApplyPendingBg();
                    } else {
                      // default to first preset
                      selectPresetBg("https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80");
                    }
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  virtualBackgroundActive 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30' 
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {virtualBackgroundActive ? "مفعلة" : "معطلة"}
              </button>
            </div>

            {/* Custom Background Upload / Camera Input */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-400 text-right">تحميل صورة مخصصة (التقاط بالكاميرا أو اختيار ملف)</span>
              <label 
                htmlFor="virtual-bg-upload"
                className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-dashed border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800/80 rounded-2xl cursor-pointer text-xs font-black text-zinc-300 transition-all active:scale-[0.98]"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>التقط صورة بالكاميرا أو اختر ملفاً</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="virtual-bg-upload" 
                  className="hidden" 
                  onChange={handleBgUpload} 
                />
              </label>
            </div>

            {/* Predefined Presets */}
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-xs font-bold text-zinc-400 text-right">أو اختر من الخلفيات الاحترافية الجاهزة</span>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  {
                    name: "مكتب مريح",
                    url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=300&q=80"
                  },
                  {
                    name: "مقر رسمي",
                    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80"
                  },
                  {
                    name: "أضواء نيون",
                    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80"
                  }
                ].map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectPresetBg(preset.url)}
                    className={`group relative rounded-2xl overflow-hidden aspect-video border transition-all duration-200 ${
                      pendingBgUrl === preset.url
                        ? 'border-emerald-500 shadow-md shadow-emerald-500/20 scale-95'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <img 
                      src={preset.url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      alt={preset.name} 
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-[1px] py-1 text-[10px] font-black text-white text-center">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Loading/Status indicator */}
            {(virtualBackgroundActive || pendingBgUrl) && (
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/30">
                {!isSegmenterLoaded ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 animate-pulse" />
                    <span className="text-right flex-1">جاري تحميل معالج إزالة الخلفية بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-right flex-1 text-emerald-400 font-bold">معالج إزالة الخلفية نشط بالذكاء الاصطناعي 🟢</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isToggling && (
        <div className="absolute inset-0 z-[115] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md transition-all duration-300">
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-[280px]">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
              <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold text-white text-base font-sans">جاري تبديل الكاميرا</p>
              <p className="text-xs text-zinc-400 font-sans">يرجى الانتظار للحظات...</p>
            </div>
          </div>
        </div>
      )}

      {showConfirmClose && (
        <div className="absolute inset-0 z-[125] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-2xl max-w-[360px] mx-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <X className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-white text-lg font-sans">
                {isHost ? "إنهاء البث المباشر؟" : "مغادرة البث المباشر؟"}
              </h3>
              <p className="text-sm text-zinc-400 font-sans leading-relaxed">
                {isHost 
                  ? "هل أنت متأكد من رغبتك في إنهاء البث المباشر؟ سيتم إيقاف التشغيل وإنهاء البث لجميع المتابعين." 
                  : "هل أنت متأكد من رغبتك في مغادرة البث المباشر الحالي؟ يمكنك الانضمام مجدداً في أي وقت."}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => {
                  setShowConfirmClose(false);
                  if (isHost) {
                    handleEndLive();
                  } else {
                    onClose();
                  }
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-sm transition-colors active:scale-95 shadow-lg shadow-red-900/20"
              >
                {isHost ? "إنهاء البث" : "مغادرة"}
              </button>
              <button 
                onClick={() => setShowConfirmClose(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-2xl text-sm transition-colors active:scale-95 border border-white/5"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. قائمة خيارات التعليق (Comment Options Menu) */}
      {/* ========================================== */}
      {selectedCommentForOptions && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center pointer-events-none">
          {/* Backdrop with slide-up easing */}
          <div 
            className="absolute inset-0 bg-black/65 backdrop-blur-sm pointer-events-auto"
            onClick={() => setSelectedCommentForOptions(null)}
          />
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-[2.5rem] p-6 pb-10 pointer-events-auto relative z-10 text-right shadow-2xl"
            dir="rtl"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6" />

            {/* Selected User Header */}
            <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-zinc-900">
              <img 
                src={selectedCommentForOptions.userPhoto || `https://ui-avatars.com/api/?name=${selectedCommentForOptions.userName}&background=random`} 
                className="w-11 h-11 rounded-full border border-white/10 object-cover"
                alt=""
              />
              <div className="text-right flex-1">
                <div className="flex items-center gap-1.5 justify-start">
                  <span className="font-black text-sm text-white">@{selectedCommentForOptions.userName}</span>
                  {selectedCommentForOptions.userId === stream?.hostId && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {stream?.moderatorIds?.includes(selectedCommentForOptions.userId) && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">"{selectedCommentForOptions.text}"</p>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Share to Story */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCommentForOptions(null);
                  onShareCommentToStory?.(selectedCommentForOptions);
                }}
                className="w-full flex items-center gap-4 p-4 bg-purple-600/10 hover:bg-purple-600/25 border border-purple-500/20 rounded-2xl text-right text-xs font-black text-purple-200 transition-all cursor-pointer active:scale-[0.99]"
              >
                <span className="p-2.5 bg-purple-600/20 rounded-xl text-purple-400">✨</span>
                <div className="flex-1">
                  <p className="text-xs font-black text-purple-300">مشاركة في القصة</p>
                  <p className="text-[10px] text-zinc-500 font-normal mt-0.5">أنشئ قصة متميزة واعرض تعليق هذا المتابع بأسلوب جذاب</p>
                </div>
              </button>

              {/* Pin / Unpin Action (Broadcaster and Moderators Only) */}
              {(isHost || isUserModerator) && (
                <button
                  type="button"
                  onClick={() => {
                    const isAlreadyPinned = stream?.pinnedComment?.id === selectedCommentForOptions.id;
                    if (isAlreadyPinned) {
                      handleUnpinComment();
                    } else {
                      handlePinComment(
                        selectedCommentForOptions.id,
                        selectedCommentForOptions.userName,
                        selectedCommentForOptions.text,
                        selectedCommentForOptions.userId,
                        selectedCommentForOptions.userPhoto || ""
                      );
                    }
                    setSelectedCommentForOptions(null);
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 rounded-2xl text-right text-xs font-black text-blue-200 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400">📌</span>
                  <div className="flex-1 text-right">
                    <p className="text-xs font-black text-blue-300">
                      {stream?.pinnedComment?.id === selectedCommentForOptions.id ? 'إلغاء تثبيت التعليق' : 'تثبيت التعليق 📌'}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-normal mt-0.5">
                      {stream?.pinnedComment?.id === selectedCommentForOptions.id 
                        ? 'إزالة هذا التعليق من العرض المثبت لجميع المتابعين' 
                        : 'عرض هذا التعليق كرسالة مثبتة في أعلى البث المباشر للجميع'}
                    </p>
                  </div>
                </button>
              )}

              {/* Moderator and Host Actions */}
              {(isHost || isUserModerator) && selectedCommentForOptions.userId !== stream?.hostId && (
                <>
                  {/* Mute action */}
                  <button
                    type="button"
                    onClick={() => {
                      const isMuted = stream?.mutedIds?.includes(selectedCommentForOptions.userId);
                      if (isMuted) {
                        handleUnmuteUser(selectedCommentForOptions.userId, selectedCommentForOptions.userName, selectedCommentForOptions.userPhoto || "");
                      } else {
                        handleMuteUser(selectedCommentForOptions.userId, selectedCommentForOptions.userName, selectedCommentForOptions.userPhoto);
                      }
                      setSelectedCommentForOptions(null);
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-2xl text-right text-xs font-black text-white transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <span className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">🔇</span>
                    <div className="flex-1">
                      <p className="text-xs font-black">
                        {stream?.mutedIds?.includes(selectedCommentForOptions.userId) ? 'إلغاء كتم الصوت عن المتابع' : 'كتم المتابع'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-normal mt-0.5">منعه من التعليق خلال البث النشط مع بقائه كمشاهد</p>
                    </div>
                  </button>

                  {/* Block / Kick action */}
                  <button
                    type="button"
                    onClick={() => {
                      const isBlocked = stream?.blockedIds?.includes(selectedCommentForOptions.userId);
                      if (isBlocked) {
                        handleUnblockUser(selectedCommentForOptions.userId, selectedCommentForOptions.userName, selectedCommentForOptions.userPhoto || "");
                      } else {
                        handleBlockUser(selectedCommentForOptions.userId, selectedCommentForOptions.userName, selectedCommentForOptions.userPhoto);
                      }
                      setSelectedCommentForOptions(null);
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-red-600/5 hover:bg-red-600/15 border border-red-500/10 rounded-2xl text-right text-xs font-black text-red-400 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <span className="p-2.5 bg-red-500/15 rounded-xl text-red-500">🚫</span>
                    <div className="flex-1">
                      <p className="text-xs font-black">
                        {stream?.blockedIds?.includes(selectedCommentForOptions.userId) ? 'إلغاء حظر المتابع' : 'حظر وطرد المتابع فوراً'}
                      </p>
                      <p className="text-[10px] text-red-500/60 font-normal mt-0.5">طرده من البث المباشر نهائياً ومنع دخوله للبث مرة أخرى</p>
                    </div>
                  </button>

                  {/* Toggle Moderator (Host Only) */}
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => {
                        const isMod = stream?.moderatorIds?.includes(selectedCommentForOptions.userId);
                        if (isMod) {
                          handleRemoveModerator(selectedCommentForOptions.userId, selectedCommentForOptions.userName, selectedCommentForOptions.userPhoto || "");
                        } else {
                          handleSetModerator(selectedCommentForOptions.userId, selectedCommentForOptions.userName, selectedCommentForOptions.userPhoto);
                        }
                        setSelectedCommentForOptions(null);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-2xl text-right text-xs font-black text-white transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <span className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">🛡️</span>
                      <div className="flex-1">
                        <p className="text-xs font-black">
                          {stream?.moderatorIds?.includes(selectedCommentForOptions.userId) ? 'تنزيل رتبة الإشراف' : 'تعيين كمشرف للبث'}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-normal mt-0.5">منح المستخدم صلاحيات الإشراف وكتم المزعجين لمساعدتك في البث</p>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            <button 
              onClick={() => setSelectedCommentForOptions(null)}
              className="w-full mt-5 py-3.5 bg-zinc-900 hover:bg-zinc-850 border border-white/5 rounded-2xl font-black text-xs text-zinc-400 transition-all cursor-pointer text-center active:scale-95"
            >
              إغلاق خيارات التعليق
            </button>
          </motion.div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. لوحة إعدادات البث (Live Settings Dashboard) */}
      {/* ========================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowSettingsModal(false)} />
          
          <div className="admin-settings-panel bg-zinc-950 border border-zinc-900 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]" dir="rtl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500 animate-spin" style={{ animationDuration: '8s' }} />
                <span className="font-black text-sm text-white">إعدادات وإدارة البث</span>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-900 bg-zinc-950/40 p-2 gap-1 overflow-x-auto custom-scrollbar">
              {[
                { id: 'users', label: 'المتابعون 👥', color: 'text-indigo-400 bg-indigo-500/5' },
                { id: 'moderators', label: 'المشرفون 🛡️', color: 'text-emerald-400 bg-emerald-500/5' },
                { id: 'muted', label: 'المكتومون 🔇', color: 'text-amber-400 bg-amber-500/5' },
                { id: 'blocked', label: 'المحظورون 🚫', color: 'text-red-400 bg-red-500/5' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as any)}
                  className={`flex-1 min-w-[80px] py-3 text-[11px] font-black rounded-xl transition-all ${
                    settingsTab === tab.id 
                      ? `${tab.color} border border-white/5 shadow-md` 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {settingsTab === 'users' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">قائمة المتابعين والحضور النشطين في البث. يمكنك ترقية أو سحب رتب الإشراف منهم مباشرة بنقرة واحدة.</p>
                  {(() => {
                    const simulatedUsers = [
                      { uid: 'guest_farah', name: 'فرح القحطاني', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
                      { uid: 'guest_youssef', name: 'يوسف الهذلي', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
                      { uid: 'guest_sara', name: 'سارة العتيبي', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80' },
                      ...(stream?.moderators || []),
                      ...(stream?.mutedUsers || []),
                      ...(stream?.blockedUsers || [])
                    ];
                    
                    const allStreamUsers = simulatedUsers.reduce((acc: any[], current) => {
                      const exists = acc.some(item => item.uid === current.uid);
                      if (!exists) {
                        return acc.concat([current]);
                      }
                      return acc;
                    }, []);

                    if (allStreamUsers.length === 0) {
                      return <div className="text-center py-8 text-xs text-zinc-600 font-bold">لا يوجد حضور نشط حالياً.</div>;
                    }

                    return (
                      <div className="divide-y divide-zinc-900">
                        {allStreamUsers.map((u: any) => {
                          const isMod = !!stream?.moderatorIds?.includes(u.uid);
                          return (
                            <div key={u.uid} className="flex items-center justify-between py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="relative">
                                  <img src={u.photo || `https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-8 h-8 rounded-full border border-white/5 object-cover" alt="" />
                                  {isMod && (
                                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[8px] p-0.5 rounded-full border border-zinc-950 text-white">
                                      🛡️
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="text-xs font-bold text-zinc-200">@{u.name}</span>
                                  {isMod && (
                                    <span className="text-[8.5px] font-black text-emerald-400 mt-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                      مشرف البث 🛡️
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isHost && (
                                <button
                                  onClick={async () => {
                                    if (isMod) {
                                      await handleRemoveModerator(u.uid, u.name, u.photo || "");
                                    } else {
                                      await handleSetModerator(u.uid, u.name, u.photo || "");
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all active:scale-95 cursor-pointer border ${
                                    isMod 
                                      ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' 
                                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                  }`}
                                >
                                  {isMod ? 'إلغاء الإشراف ❌' : 'تعيين مشرف 🛡️'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {settingsTab === 'moderators' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">المشرفون يمتلكون صلاحية كتم أو حظر المتابعين لمساعدتك في تنظيم البث.</p>
                  {(!stream?.moderatorIds || stream.moderatorIds.length === 0) ? (
                    <div className="text-center py-8 text-xs text-zinc-600 font-bold">لا يوجد مشرفون معينون للبث حالياً.</div>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {stream.moderators?.map((mod: any) => (
                        <div key={mod.uid} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <img src={mod.photo || `https://ui-avatars.com/api/?name=${mod.name}&background=random`} className="w-8 h-8 rounded-full border border-white/5 object-cover" alt="" />
                              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[8px] p-0.5 rounded-full border border-zinc-950 text-white">
                                🛡️
                              </span>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-bold text-zinc-200">@{mod.name}</span>
                              <span className="text-[8.5px] font-black text-emerald-400 mt-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                مشرف البث 🛡️
                              </span>
                            </div>
                          </div>
                          {isHost && (
                            <button 
                              onClick={() => handleRemoveModerator(mod.uid, mod.name, mod.photo || "")}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[9px] font-black transition-colors"
                            >
                              إلغاء الإشراف
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {settingsTab === 'muted' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">المكتومون يمكنهم متابعة البث لكن يمنعون من كتابة أي تعليقات.</p>
                  {(!stream?.mutedIds || stream.mutedIds.length === 0) ? (
                    <div className="text-center py-8 text-xs text-zinc-600 font-bold">لا يوجد مكتومون في البث حالياً.</div>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {stream.mutedUsers?.map((u: any) => (
                        <div key={u.uid} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            <img src={u.photo || `https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-8 h-8 rounded-full border border-white/5 object-cover" alt="" />
                            <span className="text-xs font-bold text-zinc-200">@{u.name}</span>
                          </div>
                          <button 
                            onClick={() => handleUnmuteUser(u.uid, u.name, u.photo || "")}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg text-[9px] font-black transition-colors"
                          >
                            إلغاء الكتم
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {settingsTab === 'blocked' && (
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">المحظورون يطردون فوراً من البث ويمنعون من الدخول للبث مرة أخرى.</p>
                  {(!stream?.blockedIds || stream.blockedIds.length === 0) ? (
                    <div className="text-center py-8 text-xs text-zinc-600 font-bold">قائمة الحظر فارغة حالياً.</div>
                  ) : (
                    <div className="divide-y divide-zinc-900">
                      {stream.blockedUsers?.map((u: any) => (
                        <div key={u.uid} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2.5">
                            <img src={u.photo || `https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-8 h-8 rounded-full border border-white/5 object-cover" alt="" />
                            <span className="text-xs font-bold text-zinc-200">@{u.name}</span>
                          </div>
                          <button 
                            onClick={() => handleUnblockUser(u.uid, u.name, u.photo || "")}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[9px] font-black transition-colors"
                          >
                            إلغاء الحظر
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-zinc-950 border-t border-zinc-900">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-black text-zinc-300 transition-colors"
              >
                إغلاق اللوحة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. نافذة دعوة ضيف مشارك (Invite Co-host Modal) */}
      {/* ========================================== */}
      {showInviteGuestModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowInviteGuestModal(false)} />
          
          <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative z-10 flex flex-col" dir="rtl">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <span className="font-black text-sm text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400 animate-pulse" />
                دعوة ضيف مشارك للبث 🎙️
              </span>
              <button 
                onClick={() => setShowInviteGuestModal(false)}
                className="p-1 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Host Guest Invite list */}
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">اختر أحد المتواجدين النشطين في التطبيق لإرسال دعوة استضافة مشاركة فورية ومشاركة شاشة الفيديو والبث معاً.</p>
              
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {[
                  { uid: 'guest_farah', name: 'فرح القحطاني', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
                  { uid: 'guest_youssef', name: 'يوسف الهذلي', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
                  { uid: 'guest_sara', name: 'سارة العتيبي', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80' }
                ].map((guestItem) => (
                  <div key={guestItem.uid} className="flex items-center justify-between p-2.5 bg-zinc-900/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2">
                      <img src={guestItem.photo} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt="" />
                      <span className="text-xs font-bold text-zinc-200">@{guestItem.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleInviteGuest(guestItem.uid, guestItem.name, guestItem.photo);
                        setShowInviteGuestModal(false);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg transition-colors active:scale-95 cursor-pointer shadow-sm"
                    >
                      إرسال دعوة
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border-t border-zinc-900">
              <button 
                onClick={() => setShowInviteGuestModal(false)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-black text-zinc-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. تحدي البث PK (PK Battle Modal) */}
      {/* ========================================== */}
      {showPKModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowPKModal(false)} />
          
          <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative z-10 flex flex-col" dir="rtl">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <span className="font-black text-sm text-white flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
                بدء تحدي بث مباشر PK Battle ⚔️
              </span>
              <button 
                onClick={() => setShowPKModal(false)}
                className="p-1 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">قم بتحدي أحد صناع المحتوى المتواجدين حالياً في بث مشترك وتنافس على دعم الجمهور وتجميع أكبر عدد من القلوب والهدايا المباشرة!</p>
              
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {[
                  { id: 'rival_ali', name: 'المذيع علي 🎙️', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
                  { id: 'rival_yasmin', name: 'ياسمين ستار 💠', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }
                ].map((rival) => (
                  <div key={rival.id} className="flex items-center justify-between p-2.5 bg-zinc-900/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2">
                      <img src={rival.photo} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt="" />
                      <span className="text-xs font-bold text-zinc-200">@{rival.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleStartPKBattle({ name: rival.name, photo: rival.photo });
                        setShowPKModal(false);
                      }}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[9px] rounded-lg transition-colors active:scale-95 cursor-pointer shadow-sm"
                    >
                      تحدي الآن ⚔️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border-t border-zinc-900">
              <button 
                onClick={() => setShowPKModal(false)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-black text-zinc-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4.8. نافذة إدارة وإنشاء التصويت (Poll Creator / Manager Modal) */}
      {/* ========================================== */}
      {showPollCreateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowPollCreateModal(false)} />
          
          <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative z-10 flex flex-col" dir="rtl">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <span className="font-black text-sm text-white flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-purple-400 animate-pulse" />
                {stream?.poll ? 'إدارة التصويت المباشر 📊' : 'إنشاء تصويت جديد 📊'}
              </span>
              <button 
                onClick={() => setShowPollCreateModal(false)}
                className="p-1 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              {stream?.poll ? (
                // Poll Management View
                <div className="space-y-4 text-right">
                  <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-zinc-400 font-bold">الحالة</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        stream.poll.isActive ? 'bg-purple-500/15 text-purple-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {stream.poll.isActive ? 'نشط الآن' : 'منتهي'}
                      </span>
                    </div>
                    <p className="text-xs font-black text-white leading-relaxed">{stream.poll.question}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-400 font-bold">الخيارات والنتائج:</span>
                    {(() => {
                      const totalVotes = stream.poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0);
                      return stream.poll.options.map((opt) => {
                        const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                        return (
                          <div key={opt.id} className="relative overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900/30 p-2.5 flex justify-between items-center text-xs">
                            <div className="absolute top-0 bottom-0 right-0 bg-purple-500/10 transition-all duration-1000" style={{ width: `${pct}%` }} />
                            <span className="font-bold text-zinc-200 relative z-10">{opt.text}</span>
                            <span className="font-mono text-zinc-400 relative z-10">{pct}% ({opt.votes || 0} صوت)</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    {stream.poll.isActive && (
                      <button
                        onClick={async () => {
                          await handleEndPoll();
                        }}
                        className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer active:scale-95 text-center shadow-md"
                      >
                        إنهاء التصويت
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (confirm("هل أنت متأكد من رغبتك في حذف هذا التصويت والبدء من جديد؟")) {
                          await handleDeletePoll();
                        }
                      }}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer active:scale-95 text-center shadow-md"
                    >
                      إعادة تعيين / حذف 🗑️
                    </button>
                  </div>
                </div>
              ) : (
                // Poll Creation View
                <div className="space-y-4">
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-zinc-300">سؤال التصويت</label>
                    <input 
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="مثال: ما رأيكم في موضوع بث اليوم؟"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 text-right font-semibold"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-zinc-300 block text-right">خيارات التصويت (2 على الأقل)</label>
                    
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="space-y-1.5 text-right">
                        <span className="text-[10px] text-zinc-500 font-bold">
                          الخيار {idx + 1} {idx < 2 ? '(مطلوب)' : '(اختياري)'}
                        </span>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...pollOptions];
                              updated[idx] = e.target.value;
                              setPollOptions(updated);
                            }}
                            placeholder={`الخيار المتاح ${idx + 1}`}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 text-right font-medium"
                          />
                          {idx >= 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPollOptions(pollOptions.filter((_, oIdx) => oIdx !== idx));
                              }}
                              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {pollOptions.length < 4 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPollOptions([...pollOptions, ""]);
                        }}
                        className="text-xs font-black text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        + إضافة خيار إضافي
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex gap-2">
              {!stream?.poll && (
                <button 
                  onClick={async () => {
                    if (!pollQuestion.trim()) {
                      alert("⚠️ الرجاء إدخال سؤال للتصويت.");
                      return;
                    }
                    const validOptions = pollOptions.filter(o => o.trim() !== "");
                    if (validOptions.length < 2) {
                      alert("⚠️ الرجاء إدخال خيارين صالحين على الأقل.");
                      return;
                    }
                    await handleCreatePoll(pollQuestion, validOptions);
                    setShowPollCreateModal(false);
                  }}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-lg shadow-purple-500/10"
                >
                  إطلاق التصويت 🚀
                </button>
              )}
              <button 
                onClick={() => setShowPollCreateModal(false)}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-xs font-black text-zinc-300 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. إشعار استقبال دعوة ضيف للطرف الآخر (Viewer Invite Prompt) */}
      {/* ========================================== */}
      {!isHost && stream?.guestInvite?.targetUid === currentUser?.uid && stream?.guestInvite?.status === 'pending' && (
        <div className="fixed inset-x-4 top-24 z-[130] bg-zinc-950/95 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-top-5 duration-300" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Users className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-right flex-1">
              <span className="text-xs font-black text-emerald-400 block mb-0.5">دعوة استضافة مشاركة نشطة 🟢</span>
              <p className="text-xs font-bold text-white">دعاك المضيف @{stream.hostName} لتكون ضيفاً مشاركاً وتفتح الفيديو والمايك بالبث المباشر.</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={handleAcceptGuestInvite}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              قبول الانضمام
            </button>
            <button
              onClick={handleDeclineGuestInvite}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-white/5 font-black text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              رفض الدعوة
            </button>
          </div>
        </div>
      )}

      {/* Floating hearts animation elements */}
      {hearts.map(h => (
        <span 
          key={h.id} 
          className="absolute text-xl pointer-events-none z-50 select-none animate-ping duration-1000"
          style={{ ...h.style, color: h.color }}
        >
          ❤️
        </span>
      ))}
    </motion.div>
  );
};



const LiveStreamsHeader = ({ onSelectLive }: { onSelectLive: (id: string) => void }) => {
  const [activeLives, setActiveLives] = useState<LiveStream[]>([]);

  useEffect(() => {
    const q = query(collection(db, "lives"), where("status", "==", "active"), orderBy("startedAt", "desc"), limit(15));
    const unsub = onSnapshot(q, (snapshot) => {
      setActiveLives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveStream)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "lives");
    });
    return () => unsub();
  }, []);

  if (activeLives.length === 0) return null;

  return (
    <div className="mb-8 overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-black text-white/90 uppercase tracking-widest flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
          بث مباشر نشط
        </h3>
        <span className="text-zinc-600 text-[10px] font-black uppercase tracking-tighter">شاهد الآن</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
        {activeLives.map((live) => (
          <motion.div 
            key={live.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectLive(live.id)}
            className="flex-shrink-0 w-24 flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-red-600 to-orange-500 rounded-full animate-spin-slow opacity-80" />
              <img 
                src={live.hostPhoto || `https://ui-avatars.com/api/?name=${live.hostName}&background=random`} 
                className="w-16 h-16 rounded-full object-cover border-2 border-zinc-950 relative z-10"
                alt=""
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-[8px] font-black px-2 py-0.5 rounded-md border border-zinc-950 z-20">
                مباشر
              </div>
            </div>
            <span className="text-[10px] font-black text-white truncate w-full text-center">{live.hostName}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};


/** ---------------------------------------------------------------------------
 * LIVES EXPLORER SCREEN
 * -------------------------------------------------------------------------- */
const LivesExplorerScreen = ({ onWatchLive, onNavigateToUser }: { onWatchLive: (id: string) => void, onNavigateToUser: (uid: string) => void }) => {
  const [lives, setLives] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "lives"), where("status", "==", "active"), orderBy("startedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setLives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LiveStream)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "lives");
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">البث المباشر</h2>
            <p className="text-zinc-500 font-bold text-sm">شاهد ما يحدث الآن حول العالم</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-[32px] overflow-hidden animate-pulse">
              <div className="aspect-video bg-zinc-800" />
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-4 bg-zinc-800 rounded-lg" />
                  <div className="w-16 h-3 bg-zinc-800 rounded-lg opacity-50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : lives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {lives.map((live) => (
            <motion.div 
              key={live.id}
              whileHover={{ y: -5 }}
              onClick={() => onWatchLive(live.id)}
              className="bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden group cursor-pointer shadow-xl shadow-black/50"
            >
              <div className="aspect-video relative overflow-hidden bg-zinc-800">
                <img 
                  src={live.hostPhoto || `https://ui-avatars.com/api/?name=${live.hostName}&background=random`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-60"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="bg-red-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    مباشر
                  </div>
                  <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 border border-white/10">
                    <Eye className="w-3 h-3" />
                    {live.viewerCount}
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-white font-black text-lg line-clamp-1 leading-tight">{live.title}</p>
                </div>
              </div>
              <div className="p-4 flex items-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToUser(live.hostId);
                  }}
                  className="hover:scale-105 transition-transform"
                >
                  <img src={live.hostPhoto} className="w-10 h-10 rounded-full border border-zinc-800" alt="" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate text-sm">@{live.hostName}</p>
                  <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">مضيف البث</p>
                </div>
                <div className="w-8 h-8 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-4 h-4 fill-current" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-zinc-900 rounded-[40px] flex items-center justify-center text-zinc-700 mb-6 border border-zinc-800">
            <Radio className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">لا يوجد بث مباشر حالياً</h3>
          <p className="text-zinc-500 font-bold max-w-xs mx-auto">كن أول من يبدأ بثاً مباشراً ويشاركه مع الجميع!</p>
          <button 
            onClick={() => {
              // Trigger Go Live
              const addBtn = document.querySelector('button[title="إضافة"]') as HTMLButtonElement;
              if (addBtn) addBtn.click();
            }}
            className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-900/20 hover:scale-105 transition-all"
          >
            ابدأ بثك الخاص
          </button>
        </div>
      )}
    </div>
  );
};

function Feed({ currentUser, onViewMedia, onNavigateToChat, onNavigateToSearch, onNavigateToUser, onTriggerMediaUpload, onNavigateToAI, unreadMessagesCount, onWatchLive }: { 
  currentUser: FirebaseUser | null, 
  onViewMedia: (url: string, type: 'image' | 'video') => void, 
  onNavigateToChat: () => void, 
  onNavigateToSearch: () => void, 
  onNavigateToUser: (uid: string) => void,
  onTriggerMediaUpload: () => void,
  onNavigateToAI: () => void,
  unreadMessagesCount: number,
  onWatchLive: (id: string) => void
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [postGifUrl, setPostGifUrl] = useState<string | null>(null);
  const [showFeedGifPicker, setShowFeedGifPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');

  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollCreatorOptions, setPollCreatorOptions] = useState<string[]>(["", ""]);

  useEffect(() => {
    if (!currentUser) console.log("No user"); // Wait for user to be available
    console.log("Feed: User authenticated, starting posts subscription...");
    
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
      setLoading(false);
    });
    return unsubscribe;
  }, [currentUser]);

  const [trendingCreators, setTrendingCreators] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
      setGlobalLoading(true);
      try {
        const q = query(collection(db, 'users'), limit(10));
        const snap = await getDocs(q);
        const users = snap.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .filter(u => u.uid !== currentUser?.uid);
        setTrendingCreators(users);
      } catch (e) {
        console.error("Error fetching trending creators:", e);
      } finally {
        setGlobalLoading(false);
      }
    };
    fetchTrending();
  }, [currentUser]);

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.userName.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === 'newest') return (b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0) - (a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0);
    if (sortBy === 'oldest') return (a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0) - (b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0);
    if (sortBy === 'popular') return (b.likesCount || 0) - (a.likesCount || 0);
    return 0;
  });

  const handleCreatePost = async () => {
    const hasPoll = showPollCreator && pollQuestion.trim() !== "";
    if (!newPost.trim() && !hasPoll && !postGifUrl) return;
    if (!currentUser) console.log("No user");
    setUploading(true);
    try {
      let pollData = null;
      if (hasPoll) {
        const validOptions = pollCreatorOptions.filter(o => o.trim() !== "");
        if (validOptions.length >= 2) {
          pollData = {
            question: pollQuestion.trim(),
            options: validOptions.map((text, idx) => ({
              id: `opt_${idx}_${Date.now()}`,
              text: text.trim(),
              votes: []
            }))
          };
        }
      }

      await addDoc(collection(db, 'posts'), {
        userId: currentUser?.uid,
        userName: currentUser.displayName || "مستخدم مجهول",
        userPhoto: currentUser.photoURL || "https://ui-avatars.com/api/?name=User",
        content: newPost,
        gifUrl: postGifUrl || null,
        likesCount: 0,
        createdAt: serverTimestamp(),
        ...(pollData ? { poll: pollData } : {})
      });
      setNewPost("");
      setPostGifUrl(null);
      setPollQuestion("");
      setPollCreatorOptions(["", ""]);
      setShowPollCreator(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'posts');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 rounded-2xl">
            <Home className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">الرئيسية</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">آخر الأخبار والمنشورات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onNavigateToSearch}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-blue-500 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/10"
            title="البحث"
          >
            <Search className="w-6 h-6" />
          </button>
          <button 
            onClick={onNavigateToChat}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95 relative"
          >
            <Send className="w-6 h-6" />
            {unreadMessagesCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-600 rounded-full flex items-center justify-center px-1.5 border-2 border-zinc-950 shadow-lg">
                <span className="text-[10px] font-black text-white leading-none">
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-8 shadow-xl">
        <div className="flex gap-4 mb-4">
          <img src={currentUser?.photoURL || ""} className="w-12 h-12 rounded-full border border-zinc-800 shadow-inner" alt="" />
          <textarea 
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="بماذا تفكر؟"
            className="flex-1 bg-transparent text-white placeholder:text-zinc-600 resize-none py-2 outline-none text-lg font-medium"
          />
        </div>

        {postGifUrl && (
          <div className="mb-4 relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 inline-block max-w-[280px]">
            <img 
              src={postGifUrl} 
              alt="Selected GIF" 
              className="w-full h-auto object-cover max-h-[220px] rounded-2xl" 
            />
            <button
              type="button"
              onClick={() => setPostGifUrl(null)}
              className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Poll Creator Form */}
        {showPollCreator && (
          <div className="mb-4 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-3 relative animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" />
                استطلاع رأي جديد
              </span>
              <button 
                onClick={() => {
                  setShowPollCreator(false);
                  setPollQuestion("");
                  setPollCreatorOptions(["", ""]);
                }}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2.5">
              <input 
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="اسأل سؤالاً... (مثال: ما هو رأيكم في التحديث الجديد؟)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
              
              <div className="space-y-2">
                {pollCreatorOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollCreatorOptions];
                        next[idx] = e.target.value;
                        setPollCreatorOptions(next);
                      }}
                      placeholder={`الخيار ${idx + 1}`}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    {pollCreatorOptions.length > 2 && (
                      <button 
                        onClick={() => {
                          const next = pollCreatorOptions.filter((_, i) => i !== idx);
                          setPollCreatorOptions(next);
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors active:scale-95 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollCreatorOptions.length < 5 && (
                <button 
                  onClick={() => setPollCreatorOptions([...pollCreatorOptions, ""])}
                  className="w-full py-2 border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة خيار آخر
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex gap-2">
            <button 
              onClick={() => onTriggerMediaUpload()}
              className="p-2.5 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors"
              title="إرفاق وسائط"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                setShowPollCreator(!showPollCreator);
                if (!showPollCreator && pollCreatorOptions.length < 2) {
                  setPollCreatorOptions(["", ""]);
                }
              }}
              className={`p-2.5 rounded-xl transition-colors ${
                showPollCreator ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-violet-500 hover:bg-violet-500/10'
              }`}
              title="استطلاع رأي"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onNavigateToAI()}
              className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors"
              title="الذكاء الاصطناعي"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                // Trigger Go Live from feed
                const addBtn = document.querySelector('button[title="إضافة"]') as HTMLButtonElement;
                if (addBtn) addBtn.click();
              }}
              className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              title="بث مباشر"
            >
              <Radio className="w-5 h-5" />
            </button>
            <button 
              type="button"
              onClick={() => setShowFeedGifPicker(true)}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all flex items-center justify-center shrink-0"
              title="إدراج صورة GIF"
            >
              <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded-md hover:border-violet-500 hover:text-violet-400">GIF</span>
            </button>
          </div>
          <button 
            disabled={(!newPost.trim() && !postGifUrl && !(showPollCreator && pollQuestion.trim() && pollCreatorOptions.filter(o => o.trim() !== "").length >= 2)) || uploading}
            onClick={handleCreatePost}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-8 py-2.5 rounded-[14px] transition-all shadow-lg shadow-blue-900/20"
          >
            {uploading ? "جاري النشر..." : "نشر"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFeedGifPicker && (
          <GifPicker 
            onSelect={(url) => {
              setPostGifUrl(url);
              setShowFeedGifPicker(false);
            }} 
            onClose={() => setShowFeedGifPicker(false)} 
          />
        )}
      </AnimatePresence>

      {/* Live Streams Section */}
      <LiveStreamsHeader onSelectLive={onWatchLive} />

      {/* Suggested Users Section */}
      {trendingCreators.length > 0 && (
        <div className="mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-black text-white/90 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              صناع محتوى مقترحون
            </h3>
            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-tighter">رائج الآن</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {trendingCreators.map((user) => (
              <motion.div 
                key={user?.uid}
                whileHover={{ y: -5 }}
                className="flex-shrink-0 w-36 bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-4 text-center group cursor-pointer hover:bg-zinc-800 transition-all hover:border-blue-500/30 shadow-lg"
                onClick={() => onNavigateToUser(user?.uid)}
              >
                <div className="relative mb-3 inline-block">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                    className="w-16 h-16 rounded-2xl mx-auto object-cover border-2 border-zinc-800 group-hover:border-blue-500 transition-colors shadow-xl"
                    alt=""
                  />
                  {user.lastSeen && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                  )}
                </div>
                <h4 className="text-xs font-black text-white truncate px-1">{user.displayName}</h4>
                <p className="text-[10px] text-zinc-500 font-bold truncate mt-1">@{user.username || user?.uid.slice(0,6)}</p>
                <button 
                  className="mt-3 w-full py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white text-[10px] font-black rounded-xl transition-all"
                >
                  متابعة
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Sorting and Search */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المنشورات..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3.5 pr-12 pl-4 text-white font-medium outline-none focus:border-blue-500 transition-all shadow-xl"
          />
        </div>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            <button 
              onClick={() => setSortBy('newest')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-all ${sortBy === 'newest' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              <Clock className="w-4 h-4" />
              الأحدث
            </button>
            <button 
              onClick={() => setSortBy('oldest')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-all ${sortBy === 'oldest' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              <ArrowDown className="w-4 h-4" />
              الأقدم
            </button>
            <button 
              onClick={() => setSortBy('popular')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold transition-all ${sortBy === 'popular' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
            >
              <TrendingUp className="w-4 h-4" />
              الأكثر تفاعلاً
            </button>
          </div>
          {searchQuery && (
            <span className="text-zinc-500 text-xs font-bold whitespace-nowrap">
              تم العثور على {filteredPosts.length} نتيجة
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : (
          filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUser={currentUser} 
                onViewMedia={onViewMedia}
                onNavigateToUser={onNavigateToUser}
              />
            ))
          ) : (
            <div className="text-center py-32 bg-zinc-900/30 rounded-[40px] border border-dashed border-zinc-800">
              <PlusSquare className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
              <p className="text-zinc-500 text-xl font-black">لا توجد منشورات تتطابق مع بحثك</p>
              <p className="text-zinc-600 text-sm mt-2">جرب كلمات مفتاحية أخرى أو غير خيارات الترتيب</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Profile({ currentUser, onViewMedia, onNavigate, onNavigateToUser }: { 
  currentUser: FirebaseUser | null, 
  onViewMedia: (url: string, type: 'image' | 'video') => void, 
  onNavigate: (tab: any, subView?: any) => void, 
  onNavigateToUser: (uid: string) => void 
}) {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'posts' | 'favorites'>('posts');
  const [loadingFavs, setLoadingFavs] = useState(false);
  const [viewingAll, setViewingAll] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customization = userProfile?.profileCustomization;

  useEffect(() => {
    if (!currentUser) console.log("No user");
    const unsub = onSnapshot(doc(db, 'users', currentUser?.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
        setLoading(false);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${currentUser?.uid}`);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 1024 * 512) {
      alert("حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 512 كيلوبايت.");
      return;
    }

    setUpdatingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          // Firebase Auth only allows URLs up to 2048 characters.
          // Since base64 is way longer, we use a simple placeholder URL for Auth,
          // while storing the full high-res base64 string in Firestore.
          const fallbackURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email || 'User')}`;
          await updateProfile(currentUser, { photoURL: fallbackURL });
        } catch (authErr) {
          console.error("Failed to update auth photoURL:", authErr);
        }
        await updateDoc(doc(db, 'users', currentUser?.uid), { photoURL: base64 });
        setUpdatingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error updating photo:", error);
      setUpdatingPhoto(false);
      alert("حدث خطأ أثناء تحديث الصورة.");
    }
  };

  useEffect(() => {
    if (!currentUser) console.log("No user");
    const q = query(
      collection(db, 'posts'), 
      where('userId', '==', currentUser?.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    });
    return unsubscribe;
  }, [currentUser]);

  // Fetch Folders
  useEffect(() => {
    if (!currentUser) console.log("No user");
    const q = query(
      collection(db, 'folders'),
      where('userId', '==', currentUser?.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Folder)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'folders'));
    return unsub;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || view !== 'favorites') return;
    setLoadingFavs(true);
    
    let q;
    if (selectedFolderId) {
      q = query(
        collection(db, 'favorites'),
        where('userId', '==', currentUser?.uid),
        where('folderId', '==', selectedFolderId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'favorites'),
        where('userId', '==', currentUser?.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postIds = snapshot.docs.map(doc => doc.data().postId);
      
      if (postIds.length > 0) {
        // Fetch full post details for each favorite
        const postsQuery = query(collection(db, 'posts'), where('__name__', 'in', postIds));
        const postsSnap = await getDocs(postsQuery);
        setFavoritePosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      } else {
        setFavoritePosts([]);
      }
      setLoadingFavs(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'favorites'));

    return unsubscribe;
  }, [currentUser, view, selectedFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentUser) return;
    try {
      await addDoc(collection(db, 'folders'), {
        userId: currentUser?.uid,
        name: newFolderName.trim(),
        createdAt: serverTimestamp()
      });
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'folders');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!currentUser) console.log("No user");
    if (!confirm("هل أنت متأكد من حذف هذا المجلد؟ لن يتم حذف المنشورات المحفوظة، ستعود إلى المجلد العام.")) return;
    try {
      // 1. Update all favorites in this folder to have null folderId
      const q = query(
        collection(db, 'favorites'), 
        where('userId', '==', currentUser?.uid),
        where('folderId', '==', folderId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(doc => batch.update(doc.ref, { folderId: null }));
      await batch.commit();

      // 2. Delete the folder
      await deleteDoc(doc(db, 'folders', folderId));
      setSelectedFolderId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'folders');
    }
  };

  const currentFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <div className={`max-w-2xl mx-auto py-8 px-4 ${customization?.fontFamily || 'font-sans'}`}>
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-white">الملف الشخصي</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => onNavigate('settings', 'profile-design')}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"
            title="تخصيص المظهر"
          >
            <Palette className="w-6 h-6" />
          </button>
          <button 
            onClick={() => onNavigate('settings')}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"
            title="الإعدادات"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className={`${customization?.bgColor || 'bg-zinc-900'} border border-zinc-800 rounded-[40px] p-8 mb-6 shadow-2xl text-center relative overflow-hidden group`}>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10">
          <div className="relative inline-block mb-4">
            <div className="relative">
              <img src={userProfile?.photoURL || currentUser?.photoURL || ""} className="w-32 h-32 rounded-full border-4 border-blue-600/30 p-1 bg-zinc-950 object-cover" alt="" />
              {updatingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-full shadow-lg border-2 border-zinc-900 hover:scale-110 transition-transform"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <h2 className={`text-3xl font-black mb-2 ${customization?.textColor || 'text-white'}`}>{currentUser?.displayName}</h2>
          {userProfile?.username && <p className="text-blue-500 font-bold mb-2 text-center -mt-1 underline decoration-blue-600/30 underline-offset-4">@{userProfile.username}</p>}
          <p className="text-zinc-500 text-sm mb-4">{currentUser?.email}</p>
          {userProfile?.bio && <p className="text-zinc-300 text-sm mb-6 max-w-md mx-auto leading-relaxed px-4">{userProfile.bio}</p>}
          
          <div className="flex items-center justify-center gap-12 mb-8">
            <div className="text-center relative">
              <p className="text-white font-black text-2xl">{userPosts.length}</p>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">منشور</p>
              {userProfile?.privacySettings?.showPostCount === false && (
                <div className="absolute -top-2 -right-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shadow-lg" />
                </div>
              )}
            </div>
            <div className="text-center relative">
              <p className="text-white font-black text-2xl">{userProfile?.followersCount || 0}</p>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">متابع</p>
              {userProfile?.privacySettings?.showFollowers === false && (
                <div className="absolute -top-2 -right-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shadow-lg" />
                </div>
              )}
            </div>
            <div className="text-center relative">
              <p className="text-white font-black text-2xl">{userProfile?.followingCount || 0}</p>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">يتابع</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => onNavigate('settings', 'personal')}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              تعديل الملف الشخصي
            </button>
            <button className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all active:scale-95">
              مشاركة
            </button>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl mb-8">
        <button 
          onClick={() => setView('posts')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${
            view === 'posts' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>منشوراتي</span>
        </button>
        <button 
          onClick={() => { setView('favorites'); setSelectedFolderId(null); setViewingAll(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${
            view === 'favorites' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>المحفوظات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {view === 'posts' ? (
          userPosts.length > 0 ? (
            userPosts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentUser={currentUser} 
                onViewMedia={onViewMedia}
                onNavigateToUser={onNavigateToUser}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
              <PlusSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold">لم تنشر أي شيء بعد</p>
            </div>
          )
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                {(selectedFolderId || viewingAll) && (
                  <button 
                    onClick={() => { setSelectedFolderId(null); setViewingAll(false); }}
                    className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black text-xl">
                    {selectedFolderId ? currentFolder?.name : viewingAll ? 'جميع المحفوظات' : 'المجلدات'}
                  </h3>
                  {selectedFolderId && (
                    <button 
                      onClick={() => handleDeleteFolder(selectedFolderId)}
                      className="p-1.5 text-red-500/50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {!selectedFolderId && (
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>مجلد جديد</span>
                </button>
              )}
            </div>

            {isCreatingFolder && (
              <div className="bg-zinc-900 p-6 rounded-3xl border-2 border-blue-600/30 animate-in zoom-in-95 duration-200">
                <p className="text-white font-black mb-4">إنشاء مجلد جديد</p>
                <input 
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="اسم المجلد..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white p-4 rounded-2xl mb-4 focus:border-blue-600 outline-none transition-all"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleCreateFolder}
                    className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl"
                  >
                    إنشاء
                  </button>
                  <button 
                    onClick={() => setIsCreatingFolder(false)}
                    className="flex-1 py-3 bg-zinc-800 text-zinc-400 font-black rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {!selectedFolderId && !viewingAll && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setViewingAll(true)}
                  className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-[32px] hover:border-blue-600/50 transition-all group"
                >
                  <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Grid className="w-8 h-8" />
                  </div>
                  <span className="text-white font-black">جميع المحفوظات</span>
                </button>
                {folders.map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-[32px] hover:border-blue-600/50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-blue-600 group-hover:text-white">
                      <Folder className="w-8 h-8" />
                    </div>
                    <span className="text-white font-black">{folder.name}</span>
                  </button>
                ))}
              </div>
            )}

            {(selectedFolderId || viewingAll || loadingFavs) && (
              <div className="grid grid-cols-1 gap-6">
                {loadingFavs ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  favoritePosts.length > 0 ? (
                    favoritePosts.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        currentUser={currentUser} 
                        onViewMedia={onViewMedia}
                        onNavigateToUser={onNavigateToUser}
                      />
                    ))
                  ) : (
                    <div className="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
                      <Bookmark className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-500 font-bold">هذا المجلد فارغ</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
}

function ProfileSetupScreen({ user, onComplete }: { user: FirebaseUser, onComplete: () => void }) {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);

  const sanitizeUsername = (val: string) => {
    return val.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
  };

  const checkUsernameUniqueness = async (name: string) => {
    if (!name) {
      setUsernameError("");
      return true;
    }
    
    // Convert to lowercase before checking
    const normalizedName = name.toLowerCase().trim();
    
    if (normalizedName.length < 3) {
      setUsernameError("اسم المستخدم يجب أن يكون ٣ أحرف على الأقل");
      return false;
    }

    setIsCheckingUsername(true);
    try {
      // 1. Check direct usernames collection (fast)
      const docRef = doc(db, "usernames", normalizedName);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        if (docSnap.data().uid !== auth.currentUser?.uid) {
          setUsernameError("عذراً، اسم المستخدم هذا محجوز بالفعل");
          return false;
        } else {
          setUsernameError("");
          return true;
        }
      }

      // 2. Fallback: Check users collection mirrors (for legacy accounts)
      const q = query(collection(db, "users"), where("username", "==", normalizedName));
      const querySnapshot = await getDocs(q);
      
      const isTakenByOthers = !querySnapshot.empty && querySnapshot.docs.some(d => d.id !== auth.currentUser?.uid);
      
      if (isTakenByOthers) {
        setUsernameError("عذراً، اسم المستخدم هذا محجوز بالفعل");
        // Auto-register legacy mapping if we found it in users but not in usernames
        const legacyUid = querySnapshot.docs[0].id;
        await setDoc(doc(db, "usernames", normalizedName), { uid: legacyUid, createdAt: serverTimestamp() });
        return false;
      } else {
        setUsernameError("");
        return true;
      }
    } catch (e) {
      console.warn("[Username Check] Warning:", e);
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) checkUsernameUniqueness(username);
      else setUsernameError("");
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleComplete = async () => {
    if (!username || !!usernameError || isCheckingUsername) return;
    setLoading(true);
    try {
      const isUnique = await checkUsernameUniqueness(username);
      if (!isUnique) {
        setLoading(false);
        return;
      }
      // Register username mapping
      await setDoc(doc(db, 'usernames', username), { uid: user?.uid, createdAt: serverTimestamp() });
      
      await updateDoc(doc(db, 'users', user?.uid), {
        username: username,
        updatedAt: serverTimestamp()
      });
      onComplete();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white text-center mb-2">أهلاً بك في TruCast</h2>
        <p className="text-zinc-500 text-center mb-8 font-bold text-sm">يرجى اختيار اسم مستخدم فريد لتعريف هويتك</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-zinc-500 text-[10px] font-black mb-3 uppercase tracking-[0.2em] text-right">اسم المستخدم (Username)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black">@</span>
              <input 
                type="text" 
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                placeholder="username"
                className={`w-full bg-black/50 border ${usernameError ? 'border-red-500' : 'border-zinc-800'} rounded-[24px] p-5 pl-10 text-white outline-none focus:border-blue-500 transition-all font-black text-lg shadow-inner`} 
              />
              {isCheckingUsername && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                   <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
            {usernameError && <p className="text-red-500 text-xs font-bold mt-3 px-2 text-right">{usernameError}</p>}
            {!usernameError && username && !isCheckingUsername && (
               <p className="text-emerald-500 text-xs font-bold mt-3 px-2 text-right flex items-center justify-end gap-2">
                 <Check className="w-4 h-4" />
                 هذا الاسم متاح!
               </p>
            )}
          </div>

          <button 
            disabled={loading || !username || !!usernameError || isCheckingUsername}
            onClick={handleComplete}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[24px] shadow-xl shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                <Zap className="w-5 h-5" />
                <span>إكمال التسجيل</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function NotificationToast({ 
  title, 
  body, 
  icon, 
  streamId,
  onClose,
  onClick
}: { 
  title: string, 
  body: string, 
  icon?: string, 
  streamId?: string,
  onClose: () => void,
  onClick?: () => void 
}) {
  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className="fixed top-20 md:top-6 right-4 z-[500] w-80 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-900/80 p-4 rounded-3xl shadow-2xl flex flex-col gap-3 cursor-pointer hover:bg-zinc-900 transition-all select-none"
      onClick={onClick || onClose}
    >
      <div className="flex gap-4 items-center">
        {icon ? (
          <img src={icon} className="w-12 h-12 rounded-2xl object-cover border border-white/5" alt="" />
        ) : (
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-600/25">
            <Bell className="w-6 h-6 text-white animate-bounce" />
          </div>
        )}
        <div className="flex-1 min-w-0 text-right font-sans">
          <h4 className="text-white font-black text-sm truncate">{title}</h4>
          <p className="text-zinc-400 text-[10px] mt-1 line-clamp-2 leading-relaxed font-bold">{body}</p>
        </div>
        <button 
          className="text-zinc-500 hover:text-white shrink-0 self-start p-1 hover:bg-zinc-800 rounded-lg transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {streamId && (
        <div className="flex gap-2 w-full mt-1">
          <button 
            className="flex-1 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/25 active:scale-95 font-sans"
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick();
            }}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            انضمام سريع للبث المباشر
          </button>
        </div>
      )}
    </motion.div>
  );
}

function SettingsScreen({ onBack, userProfile, initialSubView = 'main' }: { 
  onBack: () => void, 
  userProfile: UserProfile | null,
  initialSubView?: 'main' | 'personal' | 'email' | 'security' | 'privacy' | 'nav-icons' | 'profile-design' | 'stats' | 'notifications' | 'about' | 'appearance'
}) {
  const [subView, setSubView] = useState<any>(initialSubView);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [debugLog, setDebugLog] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(userProfile?.username || "");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [stats, setStats] = useState({
    totalLikes: 0,
    totalPosts: 0,
    followers: 0,
    topPosts: [] as Post[],
    chartData: [] as any[]
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (subView === 'stats' && auth.currentUser) {
      const fetchStats = async () => {
        setLoadingStats(true);
        try {
          const userId = auth.currentUser!.uid;
          
          // Fetch user posts
          const postsQ = query(collection(db, 'posts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
          const postsSnap = await getDocs(postsQ);
          const posts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
          
          const totalLikes = posts.reduce((acc, p) => acc + (p.likesCount || 0), 0);
          const topPosts = [...posts].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 3);
          
          // Mock trend data based on creation dates
          const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString('ar-EG', { weekday: 'short' });
          });
          
          const chartData = last7Days.map((day, i) => ({
            name: day,
            value: Math.floor(Math.random() * 80) + 20 
          }));

          setStats({
            totalLikes,
            totalPosts: posts.length,
            followers: 0, 
            topPosts,
            chartData
          });
        } catch (e) {
          console.error("Error fetching stats:", e);
        } finally {
          setLoadingStats(false);
        }
      };
      fetchStats();
    }
  }, [subView]);

  useEffect(() => {
    if (userProfile?.username && !username) {
      setUsername(userProfile.username);
    }
  }, [userProfile]);

  const sanitizeUsername = (val: string) => {
    return val.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
  };

  const checkUsernameUniqueness = async (name: string) => {
    if (!name) {
      setUsernameError("");
      return true;
    }
    
    const normalizedName = name.toLowerCase().trim();
    
    if (normalizedName === userProfile?.username?.toLowerCase()) {
      setUsernameError("");
      return true;
    }

    if (normalizedName.length < 3) {
      setUsernameError("اسم المستخدم يجب أن يكون ٣ أحرف على الأقل");
      return false;
    }

    setIsCheckingUsername(true);
    try {
      // 1. Check usernames collection
      const docRef = doc(db, "usernames", normalizedName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        if (docSnap.data()?.uid !== auth.currentUser?.uid) {
          setUsernameError("عذراً، اسم المستخدم هذا محجوز بالفعل");
          return false;
        } else {
          setUsernameError("");
          return true;
        }
      }

      // 2. Fallback check for legacy usernames in users collection
      const q = query(collection(db, "users"), where("username", "==", normalizedName));
      const querySnapshot = await getDocs(q);
      const isTaken = !querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== auth.currentUser?.uid);
      
      if (isTaken) {
        setUsernameError("عذراً، اسم المستخدم هذا محجوز بالفعل");
        // Mirror to usernames collection for future checks
        const ownerId = querySnapshot.docs[0].id;
        await setDoc(doc(db, "usernames", normalizedName), { uid: ownerId, createdAt: serverTimestamp() });
        return false;
      } else {
        setUsernameError("");
        return true;
      }
    } catch (e) {
      console.warn("[Username Check Settings] Warning:", e);
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username !== userProfile?.username) {
        checkUsernameUniqueness(username);
      } else {
        setUsernameError("");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, userProfile?.username]);

  const handleUpdateProfileData = async (data: { displayName: string, username?: string, bio?: string, photoURL?: string }) => {
    setLoading(true);
    setError("");
    
    const currentUid = auth.currentUser?.uid;
    
    if (!currentUid) {
      alert("لم يتم العثور على معرف المستخدم الخاص بك (UID). يرجى تسجيل الخروج من التطبيق ثم تسجيل الدخول مرة أخرى لإعادة تهيئة الجلسة.");
      setError("لم يتم العثور على معرف المستخدم. يرجى إعادة تسجيل الدخول.");
      setDebugLog("❌ خطأ: معرف المستخدم (UID) غير متوفر (undefined). يرجى تسجيل الخروج والولوج مجدداً.");
      setLoading(false);
      return;
    }
    
    let debugText = `🔍 معلومات التصحيح (Debug Log):
• معرف المستخدم الحالي (currentUser?.uid): ${currentUid}
• طريقة الحفظ: سيرفر (Admin SDK) لتجاوز قيود المتصفح والقواعد
• جاري تحديث الحساب...`;
    
    setDebugLog(debugText);

    try {
      if (auth.currentUser) {
        // Refresh token to guarantee it is valid
        await auth.currentUser.getIdToken(true);
      }
      
      const authUpdate: any = { displayName: data.displayName };
      if (data.photoURL) {
        authUpdate.photoURL = data.photoURL.startsWith('data:') 
          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'User')}`
          : data.photoURL;
      }

      // Update Local Auth Profile first
      await updateProfile(auth.currentUser!, authUpdate);

      // Get ID Token
      const idToken = await auth.currentUser!.getIdToken();

      // Call Express Proxy API
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          displayName: data.displayName,
          username: data.username,
          bio: data.bio,
          photoURL: data.photoURL,
          oldUsername: userProfile?.username
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "فشل التحديث من خلال السيرفر.");
      }
      
      setMessage("تم تحديث البيانات بنجاح!");
      setDebugLog(prev => prev + `\n• الحالة: تم التحديث بنجاح تام عبر السيرفر (Admin SDK)! 🎉`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setMessage("حدث خطأ أثناء التحديث.");
      setDebugLog(prev => prev + `\n• ❌ خطأ أثناء التحديث: ${err.message || err}`);
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentUid = auth.currentUser?.uid;
    if (!file || !currentUid) {
      alert("لم يتم العثور على معرف المستخدم الخاص بك. يرجى تسجيل الخروج من التطبيق ثم تسجيل الدخول مرة أخرى.");
      return;
    }

    setLoading(true);
    try {
      // Compress and resize image using canvas to avoid Firestore size limit
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_DIM = 300;
            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error("Failed to get 2D canvas context"));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl);
          };
          img.onerror = () => {
            reject(new Error("Failed to load image"));
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
      });

      await handleUpdateProfileData({ 
        displayName: auth.currentUser?.displayName || "مستخدم", 
        photoURL: base64DataUrl,
        username: userProfile?.username,
        bio: userProfile?.bio
      });
    } catch (err: any) {
      console.error(err);
      alert("فشل معالجة ورفع الصورة: " + (err.message || err));
      setLoading(false);
    }
  };

  const renderSubView = () => {
    switch(subView) {
      case 'personal':
        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">تعديل البيانات الشخصية</h3>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <img 
                  src={userProfile?.photoURL || auth.currentUser?.photoURL || ""} 
                  className="w-24 h-24 rounded-full border-4 border-blue-600/30 object-cover bg-zinc-950" 
                  alt="" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full border-2 border-zinc-950 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <p className="text-zinc-500 text-[10px] font-bold mt-2 uppercase tracking-widest">تغيير الصورة الشخصية</p>
            </div>

            <div className="space-y-4 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-2 uppercase tracking-widest">الاسم المعروض</label>
                <input 
                  id="display-name-input"
                  type="text" 
                  defaultValue={auth.currentUser?.displayName || ""} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold" 
                />
              </div>

              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-2 uppercase tracking-widest">اسم المستخدم</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
                  <input 
                    id="username-input"
                    type="text" 
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                    placeholder="username"
                    className={`w-full bg-zinc-950 border ${usernameError ? 'border-red-500' : 'border-zinc-800'} rounded-2xl p-4 pl-10 text-white outline-none focus:border-blue-500 transition-all font-bold`} 
                  />
                  {isCheckingUsername && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
                {usernameError && <p className="text-red-500 text-[10px] font-bold mt-2 px-2">{usernameError}</p>}
                {!usernameError && username && username !== userProfile?.username && !isCheckingUsername && (
                   <p className="text-emerald-500 text-[10px] font-bold mt-2 px-2">اسم المستخدم متاح</p>
                )}
              </div>

              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-2 uppercase tracking-widest">السيرة الذاتية (Bio)</label>
                <textarea 
                  id="bio-input"
                  defaultValue={userProfile?.bio || ""} 
                  placeholder="أخبر المجتمع عن نفسك..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold resize-none h-32" 
                />
              </div>

              {message && <p className="text-emerald-500 text-sm px-2 font-bold">{message}</p>}
              {error && <p className="text-red-500 text-sm px-2 font-bold">{error}</p>}
              <button 
                disabled={loading || !!usernameError || isCheckingUsername}
                onClick={async () => {
                  const displayName = (document.getElementById('display-name-input') as HTMLInputElement).value;
                  const bio = (document.getElementById('bio-input') as HTMLTextAreaElement).value;
                  
                  // Final check
                  if (username !== userProfile?.username) {
                    const isUnique = await checkUsernameUniqueness(username);
                    if (!isUnique) return;
                  }

                  await handleUpdateProfileData({ displayName, username, bio });
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "حفظ التغييرات"}
              </button>

              {debugLog && (
                <div dir="ltr" className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-left font-mono text-zinc-300 break-all whitespace-pre-wrap select-all">
                  {debugLog}
                </div>
              )}
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">تغيير البريد الإلكتروني</h3>
            <div className="space-y-4 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
               <div>
                <label className="block text-zinc-500 text-xs font-bold mb-2 uppercase tracking-widest">البريد الحالي</label>
                <input type="text" value={auth.currentUser?.email || ""} disabled className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 text-zinc-500 font-bold outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-2 uppercase tracking-widest">البريد الجديد</label>
                <input type="email" placeholder="example@trustcast.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all" />
              </div>
              <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                تحديث البريد
              </button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">كلمة المرور والأمان</h3>
            <div className="space-y-4 bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
               <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div>
                  <h4 className="text-white font-bold text-sm">المصادقة الثنائية (2FA)</h4>
                  <p className="text-zinc-500 text-xs mt-1">زيادة أمان حسابك بشكل أكبر</p>
                </div>
                <div className="w-12 h-6 bg-zinc-800 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-zinc-600 rounded-full" />
                </div>
              </div>
              <button className="w-full py-4 bg-zinc-800 text-white font-black rounded-2xl hover:bg-zinc-700 transition-all">
                تغيير كلمة المرور
              </button>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mt-6 translate-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="w-5 h-5 text-blue-500" />
                  <h5 className="text-white font-bold text-sm">التشفير من طرف لطرف (E2EE)</h5>
                </div>
                <p className="text-zinc-500 text-[10px] leading-relaxed mb-4">
                  يتم حماية محادثاتك بمفاتيح تشفير فريدة. مفتاحك الخاص مخزن محلياً فقط ولا يغادر جهازك أبداً.
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-black rounded-xl border border-zinc-800 break-all select-all flex items-center gap-2">
                    <code className="text-[8px] text-zinc-600 flex-1 truncate">
                      {userProfile?.publicKey || "جاري التحميل..."}
                    </code>
                    <Copy 
                      className="w-3 h-3 text-zinc-500 cursor-pointer hover:text-blue-500" 
                      onClick={() => {
                        if (userProfile?.publicKey) {
                          navigator.clipboard.writeText(userProfile.publicKey);
                          alert("تم نسخ المفتاح العام");
                        }
                      }}
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      if (!auth.currentUser) return;
                      const conf = confirm("هل أنت متأكد؟ إعادة تعيين المفاتيح ستجعل الرسائل المشفرة القديمة غير قابلة للقراءة على هذا الجهاز.");
                      if (!conf) return;
                      
                      setGlobalLoading(true);
                      try {
                        const keys = await generateEncryptionKeys();
                        const priStr = await exportPrivateKeyStr(keys.privateKey);
                        const pubStr = await exportPublicKeyStr(keys.publicKey);
                        localStorage.setItem(`trucast_private_key_${auth.currentUser?.uid}`, priStr);
                        await updateDoc(doc(db, 'users', auth.currentUser?.uid), {
                          publicKey: pubStr,
                          updatedAt: serverTimestamp()
                        });
                        alert("تم إعادة تعيين مفاتيح التشفير بنجاح.");
                      } catch (e) {
                        console.error(e);
                        alert("حدث خطأ أثناء إعادة التعيين.");
                      } finally {
                        setGlobalLoading(false);
                      }
                    }}
                    className="w-full py-2 bg-blue-600/10 text-blue-500 text-xs font-black rounded-xl border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all transition-colors"
                  >
                    إعادة تعيين مفاتيح التشفير
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'privacy':
        const currentPrivacy = userProfile?.privacySettings || {
          showFollowers: true,
          showPostCount: true,
          showLastSeen: true,
          anonymousStats: false,
        };

        const togglePrivacy = async (key: keyof NonNullable<UserProfile['privacySettings']>) => {
          if (!auth.currentUser) return;
          const newPrivacy = { ...currentPrivacy, [key]: !currentPrivacy[key] };
          await updateDoc(doc(db, 'users', auth.currentUser?.uid), {
            privacySettings: newPrivacy
          });
        };

        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">الخصوصية والأمان المتقدم</h3>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl mb-4 flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <div className="text-right">
                <p className="text-emerald-500 font-bold text-sm">أنت في بيئة آمنة</p>
                <p className="text-emerald-500/70 text-[10px] font-medium leading-relaxed">TruCast مشفر تماماً ولا يشارك بياناتك مع أي طرف ثالث.</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { 
                  id: 'showLastSeen', 
                  label: 'عرض حالة النشاط', 
                  desc: 'السماح للآخرين بمعرفة متى كنت متاحاً', 
                  icon: <Clock className="w-5 h-5 text-blue-500" />,
                  checked: currentPrivacy.showLastSeen !== false 
                },
                { 
                  id: 'showFollowers', 
                  label: 'عرض أرقام المتابعين', 
                  desc: 'إظهار عدد المتابعين في ملفك الشخصي', 
                  icon: <Users className="w-5 h-5 text-purple-500" />,
                  checked: currentPrivacy.showFollowers !== false 
                },
                { 
                  id: 'showPostCount', 
                  label: 'عرض عدد المنشورات', 
                  desc: 'إظهار كمية المحتوى الذي شاركته', 
                  icon: <Grid className="w-5 h-5 text-amber-500" />,
                  checked: currentPrivacy.showPostCount !== false 
                },
                { 
                  id: 'anonymousStats', 
                  label: 'الإحصائيات المجهولة', 
                  desc: 'تبديل الأرقام الدقيقة إلى تقريبية (مثلاً 100+)', 
                  icon: <EyeOff className="w-5 h-5 text-zinc-500" />,
                  checked: currentPrivacy.anonymousStats === true 
                }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-5 bg-zinc-900 rounded-3xl border border-zinc-800 hover:border-zinc-700 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                      {item.icon}
                    </div>
                    <div className="text-right">
                      <h4 className="text-white font-black text-sm">{item.label}</h4>
                      <p className="text-zinc-500 text-[10px] font-bold mt-1 max-w-[200px] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => togglePrivacy(item.id as any)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${item.checked ? 'bg-blue-600' : 'bg-zinc-800'}`}
                  >
                    <motion.div 
                      layout
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg ${item.checked ? 'right-1' : 'left-1'}`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 border-dashed mt-8 text-right">
              <h4 className="text-white font-black text-sm mb-2">لماذا نعتمد هذا الأسلوب؟</h4>
              <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                في TruCast، نؤمن أن الخصوصية لا تعني الاختفاء، بل تعني السيطرة. الإحصائيات المجهولة تمنع التصنيف الاجتماعي المبني على الأرقام وتركز على جودة المحتوى.
              </p>
            </div>
          </div>
        );
      case 'appearance':
        const currentThemePreference = userProfile?.theme || 'dark';
        const toggleThemeSelection = async (t: 'light' | 'dark') => {
          if (!auth.currentUser) return;
          await updateDoc(doc(db, 'users', auth.currentUser?.uid), {
            theme: t
          });
        };

        const premiumColors = [
          { name: 'Default', value: 'from-blue-600 to-indigo-600' },
          { name: 'Rose', value: 'from-rose-500 to-pink-500' },
          { name: 'Emerald', value: 'from-emerald-500 to-teal-500' },
          { name: 'Amber', value: 'from-amber-400 to-orange-500' },
          { name: 'Purple', value: 'from-purple-500 to-violet-600' },
          { name: 'Cyan', value: 'from-cyan-400 to-blue-500' },
        ];

        const premiumBackgrounds = [
          { name: 'None', url: '' },
          { name: 'Cubes', url: 'https://www.transparenttextures.com/patterns/cubes.png' },
          { name: 'Dots', url: 'https://www.transparenttextures.com/patterns/60-lines.png' },
          { name: 'Carbon', url: 'https://www.transparenttextures.com/patterns/carbon-fibre.png' },
          { name: 'Stars', url: 'https://www.transparenttextures.com/patterns/stardust.png' },
          { name: 'Paper', url: 'https://www.transparenttextures.com/patterns/exclusive-paper.png' },
        ];

        const handleUpdatePremiumSetting = async (key: string, value: any) => {
          if (!auth.currentUser) return;
          const userRef = doc(db, 'users', auth.currentUser?.uid);
          await updateDoc(userRef, {
            [key]: value
          });
        };

        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">مظهر التطبيق</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'dark', label: 'الوضع الداكن', desc: 'كلاسيكي وأنيق', icon: <Moon className="w-7 h-7" /> },
                { id: 'light', label: 'الوضع الفاتح', desc: 'نقي ومنعش', icon: <Sun className="w-7 h-7" /> }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleThemeSelection(t.id as any)}
                  className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 group ${
                    currentThemePreference === t.id 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-900/20' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${
                    currentThemePreference === t.id ? 'bg-white/20' : 'bg-zinc-950'
                  }`}>
                    {t.icon}
                  </div>
                  <div className="text-center">
                    <h4 className={`font-black text-base ${currentThemePreference === t.id ? 'text-white' : 'text-zinc-300'}`}>
                      {t.label}
                    </h4>
                    <p className={`text-[10px] font-bold mt-1 ${currentThemePreference === t.id ? 'text-blue-100' : 'text-zinc-500'}`}>
                      {t.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {userProfile?.isPremium && (
              <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="h-px bg-zinc-800" />
                
                <div className="flex items-center gap-2 px-2">
                  <PremiumBadge isPremium={true} size="md" />
                  <h3 className="text-white font-black text-xl">ميزات Premium الحصرية</h3>
                </div>

                {/* Stealth Mode Toggle */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <EyeOff className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">وضع التخفي (Stealth Mode)</h4>
                      <p className="text-zinc-500 text-[10px] font-bold">إخفاء جاري الكتابة ومؤشرات القراءة</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdatePremiumSetting('stealthMode', !userProfile?.stealthMode)}
                    className={`w-14 h-8 rounded-full transition-all relative ${userProfile?.stealthMode ? 'bg-blue-600' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md ${userProfile?.stealthMode ? 'right-7' : 'right-1'}`} />
                  </button>
                </div>

                {/* Bubble Colors */}
                <div>
                   <label className="block text-zinc-500 text-[10px] font-black mb-4 uppercase tracking-widest px-2">لون فقاعات الرسائل (المميز)</label>
                   <div className="grid grid-cols-6 gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-[32px]">
                      {premiumColors.map(c => (
                        <button 
                          key={c.value}
                          onClick={() => handleUpdatePremiumSetting('premiumSettings.bubbleColor', c.value)}
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${c.value} border-2 transition-all hover:scale-110 ${userProfile?.premiumSettings?.bubbleColor === c.value ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-110' : 'border-zinc-800'}`}
                        />
                      ))}
                   </div>
                </div>

                {/* Chat Wallpapers */}
                <div>
                   <label className="block text-zinc-500 text-[10px] font-black mb-4 uppercase tracking-widest px-2">خلفية المحادثات الخاصة</label>
                   <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-[32px]">
                      {premiumBackgrounds.map(bg => (
                        <button 
                          key={bg.url}
                          onClick={() => handleUpdatePremiumSetting('premiumSettings.chatWallpaper', bg.url)}
                          className={`h-24 rounded-2xl border-2 transition-all relative overflow-hidden group ${userProfile?.premiumSettings?.chatWallpaper === bg.url ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/20' : 'border-zinc-800 hover:border-zinc-700'}`}
                        >
                          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors z-10" />
                          {bg.url && (
                             <img src={bg.url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform group-hover:scale-110" />
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{bg.name}</span>
                            {userProfile?.premiumSettings?.chatWallpaper === bg.url && (
                              <Check className="w-4 h-4 text-blue-500 mt-2" />
                            )}
                          </div>
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'nav-icons':
        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">تخصيص أيقونات التنقل</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-12">
              {[
                { id: 'home', label: 'الرئيسية', default: 'Home' },
                { id: 'ai', label: 'الذكاء الاصطناعي', default: 'Sparkles' },
                { id: 'add', label: 'إضافة', default: 'Plus' },
                { id: 'reels', label: 'ريلز', default: 'Play' },
                { id: 'profile', label: 'حسابي', default: 'User' },
              ].map((navItem) => {
                const currentIcon = (userProfile?.customIcons as any)?.[navItem.id] || navItem.default;
                return (
                  <div key={navItem.id} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <h4 className="text-white font-black text-lg">{navItem.label}</h4>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">اختر أيقونة مناسبة</p>
                      </div>
                      <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-blue-500 shadow-inner">
                        {React.createElement(NAV_ICONS[currentIcon] || Home, { size: 32 })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 border-dashed max-h-60 overflow-y-auto custom-scrollbar">
                      {Object.keys(NAV_ICONS).map((iconName) => (
                        <button
                          key={iconName}
                          onClick={async () => {
                            if (!auth.currentUser) return;
                            const userRef = doc(db, 'users', auth.currentUser?.uid);
                            await updateDoc(userRef, {
                              [`customIcons.${navItem.id}`]: iconName
                            });
                          }}
                          className={`p-3 rounded-xl border transition-all hover:scale-110 active:scale-90 ${
                            currentIcon === iconName
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                          title={iconName}
                        >
                          {React.createElement(NAV_ICONS[iconName], { size: 20 })}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'profile-design':
        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">تصميم الصفحة الشخصية</h3>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-8">
              {/* Background Color Picker */}
              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-4 uppercase tracking-widest">لون الخلفية</label>
                <div className="grid grid-cols-4 gap-3">
                  {PROFILE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={async () => {
                        if (!auth.currentUser) return;
                        const userRef = doc(db, 'users', auth.currentUser?.uid);
                        await updateDoc(userRef, {
                          'profileCustomization.bgColor': color.value,
                          'profileCustomization.textColor': color.text
                        });
                      }}
                      className={`h-12 rounded-2xl border-2 transition-all ${color.value} ${
                        userProfile?.profileCustomization?.bgColor === color.value 
                          ? 'border-blue-600 scale-110 shadow-lg' 
                          : 'border-zinc-800 hover:border-zinc-500'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Font Picker */}
              <div>
                <label className="block text-zinc-500 text-xs font-bold mb-4 uppercase tracking-widest">نوع الخط</label>
                <div className="grid gap-3">
                  {PROFILE_FONTS.map((font) => (
                    <button
                      key={font.value}
                      onClick={async () => {
                        if (!auth.currentUser) return;
                        const userRef = doc(db, 'users', auth.currentUser?.uid);
                        await updateDoc(userRef, {
                          'profileCustomization.fontFamily': font.value
                        });
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        userProfile?.profileCustomization?.fontFamily === font.value 
                          ? 'border-blue-600 bg-blue-600/10 text-white' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className={`text-lg font-bold ${font.value}`}>{font.name}</span>
                      {userProfile?.profileCustomization?.fontFamily === font.value && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h4 className="text-zinc-500 text-xs font-bold mb-4 uppercase tracking-widest">معاينة مباشرة</h4>
              <div className={`p-8 rounded-2xl border border-zinc-800 ${userProfile?.profileCustomization?.bgColor || 'bg-zinc-950'} ${userProfile?.profileCustomization?.fontFamily || 'font-sans'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600" />
                  <div>
                    <h5 className={`font-black ${userProfile?.profileCustomization?.textColor || 'text-white'}`}>الاسم المعروض</h5>
                    <p className="text-zinc-500 text-xs text-right">معاينة النص هنا</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-white font-black text-xl px-2">إحصائيات التفاعل</h3>
            
            {loadingStats ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-zinc-500 font-bold text-sm">جاري تحليل بياناتك...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg group hover:border-red-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">إجمالي الإعجابات</p>
                      <Heart className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-white text-3xl font-black tracking-tight">{stats.totalLikes.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
                       <TrendingUp className="w-4 h-4" />
                       <span>تفاعل حقيقي من الجمهور</span>
                    </div>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">إجمالي المنشورات</p>
                      <Grid className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-white text-3xl font-black tracking-tight">{stats.totalPosts}</p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold">
                       <Zap className="w-4 h-4 text-amber-500" />
                       <span>استمرارية في الإبداع</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 shadow-xl overflow-hidden">
                   <div className="flex items-center justify-between mb-8">
                     <div>
                       <h4 className="font-black text-white text-lg">تحليل التوجهات</h4>
                       <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest">مستوى التفاعل الأسبوعي</p>
                     </div>
                     <div className="flex gap-2">
                       <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                         <span className="text-blue-500 text-[10px] font-black uppercase">مباشر</span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <defs>
                           <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#3b82f6" />
                             <stop offset="100%" stopColor="#1e3a8a" />
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                         <XAxis 
                           dataKey="name" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                           dy={10}
                         />
                         <YAxis 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                         />
                         <Tooltip 
                            cursor={{ fill: '#27272a', radius: 8 }}
                            contentStyle={{ 
                              backgroundColor: '#18181b', 
                              border: '1px solid #27272a', 
                              borderRadius: '16px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: '#3b82f6', fontWeight: 900, fontSize: '12px' }}
                            labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px', fontWeight: 700 }}
                         />
                         <Bar 
                            dataKey="value" 
                            fill="url(#barGradient)" 
                            radius={[6, 6, 0, 0]} 
                            barSize={32}
                            animationDuration={1500}
                         >
                           {stats.chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fillOpacity={0.8 + (index * 0.03)} />
                           ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-lg">
                   <div className="flex items-center justify-between mb-6">
                     <h4 className="text-white font-black text-lg">أبرز المنشورات</h4>
                     <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-3 py-1 bg-zinc-950 rounded-full border border-zinc-800">حسب الإعجابات</span>
                   </div>
                   <div className="space-y-4">
                      {stats.topPosts.length > 0 ? stats.topPosts.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 group hover:border-blue-500/30 transition-all cursor-pointer">
                          <div className="w-14 h-14 bg-zinc-800 rounded-xl overflow-hidden relative border border-zinc-800 group-hover:border-blue-500/30 transition-all">
                             {p.mediaUrl ? (
                               <img src={p.mediaUrl} className="w-full h-full object-cover" alt="" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                 <Zap className="w-6 h-6 text-zinc-800" />
                               </div>
                             )}
                             <div className="absolute top-1 left-1 w-5 h-5 bg-zinc-900/80 backdrop-blur-md rounded-lg flex items-center justify-center text-[10px] text-white font-black">
                               #{i+1}
                             </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-black truncate leading-tight">{p.caption || p.content || "بدون وصف"}</p>
                            <div className="flex items-center gap-4 mt-2">
                               <div className="flex items-center gap-1.5">
                                 <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                 <span className="text-zinc-400 text-[11px] font-black">{p.likesCount || 0}</span>
                               </div>
                               <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                               <span className="text-zinc-600 text-[10px] font-bold">{formatPostDate(p.createdAt)}</span>
                            </div>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-zinc-800 group-hover:text-blue-500 transition-colors" />
                        </div>
                      )) : (
                        <div className="text-center py-10 bg-zinc-950 rounded-2xl border border-dashed border-zinc-800">
                          <p className="text-zinc-600 text-xs font-bold">لا توجد منشورات كافية للتحليل</p>
                        </div>
                      )}
                   </div>
                </div>
              </>
            )}
          </div>
        );
      case 'notifications':
        const toggleNotification = async (key: string) => {
          if (!userProfile) return;
          const settings = userProfile.notificationSettings || { messages: true, lives: true, browserEnabled: false };
          const newVal = !((settings as any)[key]);
          
          if (key === 'browserEnabled' && newVal) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              alert('يجب تفعيل إذن التنبيهات من إعدادات المتصفح');
              return;
            }
          }

          await updateDoc(doc(db, 'users', userProfile.uid), {
            notificationSettings: {
              ...settings,
              [key]: newVal
            }
          });
        };

        const currentSettings = userProfile?.notificationSettings || { messages: true, lives: true, browserEnabled: false };

        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">إعدادات التنبيهات</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-2">
              {[
                { id: 'messages', label: 'تنبيهات الرسائل', desc: 'عندما تصلك رسالة خاصة جديدة من مستخدم آخر', enabled: currentSettings.messages },
                { id: 'lives', label: 'تنبيهات البث المباشر', desc: 'عندما يبدأ أحد صناع المحتوى بثاً مباشراً جديداً', enabled: currentSettings.lives },
                { id: 'browserEnabled', label: 'تنبيهات النظام (Browser)', desc: 'تلقي إشعارات على جهازك حتى عند عدم استخدام التطبيق بنشاط', enabled: currentSettings.browserEnabled },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors rounded-2xl">
                  <div className="text-right">
                    <h4 className="text-white font-bold text-sm">{item.label}</h4>
                    <p className="text-zinc-500 text-xs mt-1">{item.desc}</p>
                  </div>
                  <div 
                    onClick={() => toggleNotification(item.id)}
                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${item.enabled ? 'bg-blue-600' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.enabled ? 'left-7' : 'left-1'}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-blue-600/10 border border-blue-600/20 rounded-3xl">
              <div className="flex gap-4 items-center mb-2">
                <Bell className="w-6 h-6 text-blue-500" />
                <h4 className="text-blue-500 font-black text-sm">ميزة التنبيهات الذكية</h4>
              </div>
              <p className="text-blue-500/70 text-xs font-bold leading-relaxed">
                نقوم باستخدام تنبيهات لحظية لضمان عدم فوات أي لحظة مهمة في TruCast. يمكنك دائماً التحكم في نوع التنبيهات التي ترغب في استقبالها.
              </p>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6">
            <h3 className="text-white font-black text-xl px-2">حول TruCast</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/20 transform -rotate-6">
                <Play className="w-12 h-12 text-white fill-current" />
              </div>
              <h4 className="text-2xl font-black text-white mb-2">TruCast</h4>
              <p className="text-zinc-500 text-sm mb-8 font-bold">الإصدار v2.4.0 (Alpha)</p>
              
              <div className="space-y-4 text-right">
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <p className="text-white font-bold text-sm mb-1">مهمتنا</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">بناء مجتمع إبداعي يدعم صناع المحتوى في العالم العربي من خلال تقنيات الذكاء الاصطناعي وتوفير بيئة تواصل آمنة ومبدعة.</p>
                </div>
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <p className="text-white font-bold text-sm mb-1">الفريق</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">تم تطوير هذا التطبيق بواسطة فريق TruCast العالمي، بكل حب من أجل المبدعين.</p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-center gap-6 text-zinc-500">
                <button className="hover:text-blue-500 transition-colors"><Twitter size={20} /></button>
                <button className="hover:text-blue-500 transition-colors"><Instagram size={20} /></button>
                <button className="hover:text-blue-500 transition-colors"><Github size={20} /></button>
              </div>
            </div>
            
            <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">
              حقوق النشر © ٢٠٢٤ TruCast. جميع الحقوق محفوظة.
            </p>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4 px-2">الحساب</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                {[
                  { icon: <User />, label: 'تعديل البيانات الشخصية', view: 'personal' },
                  { icon: <Mail />, label: 'تغيير البريد الإلكتروني', view: 'email' },
                  { icon: <Lock />, label: 'كلمة المرور والأمان', view: 'security' },
                  { icon: <Eye />, label: 'خصوصية الحساب', view: 'privacy' },
                  { icon: <Moon />, label: 'المظهر', view: 'appearance' },
                  { icon: <Palette />, label: 'تخصيص الأيقونات', view: 'nav-icons' },
                  { icon: <Edit2 />, label: 'تصميم الملف الشخصي', view: 'profile-design' },
                  { icon: <Grid />, label: 'إحصائيات الحساب', view: 'stats' },
                  { icon: <Bell />, label: 'التنبيهات', view: 'notifications' },
                  { icon: <Info />, label: 'حول TruCast', view: 'about' },
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSubView(item.view as any)}
                    className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0 group"
                  >
                    <div className="flex items-center gap-4 text-zinc-300 group-hover:text-white transition-colors">
                      <span className="p-2 bg-zinc-800 rounded-lg text-zinc-500 group-hover:text-blue-500 transition-colors">
                        {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                      </span>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-zinc-700" />
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4 px-2">المزيد</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                {[
                  { icon: <Info />, label: 'مركز المساعدة' },
                  { icon: <Shield />, label: 'سياسة الخصوصية' },
                ].map((item, i) => (
                  <button key={i} className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0 group">
                    <div className="flex items-center gap-4 text-zinc-300 group-hover:text-white transition-colors">
                       <span className="p-2 bg-zinc-800 rounded-lg text-zinc-500 group-hover:text-blue-500 transition-colors">
                        {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                      </span>
                      <span className="font-bold">{item.label}</span>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-zinc-700" />
                  </button>
                ))}
              </div>
            </section>

            <button 
              onClick={() => signOut(auth)}
              className="w-full py-5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black rounded-3xl transition-all border border-red-500/20 shadow-xl shadow-red-950/20"
            >
              تسجيل الخروج من جميع الأجهزة
            </button>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={subView === 'main' ? onBack : () => setSubView('main')} 
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-black text-white tracking-tight">إعدادات الحساب</h2>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subView}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderSubView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CreateMediaPostScreen({ 
  selectedMedia, 
  currentUser, 
  collectionPath = 'posts',
  onCancel, 
  onComplete,
  onDirtyChange
}: { 
  selectedMedia: {file: File, preview: string, type: 'image' | 'video'}, 
  currentUser: FirebaseUser, 
  collectionPath?: 'posts' | 'reels',
  onCancel: () => void, 
  onComplete: () => void,
  onDirtyChange: (dirty: boolean) => void
}) {
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollCreatorOptions, setPollCreatorOptions] = useState<string[]>(["", ""]);

  useEffect(() => {
    onDirtyChange(caption.length > 0 || showPollCreator);
  }, [caption, showPollCreator, onDirtyChange]);

  const handlePost = async () => {
    if (isUploading) return;
    
    // Safety check for user
    if (!currentUser) {
      handleFirestoreError(new Error("يجب تسجيل الدخول أولاً قبل النشر"), OperationType.WRITE, 'posts');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    console.log("🚀 Starting post process for user:", currentUser?.uid);

    try {
      console.log("☁️ Attempting media upload to Cloudinary...");
      const downloadURL = await uploadToCloudinarySigned(selectedMedia.file, (progress) => {
        setUploadProgress(progress);
      });
      console.log("✅ Media uploaded successfully:", downloadURL);
      
      let pollData = null;
      if (showPollCreator && pollQuestion.trim() !== "") {
        const validOptions = pollCreatorOptions.filter(o => o.trim() !== "");
        if (validOptions.length >= 2) {
          pollData = {
            question: pollQuestion.trim(),
            options: validOptions.map((text, idx) => ({
              id: `opt_${idx}_${Date.now()}`,
              text: text.trim(),
              votes: []
            }))
          };
        }
      }

      console.log("📝 Creating Firestore document in:", collectionPath);
      // Create Firestore doc
      if (collectionPath === 'reels') {
        await addDoc(collection(db, 'reels'), {
          userId: currentUser?.uid,
          userName: currentUser.displayName || "مستخدم",
          userPhoto: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
          caption: caption,
          videoUrl: downloadURL,
          likes: 0,
          createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          userId: currentUser?.uid,
          userName: currentUser.displayName || "مستخدم",
          userPhoto: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`,
          caption: caption,
          content: caption,
          mediaUrl: downloadURL,
          mediaType: selectedMedia.type,
          likesCount: 0,
          createdAt: serverTimestamp(),
          ...(pollData ? { poll: pollData } : {})
        });
      }
      console.log("✨ Content created successfully in Firestore.");

      setIsUploading(false);
      onComplete();
    } catch (e: any) {
      console.error("❌ Post creation failed:", e);
      
      // Determine if it was an upload or write error
      const opType = e.message?.includes('Upload') || e.message?.includes('signature') || e.message?.includes('Network')
        ? OperationType.UPLOAD 
        : OperationType.WRITE;
      
      handleFirestoreError(e, opType, opType === OperationType.UPLOAD ? 'cloudinary' : collectionPath);
      
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 p-4 flex items-center justify-between">
        <button onClick={onCancel} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-black text-white">{collectionPath === 'reels' ? "إنشاء مقطع ريلز جديد" : "إنشاء منشور جديد"}</h2>
        <button 
          onClick={handlePost}
          disabled={isUploading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-6 py-2 rounded-xl transition-all shadow-lg shadow-blue-900/20"
        >
          {isUploading ? `${Math.round(uploadProgress)}%` : "نشر"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Preview Container */}
          <div className="bg-zinc-900 rounded-[32px] overflow-hidden border border-zinc-800 shadow-2xl overflow-hidden relative group">
            {selectedMedia.type === 'image' ? (
              <img src={selectedMedia.preview} className="w-full h-auto max-h-[500px] object-contain" alt="Preview" />
            ) : (
              <video src={selectedMedia.preview} className="w-full h-auto max-h-[500px]" controls />
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <div className="w-full max-w-xs bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
                <p className="text-white font-bold mt-4">جاري الرفع... {Math.round(uploadProgress)}%</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-zinc-400 font-bold text-sm px-2">وصف المنشور</h3>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب وصفاً لمنشورك..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-white placeholder:text-zinc-600 focus:border-blue-500 outline-none transition-all min-h-[160px] text-lg font-medium resize-none shadow-inner"
            />
          </div>

          {collectionPath === 'posts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-zinc-400 font-bold text-sm">استطلاع الرأي (اختياري)</h3>
                <button
                  onClick={() => {
                    setShowPollCreator(!showPollCreator);
                    if (!showPollCreator && pollCreatorOptions.length < 2) {
                      setPollCreatorOptions(["", ""]);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    showPollCreator
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {showPollCreator ? "إزالة الاستطلاع" : "إضافة استطلاع رأي"}
                </button>
              </div>

              {showPollCreator && (
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4 relative animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-400">السؤال</label>
                    <input 
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="اسأل سؤالاً... (مثال: ما هو رأيكم في الصورة؟)"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-zinc-400 block">الخيارات (2-5 خيارات)</label>
                    <div className="space-y-2">
                      {pollCreatorOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...pollCreatorOptions];
                              next[idx] = e.target.value;
                              setPollCreatorOptions(next);
                            }}
                            placeholder={`الخيار ${idx + 1}`}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          {pollCreatorOptions.length > 2 && (
                            <button 
                              onClick={() => {
                                const next = pollCreatorOptions.filter((_, i) => i !== idx);
                                setPollCreatorOptions(next);
                              }}
                              className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-colors active:scale-95 flex items-center justify-center shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {pollCreatorOptions.length < 5 && (
                      <button 
                        onClick={() => setPollCreatorOptions([...pollCreatorOptions, ""])}
                        className="w-full py-3 border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950 text-zinc-400 hover:text-zinc-200 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة خيار آخر
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
            <Info className="w-6 h-6 text-blue-500" />
            <p className="text-blue-400 text-sm font-medium">
              {collectionPath === 'reels' 
                ? "سيظهر هذا المقطع في صفحة الريلز لجميع المستخدمين ليكتشفوا محتواك." 
                : "سيظهر هذا المنشور في الصفحة الرئيسية لجميع المتابعين والمستخدمين."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchScreen({ onNavigateToUser, onViewMedia, currentUser }: { 
  onNavigateToUser: (uid: string) => void,
  onViewMedia: (url: string, type: 'image' | 'video') => void,
  currentUser: FirebaseUser | null
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState<{tag: string, count: number}[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [searchMode, setSearchMode] = useState<'users' | 'posts'>('users');

  // Fetch trending hashtags
  useEffect(() => {
    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        const posts = snap.docs.map(doc => doc.data() as Post);
        
        const hashtagMap: Record<string, number> = {};
        const hashtagRegex = /#([\u0600-\u06FF\w]+)/g;

        posts.forEach(post => {
          const text = (post.caption || post.content || "");
          const matches = text.match(hashtagRegex);
          if (matches) {
            matches.forEach(tag => {
              hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
            });
          }
        });

        const sortedHashtags = Object.entries(hashtagMap)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        setTrendingHashtags(sortedHashtags);
      } catch (e) {
        console.error("Error fetching trends", e);
      } finally {
        setLoadingTrends(false);
      }
    };

    fetchTrends();
  }, []);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setUserResults([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (queryStr: string) => {
    setLoading(true);
    setGlobalLoading(true);
    setHasSearched(true);
    try {
      const normalizedQuery = queryStr.toLowerCase().trim();
      const rawQuery = queryStr.trim();
      
      const usersRef = collection(db, 'users');
      const postsRef = collection(db, 'posts');
      
      // 1. Search Users by username (Prefix match)
      const qByUsername = query(
        usersRef, 
        where('username', '>=', normalizedQuery),
        where('username', '<=', normalizedQuery + '\uf8ff'),
        limit(20)
      );
      
      // 2. Search Users by displayName (Prefix match - handles Arabic)
      const qByDisplayName = query(
        usersRef,
        where('displayName', '>=', rawQuery),
        where('displayName', '<=', rawQuery + '\uf8ff'),
        limit(20)
      );

      // 3. Search Posts by content (or caption)
      // Since Firestore doesn't support full-text search easily without external services,
      // we'll do a simple prefix/keyword match for hashtags if it starts with #
      let qPosts;
      if (rawQuery.startsWith('#')) {
        qPosts = query(
          postsRef,
          where('caption', '>=', rawQuery),
          where('caption', '<=', rawQuery + '\uf8ff'),
          limit(20)
        );
      } else {
        // Fallback or general search (limited in Firestore)
        qPosts = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }
      
      const [snapUsername, snapDisplayName, snapPosts] = await Promise.all([
        getDocs(qByUsername),
        getDocs(qByDisplayName),
        getDocs(qPosts)
      ]);

      const usersFromUsernames = snapUsername.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      const usersFromDisplayNames = snapDisplayName.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      
      let posts = snapPosts.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      if (!rawQuery.startsWith('#')) {
        // Simple client-side filter for general keyword if not a hashtag
        posts = posts.filter(p => 
          (p.caption || p.content || "").toLowerCase().includes(normalizedQuery)
        );
      }

      // Merge and deduplicate by uid
      const combined = [...usersFromUsernames, ...usersFromDisplayNames];
      const uniqueUsers = combined.reduce((acc: UserProfile[], current) => {
        const x = acc.find(item => item.uid === current.uid);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      // Sort users
      uniqueUsers.sort((a, b) => {
        const aName = a.displayName?.toLowerCase() || "";
        const aUser = a.username?.toLowerCase() || "";
        const bName = b.displayName?.toLowerCase() || "";
        const bUser = b.username?.toLowerCase() || "";

        const aExact = aName === normalizedQuery || aUser === normalizedQuery;
        const bExact = bName === normalizedQuery || bUser === normalizedQuery;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });

      setUserResults(uniqueUsers);
      setPostResults(posts);
      
      // Auto-switch mode based on results
      if (uniqueUsers.length === 0 && posts.length > 0) {
        setSearchMode('posts');
      } else if (uniqueUsers.length > 0 && posts.length === 0) {
        setSearchMode('users');
      }
    } catch (e) {
      console.error("Search error", e);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 h-full overflow-y-auto custom-scrollbar pb-32">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group mb-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 animate-gradient-x" />
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">استكشاف TruCast</h2>
        <p className="text-zinc-500 font-bold text-sm mb-8">ابحث عن مستخدمين بواسطة اسم المستخدم الخاص بهم</p>
        
        <div className="relative mb-6">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 w-6 h-6" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن @username..." 
            dir="ltr"
            className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-[28px] py-6 pr-14 pl-6 text-white outline-none focus:border-blue-600 transition-all font-bold text-lg shadow-inner text-right md:text-left" 
          />
          {loading && (
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Real-time suggestions dropdown */}
          <AnimatePresence>
            {searchQuery && !hasSearched && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-[28px] overflow-hidden z-50 shadow-2xl"
              >
                <div className="p-2">
                  {/* Suggest hashtags matches */}
                  {trendingHashtags
                    .filter(t => t.tag.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 5)
                    .map((tagObj, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(tagObj.tag);
                          performSearch(tagObj.tag);
                        }}
                        className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-right"
                      >
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-blue-500">
                          <Hash className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-black">{tagObj.tag}</p>
                          <p className="text-zinc-500 text-xs font-medium">{tagObj.count} منشور متداول</p>
                        </div>
                      </button>
                    ))
                  }
                  {/* Search for query directly */}
                  <button
                    onClick={() => performSearch(searchQuery)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-blue-600/10 rounded-2xl transition-colors text-right border-t border-zinc-800 mt-2"
                  >
                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-black">البحث عن "{searchQuery}"</p>
                      <p className="text-zinc-500 text-xs font-medium">عرض كل النتائج لهذا البحث</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {loadingTrends ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-14 bg-zinc-800/20 animate-pulse rounded-3xl" />
            ))
          ) : trendingHashtags.length > 0 ? (
            trendingHashtags.map((tagObj, i) => (
              <button 
                key={i} 
                onClick={() => setSearchQuery(tagObj.tag)}
                className="flex items-center gap-3 p-4 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/30 rounded-3xl transition-all hover:scale-105 active:scale-95 group overflow-hidden"
              >
                <div className="p-2 bg-zinc-900 rounded-xl text-zinc-500 group-hover:text-blue-500 transition-colors">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-black text-zinc-300 group-hover:text-white transition-colors truncate w-full">{tagObj.tag}</span>
                  <span className="text-[10px] font-bold text-zinc-600">{tagObj.count} منشور</span>
                </div>
              </button>
            ))
          ) : (
            [
              { label: 'الأكثر تداولاً', icon: <Sparkles className="w-4 h-4" />, query: "trending" },
              { label: 'ذكاء اصطناعي', icon: <PlusSquare className="w-4 h-4" />, query: "ai" },
              { label: 'مبدعين', icon: <User className="w-4 h-4" />, query: "creator" },
            ].map((tag, i) => (
              <button 
                key={i} 
                onClick={() => setSearchQuery(tag.query)}
                className="flex items-center gap-3 p-4 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/30 rounded-3xl transition-all hover:scale-105 active:scale-95 group"
              >
                <div className="p-2 bg-zinc-900 rounded-xl text-zinc-500 group-hover:text-blue-500 transition-colors">{tag.icon}</div>
                <span className="text-sm font-black text-zinc-300 group-hover:text-white transition-colors">{tag.label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Tabs for results */}
          <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6">
            <button 
              onClick={() => setSearchMode('users')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${searchMode === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              المستخدمين ({userResults.length})
            </button>
            <button 
              onClick={() => setSearchMode('posts')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all ${searchMode === 'posts' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              المنشورات ({postResults.length})
            </button>
          </div>

          {/* Results Area */}
          <div>
            {searchMode === 'users' ? (
              <div className="grid gap-3">
                {loading ? (
                  <UserListSkeleton />
                ) : userResults.length > 0 ? (
                  userResults.map(user => (
                    <button 
                      key={user?.uid}
                      onClick={() => onNavigateToUser(user?.uid)}
                      className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-3xl hover:bg-zinc-800 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} className="w-14 h-14 rounded-full border-2 border-zinc-800 object-cover" alt="" />
                          {user.lastSeen && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-black text-lg">{user.displayName || "مستخدم"}</p>
                          <p className="text-blue-500 font-bold text-sm tracking-tight">@{user.username || "بدون_اسم"}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-blue-600 group-hover:text-white text-zinc-500 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                      </div>
                    </button>
                  ))
                ) : !loading && (
                   <div className="text-center py-20 bg-zinc-900/30 rounded-[40px] border border-zinc-800 border-dashed">
                    <p className="text-zinc-400 font-black text-xl mb-2">لم نجد مستخدمين</p>
                  </div>
                )}
              </div>
            ) : (
            <div className="grid gap-4">
              {loading ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
                </div>
              ) : postResults.length > 0 ? (
                postResults.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentUser={currentUser} 
                      onViewMedia={onViewMedia} 
                      onNavigateToUser={onNavigateToUser} 
                    />
                  ))
                ) : !loading && (
                  <div className="text-center py-20 bg-zinc-900/30 rounded-[40px] border border-zinc-800 border-dashed">
                    <p className="text-zinc-400 font-black text-xl mb-2">لم نجد منشورات</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="mt-8 text-right">
          <h3 className="text-white font-black text-xl mb-6">استكشف العالم</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="aspect-square bg-zinc-900 rounded-[32px] border border-zinc-800 overflow-hidden relative cursor-pointer hover:scale-[1.02] transition-transform">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&h=400&auto=format&fit=crop" className="w-full h-full object-cover rounded-[32px] opacity-80" alt="" />
                <div className="absolute bottom-4 right-4"><Sparkles className="w-5 h-5 text-blue-400" /></div>
             </div>
             <div className="aspect-[4/5] bg-zinc-900 rounded-[32px] border border-zinc-800 overflow-hidden relative cursor-pointer hover:scale-[1.02] transition-transform">
                <img src="https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=400&h=500&auto=format&fit=crop" className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 border border-white" />
                  <span className="text-white text-xs font-black">TruArtist</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Reel {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  videoUrl: string;
  caption: string;
  likes: number;
  createdAt: Timestamp;
}

function ReelPlayer({ videoUrl }: { videoUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) return;

    if (videoUrl.startsWith('blob:')) {
      setSrc(videoUrl);
      return;
    }

    if (videoUrl.includes('generativelanguage.googleapis.com')) {
      const fetchVideo = async () => {
        try {
          const apiKey = process.env.API_KEY || "";
          const response = await fetch(videoUrl, {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey,
            },
          });
          const blob = await response.blob();
          setSrc(URL.createObjectURL(blob));
        } catch (e) {
          console.error("Error fetching reel video", e);
        }
      };
      fetchVideo();
    } else {
      setSrc(videoUrl);
    }
  }, [videoUrl]);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <video 
      src={src} 
      className="w-full h-full object-cover" 
      autoPlay 
      loop 
      muted 
      playsInline
    />
  );
}

function ReelsScreen({ onNavigateToUser, currentUser }: { onNavigateToUser: (uid: string) => void, currentUser: FirebaseUser | null }) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);

  const triggerHeartEffect = (clientX: number, clientY: number, containerRect: DOMRect) => {
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;

    const newHeart = {
      id: Date.now() + Math.random(),
      x,
      y
    };
    setHearts(prev => [...prev, newHeart]);

    // Handle like if not already liked
    if (!isLiked && currentUser && reels[currentIndex]) {
      const reelId = reels[currentIndex].id;
      const likeRef = doc(db, 'reels', reelId, 'likes', currentUser?.uid);
      setDoc(likeRef, { userId: currentUser?.uid, createdAt: serverTimestamp() })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `reels/${reelId}/likes/${currentUser?.uid}`));
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerHeartEffect(e.clientX, e.clientY, rect);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.touches.length > 0) {
        triggerHeartEffect(e.touches[0].clientX, e.touches[0].clientY, rect);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reel)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reels'));
    return unsub;
  }, []);

  useEffect(() => {
    if (!reels[currentIndex]) return;
    const reelId = reels[currentIndex].id;
    const likesRef = collection(db, 'reels', reelId, 'likes');
    const unsub = onSnapshot(likesRef, (snap) => {
      setLikesCount(snap.docs.length);
      setIsLiked(snap.docs.some(d => d.id === currentUser?.uid));
    });
    return unsub;
  }, [currentIndex, reels, currentUser]);

  const handleLike = async () => {
    if (!currentUser || !reels[currentIndex]) return;
    const reelId = reels[currentIndex].id;
    const likeRef = doc(db, 'reels', reelId, 'likes', currentUser?.uid);
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { userId: currentUser?.uid, createdAt: serverTimestamp() });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `reels/${reelId}/likes/${currentUser?.uid}`);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="w-full max-w-md h-full flex flex-col justify-end p-10 space-y-6 animate-pulse">
          <div className="w-16 h-16 bg-zinc-800 rounded-full" />
          <div className="w-48 h-6 bg-zinc-800 rounded-lg" />
          <div className="w-full h-20 bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-bold p-6 text-center">
        <Film className="w-16 h-16 opacity-10 mb-4" />
        <p>لا توجد مقاطع ريلز بعد.</p>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div className="h-[calc(100vh-80px)] md:h-screen md:p-6 overflow-hidden">
      <div className="h-full max-w-md mx-auto bg-black md:rounded-[40px] border border-zinc-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 z-0">
          <ReelPlayer videoUrl={currentReel.videoUrl} />
        </div>
        <div 
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10 cursor-pointer select-none" 
        />
        
        {/* Floating Hearts for Double Tap */}
        <AnimatePresence>
          {hearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ scale: 0, opacity: 0, rotate: -15 + Math.random() * 30 }}
              animate={{ 
                scale: [0, 1.6, 1.2, 1.4, 0], 
                opacity: [0, 1, 1, 0.8, 0],
                y: -120,
                rotate: -25 + Math.random() * 50
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              onAnimationComplete={() => {
                setHearts(prev => prev.filter(h => h.id !== heart.id));
              }}
              className="absolute pointer-events-none z-40 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]"
              style={{
                left: heart.x - 40,
                top: heart.y - 40,
              }}
            >
              <Heart className="w-20 h-20 fill-red-500 stroke-white stroke-[2.5px]" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Navigation Arrows */}
        {reels.length > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 z-30 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto disabled:opacity-0"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            <button 
              disabled={currentIndex === reels.length - 1}
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto disabled:opacity-0"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          </div>
        )}

        <div className="absolute bottom-10 left-6 right-20 z-20 text-right">
          <button 
            onClick={() => onNavigateToUser(currentReel.userId)}
            className="flex items-center gap-3 mb-4 text-right"
          >
            <img src={currentReel.userPhoto} className="w-12 h-12 rounded-full border-2 border-white shadow-xl object-cover" alt="" />
            <div>
              <h4 className="text-white font-black text-lg tracking-tight">@{currentReel.userName}</h4>
              <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mt-0.5">صناع المحتوى الموثقين</p>
            </div>
          </button>
          <p className="text-white text-base font-bold leading-relaxed mb-4 line-clamp-2">{currentReel.caption}</p>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full w-fit">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white text-[10px] font-black tracking-wider">مقطع مرئي</span>
          </div>
        </div>

        <div className="absolute bottom-10 right-4 z-20 flex flex-col items-center gap-6">
          <button 
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-3 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-full shadow-lg group-hover:scale-110 transition-all ${isLiked ? 'text-red-500 border-red-500/50' : 'text-white'}`}>
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500' : ''}`} />
            </div>
            <span className="text-[10px] text-white font-black">{likesCount}</span>
          </button>
          <button 
            onClick={() => setShowComments(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-full text-white group-hover:scale-110 group-hover:text-blue-500 transition-all">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-[10px] text-white font-black">التعليقات</span>
          </button>
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-full text-white group-hover:scale-110 group-hover:text-emerald-500 transition-all">
              <Share2 className="w-7 h-7" />
            </div>
            <span className="text-[10px] text-white font-black">شارك</span>
          </button>
        </div>

        {/* Reels Comments Overlay */}
        <AnimatePresence>
          {showComments && (
            <CommentsComponent 
              postId={currentReel.id} 
              collectionPath="reels"
              currentUser={currentUser}
              postOwnerId={currentReel.userId}
              onNavigateToUser={onNavigateToUser}
              onClose={() => setShowComments(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CreateStory({ currentUser, onCancel, onComplete }: { 
  currentUser: FirebaseUser | null,
  onCancel: () => void,
  onComplete: () => void
}) {
  const { state } = useLocation();
  const sharedComment = state?.sharedComment;

  // Background choices
  const gradients = [
    { name: 'كوزميك بنفسجي', value: 'bg-gradient-to-br from-violet-900 via-purple-950 to-zinc-950' },
    { name: 'دمج الشروق', value: 'bg-gradient-to-tr from-amber-600 via-pink-600 to-indigo-950' },
    { name: 'أورورا الأخضر', value: 'bg-gradient-to-br from-teal-950 via-emerald-950 to-zinc-950' },
    { name: 'الفضاء الداكن', value: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-zinc-950' }
  ];

  const [selectedGradient, setSelectedGradient] = useState(gradients[0].value);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomImage(URL.createObjectURL(file));
    }
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setShowSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    }, 1200);
  };

  return (
    <div className="min-h-full bg-zinc-950 text-white flex flex-col p-4 md:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl transition-all">
          <X className="w-5 h-5 text-zinc-400 hover:text-white" />
        </button>
        <h3 className="text-lg font-black text-white">إنشاء قصة مميزة</h3>
        <button 
          onClick={handlePublish}
          disabled={isPublishing || showSuccess}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 text-sm flex items-center gap-2"
        >
          {isPublishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : showSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            "مشاركة في قصتي"
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 items-center justify-center max-w-4xl mx-auto w-full">
        {/* Story Preview Container */}
        <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-[36px] overflow-hidden border border-zinc-800/80 shadow-2xl flex flex-col justify-between p-6">
          {/* Background Layer */}
          <div className={`absolute inset-0 z-0 ${customImage ? '' : selectedGradient}`}>
            {customImage && (
              <img src={customImage} className="w-full h-full object-cover" alt="Background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </div>

          {/* Story UI (Top info) */}
          <div className="relative z-10 flex items-center gap-2">
            <img src={currentUser?.photoURL || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full border border-white/20" alt="" />
            <div>
              <p className="text-xs font-black text-white">{currentUser?.displayName || "مستخدم"}</p>
              <p className="text-[9px] text-white/65 font-medium">قصتك • الآن</p>
            </div>
          </div>

          {/* Interactive Shared Comment Sticker */}
          <div className="relative z-10 flex-1 flex items-center justify-center">
            {sharedComment ? (
              <motion.div 
                drag
                dragConstraints={{ left: -100, right: 100, top: -160, bottom: 160 }}
                whileDrag={{ scale: 1.05 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 shadow-2xl select-none cursor-grab active:cursor-grabbing text-right w-[270px] relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-[-30px] right-[-30px] w-16 h-16 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={sharedComment.userPhoto || "https://ui-avatars.com/api/?name=User"} 
                      className="w-7 h-7 rounded-full border border-white/20" 
                      alt="" 
                    />
                    <div className="text-right">
                      <p className="text-[11px] font-black text-white leading-tight">{sharedComment.userName}</p>
                      <p className="text-[8px] text-zinc-400 font-bold">تعليق مميز</p>
                    </div>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                </div>
                <p className="text-white text-xs font-bold leading-relaxed text-right text-wrap break-words">
                  {sharedComment.content}
                </p>
                
                <div className="mt-3 flex justify-between items-center border-t border-white/10 pt-2">
                  <span className="text-[7px] font-black tracking-widest text-white/30 uppercase">TRUCAST STICKER</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-zinc-500 text-xs font-bold text-center">لا يوجد تعليق متاح</div>
            )}
          </div>

          {/* Bottom text instructions */}
          <div className="relative z-10 text-center">
            <p className="text-[10px] text-white/65 font-bold">👋 اسحب الملصق لتغيير مكانه</p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex-1 w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-black text-zinc-400">تخصيص الخلفية</h4>
            <p className="text-xs text-zinc-500">اختر لوناً متدرجاً أو ارفع صورة خاصة بك من جهازك</p>
          </div>

          {/* Gradients grid */}
          <div className="grid grid-cols-2 gap-3">
            {gradients.map((grad, i) => (
              <button 
                key={i}
                onClick={() => {
                  setCustomImage(null);
                  setSelectedGradient(grad.value);
                }}
                className={`h-16 rounded-2xl ${grad.value} border-2 transition-all relative overflow-hidden flex items-end p-2.5 ${selectedGradient === grad.value && !customImage ? 'border-blue-500 scale-102 shadow-lg shadow-blue-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}
              >
                <span className="text-[10px] font-black text-white text-right z-10">{grad.name}</span>
                <div className="absolute inset-0 bg-black/20" />
              </button>
            ))}
          </div>

          {/* Custom uploader */}
          <div className="space-y-3">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl font-black text-sm text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 shadow-inner"
            >
              <ImageIcon className="w-5 h-5 text-blue-500" />
              {customImage ? "تغيير الصورة المخصصة" : "رفع صورة خلفية مخصصة"}
            </button>
          </div>

          {/* Success Banner */}
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 font-bold text-xs"
            >
              <Check className="w-5 h-5 animate-bounce" />
              <span>تم نشر قصتك ومشاركتها مع المتابعين بنجاح!</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateReel({ currentUser, onCancel, onComplete }: { 
  currentUser: FirebaseUser | null,
  onCancel: () => void,
  onComplete: () => void
}) {
  const { state } = useLocation();
  const sharedComment = state?.sharedComment;

  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("شاهدوا هذا التعليق الأسطوري! 🔥✨");
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Simulated Camera Mode when no video is selected
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedVideo(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setUploadProgress(10);
    
    try {
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(p => {
          if (p >= 90) {
            clearInterval(interval);
            return 90;
          }
          return p + 15;
        });
      }, 200);

      let downloadURL = "https://res.cloudinary.com/demo/video/upload/dog.mp4";
      if (selectedFile) {
        try {
          downloadURL = await uploadToCloudinarySigned(selectedFile, (progress) => {
            // progress updates
          });
        } catch (cloudinaryErr) {
          console.log("Cloudinary upload failed, using fallback mock video:", cloudinaryErr);
        }
      }

      // Add to Firestore collection
      await addDoc(collection(db, 'reels'), {
        userId: currentUser?.uid || "mock_uid",
        userName: currentUser?.displayName || "مستخدم",
        userPhoto: currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName}`,
        caption: caption,
        videoUrl: downloadURL,
        likes: 0,
        createdAt: serverTimestamp()
      });

      clearInterval(interval);
      setUploadProgress(100);
      setIsPublishing(false);
      setShowSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (e: any) {
      console.error("Reel publication error:", e);
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-full bg-zinc-950 text-white flex flex-col p-4 md:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl transition-all">
          <X className="w-5 h-5 text-zinc-400 hover:text-white" />
        </button>
        <h3 className="text-lg font-black text-white">إنشاء مقطع ريلز مميز</h3>
        <button 
          onClick={handlePublish}
          disabled={isPublishing || showSuccess || (!selectedVideo && !isRecording)}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 text-sm flex items-center gap-2"
        >
          {isPublishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : showSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            "نشر الريلز"
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 items-center justify-center max-w-4xl mx-auto w-full">
        {/* Reels Preview Container */}
        <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-[36px] overflow-hidden border border-zinc-800/80 bg-zinc-900 shadow-2xl flex flex-col justify-between p-6">
          {selectedVideo ? (
            <div className="absolute inset-0 z-0">
              <video src={selectedVideo} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15),transparent)] animate-pulse" />
              <div className="flex flex-col items-center justify-center space-y-3 z-10 p-4 text-center">
                <Video className={`w-14 h-14 ${isRecording ? 'text-red-500 animate-pulse' : 'text-purple-500'}`} />
                <p className="text-zinc-400 text-xs font-bold">
                  {isRecording ? "جاري تسجيل مقطع الريلز..." : "كاميرا ريلز المباشرة جاهزة"}
                </p>
                {isRecording && (
                  <div className="flex items-center gap-2 bg-red-600/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-black tracking-wider animate-pulse">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span>REC • {recordingSeconds}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reels Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-[9px] text-white font-black">مباشر</span>
            </div>
            <span className="text-[10px] text-white/50 font-bold">TruCast Reels</span>
          </div>

          {/* Draggable Comment Sticker */}
          <div className="relative z-10 flex-1 flex items-center justify-center">
            {sharedComment ? (
              <motion.div 
                drag
                dragConstraints={{ left: -100, right: 100, top: -160, bottom: 160 }}
                whileDrag={{ scale: 1.05 }}
                className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4 shadow-2xl select-none cursor-grab active:cursor-grabbing text-right w-[270px] relative overflow-hidden"
              >
                <div className="absolute top-[-30px] right-[-30px] w-16 h-16 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src={sharedComment.userPhoto || "https://ui-avatars.com/api/?name=User"} 
                      className="w-7 h-7 rounded-full border border-white/20" 
                      alt="" 
                    />
                    <div className="text-right">
                      <p className="text-[11px] font-black text-white leading-tight">{sharedComment.userName}</p>
                      <p className="text-[8px] text-zinc-400 font-bold">تعليق مميز</p>
                    </div>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                </div>
                <p className="text-white text-xs font-bold leading-relaxed text-right text-wrap break-words">
                  {sharedComment.content}
                </p>
                <div className="mt-3 flex justify-between items-center border-t border-white/10 pt-2">
                  <span className="text-[7px] font-black tracking-widest text-white/30 uppercase">TRUCAST REELS</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-zinc-500 text-xs font-bold text-center">لا يوجد تعليق متاح</div>
            )}
          </div>

          <div className="relative z-10 text-center space-y-1">
            <p className="text-[10px] text-white/65 font-bold">👋 اسحب الملصق لتغيير مكانه في فيديو الريلز</p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex-1 w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-black text-zinc-400">خيارات التسجيل والنشر</h4>
            <p className="text-xs text-zinc-500">سجل مباشرة بالكاميرا أو قم برفع ملف فيديو جاهز لعرض الملصق فوقه</p>
          </div>

          {/* Recorder buttons */}
          {!selectedVideo && (
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center space-y-4">
              <button 
                onClick={() => setIsRecording(prev => !prev)}
                className={`w-16 h-16 rounded-full border-4 border-zinc-800 flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-red-500'}`}
              >
                <div className={`rounded-full bg-white transition-all ${isRecording ? 'w-5 h-5' : 'w-8 h-8'}`} />
              </button>
              <span className="text-xs font-black">
                {isRecording ? "انقر للإنهاء وحفظ المقطع" : "بدء تسجيل مباشر"}
              </span>
            </div>
          )}

          {/* Custom video uploader */}
          <div className="space-y-3">
            <input 
              type="file" 
              accept="video/*" 
              ref={videoInputRef} 
              onChange={handleVideoSelect} 
              className="hidden" 
            />
            <button 
              onClick={() => videoInputRef.current?.click()}
              className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl font-black text-sm text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 shadow-inner"
            >
              <Video className="w-5 h-5 text-purple-500" />
              {selectedVideo ? "تغيير ملف الفيديو" : "رفع ملف فيديو مخصص للريلز"}
            </button>
          </div>

          {/* Caption text area */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-400">وصف الريلز (Caption)</label>
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب وصفاً للريلز..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none transition-all resize-none h-18 font-medium"
            />
          </div>

          {/* Success Banner */}
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center gap-3 text-purple-400 font-bold text-xs"
            >
              <Check className="w-5 h-5 animate-bounce" />
              <span>تم نشر مقطع الريلز ومشاركته بنجاح!</span>
            </motion.div>
          )}

          {isPublishing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-bold">
                <span>جاري النشر والرفع لـ Firestore...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Consolidating with top-level interfaces

function CreateGroupScreen({ currentUser, onBack, onNavigateToChat }: { 
  currentUser: FirebaseUser | null, 
  onBack: () => void, 
  onNavigateToChat: (id: string, data?: Chat) => void 
}) {
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim()) return;
    setLoading(true);
    try {
      const chatsRef = collection(db, 'chats');
      const newChat = await addDoc(chatsRef, {
        type: 'group',
        name: groupName.trim(),
        participants: [currentUser?.uid],
        admins: [currentUser?.uid],
        creatorId: currentUser?.uid,
        unreadCount: {},
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      onNavigateToChat(newChat.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'chats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 h-full">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white shadow-xl transition-all active:scale-95">
          <ChevronRight className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-black text-white tracking-tight">مجموعة جديدة</h2>
      </div>
      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[32px] p-8 shadow-2xl space-y-6">
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-28 h-28 bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-blue-500 group-hover:border-blue-500 cursor-pointer transition-all">
              <Camera className="w-10 h-10" />
            </div>
            <div className="absolute bottom-0 left-0 bg-blue-600 p-2 rounded-full border-4 border-zinc-900 text-white shadow-lg shadow-blue-900/20">
              <Plus className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="اسم المجموعة..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-zinc-700" 
            />
          </div>
          <p className="text-zinc-500 text-sm px-2 leading-relaxed">
            يمكنك إضافة لغاية 200,000 عضو، تخصيص الصلاحيات، وإضافة مشرفين.
          </p>
        </div>
        <button 
          onClick={handleCreateGroup}
          disabled={loading || !groupName.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "استمرار"}
        </button>
      </div>
    </div>
  );
}

function CreateChannelScreen({ currentUser, onBack, onNavigateToChat }: { 
  currentUser: FirebaseUser | null, 
  onBack: () => void, 
  onNavigateToChat: (id: string, data?: Chat) => void 
}) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateChannel = async () => {
    if (!currentUser || !channelName.trim()) return;
    setLoading(true);
    try {
      const chatsRef = collection(db, 'chats');
      const newChat = await addDoc(chatsRef, {
        type: 'channel',
        name: channelName.trim(),
        description: description.trim(),
        participants: [currentUser?.uid],
        admins: [currentUser?.uid],
        creatorId: currentUser?.uid,
        unreadCount: {},
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      onNavigateToChat(newChat.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'chats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 h-full">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white shadow-xl transition-all active:scale-95">
          <ChevronRight className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-black text-white tracking-tight">قناة جديدة</h2>
      </div>
      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[32px] p-8 shadow-2xl space-y-6">
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-28 h-28 bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-blue-500 group-hover:border-blue-500 cursor-pointer transition-all">
              <Camera className="w-10 h-10" />
            </div>
            <div className="absolute bottom-0 left-0 bg-blue-600 p-2 rounded-full border-4 border-zinc-900 text-white shadow-lg shadow-blue-900/20">
              <Plus className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <input 
            type="text" 
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="اسم القناة..." 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-zinc-700" 
          />
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف القناة (اختياري)..." 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all min-h-[120px] font-medium placeholder:text-zinc-700" 
          />
          <p className="text-zinc-500 text-xs px-2 leading-relaxed">
            القنوات هي أداة لبث رسائلك إلى جمهور غير محدود.
          </p>
        </div>
        <button 
          onClick={handleCreateChannel}
          disabled={loading || !channelName.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء القناة"}
        </button>
      </div>
    </div>
  );
}


function UserProfileScreen({ userId, currentUser, onBack, onViewMedia, onNavigateToUser, onNavigateToChat, onNavigate }: { 
  userId: string, 
  currentUser: FirebaseUser | null, 
  onBack: () => void, 
  onViewMedia: (url: string, type: 'image' | 'video') => void, 
  onNavigateToUser: (uid: string) => void, 
  onNavigateToChat: (chatId: string, data?: Chat) => void,
  onNavigate?: (tab: any, sub?: any) => void
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    if (!userId || !currentUser) return;
    const followRef = doc(db, 'users', userId, 'followers', currentUser?.uid);
    const unsubFollow = onSnapshot(followRef, (docSnap) => {
      setIsFollowing(docSnap.exists());
    });
    return () => unsubFollow();
  }, [userId, currentUser]);

  useEffect(() => {
    if (!userId) return;
    const profileRef = doc(db, 'users', userId);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as any);
      }
    });

    const q = query(collection(db, 'posts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    setGlobalLoading(true);
    const unsubPosts = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
      setLoading(false);
      setGlobalLoading(false);
    }, (err) => {
      setLoading(false);
      setGlobalLoading(false);
    });

    return () => {
      unsubProfile();
      unsubPosts();
    };
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!currentUser || !userId || followLoading) return;
    setFollowLoading(true);
    setGlobalLoading(true);
    
    const batch = writeBatch(db);
    const followerRef = doc(db, 'users', userId, 'followers', currentUser?.uid);
    const followingRef = doc(db, 'users', currentUser?.uid, 'following', userId);
    const targetUserRef = doc(db, 'users', userId);
    const currentUserRef = doc(db, 'users', currentUser?.uid);

    try {
      if (isFollowing) {
        // Unfollow
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
      } else {
        // Follow
        batch.set(followerRef, {
          userId: currentUser?.uid,
          userName: currentUser.displayName || 'مستخدم',
          userPhoto: currentUser.photoURL || '',
          createdAt: serverTimestamp()
        });
        batch.set(followingRef, {
          userId: userId,
          userName: profile?.displayName || 'مستخدم',
          userPhoto: profile?.photoURL || '',
          createdAt: serverTimestamp()
        });
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
      }
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'follow');
    } finally {
      setFollowLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUser || !userId) return;
    setGlobalLoading(true);
    try {
      // التحقق أولاً مما إذا كانت هناك محادثة مباشرة سابقة بين الطرفين
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', currentUser?.uid)
      );
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => {
        const data = doc.data();
        return data.participants && data.participants.includes(userId);
      });

      if (existingChat) {
        // إذا كانت المحادثة موجودة بالفعل، قم بالتوجيه إليها دون إنشاء مستند جديد
        onNavigateToChat(existingChat.id, { id: existingChat.id, ...existingChat.data() } as Chat);
        return;
      }

      // إنشاء محادثة مباشرة جديدة فقط إذا لم توجد محادثة سابقة
      const docRef = await addDoc(collection(db, 'chats'), { 
        type: 'direct', 
        participants: [currentUser?.uid, userId], 
        unreadCount: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // الانتقال للمحادثة الجديدة باستخدام المعرف المولد
      onNavigateToChat(docRef.id);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'chats');
    } finally {
      setGlobalLoading(false);
    }
  };

  const isOnline = (lastSeen?: Timestamp) => {
    if (!lastSeen) return false;
    const now = Date.now();
    const lastSeenMs = lastSeen.toMillis();
    return (now - lastSeenMs) < 1000 * 60 * 5; // 5 minutes
  };

  const customization = profile?.profileCustomization;
  const privacy = profile?.privacySettings;

  const formatStat = (count: number, isEnabled: boolean) => {
    if (isEnabled === false) return "---";
    if (privacy?.anonymousStats) {
      if (count >= 1000) return `${Math.floor(count / 1000)}K+`;
      if (count >= 500) return `500+`;
      if (count >= 100) return `100+`;
      return count;
    }
    return count;
  };

  const isHighPrivacy = privacy?.showLastSeen === false && privacy?.anonymousStats === true;

  return (
    <div className={`max-w-2xl mx-auto min-h-full flex flex-col bg-zinc-950 pb-20 ${customization?.fontFamily || 'font-sans'} overflow-y-auto custom-scrollbar`}>
      {loading ? (
        <div className="p-8">
          <ProfileSkeleton />
        </div>
      ) : (
        <>
          {/* Dynamic Header */}
          <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all active:scale-90">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex flex-col -gap-1">
            <h2 className="text-lg font-black text-white leading-tight flex items-center gap-2">
              {profile?.displayName || 'مبدع TruCast'}
              <VerifiedBadge isVerified={profile?.isVerified} />
              <PremiumBadge isPremium={profile?.isPremium} />
              {isHighPrivacy && (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              )}
            </h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
              {privacy?.showPostCount !== false ? `${posts.length} منشور` : 'محتوى محمي'}
            </p>
          </div>
        </div>
        <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-8">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${customization?.bgColor || 'bg-zinc-900/50'} border border-zinc-800 rounded-[32px] p-8 mb-10 relative overflow-hidden backdrop-blur-md`}
        >
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10 text-center">
            <div className="inline-block relative mb-6">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${userId}&background=random&size=128`} 
                className="w-32 h-32 rounded-full border-4 border-zinc-950 p-1.5 bg-blue-600 object-cover shadow-2xl relative z-10" 
                alt="" 
              />
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-zinc-950 z-20 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>

            <h2 className={`text-4xl font-black mb-1 tracking-tighter ${customization?.textColor || 'text-white'} flex items-center justify-center gap-2`}>
              {profile?.displayName || userId}
              <VerifiedBadge isVerified={profile?.isVerified} size="md" />
              <PremiumBadge isPremium={profile?.isPremium} size="md" />
              {isHighPrivacy && <ShieldCheck className="w-6 h-6 text-emerald-500/50" />}
              {profile?.publicKey && <Lock className="w-5 h-5 text-blue-500/50" />}
            </h2>
            
            {profile?.username && (
              <p className="text-zinc-500 font-bold mb-4 flex items-center justify-center gap-1.5 italic">
                @{profile.username}
                <Sparkles className="w-4 h-4 text-zinc-600" />
              </p>
            )}

            {privacy?.showLastSeen !== false && profile?.lastSeen && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${isOnline(profile.lastSeen) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {isOnline(profile.lastSeen) ? 'متصل الآن' : `نشط ${formatPostDate(profile.lastSeen)}`}
                </span>
              </div>
            )}

            {profile?.bio && (
              <p className="text-zinc-400 text-sm mb-10 max-w-sm mx-auto leading-relaxed px-4 font-medium italic">
                "{profile.bio}"
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 mb-10">
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-[24px] text-center hover:bg-zinc-900/50 transition-all group cursor-default">
                <p className="text-2xl font-black text-white group-hover:text-blue-500 transition-colors">
                  {formatStat(posts.length, privacy?.showPostCount !== false)}
                </p>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">منشور</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-[24px] text-center hover:bg-zinc-900/50 transition-all group cursor-default">
                <p className="text-2xl font-black text-white group-hover:text-blue-500 transition-colors">
                  {formatStat(profile?.followersCount || 0, privacy?.showFollowers !== false)}
                </p>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">متابع</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-[24px] text-center hover:bg-zinc-900/50 transition-all group cursor-default">
                <p className="text-2xl font-black text-white group-hover:text-blue-500 transition-colors">
                  {formatStat(profile?.followingCount || 0, privacy?.showFollowing !== false)}
                </p>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">يتابع</p>
              </div>
            </div>

            {isOwnProfile ? (
              <button 
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('settings', 'personal');
                  }
                }}
                className="w-full py-4.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black rounded-22px border border-zinc-800/80 hover:border-zinc-700/80 transition-all active:scale-95 text-lg flex items-center justify-center gap-2"
              >
                <Edit2 className="w-5 h-5 text-zinc-400" />
                تعديل الحساب
              </button>
            ) : (
              <div className="flex gap-4 w-full">
                <button 
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`flex-1 py-4.5 ${isFollowing ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black rounded-22px transition-all shadow-xl shadow-blue-900/20 active:scale-95 text-lg flex items-center justify-center gap-2`}
                >
                  {followLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <Check className="w-5 h-5" />
                      متابع
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      متابعة
                    </>
                  )}
                </button>
                <button 
                  onClick={handleStartChat}
                  className="flex-1 py-4.5 bg-white/5 hover:bg-white/10 text-white font-black rounded-22px border border-white/10 transition-all active:scale-95 text-lg"
                >
                  مراسلة
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Content Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              المنشورات
            </h3>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
            </div>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  <div className="absolute inset-0 blur-lg bg-blue-500/20 animate-pulse" />
                </div>
              </div>
            ) : (
              posts.length > 0 ? (
                posts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <PostCard 
                      post={post} 
                      currentUser={currentUser} 
                      onViewMedia={onViewMedia} 
                      onNavigateToUser={onNavigateToUser} 
                    />
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-24 bg-zinc-900/20 rounded-[32px] border border-dashed border-zinc-800/50 text-zinc-500 font-bold overflow-hidden relative">
                  <Grid className="w-16 h-16 mx-auto mb-6 opacity-5 relative z-10" />
                  <p className="relative z-10 font-black text-xl tracking-tight">لا توجد منشورات متاحة</p>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-600/5 blur-[80px] rounded-full" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
}

function DiscoverScreen({ currentUser, onClose, onNavigateToChat }: { 
  currentUser: FirebaseUser | null, 
  onClose: () => void, 
  onNavigateToChat: (id: string, data?: Chat) => void 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicChats = async () => {
      setLoading(true);
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef,
          where('type', 'in', ['group', 'channel']),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const allChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        setResults(allChats);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      } finally {
        setLoading(false);
      }
    };
    fetchPublicChats();
  }, []);

  const handleJoin = async (chat: Chat) => {
    if (!currentUser) console.log("No user");
    setJoiningId(chat.id);
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        participants: arrayUnion(currentUser?.uid),
        updatedAt: serverTimestamp()
      });
      onNavigateToChat(chat.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chats');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredResults = results.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="fixed inset-0 z-[150] bg-zinc-950 flex flex-col"
    >
      <div className="p-4 flex items-center gap-4 bg-zinc-900 border-b border-zinc-800">
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white">
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text"
            placeholder="ابحث عن مجموعات أو قنوات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800 text-white pl-12 pr-4 py-3 rounded-2xl border border-zinc-700 focus:outline-none focus:border-blue-600 font-bold transition-all"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : filteredResults.length > 0 ? (
          <div className="space-y-4">
            {filteredResults.map(chat => {
              const isMember = chat.participants.includes(currentUser?.uid || '');
              return (
                <div key={chat.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-[28px] flex items-center gap-4 hover:border-zinc-700 transition-all group">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-700">
                    {chat.photoURL ? (
                      <img src={chat.photoURL} className="w-full h-full object-cover" alt="" />
                    ) : (
                      chat.type === 'channel' ? <Hash className="w-8 h-8 text-blue-500" /> : <Users className="w-8 h-8 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-white truncate">{chat.name}</h4>
                      {chat.type === 'channel' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    {chat.description && <p className="text-zinc-500 text-xs truncate font-bold mb-2">{chat.description}</p>}
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-zinc-950 text-zinc-400 px-2 py-1 rounded-full font-black uppercase tracking-widest border border-zinc-800">
                        {chat.type === 'channel' ? 'قناة' : 'مجموعة'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold">
                        {chat.participants.length} عضو
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => isMember ? onNavigateToChat(chat.id) : handleJoin(chat)}
                    disabled={joiningId === chat.id}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${
                      isMember 
                      ? 'bg-zinc-800 text-zinc-400 hover:text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20'
                    }`}
                  >
                    {joiningId === chat.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (isMember ? 'دخول' : 'انضمام')}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Search className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold">لم يتم العثور على نتائج للبحث</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChatListScreen({ 
  currentUser, 
  userProfile,
  onNavigateToChat, 
  onNavigateToCreate, 
  isDiscoverOpen, 
  setIsDiscoverOpen, 
  onNavigateToUser 
}: { 
  currentUser: FirebaseUser | null, 
  userProfile?: UserProfile | null,
  onNavigateToChat: (id: string, data?: Chat) => void, 
  onNavigateToCreate: (type: 'group' | 'channel') => void, 
  isDiscoverOpen: boolean, 
  setIsDiscoverOpen: (o: boolean) => void, 
  onNavigateToUser: (uid: string) => void 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  const handleToggleArchive = async (chatId: string, currentArchivedBy: string[] = []) => {
    if (!currentUser) console.log("No user");
    const chatRef = doc(db, 'chats', chatId);
    const isArchived = currentArchivedBy.includes(currentUser?.uid);
    const updatedArchivedBy = isArchived 
      ? currentArchivedBy.filter(uid => uid !== currentUser?.uid)
      : [...currentArchivedBy, currentUser?.uid];
    
    try {
      await updateDoc(chatRef, { archivedBy: updatedArchivedBy });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  useEffect(() => {
    if (!currentUser) console.log("No user");

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', currentUser?.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      setGlobalLoading(true);
      const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      
      // Fetch other user profile for each chat
      const chatsWithProfiles = await Promise.all(fetchedChats.map(async (chat) => {
        if (!chat.participants || !Array.isArray(chat.participants)) return chat;
        const otherUserId = chat.participants.find(p => p !== currentUser?.uid);
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            return { ...chat, otherUser: userDoc.data() as UserProfile };
          }
        }
        return chat;
      }));

      setChats(chatsWithProfiles);
      setLoading(false);
      setGlobalLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
      setLoading(false);
      setGlobalLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const handleSavedMessages = async () => {
    if (!currentUser) console.log("No user");
    
    // Check if saved messages chat already exists
    const savedChat = chats.find(c => c.type === 'saved');
    if (savedChat) {
      onNavigateToChat(savedChat.id, savedChat);
      setIsSidebarOpen(false);
      return;
    }

    setGlobalLoading(true);
    // Double check from server
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'saved'),
      where('participants', 'array-contains', currentUser?.uid)
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const chatData = snap.docs[0].data();
        onNavigateToChat(snap.docs[0].id, { id: snap.docs[0].id, ...chatData } as Chat);
        setIsSidebarOpen(false);
        return;
      }

      // Create new saved messages chat
      const docRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUser?.uid],
        type: 'saved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        creatorId: currentUser?.uid,
        name: 'الرسائل المحفوظة',
      });
      onNavigateToChat(docRef.id);
      setIsSidebarOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    } finally {
      setGlobalLoading(false);
    }
  };

  const formatMessageTime = (ts?: Timestamp) => {
    if (!ts) return "";
    const date = ts.toDate();
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const isOnline = (lastSeen?: Timestamp) => {
    if (!lastSeen) return false;
    const lastSeenDate = lastSeen.toDate();
    const now = new Date();
    // Online if seen in the last 2 minutes
    return (now.getTime() - lastSeenDate.getTime()) < 2 * 60 * 1000;
  };

  const displayedChats = chats.filter(chat => {
    const isArchived = chat.archivedBy?.includes(currentUser?.uid || "");
    return viewMode === 'archived' ? isArchived : !isArchived;
  });

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 right-0 w-80 bg-zinc-900 z-[110] border-l border-zinc-800 shadow-2xl flex flex-col"
            >
              <div className="p-8 bg-zinc-950 border-b border-zinc-800">
                <div className="flex items-center gap-4 mb-6">
                  {userProfile?.photoURL || currentUser?.photoURL ? (
                    <img src={userProfile?.photoURL || currentUser?.photoURL || ''} className="w-16 h-16 rounded-full object-cover border-2 border-zinc-800 shadow-xl" alt="" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-blue-900/20">
                      {currentUser?.displayName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black text-white">{currentUser?.displayName || "مستخدم"}</h3>
                    <p className="text-zinc-500 text-sm truncate max-w-[150px]">{currentUser?.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                {[
                  { icon: <User className="w-5 h-5" />, label: 'الملف الشخصي', action: () => {} },
                  { icon: <PlusSquare className="w-5 h-5" />, label: 'مجموعة جديدة', action: () => onNavigateToCreate('group') },
                  { icon: <Bell className="w-5 h-5" />, label: 'قناة جديدة', action: () => onNavigateToCreate('channel') },
                  { icon: <Bookmark className="w-5 h-5" />, label: 'الرسائل المحفوظة', action: handleSavedMessages },
                  { 
                    icon: <Archive className="w-5 h-5" />, 
                    label: 'المحادثات المؤرشفة', 
                    action: () => setViewMode('archived'),
                    badge: chats.filter(c => c.archivedBy?.includes(currentUser?.uid || "")).length
                  },
                  { icon: <Settings className="w-5 h-5" />, label: 'الإعدادات', action: () => {} },
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      item.action();
                      if (item.label !== 'الرسائل المحفوظة') setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl text-zinc-300 hover:text-white transition-all font-bold"
                  >
                    <div className="flex items-center gap-5">
                      <span className="text-zinc-500">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 ? (
                      <span className="bg-violet-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {viewMode === 'archived' ? (
        <div className="flex items-center gap-4 p-4 sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-10 border-b border-zinc-800/50">
          <button 
            onClick={() => setViewMode('active')}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black text-white tracking-tight flex-1">المحادثات المؤرشفة</h2>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-10 border-b border-zinc-800/50">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black text-white tracking-tight flex-1">المحادثات</h2>
          <button 
            onClick={() => setIsDiscoverOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Search className="w-6 h-6" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isDiscoverOpen && (
          <DiscoverScreen 
            currentUser={currentUser} 
            onClose={() => setIsDiscoverOpen(false)} 
            onNavigateToChat={(id, data) => {
              setIsDiscoverOpen(false);
              onNavigateToChat(id, data);
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="px-2 pt-2 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-2xl animate-pulse">
                <div className="w-14 h-14 bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-zinc-800 rounded-lg" />
                  <div className="w-full h-3 bg-zinc-800 rounded-lg opacity-50" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedChats.length > 0 ? (
          <div className="px-2 pt-2 space-y-2">
            {displayedChats.map(chat => {
              const isArchived = chat.archivedBy?.includes(currentUser?.uid || "");
              return (
                <div key={chat.id} className="relative overflow-hidden rounded-2xl bg-zinc-950">
                  {/* Background Archive Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchive(chat.id, chat.archivedBy || []);
                    }}
                    className={`absolute inset-y-0 right-0 w-[110px] flex flex-col items-center justify-center gap-1.5 text-white select-none rounded-2xl transition-all ${
                      isArchived ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'
                    }`}
                  >
                    <Archive className="w-5 h-5" />
                    <span className="text-[10px] font-black">{isArchived ? 'تنشيط' : 'أرشفة'}</span>
                  </button>

                  {/* Swipable chat list item */}
                  <motion.div
                    drag="x"
                    dragDirectionLock
                    dragConstraints={{ left: -110, right: 0 }}
                    dragElastic={{ left: 0.1, right: 0 }}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -80) {
                        handleToggleArchive(chat.id, chat.archivedBy || []);
                      }
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-900/40 hover:border-zinc-800/80 rounded-2xl transition-all group relative z-10 cursor-pointer select-none"
                    onClick={() => onNavigateToChat(chat.id, chat)}
                  >
                    <div 
                      className="relative shrink-0"
                      onClick={(e) => {
                        if ((chat.type === 'private' || chat.type === 'direct') && chat.otherUser) {
                          e.stopPropagation();
                          onNavigateToUser(chat.otherUser.uid || "");
                        }
                      }}
                    >
                      {chat.type === 'saved' ? (
                        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
                          <Bookmark className="w-7 h-7" />
                        </div>
                      ) : (chat.type === 'private' || chat.type === 'direct') ? (
                        <>
                          <img 
                            src={chat.otherUser?.photoURL || `https://ui-avatars.com/api/?name=${chat.id}&background=random`} 
                            className="w-14 h-14 rounded-full border border-zinc-800 shadow-lg object-cover hover:ring-2 hover:ring-blue-500 transition-all" 
                            alt="" 
                          />
                          {isOnline(chat.otherUser?.lastSeen) && (
                            <div className="absolute bottom-0 left-0 w-4 h-4 bg-emerald-500 border-4 border-zinc-950 rounded-full shadow-lg shadow-emerald-900/40" />
                          )}
                        </>
                      ) : (
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg overflow-hidden ${chat.type === 'group' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                          {chat.avatarUrl ? (
                             <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" style={getAvatarStyle(chat)} />
                          ) : (
                             chat.type === 'group' ? <Users className="w-6 h-6" /> : <Bell className="w-6 h-6" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-right min-w-0 px-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 
                            onClick={(e) => {
                              if ((chat.type === 'private' || chat.type === 'direct') && chat.otherUser) {
                                e.stopPropagation();
                                onNavigateToUser(chat.otherUser.uid || "");
                              }
                            }}
                            className="font-black text-white tracking-tight text-base truncate hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1 min-w-0"
                          >
                            <span className="truncate">
                              {chat.type === 'saved' ? 'الرسائل المحفوظة' : (chat.type === 'private' || chat.type === 'direct') ? (chat.otherUser?.displayName || "مستخدم") : chat.name}
                            </span>
                            {(chat.type === 'private' || chat.type === 'direct') && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <VerifiedBadge isVerified={chat.otherUser?.isVerified} />
                                <PremiumBadge isPremium={chat.otherUser?.isPremium} />
                              </div>
                            )}
                          </h4>
                          {chat.type === 'channel' && <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white shrink-0"><Check className="w-2.5 h-2.5" /></div>}
                        </div>
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest shrink-0">
                          {formatMessageTime(chat.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-zinc-500 text-sm font-medium truncate group-hover:text-zinc-300 transition-colors leading-snug flex-1 text-right">
                          {(chat.type === 'private' || chat.type === 'direct') && chat.lastSenderId === currentUser?.uid && <span className="text-blue-500 ml-1">أنت: </span>}
                          {chat.lastMessage || (chat.type === 'channel' ? "لا توجد رسائل في هذه القناة" : "ابدأ المحادثة الآن")}
                        </p>
                        {((chat.unreadCount?.[currentUser?.uid || '']) || 0) > 0 && (
                          <div className="min-w-[20px] h-5 bg-blue-600 rounded-full flex items-center justify-center px-1.5 mr-2 shadow-lg shadow-blue-900/20 shrink-0">
                            <span className="text-[10px] font-black text-white leading-none">
                              {(chat.unreadCount?.[currentUser?.uid || ''] || 0) > 99 ? '99+' : (chat.unreadCount?.[currentUser?.uid || ''] || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 font-bold">
            <MessageSquare className="w-16 h-16 opacity-10 mb-4" />
            <p>{viewMode === 'archived' ? 'لا توجد محادثات مؤرشفة' : 'لا توجد محادثات نشطة'}</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 md:right-1/2 md:translate-x-1/2 lg:translate-x-0 lg:right-6 md:bottom-12 z-[60]">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-90 ${
            isMenuOpen ? 'bg-zinc-800 rotate-45' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/40'
          }`}
        >
          {isMenuOpen ? <Plus className="w-7 h-7" /> : <Edit2 className="w-6 h-6" />}
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[65] md:hidden"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute bottom-16 right-0 w-64 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-2 z-[70]"
              >
                {[
                  { label: 'مجموعة جديدة', icon: <User className="w-5 h-5" />, type: 'group' },
                  { label: 'قناة جديدة', icon: <Bell className="w-5 h-5" />, type: 'channel' },
                  { label: 'رسالة سرية', icon: <Lock className="w-5 h-5" />, type: 'secret' },
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => { 
                      if (item.type !== 'secret') onNavigateToCreate(item.type as any);
                      setIsMenuOpen(false); 
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/80 rounded-[20px] text-zinc-300 hover:text-white transition-all font-bold text-sm group"
                  >
                    <span className="p-2.5 bg-zinc-950 rounded-xl text-zinc-500 group-hover:text-blue-500 transition-colors">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


/** ---------------------------------------------------------------------------
 * SMART WHITEBOARD COMPONENT
 * -------------------------------------------------------------------------- */
const WhiteboardStage = ({ 
  chat, 
  call, 
  currentUser, 
  isAdmin, 
  onClose 
}: { 
  chat: Chat, 
  call: CallSession, 
  currentUser: FirebaseUser | null, 
  isAdmin: boolean,
  onClose: () => void
}) => {
  const [elements, setElements] = useState<WhiteboardElementData[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [width, setWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [bgColor, setBgColor] = useState('#000000');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [whiteboardData, setWhiteboardData] = useState<any>(null);
  const [textInput, setTextInput] = useState({ active: false, x: 0, y: 0, value: "" });

  const svgRef = useRef<SVGSVGElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sync whiteboard metadata (like background color)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "chats", chat.id, "calls", call.id, "whiteboard", "current"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setWhiteboardData(data);
        if (data.backgroundColor) setBgColor(data.backgroundColor);
      }
    });
    return () => unsub();
  }, [chat.id, call.id]);

  // Sync elements
  useEffect(() => {
    const q = query(
      collection(db, "chats", chat.id, "calls", call.id, "whiteboard", "current", "elements"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const els = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhiteboardElementData));
      setElements(els);
    });
    return () => unsub();
  }, [chat.id, call.id]);

  const getPointerPos = (e: any) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Scale and translate the coordinates based on zoom/offset
    return {
      x: (clientX - rect.left - offset.x) / zoom,
      y: (clientY - rect.top - offset.y) / zoom
    };
  };

  const handleStart = (e: any) => {
    if (textInput.active) return;
    const pos = getPointerPos(e);

    if (tool === 'text') {
      setTextInput({ active: true, x: pos.x, y: pos.y, value: "" });
      setTimeout(() => textInputRef.current?.focus(), 100);
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      setIsDrawing(true);
      setCurrentPath(`M ${pos.x} ${pos.y}`);
    }
  };

  const handleMove = (e: any) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    setCurrentPath(prev => `${prev} L ${pos.x} ${pos.y}`);
  };

  const handleEnd = async () => {
    if (!isDrawing || !currentUser) return;
    setIsDrawing(false);
    
    if (currentPath) {
      const element: Partial<WhiteboardElementData> = {
        type: 'path',
        d: currentPath,
        color: tool === 'eraser' ? bgColor : color,
        width: tool === 'eraser' ? width * 4 : width,
        creatorId: currentUser?.uid,
        createdAt: serverTimestamp() as Timestamp
      };

      try {
        await addDoc(collection(db, "chats", chat.id, "calls", call.id, "whiteboard", "current", "elements"), element);
      } catch (e) {
        console.error("Failed to sync path:", e);
      }
    }
    setCurrentPath("");
  };

  const addTextElement = async () => {
    if (!textInput.value.trim() || !currentUser) {
      setTextInput({ ...textInput, active: false });
      return;
    }

    const element: Partial<WhiteboardElementData> = {
      type: 'text',
      text: textInput.value,
      x: textInput.x,
      y: textInput.y,
      color: color,
      creatorId: currentUser?.uid,
      createdAt: serverTimestamp() as Timestamp
    };

    try {
      await addDoc(collection(db, "chats", chat.id, "calls", call.id, "whiteboard", "current", "elements"), element);
    } catch (e) {
      console.error("Failed to sync text:", e);
    }
    setTextInput({ active: false, x: 0, y: 0, value: "" });
  };

  const clearAll = async () => {
    if (!isAdmin) return;
    if (!confirm("هل أنت متأكد من مسح السبورة بالكامل؟")) return;
    
    try {
      // In firestore, we have to delete one by one or use a batch
      // For simplicity in this demo, let's just delete the elements we have
      const batch = writeBatch(db);
      elements.forEach(el => {
        batch.delete(doc(db, "chats", chat.id, "calls", call.id, "whiteboard", "current", "elements", el.id));
      });
      await batch.commit();
    } catch (e) {
      console.error("Clear failed:", e);
    }
  };

  const updateBg = async (c: string) => {
    if (!isAdmin) return;
    setBgColor(c);
    try {
      await updateDoc(doc(db, "chats", chat.id, "calls", call.id, "whiteboard", "current"), {
        backgroundColor: c,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("BG Update failed:", e);
    }
  };

  const undoLast = async () => {
    const myLast = [...elements].reverse().find(el => el.creatorId === currentUser?.uid);
    if (myLast) {
      try {
        await deleteDoc(doc(db, "chats", chat.id, "calls", call.id, "whiteboard", "current", "elements", myLast.id));
      } catch (e) {
        console.error("Undo failed:", e);
      }
    }
  };

  // Zoom logic
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
    } else {
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 overflow-hidden" onWheel={handleWheel}>
      {/* Background with Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ 
          backgroundColor: bgColor,
          backgroundImage: `radial-gradient(circle, #333 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }} 
      />

      {/* Canvas Header */}
      <div className="absolute top-4 left-0 right-0 px-6 flex items-center justify-between z-50 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={onClose}
            className="p-3 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all shadow-2xl"
          >
            إغلاق عندي فقط
          </button>
        </div>
        
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="flex -space-x-2">
            {/* Show active participants counts or similar */}
            <Users className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-xs font-bold font-mono">{elements.length} عناصر</span>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={clearAll}
            className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-2xl transition-all shadow-2xl pointer-events-auto"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Floating Toolbar (Telegram Aesthetic) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 p-2 bg-zinc-900/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] shadow-2xl z-50">
        {[
          { id: 'pen', icon: <PenLine className="w-5 h-5" />, label: 'قلم' },
          { id: 'text', icon: <Type className="w-5 h-5" />, label: 'نص' },
          { id: 'eraser', icon: <Eraser className="w-5 h-5" />, label: 'ممحاة' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id as any)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${tool === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-zinc-500 hover:bg-white/5'}`}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
        
        <div className="w-8 h-[1px] bg-white/10 mx-auto my-1" />
        
        <button 
          onClick={undoLast}
          className="w-12 h-12 rounded-full flex items-center justify-center text-zinc-500 hover:bg-white/5 transition-all"
          title="تراجع"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <div className="w-8 h-[1px] bg-white/10 mx-auto my-1" />

        <div className="flex flex-col gap-2 py-2 items-center">
          {['#f87171', '#fbbf24', '#34d399', '#3b82f6', '#a78bfa', '#ffffff'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent scale-100'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="flex-1 w-full h-full cursor-crosshair touch-none select-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
          {/* Synced Elements */}
          {elements.map((el) => (
            <React.Fragment key={el.id}>
              {el.type === 'path' ? (
                <path
                  d={el.d}
                  fill="none"
                  stroke={el.color}
                  strokeWidth={el.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text
                  x={el.x}
                  y={el.y}
                  fill={el.color}
                  className="font-bold pointer-events-none select-none"
                  style={{ fontSize: 24 / zoom }}
                >
                  {el.text}
                </text>
              )}
            </React.Fragment>
          ))}

          {/* Local Current Drawing Path */}
          {currentPath && (
            <path
              d={currentPath}
              fill="none"
              stroke={tool === 'eraser' ? bgColor : color}
              strokeWidth={tool === 'eraser' ? width * 4 : width}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )}

          {/* Text Input Pointer */}
          {textInput.active && (
            <foreignObject x={textInput.x} y={textInput.y} width="300" height="100" className="overflow-visible">
              <input
                ref={textInputRef}
                type="text"
                value={textInput.value}
                onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTextElement();
                  if (e.key === 'Escape') setTextInput({ ...textInput, active: false });
                }}
                onBlur={addTextElement}
                className="bg-zinc-800 text-white border border-blue-500 px-3 py-2 rounded-xl shadow-2xl focus:outline-none w-full"
                placeholder="اكتب هنا..."
                dir="auto"
              />
            </foreignObject>
          )}
        </g>
      </svg>

      {/* Footer Controls / Hint */}
      <div className="absolute bottom-6 right-6 p-4 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-3xl z-50 flex items-center gap-4 text-zinc-500">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">التكبير</span>
          <span className="text-sm font-bold font-mono text-zinc-300">{(zoom * 100).toFixed(0)}%</span>
        </div>
        <div className="w-[1px] h-8 bg-white/5" />
        <p className="text-xs font-bold leading-tight max-w-[120px]">
          استخدم Ctrl + Wheel للتكبير، واسحب للتحرك.
        </p>
      </div>
    </div>
  );
};


/** ---------------------------------------------------------------------------
 * STAGE SCREEN (TELEGRAM-LIKE GROUP CALL)
 * -------------------------------------------------------------------------- */
const StageScreen = ({ 
  currentUser, 
  chat, 
  call, 
  onClose, 
  onNavigateToUser 
}: { 
  currentUser: FirebaseUser | null, 
  chat: Chat, 
  call: CallSession, 
  onClose: () => void,
  onNavigateToUser: (uid: string) => void
}) => {
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CallParticipant | null>(null);
  const [showParticipantMenu, setShowParticipantMenu] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [isNoiseReduction, setIsNoiseReduction] = useState(false);
  const [showNoiseToast, setShowNoiseToast] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const [micGain, setMicGain] = useState(100);

  const toggleNoiseReduction = () => {
    setIsNoiseReduction(!isNoiseReduction);
    setShowNoiseToast(true);
    setTimeout(() => setShowNoiseToast(false), 3000);
  };
  const [callTitle, setCallTitle] = useState(call.title);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(call.smartBoardEnabled || false);
  const [whiteboardLoading, setWhiteboardLoading] = useState(false);

  const userParticipant = participants.find(p => p.userId === currentUser?.uid);
  const isPrivate = chat.type === 'private' || chat.type === 'direct';
  const isAdmin = isPrivate || !!((userParticipant?.role === 'owner' || userParticipant?.role === 'admin') || 
                  (!!currentUser && (chat.creatorId === currentUser?.uid || chat.admins?.includes(currentUser?.uid))));

  useEffect(() => {
    if (!chat.id || !call.id) return;
    const callDoc = doc(db, "chats", chat.id, "calls", call.id);
    const unsub = onSnapshot(callDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsWhiteboardActive(data.smartBoardEnabled || false);
        if (data.title) setCallTitle(data.title);
      }
    });
    return () => unsub();
  }, [chat.id, call.id]);

  useEffect(() => {
    if (!chat.id || !call.id) return;
    const q = query(collection(db, "chats", chat.id, "calls", call.id, "participants"), orderBy("joinedAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const parts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CallParticipant));
      setParticipants(parts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chat.id}/calls/${call.id}/participants`);
    });
    return () => unsub();
  }, [chat.id, call.id]);

  const toggleMic = async () => {
    if (!currentUser) console.log("No user");
    const me = participants.find(p => p.userId === currentUser?.uid);
    if (me) {
      try {
        const newMutedState = !me.isMuted;
        await updateDoc(doc(db, "chats", chat.id, "calls", call.id, "participants", me.id), {
          isMuted: newMutedState,
          isSpeaking: false,
          isHandRaised: false
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `participants/${me.id}`);
      }
    }
  };

  const toggleCamera = async () => {
    if (!currentUser) console.log("No user");
    const me = participants.find(p => p.userId === currentUser?.uid);
    if (!me) return;

    try {
      const newCameraState = !isCameraOn;
      
      if (newCameraState) {
        // Real logic: get user media
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(stream);
          // If we are sharing screen, don't replace the track yet, or handle it
          if (!isSharingScreen && peerConnectionRef.current) {
            const videoTrack = stream.getVideoTracks()[0];
            const senders = peerConnectionRef.current.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) videoSender.replaceTrack(videoTrack);
          }
        } catch (mediaErr) {
          console.error("Camera access failed:", mediaErr);
          alert("تعذر الوصول إلى الكاميرا.");
          return;
        }
      } else {
        // Stop camera tracks
        if (localStream) {
          localStream.getVideoTracks().forEach(track => track.stop());
        }
      }

      setIsCameraOn(newCameraState);
      await updateDoc(doc(db, "chats", chat.id, "calls", call.id, "participants", me.id), {
        isCameraOn: newCameraState
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `participants/${me.id}`);
    }
  };

  const raiseHand = async () => {
    if (!currentUser) console.log("No user");
    const me = participants.find(p => p.userId === currentUser?.uid);
    if (me) {
      try {
        await updateDoc(doc(db, "chats", chat.id, "calls", call.id, "participants", me.id), {
          isHandRaised: true
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `participants/${me.id}`);
      }
    }
  };

  const handleLeave = async (endForAll: boolean = false) => {
    if (!currentUser) console.log("No user");
    
    // Logic for owner/admin: must confirm or choose to end call
    if ((isAdmin) && !showLeaveConfirm && !endForAll) {
      setShowLeaveConfirm(true);
      return;
    }

    try {
      if (endForAll && isAdmin) {
        await updateDoc(doc(db, "chats", chat.id, "calls", call.id), { active: false });
      } else {
        const me = participants.find(p => p.userId === currentUser?.uid);
        if (me) {
          await deleteDoc(doc(db, "chats", chat.id, "calls", call.id, "participants", me.id));
        }
      }
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `participants`);
    }
  };

  const updateTitle = async () => {
    if (!isAdmin || !callTitle.trim()) return;
    try {
      await updateDoc(doc(db, "chats", chat.id, "calls", call.id), {
        title: callTitle.trim()
      });
      setShowTitleEdit(false);
      setShowOptions(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `calls/${call.id}`);
    }
  };

  const handleParticipantAction = async (action: string, value?: any) => {
    if (!selectedUser || !currentUser) return;
    try {
      const partDoc = doc(db, "chats", chat.id, "calls", call.id, "participants", selectedUser.id);
      
      switch (action) {
        case 'global_mute':
          await updateDoc(partDoc, { 
            isMuted: true, 
            isMutedByAdmin: true,
            isHandRaised: false 
          });
          break;
        case 'allow_speak':
          await updateDoc(partDoc, { 
            isMuted: false, 
            isMutedByAdmin: false,
            isHandRaised: false 
          });
          break;
        case 'global_volume':
          await updateDoc(partDoc, { globalVolume: value });
          break;
        case 'kick':
          await deleteDoc(partDoc);
          break;
      }
      setShowParticipantMenu(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `participants/${selectedUser.id}`);
    }
  };

  const shareCallLink = async () => {
    const inviteUrl = `${window.location.origin}?chatId=${chat.id}&callId=${call.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `انضم إلى مكالمة ${callTitle}`,
          text: `أدعوك للانضمام إلى المكالمة الجماعية في ${chat.name}`,
          url: inviteUrl,
        });
      } catch (e) {
        copyToClipboard(inviteUrl);
      }
    } else {
      copyToClipboard(inviteUrl);
    }
    setShowOptions(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("تم نسخ رابط الدعوة!");
  };

  const toggleWhiteboard = async (active: boolean) => {
    if (!isAdmin) return;
    setWhiteboardLoading(true);
    try {
      await updateDoc(doc(db, "chats", chat.id, "calls", call.id), {
        smartBoardEnabled: active
      });
      // Also update the whiteboard doc itself
      await setDoc(doc(db, "chats", chat.id, "calls", call.id, "whiteboard", "current"), {
        isActive: active,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `calls/${call.id}`);
    } finally {
      setWhiteboardLoading(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!currentUser) console.log("No user");
    const me = participants.find(p => p.userId === currentUser?.uid);
    if (!me) return;

    if (isSharingScreen) {
      await stopScreenShare();
      return;
    }

    // 1. Browser Support & Mobile Fallback
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const supportsDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);

    if (!supportsDisplayMedia || isMobile) {
      alert('مشاركة الشاشة غير مدعومة في متصفح الهاتف حالياً. يرجى استخدام تطبيق TruCast الرسمي أو متصفح الكمبيوتر.');
      setShowOptions(false);
      return;
    }

    try {
      // 2. Activate Share (Real Logic)
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          cursor: "always"
        } as any,
        audio: false 
      });
      
      screenStreamRef.current = stream;
      const screenTrack = stream.getVideoTracks()[0];

      // 3. Replace Video Track in Peer Connection
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      // 4. Handle End of Sharing (Stop Button from browser UI)
      screenTrack.onended = () => {
        stopScreenShare();
      };

      // 5. Update UI & Firestore State
      setIsSharingScreen(true);
      await updateDoc(doc(db, "chats", chat.id, "calls", call.id, "participants", me.id), {
        isSharingScreen: true
      });
      
      setShowOptions(false);
    } catch (e) {
      console.error("Screen share failed or cancelled:", e);
      setIsSharingScreen(false);
    }
  };

  const stopScreenShare = async () => {
    if (!currentUser) console.log("No user");
    const me = participants.find(p => p.userId === currentUser?.uid);
    
    // 1. Stop all screen tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    setIsSharingScreen(false);

    // 2. Revert back to Camera track if enabled
    if (peerConnectionRef.current) {
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      
      if (videoSender) {
        if (isCameraOn && localStream) {
          const cameraTrack = localStream.getVideoTracks()[0];
          if (cameraTrack) {
            await videoSender.replaceTrack(cameraTrack);
          }
        } else {
          // If camera is off, we might want to remove the track or replace with null
          // but usually we just leave it or stop sending
          await videoSender.replaceTrack(null);
        }
      }
    }

    // 3. Update Firestore
    if (me) {
      try {
        await updateDoc(doc(db, "chats", chat.id, "calls", call.id, "participants", me.id), {
          isSharingScreen: false
        });
      } catch (e) {
        console.error("Failed to update sharing state in DB:", e);
      }
    }
    
    setShowOptions(false);
  };

  useEffect(() => {
    if (!currentUser || !chat.id || !call.id) return;
    const me = participants.find(p => p.userId === currentUser?.uid);
    if (!me || me.isMuted) return;

    // Simulate voice activity randomly
    const interval = setInterval(async () => {
      if (Math.random() > 0.7) {
        try {
          const partDoc = doc(db, "chats", chat.id, "calls", call.id, "participants", me.id);
          const isNowSpeaking = !me.isSpeaking;
          await updateDoc(partDoc, { isSpeaking: isNowSpeaking });
        } catch (e) {
          // Ignore silent errors for mock activity
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentUser, chat.id, call.id, participants.find(p => p.userId === currentUser?.uid)?.isMuted]);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  const currentUserRole = userParticipant?.role || (isAdmin ? 'owner' : 'member');
  const isActualAdmin = isAdmin;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans text-white overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between z-10">
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="font-black text-lg tracking-tight">{callTitle || chat.name}</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            {isPrivate ? 'مكالمة خاصة' : 'مكالمة جماعية'}
          </p>
        </div>
        <button onClick={() => setShowOptions(true)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>

      {/* Grid or Whiteboard */}
      <div className="flex-1 relative overflow-hidden">
        {isWhiteboardActive ? (
          <WhiteboardStage 
            chat={chat} 
            call={call} 
            currentUser={currentUser} 
            isAdmin={isActualAdmin} 
            onClose={() => setIsWhiteboardActive(false)}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-32">
              {participants.map(p => (
                <motion.div 
                  layout
                  key={p.id}
                  onClick={() => {
                    setSelectedUser(p);
                    setShowParticipantMenu(true);
                  }}
                  className="relative aspect-square flex flex-col items-center justify-center bg-zinc-900/40 rounded-[2.5rem] p-4 border border-zinc-800/50 group cursor-pointer hover:bg-zinc-900/60 transition-all shadow-xl"
                >
                  <div className="relative mb-3">
                    <div className={`absolute -inset-2 rounded-full blur-lg opacity-40 transition-opacity ${p.isSpeaking ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                    <img 
                      src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`} 
                      className={`w-20 h-20 rounded-full border-2 object-cover relative z-10 transition-transform group-hover:scale-105 ${p.isSpeaking ? 'border-emerald-500 scale-105' : 'border-zinc-700'}`}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    {p.isHandRaised && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-1 -right-1 z-20 bg-blue-500 p-1.5 rounded-full shadow-lg border-2 border-black"
                      >
                        <span className="text-lg">✋</span>
                      </motion.div>
                    )}
                  </div>
                  <div className="text-center z-10">
                    <span className="font-bold text-sm block truncate w-32">{p.displayName}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{p.role === 'owner' ? 'المالك' : p.role === 'admin' ? 'مشرف' : 'مشارك'}</span>
                  </div>
                  <div className={`absolute bottom-4 right-4 p-1.5 rounded-full z-10 ${p.isMuted ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {p.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>
                  {(p.isSharingScreen || p.isCameraOn) && (
                    <div className="absolute top-4 left-4 p-1.5 rounded-xl bg-blue-500 text-white z-10 shadow-lg animate-pulse flex items-center gap-1">
                      {p.isCameraOn && <Video className="w-3.5 h-3.5" />}
                      {p.isSharingScreen && <Play className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar Controls */}
      <div className="p-6 pb-12 bg-gradient-to-t from-black via-black/95 to-transparent flex items-center justify-between gap-4 z-10 border-t border-zinc-800/10">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-all ${isSpeakerOn ? 'bg-zinc-800/80 text-white' : 'bg-zinc-900/40 text-zinc-500'}`}
        >
          {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          <span className="text-[10px] font-black uppercase tracking-tighter">مكبر الصوت</span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={toggleCamera}
          className={`flex-1 p-5 rounded-3xl flex flex-col items-center gap-2 transition-all ${isCameraOn ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-zinc-800/80 text-zinc-500'}`}
        >
          {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          <span className="text-[10px] font-black uppercase tracking-tighter">الكاميرا</span>
        </motion.button>

        {/* Dynamic Mic/Raise Hand Button */}
        {currentUserRole === 'member' && userParticipant?.isMutedByAdmin ? (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={raiseHand}
            className={`flex-[1.5] p-5 rounded-3xl flex flex-col items-center gap-2 transition-all ${userParticipant?.isHandRaised ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 text-white shadow-lg'}`}
            disabled={userParticipant?.isHandRaised}
          >
            <div className="text-2xl">{userParticipant?.isHandRaised ? '🕒' : '✋'}</div>
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {userParticipant?.isHandRaised ? 'انتظار الموافقة' : 'طلب التحدث'}
            </span>
          </motion.button>
        ) : (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={toggleMic}
            className={`flex-[1.5] p-5 rounded-3xl flex flex-col items-center gap-2 transition-all ${userParticipant?.isMuted ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'}`}
          >
            {userParticipant?.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {userParticipant?.isMuted ? 'تشغيل المايك' : 'إيقاف المايك'}
            </span>
          </motion.button>
        )}

        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => handleLeave()}
          className="flex-1 p-5 bg-red-500 text-white rounded-3xl flex flex-col items-center gap-2 shadow-lg shadow-red-900/20 transition-all"
        >
          <PhoneOff className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">المغادرة</span>
        </motion.button>
      </div>

      {/* Leave Confirmation Modal for Owners/Admins */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 w-full max-w-[360px] rounded-[3rem] p-8 border border-zinc-800 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <PhoneOff className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black mb-3">مغادرة الستيج</h3>
              <p className="text-zinc-500 font-bold mb-8 leading-relaxed">بصفتك {currentUserRole === 'owner' ? 'مالك' : 'مشرف'} المكالمة، يمكنك المغادرة بمفردك أو إنهاء المكالمة للجميع.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleLeave(true)}
                  className="w-full p-5 bg-red-500 text-white rounded-2xl font-black transition-all hover:bg-red-600 active:scale-95 flex items-center justify-center gap-3"
                >
                  إنهاء المكالمة للجميع
                </button>
                <button 
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    setTimeout(() => handleLeave(false), 100);
                  }}
                  className="w-full p-5 bg-zinc-800 text-white rounded-2xl font-black transition-all hover:bg-zinc-700 active:scale-95"
                >
                  مغادرة بمفردي
                </button>
                <button 
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full p-4 border border-zinc-800 text-zinc-500 rounded-2xl font-bold transition-all hover:text-white mt-2"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options Menu Modal */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center px-4 pb-12 bg-black/60 backdrop-blur-sm" onClick={() => setShowOptions(false)}>
            <motion.div 
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 rounded-[3rem] p-6 space-y-4"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto" />
              <div className="flex flex-col gap-2">
                {[
                  { label: "إعدادات الصوت", icon: <Volume2 className="text-zinc-500" />, action: () => { setShowAudioSettings(true); setShowOptions(false); } },
                  { label: "مشاركة رابط الدعوة", icon: <Link className="text-zinc-500" />, action: () => shareCallLink() },
                  { label: isSharingScreen ? "إيقاف مشاركة الشاشة" : "مشاركة الشاشة", icon: <Play className={`w-5 h-5 ${isSharingScreen ? 'text-red-500' : 'text-zinc-500'}`} />, action: () => toggleScreenShare() },
                ].map((opt, i) => (
                  <button key={i} onClick={opt.action} className="flex items-center gap-4 w-full p-4 hover:bg-zinc-800 rounded-2xl transition-colors">
                    <span className="p-2.5 bg-zinc-950 rounded-xl">{opt.icon}</span>
                    <span className="font-bold">{opt.label}</span>
                  </button>
                ))}
                <button 
                  onClick={() => setIsNoiseReduction(!isNoiseReduction)}
                  className="flex items-center justify-between w-full p-4 hover:bg-zinc-800 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="p-2.5 bg-zinc-950 rounded-xl"><Sparkles className="text-emerald-500 w-5 h-5" /></span>
                    <span className="font-bold">تقليل الضوضاء</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${isNoiseReduction ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isNoiseReduction ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
                {isActualAdmin && (
                  <>
                    <button 
                      onClick={() => toggleWhiteboard(!isWhiteboardActive)}
                      disabled={whiteboardLoading}
                      className="flex items-center gap-4 w-full p-4 hover:bg-zinc-800 rounded-2xl transition-colors"
                    >
                      <span className="p-2.5 bg-zinc-950 rounded-xl">
                        {whiteboardLoading ? (
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Grid className="text-blue-500 w-5 h-5" />
                        )}
                      </span>
                      <span className="font-bold text-blue-500">
                        {isWhiteboardActive ? "إغلاق السبورة للكل" : "تشغيل السبورة الذكية"}
                      </span>
                    </button>
                    <button onClick={() => { setShowTitleEdit(true); setShowOptions(false); }} className="flex items-center gap-4 w-full p-4 hover:bg-zinc-800 rounded-2xl transition-colors">
                      <span className="p-2.5 bg-zinc-950 rounded-xl"><Pen className="text-blue-500 w-5 h-5" /></span>
                      <span className="font-bold text-blue-500">تغيير عنوان المكالمة</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Noise Reduction Toast */}
      <AnimatePresence>
        {showNoiseToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <div className={`p-1.5 rounded-full ${isNoiseReduction ? 'bg-blue-500' : 'bg-zinc-800'}`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-white">
              {isNoiseReduction ? 'تم تفعيل تقليل الضوضاء' : 'تم إيقاف تقليل الضوضاء'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Edit Modal */}
      <AnimatePresence>
        {showTitleEdit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-zinc-950 w-full max-w-[400px] rounded-[3rem] p-8 border border-zinc-800 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black">عنوان المكالمة</h3>
                <button onClick={() => setShowTitleEdit(false)} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 block mr-1">العنوان الجديد</label>
                  <input 
                    type="text"
                    value={callTitle}
                    onChange={(e) => setCallTitle(e.target.value)}
                    placeholder="أدخل عنواناً للمكالمة..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                    dir="auto"
                  />
                </div>

                <button 
                  onClick={updateTitle}
                  disabled={!callTitle.trim()}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                >
                  حفظ التغييرات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Audio Settings Modal */}
      <AnimatePresence>
        {showAudioSettings && (
          <div className="fixed inset-0 z-[130] flex items-end justify-center px-4 pb-12 bg-black/80 backdrop-blur-md" onClick={() => setShowAudioSettings(false)}>
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 rounded-[3rem] overflow-hidden border border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <button onClick={() => setShowAudioSettings(false)} className="p-2 hover:bg-zinc-800 rounded-full">
                  <ChevronRight className="w-6 h-6 text-zinc-400" />
                </button>
                <h3 className="text-lg font-black tracking-tight">إعدادات الصوت</h3>
                <div className="w-10" /> 
              </div>

              <div className="p-8 space-y-8">
                {/* Speaker Volume */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm">مستوى صوت السبيكر</span>
                    </div>
                    <span className="text-xs font-black text-zinc-500">{speakerVolume}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="200" 
                    value={speakerVolume}
                    onChange={(e) => setSpeakerVolume(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Mic Gain */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                        <Mic className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm">حساسية الميكروفون</span>
                    </div>
                    <span className="text-xs font-black text-zinc-500">{micGain}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="150" 
                    value={micGain}
                    onChange={(e) => setMicGain(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <button 
                    onClick={toggleNoiseReduction}
                    className="w-full p-5 bg-zinc-950 rounded-[2rem] flex items-center justify-between group transition-all active:scale-95"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-colors ${isNoiseReduction ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-zinc-500'}`}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="font-bold block text-sm">تقليل الضوضاء</span>
                        <span className="text-[10px] text-zinc-500 font-medium tracking-tight">إزالة أصوات الخلفية المزعجة</span>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-all relative ${isNoiseReduction ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isNoiseReduction ? 'right-1' : 'left-1'}`} />
                    </div>
                  </button>

                  <button 
                    className="w-full p-5 bg-zinc-950 rounded-[2rem] flex items-center justify-between group transition-all opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-zinc-900 text-zinc-500">
                        <VolumeX className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="font-bold block text-sm">إلغاء الصدى</span>
                        <span className="text-[10px] text-zinc-500 font-medium tracking-tight">مفعل تلقائياً للهواتف</span>
                      </div>
                    </div>
                    <div className="w-12 h-6 rounded-full bg-emerald-600 relative">
                      <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-all" />
                    </div>
                  </button>
                </div>

                <button 
                  onClick={() => setShowAudioSettings(false)}
                  className="w-full p-5 bg-zinc-800 hover:bg-zinc-700 rounded-3xl font-black text-xs uppercase tracking-widest transition-all mt-4"
                >
                  إغلاق الإعدادات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showParticipantMenu && selectedUser && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center px-4 pb-12 bg-black/60 backdrop-blur-sm" onClick={() => setShowParticipantMenu(false)}>
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 rounded-[3rem] overflow-hidden"
            >
              <div className="p-8 text-center space-y-4 bg-gradient-to-b from-zinc-800/50 to-zinc-900">
                <img 
                  src={selectedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.userId}`} 
                  className="w-24 h-24 rounded-full mx-auto border-4 border-zinc-800 shadow-2xl"
                  alt=""
                />
                <div>
                  <h3 className="text-xl font-black">{selectedUser.displayName}</h3>
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                    {selectedUser.role === 'owner' ? 'المالك' : selectedUser.role === 'admin' ? 'مشرف المجموعة' : 'مشارك'}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-zinc-950 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-500 uppercase">مستوى الصوت</span>
                    <span className="text-xs font-black text-blue-500">{isAdmin ? 'تحكم عالمي' : 'تحكم محلي'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Volume1 className="w-4 h-4 text-zinc-600" />
                    <input 
                      type="range" 
                      min="0" max="200" 
                      value={selectedUser.globalVolume || 100}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isAdmin) {
                          handleParticipantAction('global_volume', val);
                        } else {
                          // Local volume would need local state management per participant, 
                          // which we can mock or implement with a simple state for now
                          // for this task we follow instructions: "Local changes only for members"
                          setSelectedUser({...selectedUser, globalVolume: val});
                        }
                      }}
                      className="flex-1 accent-blue-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <Volume2 className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-black text-zinc-600">{selectedUser.globalVolume || 100}%</span>
                  </div>
                </div>

                {isAdmin ? (
                  <div className="flex flex-col gap-2">
                    {selectedUser.userId !== currentUser?.uid && (
                      <button 
                        onClick={() => handleParticipantAction(selectedUser.isMuted ? 'allow_speak' : 'global_mute')}
                        className={`w-full p-4 flex items-center justify-between rounded-2xl transition-all ${selectedUser.isMuted ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${selectedUser.isMuted ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            {selectedUser.isMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                          </div>
                          <span className="font-black">{selectedUser.isMuted ? (selectedUser.isHandRaised ? 'السماح بالتحدث' : 'إلغاء كتم الصوت') : 'كتم الصوت للجميع'}</span>
                        </div>
                      </button>
                    )}
                    <button 
                      onClick={() => onNavigateToUser(selectedUser.userId)}
                      className="w-full p-4 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-zinc-950 rounded-xl"><User className="w-5 h-5 text-zinc-400" /></div>
                        <span className="font-black">الملف الشخصي</span>
                      </div>
                    </button>
                    {selectedUser.userId !== currentUser?.uid && (
                      <button 
                        onClick={() => handleParticipantAction('kick')}
                        className="w-full p-4 flex items-center justify-between bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-red-500/10 rounded-xl"><Trash2 className="w-5 h-5" /></div>
                          <span className="font-black">إزالة من المجموعة</span>
                        </div>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onNavigateToUser(selectedUser.userId)}
                      className="w-full p-4 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-zinc-950 rounded-xl"><User className="w-5 h-5 text-zinc-400" /></div>
                        <span className="font-black">زيارة الملف الشخصي</span>
                      </div>
                    </button>
                    <button className="w-full p-4 flex items-center justify-between bg-zinc-800/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-500/10 rounded-xl"><VolumeX className="w-5 h-5" /></div>
                        <span className="font-black">كتم عندي فقط</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <div className="p-6 pt-0">
                <button onClick={() => setShowParticipantMenu(false)} className="w-full p-5 bg-zinc-800 hover:bg-zinc-700 rounded-3xl font-black text-xs uppercase tracking-widest transition-all">إغلاق</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


function AudioPlayer({ url, isMe }: { url: string, isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-2xl ${isMe ? 'bg-white/10' : 'bg-zinc-800'} backdrop-blur-sm`}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMe ? 'bg-white text-blue-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      
      <div className="flex-1 space-y-1">
        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
          <div 
            className={`h-full ${isMe ? 'bg-white' : 'bg-blue-500'} transition-all duration-100`} 
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold opacity-60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="pr-1">
        <Mic className={`w-4 h-4 ${isMe ? 'text-white' : 'text-blue-500'} opacity-40`} />
      </div>
    </div>
  );
}

function ChatDetailScreen({ chatId, currentUser, currentUserProfile, onBack, onNavigateToUser, onViewMedia }: { chatId: string, currentUser: FirebaseUser | null, currentUserProfile: UserProfile | null, onBack: () => void, onNavigateToUser: (uid: string) => void, onViewMedia: (url: string, type: 'image' | 'video') => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [chat, setChat] = useState<Chat | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [showStage, setShowStage] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageActionMenu, setMessageActionMenu] = useState<Message | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- E2EE Decryption Hook ---
  useEffect(() => {
    const decryptAll = async () => {
      if (!currentUser || !messages.length) return;
      const privateKeyStr = localStorage.getItem(`trucast_private_key_${currentUser?.uid}`);
      if (!privateKeyStr) return;

      try {
        const privateKey = await importPrivateKeyFromStr(privateKeyStr);
        const newDecrypted: Record<string, string> = { ...decryptedMessages };
        let changed = false;

        for (const msg of messages) {
          if (msg.isEncrypted && msg.encryptionData && msg.iv && !newDecrypted[msg.id]) {
            const encryptedAESKey = msg.encryptionData[currentUser?.uid];
            if (encryptedAESKey) {
              try {
                const rawAESKey = await decryptAESKeyWithRSA(encryptedAESKey, privateKey);
                const decryptedText = await decryptWithAES(msg.text, msg.iv, rawAESKey);
                newDecrypted[msg.id] = decryptedText;
                changed = true;
              } catch (e) {
                console.error("Decryption error", e);
                newDecrypted[msg.id] = "⚠️ خطأ في فك التشفير";
                changed = true;
              }
            } else {
              newDecrypted[msg.id] = "🔐 رسالة مشفرة لا يمكن قراءتها";
              changed = true;
            }
          }
        }

        if (changed) setDecryptedMessages(newDecrypted);
      } catch (e) {
        console.error("PrivateKey import failed", e);
      }
    };
    decryptAll();
  }, [messages, currentUser?.uid]);

  useEffect(() => {
    if (!chatId || !chat) return;
    // Watch for active calls
    const callsRef = collection(db, 'chats', chatId, 'calls');
    const q = query(callsRef, where('active', '==', true), orderBy('startedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CallSession;
        setActiveCall(callData);
      } else {
        setActiveCall(null);
        setShowStage(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/calls`);
    });
    return () => unsub();
  }, [chatId, !!chat]);

  const startCall = async () => {
    if (!currentUser || !chatId || !chat) return;
    const isAdmin = chat.creatorId === currentUser?.uid || chat.admins?.includes(currentUser?.uid);
    const isPrivate = chat.type === 'private' || chat.type === 'direct';
    
    if (!isAdmin && !isPrivate) return;

    try {
      const callData: Omit<CallSession, 'id'> = {
        chatId,
        title: isPrivate ? `مكالمة مع ${chat.otherUser?.displayName || "مستخدم"}` : (chat.name || "مكالمة جماعية"),
        active: true,
        startedAt: serverTimestamp() as any,
        smartBoardEnabled: false
      };
      const callRef = await addDoc(collection(db, 'chats', chatId, 'calls'), callData);
      
      // Join as first participant
      await setDoc(doc(db, 'chats', chatId, 'calls', callRef.id, 'participants', currentUser?.uid), {
        userId: currentUser?.uid,
        displayName: currentUser.displayName || "مستخدم",
        photoURL: currentUser.photoURL || "",
        isMuted: false,
        isCameraOn: false,
        isHandRaised: false,
        isSpeaking: false,
        globalVolume: 100,
        role: isPrivate ? 'owner' : (chat.creatorId === currentUser?.uid ? 'owner' : 'admin'),
        joinedAt: serverTimestamp() as any
      });
      setShowStage(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'calls');
    }
  };

  const joinCall = async () => {
    if (!currentUser || !activeCall || !chat) return;
    try {
      const partRef = doc(db, 'chats', chatId, 'calls', activeCall.id, 'participants', currentUser?.uid);
      const snap = await getDoc(partRef);
      
      if (!snap.exists()) {
        await setDoc(partRef, {
          userId: currentUser?.uid,
          displayName: currentUser.displayName || "مستخدم",
          photoURL: currentUser.photoURL || "",
          isMuted: true, // Join muted by default
          isCameraOn: false,
          isHandRaised: false,
          isSpeaking: false,
          globalVolume: 100,
          role: chat.creatorId === currentUser?.uid ? 'owner' : chat.admins?.includes(currentUser?.uid) ? 'admin' : 'member',
          joinedAt: serverTimestamp() as any
        });
      }
      setShowStage(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'participants');
    }
  };

  useEffect(() => {
    if (chat) {
      setEditName(chat.name || "");
      setEditBio(chat.description || "");
    }
  }, [chat]);

  useEffect(() => {
    if (!chatId || !currentUser) return;
    
    // Reset unread count for current user when entering chat
    const resetUnread = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, {
          [`unreadCount.${currentUser?.uid}`]: 0
        });
      } catch (e) {
        // Silently fail if rules don't allow or other issues
        console.warn("Could not reset unread count", e);
      }
    };
    resetUnread();

    // Fetch Chat metadata
    const chatRef = doc(db, 'chats', chatId);
    let unsubOtherUser: (() => void) | null = null;

    const unsubChat = onSnapshot(chatRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as Chat;
        
      // Setup listener for other user profile if private/direct chat
        if ((chatData.type === 'private' || chatData.type === 'direct') && chatData.participants && Array.isArray(chatData.participants)) {
          const otherUserId = chatData.participants.find(p => p !== currentUser?.uid);
          if (otherUserId) {
            if (unsubOtherUser) unsubOtherUser();
            unsubOtherUser = onSnapshot(doc(db, 'users', otherUserId), (userSnap) => {
              if (userSnap.exists()) {
                setChat(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    otherUser: userSnap.data() as UserProfile
                  };
                });
              }
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${otherUserId}`);
            });
          }
        }
        setChat(prev => ({ ...chatData, otherUser: prev?.otherUser || chatData.otherUser }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
      setLoading(false);
    });

    // Fetch Messages
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setLoading(false);

      // Mark messages as read in private/direct chats (Respect Stealth Mode)
      if (chat && (chat.type === 'private' || chat.type === 'direct') && currentUser && !currentUserProfile?.stealthMode) {
        const unreadMessages = msgs.filter(m => m.senderId !== currentUser?.uid && !m.readAt);
        if (unreadMessages.length > 0) {
          unreadMessages.forEach(async (m) => {
            try {
              const mRef = doc(db, 'chats', chatId, 'messages', m.id);
              await updateDoc(mRef, { readAt: serverTimestamp() });
            } catch (e) {
              console.error("Error marking as read", e);
            }
          });

          // Reset unread count for current user
          const chatRef = doc(db, 'chats', chatId);
          updateDoc(chatRef, {
            [`unreadCount.${currentUser?.uid}`]: 0
          }).catch(() => {});
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
      setLoading(false);
    });

    return () => {
      unsubChat();
      if (unsubMsgs) unsubMsgs();
      if (unsubOtherUser) unsubOtherUser();
    };
  }, [chatId, currentUser, !!chat]);

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser || !chatId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    try {
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) return;
      const data = msgSnap.data() as Message;
      const reactions = data.reactions || {};
      const userList = reactions[emoji] || [];
      
      let updatedList;
      if (userList.includes(currentUser?.uid)) {
        updatedList = userList.filter(id => id !== currentUser?.uid);
      } else {
        updatedList = [...userList, currentUser?.uid];
      }
      
      const newReactions = { ...reactions };
      if (updatedList.length > 0) {
        newReactions[emoji] = updatedList;
      } else {
        delete newReactions[emoji];
      }
      
      await updateDoc(msgRef, { reactions: newReactions });
      setReactingToMessageId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
    }
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser || !chatId || !chat) return;
    
    if (editingMessage) {
      handleEditMessage();
      return;
    }

    // Channel restriction
    if (chat.type === 'channel' && !chat.admins?.includes(currentUser?.uid)) {
      return;
    }

    setGlobalLoading(true);
    let text = input.trim();
    let isEncrypted = false;
    let encryptionData: Record<string, string> = {};
    let iv = "";

    // E2EE for private/direct chats
    if ((chat.type === 'private' || chat.type === 'direct') && chat.otherUser && chat.otherUser.publicKey) {
      try {
        console.log("🔐 Encrypting message for E2EE...");
        const recipientPubKeyStr = chat.otherUser.publicKey;
        const senderPubKeyStr = currentUserProfile?.publicKey;

        const aesResult = await encryptWithAES(text);
        text = aesResult.encryptedText;
        iv = aesResult.iv;

        // Encrypt for recipient
        const recipientPubKey = await importPublicKeyFromStr(recipientPubKeyStr);
        encryptionData[chat.otherUser.uid] = await encryptAESKeyWithRSA(aesResult.rawKey, recipientPubKey);

        // Encrypt for sender
        if (senderPubKeyStr) {
          const senderPubKey = await importPublicKeyFromStr(senderPubKeyStr);
          encryptionData[currentUser?.uid] = await encryptAESKeyWithRSA(aesResult.rawKey, senderPubKey);
        }
        isEncrypted = true;
      } catch (e) {
        console.error("Encryption failed", e);
        text = input.trim();
        isEncrypted = false;
      }
    }

    const originalText = input.trim();
    setInput("");

    try {
      // Add message
      const msgsRef = collection(db, 'chats', chatId, 'messages');
      const msgData: any = {
        senderId: currentUser?.uid,
        senderName: currentUser.displayName || "مستخدم",
        text,
        isEncrypted,
        encryptionData: isEncrypted ? encryptionData : null,
        iv: isEncrypted ? iv : null,
        createdAt: serverTimestamp(),
        disappearingTimer: chat.disappearingTimer || 0
      };

      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.isEncrypted ? (decryptedMessages[replyingTo.id] || "🔐 رسالة مشفرة") : replyingTo.text,
          senderName: replyingTo.senderName || "مستخدم"
        };
        setReplyingTo(null);
      }

      await addDoc(msgsRef, msgData);

      // Update chat meta
      const chatRef = doc(db, 'chats', chatId);
      const updates: any = {
        lastMessage: isEncrypted ? "🔐 رسالة مشفرة" : originalText,
        lastMessageAt: serverTimestamp(),
        lastSenderId: currentUser?.uid,
        updatedAt: serverTimestamp()
      };

      // Increment unread count for other participants
      if (chat.participants) {
        chat.participants.forEach(pid => {
          if (pid !== currentUser?.uid) {
            updates[`unreadCount.${pid}`] = increment(1);
          }
        });
      }

      await updateDoc(chatRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}/messages`);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !input.trim() || !currentUser || !chatId) return;
    setGlobalLoading(true);
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', editingMessage.id);
      await updateDoc(msgRef, {
        text: input.trim(),
        isEdited: true
      });
      setEditingMessage(null);
      setInput("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'messages');
    } finally {
      setGlobalLoading(false);
    }
  };

  const deleteMessage = async (msgId: string, forEveryone: boolean) => {
    if (!currentUser || !chatId) return;
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
      if (forEveryone) {
        await deleteDoc(msgRef);
      } else {
        await updateDoc(msgRef, {
          deletedBy: arrayUnion(currentUser?.uid)
        });
      }
      setMessageActionMenu(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'messages');
    }
  };

  const submitReport = async () => {
    if (!currentUser || !messageActionMenu || !reportReason) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser?.uid,
        reportedUserId: messageActionMenu.senderId,
        messageId: messageActionMenu.id,
        reason: reportReason,
        createdAt: serverTimestamp()
      });
      setShowReportModal(false);
      setReportReason("");
      setMessageActionMenu(null);
      alert("تم إرسال البلاغ بنجاح");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'reports');
    }
  };

  const forwardCurrentMessage = async (targetChatId: string) => {
    if (!forwardMessage || !currentUser) return;
    try {
      const targetMsgsRef = collection(db, 'chats', targetChatId, 'messages');
      const textToForward = forwardMessage.isEncrypted ? (decryptedMessages[forwardMessage.id] || "🔐 رسالة مشفرة") : forwardMessage.text;
      
      await addDoc(targetMsgsRef, {
        senderId: currentUser?.uid,
        senderName: currentUser.displayName || "مستخدم",
        text: textToForward,
        createdAt: serverTimestamp(),
        disappearingTimer: 0
      });

      const chatRef = doc(db, 'chats', targetChatId);
      await updateDoc(chatRef, {
        lastMessage: textToForward,
        lastMessageAt: serverTimestamp(),
        lastSenderId: currentUser?.uid,
        updatedAt: serverTimestamp()
      });

      setIsForwarding(false);
      setForwardMessage(null);
      alert("تم تحويل الرسالة بنجاح");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'messages');
    }
  };

  const formatMessageTime = (ts?: Timestamp) => {
    if (!ts) return "";
    return ts.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const uploadToCloudinary = async (file: File | Blob, resourceType: 'image' | 'video' | 'auto' = 'auto') => {
    // Attempt to get from env, default to provided values if not found
    const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || "dihv9it61";
    const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || "trucast_unsigned";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'trucast_chats');

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'فشل الرفع إلى Cloudinary');
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (e) {
      console.error("Cloudinary upload failed", e);
      throw e;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !chatId || !chat) return;

    setIsUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      const type = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';
      
      // Cloudinary: 'image' for images, 'video' for video/audio, 'auto' for others
      const resourceType = isImage ? 'image' : (isVideo || isAudio) ? 'video' : 'auto';
      
      const url = await uploadToCloudinary(file, resourceType);
      
      await sendMediaMessage(url, type);
    } catch (error) {
      alert("فشل رفع الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsUploading(true);
        try {
          const url = await uploadToCloudinary(audioBlob, 'video'); // Cloudinary uses video for audio
          await sendMediaMessage(url, 'audio');
        } catch (e) {
          alert("فشل إرسال البصمة الصوتية.");
        } finally {
          setIsUploading(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error("Mic access denied", e);
      alert("يرجى السماح بالوصول إلى المايكروفون.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const sendMediaMessage = async (url: string, type: 'image' | 'video' | 'audio' | 'file') => {
    if (!currentUser || !chatId || !chat) return;

    try {
      const msgsRef = collection(db, 'chats', chatId, 'messages');
      const msgData: any = {
        senderId: currentUser?.uid,
        senderName: currentUser.displayName || "مستخدم",
        text: type === 'image' ? "🖼️ صورة" : type === 'video' ? "🎥 فيديو" : type === 'audio' ? "🎤 بصمة صوتية" : "📎 ملف",
        fileUrl: url,
        type,
        createdAt: serverTimestamp(),
        disappearingTimer: chat.disappearingTimer || 0
      };

      await addDoc(msgsRef, msgData);

      // Update chat meta
      const chatRef = doc(db, 'chats', chatId);
      const updates: any = {
        lastMessage: msgData.text,
        lastMessageAt: serverTimestamp(),
        lastSenderId: currentUser?.uid,
        updatedAt: serverTimestamp()
      };

      if (chat.participants) {
        chat.participants.forEach(pid => {
          if (pid !== currentUser?.uid) {
            updates[`unreadCount.${pid}`] = increment(1);
          }
        });
      }

      await updateDoc(chatRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}/messages`);
    }
  };

  const isOnline = (lastSeen?: Timestamp) => {
    if (!lastSeen) return false;
    const lastSeenDate = lastSeen.toDate();
    const now = new Date();
    return (now.getTime() - lastSeenDate.getTime()) < 2 * 60 * 1000;
  };

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (!chatId || !currentUser || !chat) return;
    const typingRef = collection(db, 'chats', chatId, 'typing');
    const unsub = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const users = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toMillis() || now;
          return doc.id !== currentUser?.uid && (now - timestamp) < 6000;
        })
        .map(doc => doc.data().userName || "مستخدم");
      setTypingUsers(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/typing`);
    });
    return () => unsub();
  }, [chatId, currentUser, !!chat]);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !currentUser || currentUserProfile?.stealthMode) return;
    const typingRef = doc(db, 'chats', chatId, 'typing', currentUser?.uid);
    try {
      if (isTyping) {
        await setDoc(typingRef, {
          timestamp: serverTimestamp(),
          userName: currentUserProfile?.displayName || currentUser.displayName || "مستخدم"
        });
      } else {
        await deleteDoc(typingRef);
      }
    } catch (e) {
      console.warn("Error updating typing status:", e);
    }
  };

  useEffect(() => {
    if (!isInputFocused || !chatId || !currentUser) {
      updateTypingStatus(false);
      return;
    }

    // Set typing to true initially
    updateTypingStatus(true);

    // Periodically update the timestamp while focused
    const interval = setInterval(() => {
      updateTypingStatus(true);
    }, 3500);

    return () => {
      clearInterval(interval);
      updateTypingStatus(false);
    };
  }, [isInputFocused, chatId, currentUser]);

  const statusText = () => {
    if (typingUsers.length > 0) {
      if (typingUsers.length === 1) return `📝 ${typingUsers[0]} يكتب...`;
      return "📝 عدة أشخاص يكتبون...";
    }
    if (activeCall) return "📞 مكالمة نشطة";
    if (chat?.type === 'saved') return "رسائل مخزنة";
    if (chat?.type === 'private' || chat?.type === 'direct') {
      if (isOnline(chat?.otherUser?.lastSeen)) {
        return "متصل الآن";
      }
      if (!chat?.otherUser?.lastSeen) return "عبر TruCast";
      return `نشط ${formatPostDate(chat.otherUser.lastSeen)}`;
    }
    if (chat?.type === 'group') {
      return `${chat.participants?.length || 0} عضو`;
    }
    return "قناة عامة";
  };

  const canSend = chat?.type !== 'channel' || chat?.admins?.includes(currentUser?.uid || "");
  const isAdminOrOwner = chat?.admins?.includes(currentUser?.uid || "") || chat?.creatorId === currentUser?.uid;

  // Sub-screens components
  const ReactionsScreen = () => {
    const emojis = ["👍", "❤️", "🔥", "🥰", "👏", "😁", "🤔", "🤯", "😱", "🤬", "🎉", "🤩", "🙏"];
    const [mode, setMode] = useState<'all' | 'some' | 'none'>(chat?.reactionSettings?.mode || 'all');
    const [enabledEmojis, setEnabledEmojis] = useState<string[]>(chat?.reactionSettings?.enabledReactions || emojis.slice(0, 8));
    const [saving, setSaving] = useState(false);

    const toggleEmoji = (emoji: string) => {
      setEnabledEmojis(prev => 
        prev.includes(emoji) ? prev.filter(e => e !== emoji) : [...prev, emoji]
      );
    };

    const handleSave = async () => {
      if (!chatId) return;
      setSaving(true);
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          reactionSettings: {
            mode,
            enabledReactions: enabledEmojis
          },
          updatedAt: serverTimestamp()
        });
        setActiveSettingsTab('main-management');
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setActiveSettingsTab('main-management')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-black">التفاعلات</h2>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          </button>
        </div>
        <div className="p-6 space-y-8 overflow-y-auto">
          <div className="bg-zinc-900/50 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">نمط التفاعلات</h3>
            {[
              { id: 'all', label: 'كل التفاعلات', icon: '✨', desc: 'السماح بجميع الرموز التعبيرية' },
              { id: 'some', label: 'بعض التفاعلات', icon: '🌗', desc: 'السماح برموز مختارة فقط' },
              { id: 'none', label: 'إيقاف التفاعلات', icon: '🚫', desc: 'لا يسمح بالتفاعل على الرسائل' }
            ].map(opt => (
              <label 
                key={opt.id} 
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${mode === opt.id ? 'bg-blue-600/10 border-blue-600/30' : 'bg-zinc-950 border-transparent hover:bg-zinc-900/50'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl p-2 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl">{opt.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{opt.label}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{opt.desc}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${mode === opt.id ? 'border-blue-500 bg-blue-500' : 'border-zinc-700'}`}>
                  {mode === opt.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <input 
                  type="radio" 
                  name="reactions" 
                  checked={mode === opt.id}
                  onChange={() => setMode(opt.id as any)}
                  className="hidden" 
                />
              </label>
            ))}
          </div>
          
          <AnimatePresence>
            {mode === 'some' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-4"
              >
                <h3 className="text-xs font-black text-zinc-500 uppercase px-4 tracking-widest">تخصيص الرموز</h3>
                <div className="bg-zinc-900/50 rounded-2xl p-3 grid grid-cols-4 gap-3 shadow-inner">
                  {emojis.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => toggleEmoji(emoji)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all relative border-2 ${
                        enabledEmojis.includes(emoji) 
                          ? 'bg-blue-600/10 border-blue-600 text-white scale-105 shadow-xl shadow-blue-900/20' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <span className="text-2xl">{emoji}</span>
                      {enabledEmojis.includes(emoji) && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5"><Check className="w-2.5 h-2.5 text-white" /></div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const PermissionsScreen = () => {
    const [mediaExpanded, setMediaExpanded] = useState(false);
    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setActiveSettingsTab('main-management')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-black">الصلاحيات</h2>
          <button 
            onClick={() => setActiveSettingsTab('main-management')}
            className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="bg-zinc-900/50 rounded-2xl p-2 space-y-1">
            {[
              { label: 'إرسال رسائل نصية', icon: <MessageSquare className="w-5 h-5 text-blue-500" /> },
              { label: 'إضافة مستخدمين', icon: <UserPlus className="w-5 h-5 text-emerald-500" /> },
              { label: 'تثبيت الرسائل', icon: <PlusSquare className="w-5 h-5 text-amber-500" /> },
              { label: 'تغيير معلومات المحادثة', icon: <Info className="w-5 h-5 text-purple-500" /> },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 active:bg-zinc-800 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  {p.icon}
                  <span className="font-bold text-sm">{p.label}</span>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" /></div>
              </div>
            ))}
            
            <div className="h-px bg-zinc-800/50 mx-4 my-1" />
            
            <div className="space-y-1">
              <button 
                onClick={() => setMediaExpanded(!mediaExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-sm">إرسال الوسائط</span>
                </div>
                {mediaExpanded ? <ChevronUp className="w-5 h-5 text-zinc-600" /> : <ChevronDown className="w-5 h-5 text-zinc-600" />}
              </button>
              <AnimatePresence>
                {mediaExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-zinc-900/20 rounded-xl px-4"
                  >
                    {['الصور', 'المقاطع المرئية', 'الملفات', 'الموسيقى'].map(m => (
                      <div key={m} className="flex items-center justify-between py-3 border-t border-zinc-800/50 first:border-0">
                        <span className="text-sm font-medium text-zinc-400">{m}</span>
                        <div className="w-10 h-5 bg-blue-600 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" /></div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 font-bold px-4 leading-relaxed">
            هذه الصلاحيات تنطبق على جميع أعضاء المجموعة الافتراضييين، يمكنك تخصيص صلاحيات المشرفين بشكل منفصل.
          </p>
        </div>
      </div>
    );
  };

  const AdminsScreen = () => (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => setActiveSettingsTab('main-management')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
          <ArrowRight className="w-6 h-6 rtl:rotate-180" />
        </button>
        <h2 className="text-lg font-black">المشرفون</h2>
        <button 
          onClick={() => setActiveSettingsTab('main-management')}
          className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between bg-zinc-900/50 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Shield className="w-6 h-6 text-blue-500" /></div>
            <div>
              <h3 className="font-bold">المكافح العنيف للإزعاج</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">تحقق ذكي لحماية المجموعة</p>
            </div>
          </div>
          <div className="w-10 h-5 bg-zinc-800 rounded-full relative"><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" /></div>
        </div>

        <button className="w-full flex items-center gap-4 p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500/20 transition-all font-black group">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform"><UserPlus className="w-6 h-6" /></div>
          <span>إضافة مشرف</span>
        </button>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-zinc-500 uppercase px-4">المشرفون الحاليون</h3>
          <div className="bg-zinc-900/50 rounded-2xl p-2 space-y-1">
            {chat?.admins?.map(adminId => (
              <button 
                key={adminId}
                onClick={() => { setSelectedAdminId(adminId); setActiveSettingsTab('admin-rights'); }}
                className="w-full flex items-center gap-4 p-3 hover:bg-zinc-800/40 rounded-xl transition-all group relative"
              >
                <div className="w-11 h-11 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 border border-zinc-700 shadow-inner">
                  <img src={`https://ui-avatars.com/api/?name=${adminId}&background=random`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-right">
                  <h4 className="font-bold text-sm">{adminId === currentUser?.uid ? 'أنت' : 'مشرف'}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">بواسطة المالك</p>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const AdminRightsScreen = () => (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => setActiveSettingsTab('admins')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
          <ArrowRight className="w-6 h-6 rtl:rotate-180" />
        </button>
        <h2 className="text-lg font-black">صلاحيات المشرف</h2>
        <button 
          onClick={() => setActiveSettingsTab('admins')}
          className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="flex flex-col items-center gap-4">
          <div 
            onClick={() => { if (selectedAdminId) onNavigateToUser(selectedAdminId); }}
            className="w-24 h-24 bg-zinc-800 rounded-full overflow-hidden border-4 border-zinc-900 shadow-2xl cursor-pointer hover:border-blue-500 transition-all"
          >
            <img src={`https://ui-avatars.com/api/?name=${selectedAdminId}&background=random`} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black">{selectedAdminId === currentUser?.uid ? 'أنت' : 'مشرف'}</h3>
            <button 
              onClick={() => { if (selectedAdminId) onNavigateToUser(selectedAdminId); }}
              className="mt-1 text-blue-500 text-xs font-black hover:underline"
            >
              عرض الملف الشخصي
            </button>
            <p className="text-zinc-500 text-sm font-bold mt-2">نشط مؤخراً</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-2xl p-2 space-y-1">
          {[
            { label: 'تغيير معلومات المجموعة', icon: <Pen className="w-4 h-4 text-blue-500" /> },
            isAdminOrOwner && !activeCall && { label: 'بدء مكالمة جماعية', icon: <PhoneCall className="w-4 h-4 text-emerald-500" />, onClick: startCall },
            { label: 'حذف الرسائل', icon: <Trash2 className="w-4 h-4 text-red-500" /> },
            { label: 'حظر المستخدمين', icon: <ShieldAlert className="w-4 h-4 text-amber-500" /> },
            { label: 'دعوة عبر الرابط', icon: <Link className="w-4 h-4 text-emerald-500" /> },
            { label: 'إضافة مشرفين جدد', icon: <ShieldCheck className="w-4 h-4 text-purple-500" /> },
          ].filter(Boolean).map((r: any, i) => (
            <div key={i} onClick={r.onClick} className="flex items-center justify-between p-4 active:bg-zinc-800 rounded-xl transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                {r.icon}
                <span className={`font-bold text-sm ${r.onClick ? 'text-zinc-100' : ''}`}>{r.label}</span>
              </div>
              {r.onClick ? (
                <ChevronLeft className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500" />
              ) : (
                <div className="w-10 h-5 bg-blue-600 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" /></div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3 px-2">
          <h3 className="text-xs font-black text-zinc-500 uppercase px-2">رتبة المشرف</h3>
          <input 
            type="text" 
            placeholder="وسم العضو (مثال: مؤسس)" 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-all placeholder:text-zinc-700"
          />
          <p className="text-[10px] text-zinc-600 font-bold px-2">هذا الوسم سيظهر بجانب اسم المشرف في الرسائل.</p>
        </div>

        <button className="w-full py-4 text-red-500 font-black bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all border border-red-500/10 mt-8 mb-4">
          عزل المشرف
        </button>
      </div>
    </div>
  );

  const AddMembersModal = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
      const fetchInitialUsers = async () => {
        setSearching(true);
        try {
          const q = query(collection(db, 'users'), limit(20));
          const snap = await getDocs(q);
          setAvailableUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        } catch (e) {
          console.error(e);
        } finally {
          setSearching(false);
        }
      };
      fetchInitialUsers();
    }, []);

    const handleAdd = async (userId: string) => {
      if (!chatId) return;
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          participants: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `chats/${chatId}`);
      }
    };

    const filtered = availableUsers.filter(u => 
      !chat?.participants?.includes(u.uid) && 
      (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <AnimatePresence>
        {isAddMembersModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white">إضافة أعضاء</h3>
                  <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-tighter">اختر المستخدمين لإضافتهم لمجموعتك</p>
                </div>
                <button onClick={() => setIsAddMembersModalOpen(false)} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-zinc-400 transition-all active:scale-90">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 bg-zinc-900/50">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن اسم أو اسم مستخدم..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pr-11 pl-4 text-white text-sm font-bold outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {searching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-xs font-bold text-zinc-600">جاري البحث...</p>
                  </div>
                ) : filtered.length > 0 ? (
                  filtered.map(user => (
                    <div key={user?.uid} className="flex items-center justify-between p-3.5 hover:bg-zinc-800/50 rounded-2xl transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                            className="w-12 h-12 rounded-full object-cover border border-zinc-800 shadow-lg" 
                            alt="" 
                          />
                          <div className={`absolute bottom-0 left-0 w-3 h-3 border-2 border-zinc-900 rounded-full ${isOnline(user.lastSeen) ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{user.displayName}</p>
                          <p className="text-[10px] text-zinc-500 font-bold">@{user.username || user?.uid.slice(0, 8)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAdd(user?.uid)}
                        className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-zinc-800/50 rounded-3xl mx-auto flex items-center justify-center text-zinc-600">
                      <Users className="w-8 h-8" />
                    </div>
                    <p className="text-zinc-500 font-bold text-xs">لا يوجد مستخدمون متاحون للقائمة</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                <button 
                  onClick={() => setIsAddMembersModalOpen(false)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-2xl transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const MembersScreen = () => (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => setActiveSettingsTab('main-management')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
          <ArrowRight className="w-6 h-6 rtl:rotate-180" />
        </button>
        <h2 className="text-lg font-black">الأعضاء</h2>
        <button 
          onClick={() => setActiveSettingsTab('main-management')}
          className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        <div className="flex items-center justify-between bg-zinc-900/50 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg"><User className="w-6 h-6 text-purple-500" /></div>
            <h3 className="font-bold">إخفاء الأعضاء</h3>
          </div>
          <div className="w-10 h-5 bg-zinc-800 rounded-full relative"><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-lg" /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setIsAddMembersModalOpen(true)}
            className="flex items-center justify-center gap-2 p-4 bg-blue-600 rounded-2xl text-white font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            إضافة أعضاء
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 font-bold hover:bg-zinc-800 transition-all">
            <Link className="w-5 h-5" />
            دعوة برابط
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black text-zinc-500 uppercase">{chat?.participants?.length || 0} عضو</h3>
            <Search className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="bg-zinc-900/50 rounded-2xl p-2 space-y-1">
            {chat?.participants?.map(userId => (
              <div 
                key={userId} 
                onClick={() => onNavigateToUser(userId)}
                className="w-full flex items-center gap-4 p-3 hover:bg-zinc-800/40 rounded-xl transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 shadow-inner">
                  <img src={`https://ui-avatars.com/api/?name=${userId}&background=random`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-right">
                  <h4 className="font-bold text-sm bg-blue-500/0 group-hover:text-blue-400 transition-colors">{userId === currentUser?.uid ? 'أنت' : 'مستخدم TruCast'}</h4>
                  <p className="text-[10px] text-emerald-500 font-bold mt-0.5">متصل الآن</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); /* show more menu */ }}
                  className="p-2 text-zinc-600 hover:text-white rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const StatisticsScreen = () => {
    const statsData = [
      { name: '1', value: 120 },
      { name: '2', value: 450 },
      { name: '3', value: 300 },
      { name: '4', value: 800 },
      { name: '5', value: 650 },
      { name: '6', value: 1200 },
      { name: '7', value: 950 },
    ];

    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setActiveSettingsTab('main-management')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-black">الإحصائيات</h2>
          <button 
            onClick={() => setActiveSettingsTab('main-management')}
            className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-8 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'الأعضاء', value: chat?.participants?.length || 0, trend: '+5.2%', positive: true },
              { label: 'الرسائل', value: '4.2k', trend: '+12.4%', positive: true },
              { label: 'مشاهدات', value: '18k', trend: '-2.1%', positive: false },
              { label: 'تفاعل', value: '850', trend: '+0.8%', positive: true },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${s.positive ? 'from-emerald-500/10' : 'from-red-500/10'} to-transparent blur-2xl opacity-50`} />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-white">{s.value}</h3>
                  <span className={`text-[11px] font-black ${s.positive ? 'text-emerald-500' : 'text-red-500'}`}>{s.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-blue-500 uppercase">نمو القناة</h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="w-2 h-2 rounded-full bg-zinc-800" />
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-sm font-black text-zinc-300 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              تحليل النشاط اليومي
            </h3>
            <div className="space-y-4">
              {[
                { label: 'أعلى وقت للنشاط', val: '8:00 PM - 10:00 PM', color: 'bg-indigo-500' },
                { label: 'أكثر المواضيع تداولاً', val: 'تحديثات التطبيق، دردشة عامة', color: 'bg-rose-500' },
                { label: 'معدل التفاعل للأعضاء', val: '76%', color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-bold text-zinc-500">{item.label}</span>
                     <span className="text-xs font-black text-zinc-200">{item.val}</span>
                   </div>
                   <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} w-3/4`} />
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

    const ManagementScreen = () => {
      const [antiSpam, setAntiSpam] = useState(true);
      const [hideParticipants, setHideParticipants] = useState(false);
      const [uploading, setUploading] = useState(false);
      const [previewUrl, setPreviewUrl] = useState<string | null>(null);
      const [zoom, setZoom] = useState(chat?.avatarZoom || 1);
      const [panX, setPanX] = useState(chat?.avatarPanX || 0);
      const [panY, setPanY] = useState(chat?.avatarPanY || 0);
      const [selectedFilter, setSelectedFilter] = useState(chat?.avatarFilter || 'none');
      const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [historyState, setHistoryState] = useState<{
      list: Array<{ zoom: number; panX: number; panY: number; filter: string }>;
      index: number;
    }>({
      list: [{ zoom: chat?.avatarZoom || 1, panX: chat?.avatarPanX || 0, panY: chat?.avatarPanY || 0, filter: chat?.avatarFilter || 'none' }],
      index: 0
    });

    const statesRef = useRef({ zoom, panX, panY, selectedFilter });
    useEffect(() => {
      statesRef.current = { zoom, panX, panY, selectedFilter };
    }, [zoom, panX, panY, selectedFilter]);

    const dragCoordsRef = useRef({ panX: chat?.avatarPanX || 0, panY: chat?.avatarPanY || 0 });

    const commitStateToHistory = (z?: number, px?: number, py?: number, f?: string) => {
      const curZ = z !== undefined ? z : statesRef.current.zoom;
      const curX = px !== undefined ? px : statesRef.current.panX;
      const curY = py !== undefined ? py : statesRef.current.panY;
      const curF = f !== undefined ? f : statesRef.current.selectedFilter;

      setHistoryState(prev => {
        const sliced = prev.list.slice(0, prev.index + 1);
        const last = sliced[sliced.length - 1];
        if (last && last.zoom === curZ && last.panX === curX && last.panY === curY && last.filter === curF) {
          return prev;
        }
        return {
          list: [...sliced, { zoom: curZ, panX: curX, panY: curY, filter: curF }],
          index: sliced.length
        };
      });
    };

    const handleUndo = () => {
      if (historyState.index > 0) {
        const newIndex = historyState.index - 1;
        const stateVal = historyState.list[newIndex];
        setZoom(stateVal.zoom);
        setPanX(stateVal.panX);
        setPanY(stateVal.panY);
        setSelectedFilter(stateVal.filter);
        dragCoordsRef.current = { panX: stateVal.panX, panY: stateVal.panY };
        setHistoryState(h => ({ ...h, index: newIndex }));
      }
    };

    const handleRedo = () => {
      if (historyState.index < historyState.list.length - 1) {
        const newIndex = historyState.index + 1;
        const stateVal = historyState.list[newIndex];
        setZoom(stateVal.zoom);
        setPanX(stateVal.panX);
        setPanY(stateVal.panY);
        setSelectedFilter(stateVal.filter);
        dragCoordsRef.current = { panX: stateVal.panX, panY: stateVal.panY };
        setHistoryState(h => ({ ...h, index: newIndex }));
      }
    };

    const handleStart = (clientX: number, clientY: number) => {
      setIsDragging(true);
      setDragStart({ x: clientX, y: clientY });
      setPanStart({ x: panX, y: panY });
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - dragStart.x;
      const dy = clientY - dragStart.y;
      const nextX = panStart.x + dx;
      const nextY = panStart.y + dy;
      setPanX(nextX);
      setPanY(nextY);
      dragCoordsRef.current = { panX: nextX, panY: nextY };
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    const onMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.stopPropagation();
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUpOrLeave = (e: React.MouseEvent) => {
      if (isDragging) {
        e.stopPropagation();
        handleEnd();
        commitStateToHistory(statesRef.current.zoom, dragCoordsRef.current.panX, dragCoordsRef.current.panY, statesRef.current.selectedFilter);
      }
    };

    const onTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      if (e.touches[0]) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return;
      e.stopPropagation();
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = (e: React.TouchEvent) => {
      if (isDragging) {
        e.stopPropagation();
        handleEnd();
        commitStateToHistory(statesRef.current.zoom, dragCoordsRef.current.panX, dragCoordsRef.current.panY, statesRef.current.selectedFilter);
      }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !chatId) return;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setSelectedFilter('none');
      dragCoordsRef.current = { panX: 0, panY: 0 };
      setHistoryState({
        list: [{ zoom: 1, panX: 0, panY: 0, filter: 'none' }],
        index: 0
      });

      setUploading(true);
      try {
        const downloadURL = await uploadToCloudinarySigned(file);
        await updateDoc(doc(db, 'chats', chatId), { 
          avatarUrl: downloadURL,
          updatedAt: serverTimestamp()
        });
        setUploading(false);
      } catch (error) {
        console.error("Error updating avatar:", error);
        alert("فشل تحديث الصورة");
        setUploading(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-zinc-950 text-white">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleAvatarChange} 
        />
        {/* Custom Telegram Edit Header */}
        <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <button 
            onClick={() => {
              if (chat?.name !== editName || chat?.description !== editBio) {
                if (confirm("هل تريد تجاهل التغييرات؟")) setActiveSettingsTab(null);
              } else {
                setActiveSettingsTab(null);
              }
            }} 
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 active:scale-90"
          >
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-black">تعديل</h2>
          <button 
            onClick={async () => {
              if (!chatId) return;
              try {
                await updateDoc(doc(db, 'chats', chatId), {
                  name: editName,
                  description: editBio,
                  avatarZoom: zoom,
                  avatarPanX: panX,
                  avatarPanY: panY,
                  avatarFilter: selectedFilter,
                  updatedAt: serverTimestamp()
                });
                setActiveSettingsTab(null);
              } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`);
              }
            }}
            className="p-2 hover:bg-blue-500/10 rounded-full transition-all text-blue-500 active:scale-90"
          >
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-8 px-6 space-y-10">
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-6">
            <div 
              className="relative group cursor-pointer w-32 h-32 rounded-[44px] overflow-hidden bg-zinc-900 border border-zinc-800" 
              onClick={() => {
                if (!previewUrl && !chat?.avatarUrl) {
                  fileInputRef.current?.click();
                }
              }}
            >
              {previewUrl || chat?.avatarUrl ? (
                <div 
                  className="w-full h-full select-none relative"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUpOrLeave}
                  onMouseLeave={onMouseUpOrLeave}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  <img 
                    src={previewUrl || chat?.avatarUrl || ''} 
                    alt="Preview" 
                    className="w-full h-full object-cover pointer-events-none" 
                    style={{ 
                      transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                      transformOrigin: 'center center',
                      filter: FILTER_MAP[selectedFilter] || 'none',
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-white text-5xl font-black shadow-2xl transition-transform group-hover:scale-105 duration-500 ${chat?.type === 'group' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                  {chat?.type === 'group' ? <Users className="w-16 h-16" /> : <Bell className="w-16 h-16" />}
                </div>
              )}
              {uploading ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-20">
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                </div>
              ) : (
                <div 
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl border-4 border-zinc-950 group-hover:bg-blue-500 transition-colors overflow-hidden z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {(previewUrl || chat?.avatarUrl) && (
                    <img
                      src={previewUrl || chat?.avatarUrl || ''}
                      alt="Avatar Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ 
                        transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                        transformOrigin: 'center center',
                        filter: FILTER_MAP[selectedFilter] || 'none'
                      }}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <Camera id="avatar_camera_icon" className="w-5 h-5 text-white z-10" />
                </div>
              )}
            </div>

            {(previewUrl || chat?.avatarUrl) && (
              <div className="flex flex-col gap-4 w-full max-w-[270px] animate-fadeIn bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800">
                <div className="flex flex-col gap-1 w-full text-right mb-1">
                  <span className="text-xs text-zinc-400 font-bold px-1 mb-1">فلتر ومحسنات الصورة:</span>
                  <select
                    value={selectedFilter}
                    onChange={(e) => {
                      e.stopPropagation();
                      const val = e.target.value;
                      setSelectedFilter(val);
                      commitStateToHistory(undefined, undefined, undefined, val);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-zinc-950 border border-zinc-800 text-xs rounded-2xl p-2.5 text-zinc-300 font-bold focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="none">✨ طبيعي (بدون فلتر)</option>
                    <option value="grayscale">🖤 أبيض وأسود (Grayscale)</option>
                    <option value="sepia">⏳ سيبيا دافئ (Sepia)</option>
                    <option value="brightness">☀️ سطوع معزز (Brightness)</option>
                    <option value="warm">🍁 فلتر دافئ (Warm)</option>
                    <option value="cool">❄️ فلتر بارد (Cool)</option>
                    <option value="contrast">🎯 تباين عالٍ (Contrast)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between w-full text-xs text-zinc-400 font-bold px-1">
                    <span>تكبير الصورة:</span>
                    <span className="font-mono text-blue-400">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3 w-full bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextZoom = Math.max(1, zoom - 0.2);
                        setZoom(nextZoom);
                        commitStateToHistory(nextZoom, undefined, undefined, undefined);
                      }} 
                      className="p-1 px-2.5 bg-zinc-950 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all text-xs font-black active:scale-95"
                      title="تصغير"
                    >
                      -
                    </button>
                    <input 
                      type="range"
                      min="1"
                      max="4"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => {
                        e.stopPropagation();
                        setZoom(parseFloat(e.target.value));
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        commitStateToHistory(parseFloat((e.target as HTMLInputElement).value), undefined, undefined, undefined);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        commitStateToHistory(zoom, undefined, undefined, undefined);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextZoom = Math.min(4, zoom + 0.2);
                        setZoom(nextZoom);
                        commitStateToHistory(nextZoom, undefined, undefined, undefined);
                      }} 
                      className="p-1 px-2.5 bg-zinc-950 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all text-xs font-black active:scale-95"
                      title="تكبير"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Undo / Redo Row Controls */}
                <div className="grid grid-cols-2 gap-2 w-full pt-1 border-t border-zinc-800/60">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUndo();
                    }}
                    disabled={historyState.index <= 0}
                    className={`flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 px-3 rounded-2xl transition-all border ${
                      historyState.index > 0
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-95'
                        : 'bg-zinc-950/10 border-zinc-950/30 text-zinc-600 cursor-not-allowed'
                    }`}
                    title="تراجع"
                  >
                    <Undo className="w-3.5 h-3.5" />
                    <span>تراجع</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRedo();
                    }}
                    disabled={historyState.index >= historyState.list.length - 1}
                    className={`flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 px-3 rounded-2xl transition-all border ${
                      historyState.index < historyState.list.length - 1
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:text-white cursor-pointer active:scale-95'
                        : 'bg-zinc-950/10 border-zinc-950/30 text-zinc-600 cursor-not-allowed'
                    }`}
                    title="إعادة"
                  >
                    <Redo className="w-3.5 h-3.5" />
                    <span>إعادة</span>
                  </button>
                </div>

                <div className="flex gap-2 w-full justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      setSelectedFilter('none');
                      dragCoordsRef.current = { panX: 0, panY: 0 };
                      commitStateToHistory(1, 0, 0, 'none');
                    }}
                    className="text-[10px] text-zinc-300 hover:text-white bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-2xl transition-all active:scale-95 font-bold flex-1"
                  >
                    إعادة الضبط
                  </button>
                  {previewUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(null);
                        setZoom(chat?.avatarZoom || 1);
                        setPanX(chat?.avatarPanX || 0);
                        setPanY(chat?.avatarPanY || 0);
                        setSelectedFilter(chat?.avatarFilter || 'none');
                        dragCoordsRef.current = { panX: chat?.avatarPanX || 0, panY: chat?.avatarPanY || 0 };
                        setHistoryState({
                          list: [{ zoom: chat?.avatarZoom || 1, panX: chat?.avatarPanX || 0, panY: chat?.avatarPanY || 0, filter: chat?.avatarFilter || 'none' }],
                          index: 0
                        });
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-2xl transition-all active:scale-95 font-bold flex-1"
                    >
                      إلغاء المعاينة
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="w-full space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-4">اسم {chat?.type === 'group' ? 'المجموعة' : 'القناة'}</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="أدخل الاسم هنا..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-blue-500/50 transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-4">الوصف</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="اكتب وصفاً مختصراً..."
                  rows={3}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-medium outline-none focus:border-blue-500/50 transition-all shadow-inner resize-none text-sm leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">الإعدادات المتقدمة</h3>
            <div className="bg-zinc-900/30 rounded-[32px] p-2 border border-zinc-900 overflow-hidden shadow-xl">
              {[
                { id: 'reactions', label: 'التفاعلات', icon: <Smile className="w-5 h-5 text-pink-500" /> },
                { id: 'permissions', label: 'الصلاحيات', icon: <Key className="w-5 h-5 text-amber-500" />, suffix: <span className="text-xs font-bold text-zinc-500">2/13</span> },
                { id: 'admins', label: 'المشرفون', icon: <ShieldCheck className="w-5 h-5 text-blue-500" />, suffix: <span className="text-xs font-bold text-zinc-500">{chat?.admins?.length || 0}</span> },
                { id: 'members', label: 'الأعضاء', icon: <Users className="w-5 h-5 text-indigo-500" />, suffix: <span className="text-xs font-bold text-zinc-500">{chat?.participants?.length || 0}</span> },
                { id: 'statistics', label: 'الإحصائيات', icon: <BarChart2 className="w-5 h-5 text-emerald-500" /> },
                { id: 'appearance', label: 'المظهر', icon: <Sparkles className="w-5 h-5 text-purple-500" />, badge: 'NEW' },
              ].map((item, idx) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveSettingsTab(item.id)}
                  className={`w-full flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-all group ${idx !== 5 ? 'border-b border-zinc-800/50' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-zinc-900 rounded-2xl group-hover:bg-zinc-800 transition-colors shadow-lg">
                      {item.icon}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-sm text-zinc-200">{item.label}</span>
                       {item.badge && (
                         <span className="bg-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-md text-white animate-pulse">
                           {item.badge}
                         </span>
                       )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.suffix}
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-colors rtl:rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">الأمان والخصوصية</h3>
            <div className="bg-zinc-900/30 rounded-[32px] p-2 border border-zinc-900 shadow-xl divide-y divide-zinc-800/50">
              <div className="flex items-center justify-between p-4 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-zinc-900 rounded-2xl shadow-lg">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-200">المكافح العنيف للإزعاج</span>
                    <span className="text-[10px] text-zinc-600 font-bold">تصفية تلقائية متقدمة</span>
                  </div>
                </div>
                <button 
                  onClick={() => setAntiSpam(!antiSpam)}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${antiSpam ? 'bg-blue-600' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${antiSpam ? 'right-6' : 'right-1 shadow-md'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-zinc-900 rounded-2xl shadow-lg">
                    <Eye className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-200">إخفاء الأعضاء</span>
                    <span className="text-[10px] text-zinc-600 font-bold">فقط المشرفون يمكنهم رؤية القائمة</span>
                  </div>
                </div>
                <button 
                  onClick={() => setHideParticipants(!hideParticipants)}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${hideParticipants ? 'bg-blue-600' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${hideParticipants ? 'right-6' : 'right-1 shadow-md'}`} />
                </button>
              </div>
            </div>
          </div>

          <button className="w-full mt-4 flex items-center justify-center gap-3 p-5 text-red-500 font-black bg-red-500/5 hover:bg-red-500/10 rounded-3xl transition-all border border-red-500/10 shadow-lg active:scale-95 group">
            <Trash2 className="w-5 h-5 group-hover:animate-bounce" />
            حذف ومغادرة {chat?.type === 'group' ? 'المجموعة' : 'القناة'}
          </button>
        </div>
      </div>
    );
  };

  const DisappearingMessagesScreen = () => {
    const options = [
      { label: 'إيقاف', value: 0 },
      { label: '5 ثواني', value: 5 },
      { label: '10 ثواني', value: 10 },
      { label: '30 ثانية', value: 30 },
      { label: 'دقيقة واحدة', value: 60 },
      { label: 'ساعة واحدة', value: 3600 },
      { label: 'يوم واحد', value: 86400 },
    ];

    const [updating, setUpdating] = useState<number | null>(null);

    const handleUpdateTimer = async (val: number) => {
      if (!chatId || !currentUser) return;
      setUpdating(val);
      try {
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, { disappearingTimer: val });
        setActiveSettingsTab(null);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `chats/${chatId}`);
      } finally {
        setUpdating(null);
      }
    };

    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setActiveSettingsTab(null)} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-black">ذاتي الاختفاء</h2>
          <button 
            onClick={() => setActiveSettingsTab(null)}
            className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-8 overflow-y-auto">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
             <div className="w-24 h-24 bg-blue-500/10 rounded-[32px] flex items-center justify-center text-blue-500 shadow-2xl">
               <Hourglass className="w-12 h-12" />
             </div>
             <div>
               <h3 className="text-xl font-black">مؤقت التدمير الذاتي</h3>
               <p className="text-xs text-zinc-500 font-bold mt-2 leading-relaxed px-4">
                 سيتم حذف الرسائل الجديدة تلقائياً للجميع بعد قراءتها بالمدة المحددة.
               </p>
             </div>
          </div>

          <div className="bg-zinc-900/30 rounded-[32px] p-2 border border-zinc-900 divide-y divide-zinc-800/50">
            {options.map(opt => (
              <button 
                key={opt.value}
                onClick={() => handleUpdateTimer(opt.value)}
                disabled={updating !== null}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/40 first:rounded-t-[24px] last:rounded-b-[24px] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full transition-colors ${chat?.disappearingTimer === opt.value ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`} />
                  <span className={`font-bold transition-colors ${chat?.disappearingTimer === opt.value ? 'text-blue-500' : 'text-zinc-300'}`}>{opt.label}</span>
                </div>
                {updating === opt.value ? <Loader2 className="w-4 h-4 animate-spin text-zinc-600" /> : chat?.disappearingTimer === opt.value && <Check className="w-5 h-5 text-blue-500" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());

  const DisappearingTimer = ({ msg }: { msg: Message }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
      if (!msg.disappearingTimer || !msg.readAt) return;
      
      const readAtDate = msg.readAt.toDate();
      const expiryDate = new Date(readAtDate.getTime() + msg.disappearingTimer * 1000);
      
      const update = () => {
        const now = new Date();
        const diff = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
        setTimeLeft(diff);
        if (diff <= 0) {
          setHiddenMessageIds(prev => {
            const next = new Set(prev);
            next.add(msg.id);
            return next;
          });
          // Hard delete from Firestore after local expiry
          deleteDoc(doc(db, 'chats', chatId, 'messages', msg.id)).catch(() => {
            // Might fail if another participant already deleted it, which is fine
          });
        }
      };

      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }, [msg]);

    if (timeLeft === null || timeLeft <= 0) return null;

    return (
      <div className="flex items-center gap-1 mt-1 text-[9px] font-black opacity-80 bg-black/20 rounded-full px-2 py-0.5">
        <Hourglass className="w-2.5 h-2.5 animate-spin duration-[3000ms]" />
        <span>يختفي في {timeLeft}ث</span>
      </div>
    );
  };

  const isMessageExpired = (msg: Message) => {
    if (hiddenMessageIds.has(msg.id)) return true;
    if (!msg.disappearingTimer || !msg.readAt) return false;
    const expiryTime = msg.readAt.toDate().getTime() + msg.disappearingTimer * 1000;
    return new Date().getTime() > expiryTime;
  };

  const AppearanceScreen = () => {
    const colors = [
      { name: 'Default', value: 'from-blue-600 to-indigo-600', text: 'text-blue-500' },
      { name: 'Rose', value: 'from-rose-500 to-pink-500', text: 'text-rose-500' },
      { name: 'Emerald', value: 'from-emerald-500 to-teal-500', text: 'text-emerald-500' },
      { name: 'Amber', value: 'from-amber-400 to-orange-500', text: 'text-amber-500' },
      { name: 'Purple', value: 'from-purple-500 to-violet-600', text: 'text-purple-500' },
      { name: 'Cyan', value: 'from-cyan-400 to-blue-500', text: 'text-cyan-500' },
    ];

    const backgrounds = [
      { name: 'None', url: '' },
      { name: 'Cubes', url: 'https://www.transparenttextures.com/patterns/cubes.png' },
      { name: 'Dots', url: 'https://www.transparenttextures.com/patterns/60-lines.png' },
      { name: 'Carbon', url: 'https://www.transparenttextures.com/patterns/carbon-fibre.png' },
      { name: 'Stars', url: 'https://www.transparenttextures.com/patterns/stardust.png' },
      { name: 'Paper', url: 'https://www.transparenttextures.com/patterns/exclusive-paper.png' },
    ];

    const handleUpdateTheme = async (color: string) => {
      if (!chatId) return;
      try {
        await updateDoc(doc(db, 'chats', chatId), { themeColor: color });
      } catch (e) {
        console.error(e);
      }
    };

    const handleUpdateBackground = async (url: string) => {
      if (!chatId) return;
      try {
        await updateDoc(doc(db, 'chats', chatId), { backgroundUrl: url });
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <div className="flex flex-col h-full bg-zinc-950">
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setActiveSettingsTab('main-management')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-black">المظهر والتصميم</h2>
          <button 
            onClick={() => setActiveSettingsTab('main-management')}
            className="p-2 hover:bg-blue-500/10 rounded-full text-blue-500 transition-all active:scale-90"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-10 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-blue-500 uppercase px-4">ألوان السمة</h3>
            <div className="grid grid-cols-3 gap-3">
              {colors.map(c => (
                <button 
                  key={c.name}
                  onClick={() => handleUpdateTheme(c.value)}
                  className={`h-24 rounded-2xl bg-gradient-to-br ${c.value} border-4 transition-all relative overflow-hidden group active:scale-95 ${chat?.themeColor === c.value ? 'border-white' : 'border-transparent'}`}
                >
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {chat?.themeColor === c.value && (
                    <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-md p-1 rounded-full"><Check className="w-3 h-3 text-white" /></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-blue-500 uppercase px-4">نمط الخلفية</h3>
            <div className="grid grid-cols-2 gap-4">
              { backgrounds.map(bg => (
                <button 
                  key={bg.name}
                  onClick={() => handleUpdateBackground(bg.url)}
                  className={`h-32 rounded-3xl bg-zinc-900 border-2 transition-all p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden group active:scale-95 ${chat?.backgroundUrl === bg.url ? 'border-blue-500' : 'border-zinc-800'}`}
                >
                  {bg.url && (
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${bg.url})` }} />
                  )}
                  <div className={`p-3 rounded-2xl bg-zinc-800 group-hover:bg-zinc-700 transition-colors ${chat?.backgroundUrl === bg.url ? 'text-blue-500' : 'text-zinc-400'}`}>
                    <Palette className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-black ${chat?.backgroundUrl === bg.url ? 'text-blue-500' : 'text-zinc-500'}`}>{bg.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800">
             <h3 className="text-sm font-black mb-4">معاينة الرسالة</h3>
             <div className="flex justify-end">
                <div className={`max-w-[80%] rounded-2xl p-4 bg-gradient-to-br ${chat?.themeColor || 'from-blue-600 to-indigo-600'} text-white shadow-xl`}>
                   <p className="text-sm font-medium">هذه هي طريقة ظهور رسائلك بالتنسيق الجديد!</p>
                   <div className="flex justify-end mt-2 opacity-60 text-[10px] font-bold">10:45 PM</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (activeSettingsTab === 'main-management') return <ManagementScreen />;
  if (activeSettingsTab === 'appearance') return <AppearanceScreen />;
  if (activeSettingsTab === 'disappearing-messages') return <DisappearingMessagesScreen />;
  if (activeSettingsTab === 'reactions') return <ReactionsScreen />;
  if (activeSettingsTab === 'permissions') return <PermissionsScreen />;
  if (activeSettingsTab === 'admins') return <AdminsScreen />;
  if (activeSettingsTab === 'admin-rights') return <AdminRightsScreen />;
  if (activeSettingsTab === 'members') return <><MembersScreen /><AddMembersModal /></>;
  if (activeSettingsTab === 'statistics') return <StatisticsScreen />;

  if (showMediaGallery && chat) {
    const mediaMessages = messages.filter(m => (m.type === 'image' || m.type === 'video') && m.fileUrl && !isMessageExpired(m) && !m.deletedBy?.includes(currentUser?.uid || ""));

    return (
      <div className="flex flex-col h-full bg-zinc-950 text-white animate-in fade-in slide-in-from-left duration-300 z-[110] absolute inset-0">
        <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setShowMediaGallery(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <h3 className="font-black text-base text-zinc-100">الوسائط المشتركة</h3>
          <div className="w-10 h-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {mediaMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
              <ImageIcon className="w-16 h-16 mb-4 opacity-20 text-zinc-500" />
              <p className="font-black text-sm text-zinc-500">لا توجد صور أو مقاطع فيديو مشتركة بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {mediaMessages.map((msg) => {
                const isVideo = msg.type === 'video';
                return (
                  <motion.div 
                    key={msg.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onViewMedia?.(msg.fileUrl!, isVideo ? 'video' : 'image')}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/30 cursor-pointer group shadow-md"
                  >
                    {isVideo ? (
                      <>
                        <video 
                          src={msg.fileUrl} 
                          className="w-full h-full object-cover" 
                          muted 
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition-opacity group-hover:bg-black/20">
                          <Play className="w-8 h-8 text-white/90 drop-shadow-lg" />
                        </div>
                      </>
                    ) : (
                      <img 
                        src={msg.fileUrl} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    )}
                    
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end text-right">
                      <p className="text-[10px] font-black text-white truncate">{msg.senderName || "مستخدم"}</p>
                      <p className="text-[8px] text-zinc-400 font-bold mt-0.5">
                        {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : ""}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showInfo && chat) {
    const mediaMessages = messages.filter(m => (m.type === 'image' || m.type === 'video') && m.fileUrl && !isMessageExpired(m) && !m.deletedBy?.includes(currentUser?.uid || ""));

    return (
      <div className="flex flex-col h-full bg-zinc-950 text-white animate-in fade-in slide-in-from-left duration-300 z-[100] absolute inset-0">
        <div className="p-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
          <button onClick={() => setShowInfo(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            {isAdminOrOwner && (
              <button 
                onClick={() => setActiveSettingsTab('main-management')}
                className="p-2.5 hover:bg-zinc-900 rounded-full transition-colors text-blue-500"
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400">
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in zoom-in-95">
                  <button className="w-full text-right p-3 hover:bg-zinc-800 rounded-xl flex items-center justify-between group transition-colors">
                    <span className="text-sm font-bold text-zinc-300">مشاركة الرابط</span>
                    <Share2 className="w-4 h-4 text-zinc-500" />
                  </button>
                  <div className="h-px bg-zinc-800 my-1" />
                  <button className="w-full text-right p-3 hover:bg-red-500/10 rounded-xl flex items-center justify-between group transition-colors text-red-500">
                    <span className="text-sm font-bold">مغادرة {chat.type === 'channel' ? 'القناة' : 'المجموعة'}</span>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
          <div className="p-8 flex flex-col items-center gap-4 bg-zinc-900/10">
             <div className="relative group">
                {chat?.type === 'saved' ? (
                  <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xl">
                    <Bookmark className="w-16 h-16" />
                  </div>
                ) : (chat?.type === 'private' || chat?.type === 'direct') ? (
                  <img 
                    src={chat?.otherUser?.photoURL || `https://ui-avatars.com/api/?name=${chatId}&background=random`} 
                    className="w-32 h-32 rounded-full border-4 border-zinc-900 shadow-2xl object-cover" 
                    alt="" 
                  />
                ) : (
                  <div className={`w-32 h-32 rounded-[40px] flex items-center justify-center text-white text-5xl font-black shadow-2xl overflow-hidden ${chat?.type === 'group' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                    {chat?.avatarUrl ? (
                      <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" style={getAvatarStyle(chat)} />
                    ) : (
                      chat?.type === 'group' ? <Users className="w-16 h-16" /> : <Bell className="w-16 h-16" />
                    )}
                  </div>
                )}
             </div>
             <div className="text-center">
               <h2 
                 onClick={() => {
                   if ((chat?.type === 'private' || chat?.type === 'direct') && chat.otherUser) {
                     onNavigateToUser(chat.otherUser.uid || chat.participants?.find((p: string) => p !== currentUser?.uid) || "");
                   }
                 }}
                 className={`text-2xl font-black ${(chat?.type === 'private' || chat?.type === 'direct') ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
               >
                 {chat?.type === 'saved' ? 'الرسائل المحفوظة' : (chat?.type === 'private' || chat?.type === 'direct') ? (chat.otherUser?.displayName || "مستخدم") : chat?.name}
               </h2>
               <p className="text-zinc-500 font-medium mt-1">{statusText()}</p>
             </div>
          </div>

          <div className="grid grid-cols-4 gap-2 px-6 py-6 border-b border-zinc-900">
            <button onClick={() => setShowInfo(false)} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg active:scale-90">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 tracking-tighter">مراسلة</span>
            </button>
            {(chat.type === 'group' || chat.type === 'channel') && isAdminOrOwner && (
              <button className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-lg active:scale-90">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-zinc-500 tracking-tighter">مكالمة</span>
              </button>
            )}
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white transition-all shadow-lg active:scale-90">
                <Volume2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 tracking-tighter">كتم</span>
            </button>
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white transition-all shadow-lg active:scale-90">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 tracking-tighter">بحث</span>
            </button>
          </div>

          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">المعلومات</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="text-zinc-500 mt-1"><Info className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-200 leading-relaxed">
                      {chat.description || ((chat.type === 'private' || chat.type === 'direct') ? "هذه الدردشة مشفرة تماماً." : "أهلاً بك في القناة/المجموعة.")}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-bold mt-1">وصف</p>
                    {(chat.type === 'group' || chat.type === 'channel') && (
                      <button 
                        onClick={() => setIsAddMembersModalOpen(true)}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all font-black text-sm active:scale-95"
                      >
                        <UserPlus className="w-5 h-5" />
                        <span>إضافة أعضاء</span>
                      </button>
                    )}
                  </div>
                </div>

                {(chat.type === 'private' || chat.type === 'direct') && (
                  <button 
                    onClick={() => setActiveSettingsTab('disappearing-messages')}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-3xl border border-zinc-900 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-500">
                        <Timer className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-200">الرسائل ذاتية الاختفاء</p>
                        <p className="text-[10px] text-zinc-500 font-bold">
                          {chat.disappearingTimer ? `مفعل (${chat.disappearingTimer} ث)` : "متوقفة"}
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-zinc-600" />
                  </button>
                )}

                <button 
                  onClick={() => setShowMediaGallery(true)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-3xl border border-zinc-900 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-200">الوسائط المشتركة</p>
                      <p className="text-[10px] text-zinc-500 font-bold">
                        {mediaMessages.length > 0 ? `${mediaMessages.length} ملف مشترك` : "لا توجد وسائط مشتركة"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mediaMessages.length > 0 && (
                      <div className="flex -space-x-2 space-x-reverse items-center">
                        {mediaMessages.slice(0, 3).map((m, i) => (
                          <img 
                            key={m.id || i}
                            src={m.fileUrl} 
                            alt="" 
                            className="w-7 h-7 rounded-lg object-cover border-2 border-zinc-950 shadow-md"
                          />
                        ))}
                      </div>
                    )}
                    <ChevronLeft className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          </div>
          <AddMembersModal />
        </div>
      </div>
    );
  }

  const activeMessages = messages.filter(m => !isMessageExpired(m) && !m.deletedBy?.includes(currentUser?.uid || ""));
  
  const filteredMessages = activeMessages.filter(msg => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // Check text/decrypted content
    const textContent = msg.isEncrypted ? decryptedMessages[msg.id] : msg.text;
    if (textContent && textContent.toLowerCase().includes(query)) return true;
    
    // Check transcription
    if (msg.transcription && msg.transcription.toLowerCase().includes(query)) return true;
    
    // Check sender name
    if (msg.senderName && msg.senderName.toLowerCase().includes(query)) return true;
    
    // Check file name
    if (msg.type === 'file' && msg.fileUrl) {
      const fileName = msg.fileUrl.split('/').pop()?.split('?')[0] || "";
      if (fileName.toLowerCase().includes(query)) return true;
    }
    
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none z-0 mix-blend-overlay" 
        style={{ backgroundImage: chat?.backgroundUrl ? `url(${chat.backgroundUrl})` : "url('https://www.transparenttextures.com/patterns/cubes.png')" }} 
      />
      
      <div className="p-4 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/90 backdrop-blur-3xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors active:scale-90">
            <ArrowRight className="w-6 h-6 rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowInfo(true)}>
             <div className="relative transition-transform active:scale-95">
                {chat?.type === 'saved' ? (
                  <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                    <Bookmark className="w-5 h-5" />
                  </div>
                ) : (chat?.type === 'private' || chat?.type === 'direct') ? (
                  <img 
                    src={chat?.otherUser?.photoURL || `https://ui-avatars.com/api/?name=${chatId}&background=random`} 
                    className="w-11 h-11 rounded-full border border-zinc-800 object-cover shadow-lg" 
                    alt="" 
                  />
                ) : (
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black shadow-lg overflow-hidden ${chat?.type === 'group' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                    {chat?.avatarUrl ? (
                      <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" style={getAvatarStyle(chat)} />
                    ) : (
                      chat?.type === 'group' ? <Users className="w-6 h-6" /> : <Bell className="w-6 h-6" />
                    )}
                  </div>
                )}
                {(chat?.type === 'private' || chat?.type === 'direct') && isOnline(chat?.otherUser?.lastSeen) && (
                  <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-950 rounded-full shadow-lg" />
                )}
             </div>
              <div className="max-w-[150px] sm:max-w-[200px]">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white text-base leading-tight truncate group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    {chat?.type === 'saved' ? 'الرسائل المحفوظة' : (chat?.type === 'private' || chat?.type === 'direct') ? (chat.otherUser?.displayName || "مستخدم") : chat?.name}
                    {(chat?.type === 'private' || chat?.type === 'direct') && (
                      <>
                        <VerifiedBadge isVerified={chat?.otherUser?.isVerified} />
                        <PremiumBadge isPremium={chat?.otherUser?.isPremium} />
                      </>
                    )}
                    {chat?.otherUser?.publicKey && (chat.type === 'private' || chat.type === 'direct') && (
                      <Lock className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </h4>
                  {(chat?.type === 'private' || chat?.type === 'direct') && isOnline(chat?.otherUser?.lastSeen) && (
                    <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                  )}
                </div>
                <p className={`${(chat?.type === 'private' || chat?.type === 'direct') && isOnline(chat?.otherUser?.lastSeen) ? 'text-emerald-500' : 'text-zinc-500'} text-[11px] font-bold mt-0.5 tracking-tight truncate`}>
                  {statusText()}
                </p>
              </div>
          </div>
        </div>
        <div className="flex gap-1 items-center">
          <div className="flex gap-1 items-center">
            <div className="flex items-center gap-1">
              {activeCall ? (
                <button 
                  onClick={joinCall}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all animate-pulse shadow-lg shadow-blue-900/40"
                  title="انضم للمكالمة النشطة"
                >
                  <PhoneForwarded className="w-5 h-5" />
                </button>
              ) : ( ((chat?.type === 'group' || chat?.type === 'channel') ? isAdminOrOwner : true) && chat?.type !== 'saved' && (
                <button 
                  onClick={startCall}
                  className="p-2.5 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-900 transition-all"
                  title={chat?.type === 'group' ? "بدء مكالمة جماعية" : "بدء مكالمة"}
                >
                  <PhoneCall className="w-5 h-5" />
                </button>
              ))}
            </div>
            {(chat?.type === 'group' || chat?.type === 'channel') && (
              <button 
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-2.5 rounded-full transition-all flex items-center gap-2 ${autoScroll ? 'bg-blue-600/20 text-blue-500' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                title={autoScroll ? "إيقاف التمرير التلقائي" : "تفعيل التمرير التلقائي"}
              >
                {autoScroll ? <MousePointer2 className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
              </button>
            )}
            <button 
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery("");
              }}
              className={`p-2.5 rounded-full transition-all ${isSearchOpen ? 'bg-blue-600/20 text-blue-500' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
              title="البحث في الرسائل"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-900 transition-all">
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                >
                  {((chat?.type === 'group' || chat?.type === 'channel') ? isAdminOrOwner : true) && !activeCall && chat?.type !== 'saved' && (
                    <button 
                      onClick={() => { startCall(); setShowMenu(false); }} 
                      className="w-full text-right p-3 hover:bg-zinc-800 rounded-xl text-sm font-bold flex items-center justify-between group text-blue-500"
                    >
                      {chat?.type === 'group' ? "بدء مكالمة جماعية" : "بدء مكالمة"}
                      <PhoneCall className="w-4 h-4" />
                    </button>
                  )}
                  <button className="w-full text-right p-3 hover:bg-zinc-800 rounded-xl text-sm font-bold flex items-center justify-between group text-zinc-300">
                    كتم الإشعارات
                    <VolumeX className="w-4 h-4 text-zinc-500" />
                  </button>
                  <button onClick={() => { setShowInfo(true); setShowMenu(false); }} className="w-full text-right p-3 hover:bg-zinc-800 rounded-xl text-sm font-bold flex items-center justify-between group text-zinc-300">
                    إظهار لمعلومات
                    <Info className="w-4 h-4 text-zinc-500" />
                  </button>
                  <div className="h-px bg-zinc-800 my-1" />
                  <button className="w-full text-right p-3 hover:bg-red-500/10 rounded-xl text-sm font-bold text-red-500 flex items-center justify-between group">
                    {chat?.type === 'private' ? 'حذف المحادثة' : 'مغادرة'}
                    <LogOut className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-zinc-950 border-b border-zinc-900/50 p-3 flex items-center gap-2 sticky top-[77px] z-30"
          >
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في الرسائل..." 
                className="w-full bg-zinc-900 text-white pl-10 pr-10 py-2 rounded-xl text-sm border border-zinc-800 focus:border-blue-500 focus:outline-none placeholder:text-zinc-600 text-right"
                dir="rtl"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery("");
              }}
              className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 rounded-xl hover:bg-zinc-900 transition-colors flex-shrink-0"
            >
              إلغاء
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col z-10 custom-scrollbar scroll-smooth relative"
        style={(!chat?.backgroundUrl && currentUserProfile?.isPremium && currentUserProfile.premiumSettings?.chatWallpaper) ? {
          backgroundImage: `url(${currentUserProfile.premiumSettings.chatWallpaper})`,
          backgroundAttachment: 'fixed',
          backgroundBlendMode: 'overlay',
          backgroundColor: 'rgba(9,9,11,0.8)'
        } : chat?.backgroundUrl ? {
          backgroundImage: `url(${chat.backgroundUrl})`,
          backgroundAttachment: 'fixed',
          backgroundBlendMode: 'overlay',
          backgroundColor: 'rgba(9,9,11,0.6)'
        } : {}}
      >
        {activeCall && !showStage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-20 m-2 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-between shadow-2xl shadow-blue-900/40 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                <PhoneCall className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-white font-black text-sm tracking-tight">مكالمة نشطة الآن</p>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">انضم للتواصل الصوتي والمرئي</p>
              </div>
            </div>
            <button 
              onClick={joinCall}
              className="px-6 py-3 bg-white text-blue-600 rounded-2xl text-xs font-black hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
            >
              انضم الآن
            </button>
          </motion.div>
        )}

        {searchQuery && filteredMessages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-blue-950/20 border border-blue-900/40 px-4 py-3 rounded-2xl text-xs text-blue-400 z-10 mx-2 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>نتائج البحث عن: <strong className="text-white">"{searchQuery}"</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold bg-blue-500/10 px-2.5 py-1 rounded-xl text-blue-300">تم العثور على {filteredMessages.length} رسائل</span>
              <button 
                onClick={() => setSearchQuery("")}
                className="text-zinc-500 hover:text-white font-black p-1 hover:bg-zinc-800 rounded transition-colors"
                title="إلغاء البحث"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600 opacity-20">
             <MessageSquare className="w-20 h-20 mb-4" />
             <p className="font-black">لا توجد رسائل بعد</p>
          </div>
        ) : searchQuery && filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 animate-in fade-in zoom-in duration-300">
             <Search className="w-14 h-14 mb-4 text-zinc-600" />
             <p className="font-black text-base text-zinc-400">لا توجد رسائل تطابق "{searchQuery}"</p>
             <button 
               onClick={() => setSearchQuery("")}
               className="mt-4 px-4 py-2 bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white rounded-xl transition-all font-bold"
             >
               عرض كل الرسائل
             </button>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.uid;
            const showTail = idx === filteredMessages.length - 1 || filteredMessages[idx+1].senderId !== msg.senderId;
            const tailColor = isMe ? (chat?.themeColor?.split(' ')[0]?.replace('from-', 'text-') || 'text-blue-600') : 'text-zinc-900';
            
            return (
              <motion.div 
                key={msg.id} 
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80 || info.offset.x < -80) {
                    setReplyingTo(msg);
                  }
                }}
                className={`flex ${isMe ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300 group cursor-pointer active:scale-[0.98] transition-transform`}
              >
                <div 
                  onClick={() => setMessageActionMenu(msg)}
                  className={`relative max-w-[85%] md:max-w-[70%] p-3.5 shadow-xl transition-all ${
                  isMe 
                    ? `bg-gradient-to-br ${currentUserProfile?.isPremium && currentUserProfile.premiumSettings?.bubbleColor ? currentUserProfile.premiumSettings.bubbleColor : (chat?.themeColor || 'from-blue-600 to-indigo-600')} text-white rounded-[22px] rounded-tr-none` 
                    : 'bg-zinc-900 text-zinc-100 rounded-[22px] rounded-tl-none border border-zinc-800'
                }`}>
                  {showTail && (
                    <div className={`absolute top-0 w-4 h-4 ${
                      isMe 
                        ? `right-[-8px] ${tailColor}` 
                        : `left-[-8px] ${tailColor}`
                    }`}>
                      <svg width="10" height="20" viewBox="0 0 10 20" className="fill-current">
                        <path d={isMe ? "M0 0 L10 0 L0 20 Z" : "M10 0 L0 0 L10 20 Z"} />
                      </svg>
                    </div>
                  )}
                  
                  {!isMe && chat?.type !== 'private' && (
                    <p 
                      onClick={(e) => { e.stopPropagation(); onNavigateToUser(msg.senderId); }}
                      className="text-[10px] font-black text-blue-400 mb-1 uppercase tracking-tighter cursor-pointer hover:underline"
                    >
                      {msg.senderName || "مستخدم"}
                    </p>
                  )}

                  {msg.replyTo && (
                    <div className="bg-black/20 p-2 rounded-xl mb-2 text-xs border-r-4 border-white/30 backdrop-blur-sm">
                      <p className="font-black text-[10px] opacity-80 uppercase tracking-tighter">{msg.replyTo.senderName}</p>
                      <p className="opacity-70 truncate line-clamp-1">{msg.replyTo.text}</p>
                    </div>
                  )}
                  
                  {msg.type === 'image' && msg.fileUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 bg-black/10 cursor-pointer group/media" onClick={(e) => { e.stopPropagation(); onViewMedia?.(msg.fileUrl!, 'image'); }}>
                      <img src={msg.fileUrl} alt="" className="w-full h-auto max-h-[300px] object-cover transition-transform group-hover/media:scale-105" />
                    </div>
                  )}

                  {msg.type === 'video' && msg.fileUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 bg-black/10 cursor-pointer group/media relative" onClick={(e) => { e.stopPropagation(); onViewMedia?.(msg.fileUrl!, 'video'); }}>
                      <video src={msg.fileUrl} className="w-full h-auto max-h-[300px] object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <PlayCircle className="w-12 h-12 text-white/80 group-hover/media:scale-110 transition-transform" />
                      </div>
                    </div>
                  )}

                  {msg.type === 'audio' && msg.fileUrl && (
                    <div className="mb-2 min-w-[200px]" onClick={e => e.stopPropagation()}>
                      <AudioPlayer url={msg.fileUrl} isMe={isMe} />
                      
                      {msg.transcription && (
                        <div className="mt-3 p-3 bg-white/10 rounded-2xl text-[13px] font-bold italic opacity-90 border-r-4 border-white/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-500">
                           <Volume2 className="w-4 h-4 mb-2 inline-block ml-2 text-blue-300" />
                           <span>{msg.transcription}</span>
                        </div>
                      )}

                      {!msg.transcription && currentUserProfile?.isPremium && (
                        <button
                          onClick={async () => {
                            try {
                              const text = await transcriptionService.transcribeAudio(msg.fileUrl!);
                              const mRef = doc(db, 'chats', chatId, 'messages', msg.id);
                              await updateDoc(mRef, { transcription: text });
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>تحويل الصوت لنص</span>
                        </button>
                      )}
                    </div>
                  )}

                  {msg.type === 'file' && msg.fileUrl && (
                    <div className="mb-2" onClick={e => e.stopPropagation()}>
                      <a 
                        href={msg.fileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-zinc-800 border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-800'}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-white text-blue-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}>
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-black truncate">{msg.fileUrl.split('/').pop()?.split('?')[0] || "ملف مرفق"}</p>
                          <p className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">تحميل الملف</p>
                        </div>
                      </a>
                    </div>
                  )}

                  {(!msg.type || msg.type === 'text') && (
                    <p className={`text-[15px] font-medium leading-relaxed mb-1 flex flex-wrap items-center gap-1.5 ${msg.isEncrypted ? 'opacity-95' : ''}`}>
                      {msg.isEncrypted && <Lock className="w-3 h-3 flex-shrink-0 opacity-60" />}
                      <span>{msg.isEncrypted ? (decryptedMessages[msg.id] || "🔐 جاري فك التشفير...") : msg.text}</span>
                    </p>
                  )}
                  
                  {msg.isEdited && (
                    <p className="text-[9px] font-bold opacity-40 text-right italic">(معدلة)</p>
                  )}

                  {/* Reactions display */}
                  {msg.reactions && Object.entries(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions).map(([emoji, uids]) => (
                        <button 
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold transition-all border ${
                            uids.includes(currentUser?.uid || "") 
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                              : 'bg-zinc-800/80 border-transparent text-zinc-400 hover:bg-zinc-800'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{uids.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {msg.disappearingTimer ? <DisappearingTimer msg={msg} /> : null}

                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className={`text-[10px] font-bold opacity-60`}>
                      {formatMessageTime(msg.createdAt)}
                    </span>
                    {isMe && <span className={`text-[10px] ${msg.readAt ? 'text-emerald-400' : 'text-blue-200 opacity-60'}`}>
                      {msg.readAt ? '✓✓' : '✓'}
                    </span>}
                  </div>

                  {/* Reaction Picker Trigger */}
                  {chat?.reactionSettings?.mode !== 'none' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setReactingToMessageId(reactingToMessageId === msg.id ? null : msg.id); }}
                      className={`absolute -bottom-1 ${isMe ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-blue-500 transition-all z-20 shadow-lg`}
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  )}

                  <AnimatePresence>
                    {reactingToMessageId === msg.id && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 10 }}
                        className={`absolute z-50 bottom-full mb-3 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-wrap max-w-[200px] gap-1 ${isMe ? 'right-0' : 'left-0'}`}
                        onClick={e => e.stopPropagation()}
                      >
                        {(chat?.reactionSettings?.mode === 'some' 
                          ? (chat?.reactionSettings?.enabledReactions || []) 
                          : ["👍", "❤️", "🔥", "🥰", "👏", "😁", "🤔", "🤯", "😱", "🤬", "🎉", "🤩", "🙏"]
                        ).map(emoji => (
                          <button 
                            key={emoji}
                            onClick={() => { handleReact(msg.id, emoji); setReactingToMessageId(null); }}
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-xl transition-transform active:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 mt-2 self-start"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs border border-zinc-700/50 flex-shrink-0 shadow-md">
              💬
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-[22px] rounded-tl-none text-zinc-400 text-sm flex items-center gap-2 shadow-lg">
              <span className="font-black text-blue-400">{typingUsers.join('، ')}</span>
              <span className="text-zinc-500 font-bold">يكتب الآن</span>
              <span className="flex gap-1 items-center ml-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800 z-20">
        {replyingTo && (
           <div className="p-3 mb-3 bg-zinc-900/50 rounded-2xl flex items-center justify-between border-r-4 border-blue-500 animate-in slide-in-from-bottom-2 shadow-inner">
             <div className="text-sm">
               <p className="font-black text-[10px] text-blue-400 uppercase tracking-widest mb-0.5">الرد على {replyingTo.senderName}</p>
               <p className="text-zinc-400 truncate max-w-[250px] font-medium">
                 {replyingTo.isEncrypted ? (decryptedMessages[replyingTo.id] || "🔐 رسالة مشفرة") : replyingTo.text}
               </p>
             </div>
             <button onClick={() => setReplyingTo(null)} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
           </div>
        )}
        {editingMessage && (
           <div className="p-3 mb-3 bg-zinc-900/50 rounded-2xl flex items-center justify-between border-r-4 border-yellow-500 animate-in slide-in-from-bottom-2 shadow-inner">
             <div className="text-sm">
               <p className="font-black text-[10px] text-yellow-500 uppercase tracking-widest mb-0.5">تعديل الرسالة</p>
               <p className="text-zinc-400 truncate max-w-[250px] font-medium">
                 {editingMessage.isEncrypted ? (decryptedMessages[editingMessage.id] || "") : editingMessage.text}
               </p>
             </div>
             <button onClick={() => { setEditingMessage(null); setInput(""); }} className="p-1.5 text-zinc-500 hover:text-white bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
           </div>
        )}
        {canSend ? (
          <div className="flex items-end gap-3 relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
              className="hidden" 
              accept="*"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-500 hover:text-blue-500 transition-colors disabled:opacity-50"
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Paperclip className="w-6 h-6" />}
            </button>
            <div className={`flex-1 bg-zinc-900 border ${isRecording ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-zinc-800'} rounded-[28px] px-4 py-2 flex items-center gap-3 shadow-inner group focus-within:border-blue-500/50 transition-all`}>
              {isRecording ? (
                <div className="flex-1 h-10 flex items-center gap-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-black text-sm tracking-tighter tabular-nums">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-red-500"
                      animate={{ width: ["0%", "100%"] }}
                      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <span className="text-zinc-500 text-[10px] font-bold">جاري التسجيل...</span>
                </div>
              ) : (
                <>
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    disabled={isUploading}
                    placeholder={editingMessage ? "تعديل الرسالة..." : isUploading ? "جاري الرفع..." : "الرسالة..."} 
                    className="flex-1 bg-transparent text-white outline-none font-medium h-10 placeholder:text-zinc-600 disabled:opacity-50" 
                  />
                  <button className="text-zinc-500 hover:text-blue-500 transition-colors"><Sparkles className="w-5 h-5" /></button>
                </>
              )}
            </div>
            {(input.trim() || isRecording) ? (
              <motion.button 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={isRecording ? stopRecording : sendMessage}
                disabled={isUploading}
                className={`w-12 h-12 ${isRecording ? 'bg-red-600 shadow-red-900/40' : editingMessage ? 'bg-yellow-600' : 'bg-blue-600 shadow-blue-900/40'} text-white rounded-full flex items-center justify-center hover:opacity-90 transition-all shadow-lg active:scale-90 disabled:opacity-50`}
              >
                {isRecording ? <StopCircle className="w-6 h-6" /> : editingMessage ? <Edit2 className="w-5 h-5" /> : <Send className="w-5 h-5 rtl:-rotate-90" />}
              </motion.button>
            ) : (
              <button 
                onClick={startRecording}
                disabled={isUploading}
                className="w-12 h-12 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full flex items-center justify-center hover:text-red-500 hover:border-red-500/30 transition-all shadow-xl active:scale-90 disabled:opacity-50"
              >
                <Mic className="w-6 h-6" />
              </button>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 font-bold text-sm">فقط المشرفين يمكنهم إرسال رسائل في هذه القناة.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {messageActionMenu && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setMessageActionMenu(null)}>
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-2 pb-8 overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto my-3" />
              
              <button 
                onClick={() => { setReplyingTo(messageActionMenu); setMessageActionMenu(null); }}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-100 font-bold"
              >
                الرد
                <Reply className="w-5 h-5 text-blue-500" />
              </button>
              
              <button 
                onClick={() => { 
                    const t = messageActionMenu.isEncrypted ? (decryptedMessages[messageActionMenu.id] || "🔐") : messageActionMenu.text;
                    navigator.clipboard.writeText(t); 
                    setMessageActionMenu(null); 
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-100 font-bold"
              >
                نسخ النص
                <Copy className="w-5 h-5 text-zinc-400" />
              </button>

              <button 
                onClick={() => { setForwardMessage(messageActionMenu); setIsForwarding(true); setMessageActionMenu(null); }}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-100 font-bold"
              >
                تحويل
                <Share2 className="w-5 h-5 text-zinc-400" />
              </button>

              {messageActionMenu.senderId === currentUser?.uid && (
                <button 
                  onClick={() => { 
                      setEditingMessage(messageActionMenu); 
                      const t = messageActionMenu.isEncrypted ? (decryptedMessages[messageActionMenu.id] || "") : messageActionMenu.text;
                      setInput(t);
                      setMessageActionMenu(null); 
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-100 font-bold"
                >
                  تعديل
                  <Edit2 className="w-5 h-5 text-yellow-500" />
                </button>
              )}

              {messageActionMenu.senderId !== currentUser?.uid && (
                <button 
                  onClick={() => { setShowReportModal(true); }}
                  className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 rounded-2xl transition-colors text-red-500 font-bold"
                >
                  إبلاغ
                  <Flag className="w-5 h-5" />
                </button>
              )}

              <div className="h-px bg-zinc-800 my-2 mx-4" />

              <button 
                onClick={() => deleteMessage(messageActionMenu.id, false)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-100 font-bold"
              >
                حذف عندي فقط
                <Trash2 className="w-5 h-5 text-zinc-500" />
              </button>

              <button 
                onClick={() => deleteMessage(messageActionMenu.id, true)}
                className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 rounded-2xl transition-colors text-red-500 font-bold"
              >
                حذف عند الطرفين
                <Trash2 className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setMessageActionMenu(null)}
                className="w-full mt-2 p-4 text-zinc-500 font-bold hover:text-white transition-colors"
              >
                إلغاء
              </button>
            </motion.div>
          </div>
        )}

        {isForwarding && (
           <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
             >
               <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                 <h2 className="text-xl font-black">تحويل الرسالة إلى...</h2>
                 <button onClick={() => { setIsForwarding(false); setForwardMessage(null); }} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <ForwardChatList onSelect={forwardCurrentMessage} currentUser={currentUser} />
               </div>
             </motion.div>
           </div>
        )}

        {showReportModal && (
           <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl"
             >
               <h2 className="text-xl font-black mb-4">إبلاغ عن رسالة</h2>
               <p className="text-zinc-500 text-sm mb-4 font-bold">لماذا تريد الإبلاغ عن هذه الرسالة؟</p>
               <textarea 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-medium mb-4 outline-none focus:border-red-500/50 transition-all min-h-[100px]"
                  placeholder="اكتب السبب هنا..."
               />
               <div className="flex gap-3">
                 <button onClick={submitReport} className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 active:scale-95 transition-all">إرسال</button>
                 <button onClick={() => setShowReportModal(false)} className="flex-1 bg-zinc-800 text-zinc-400 font-black py-4 rounded-2xl hover:bg-zinc-700 transition-all">إلغاء</button>
               </div>
             </motion.div>
           </div>
        )}

        {showStage && activeCall && chat && (
          <StageScreen 
            currentUser={currentUser} 
            chat={chat} 
            call={activeCall} 
            onClose={() => setShowStage(false)} 
            onNavigateToUser={onNavigateToUser}
          />
        )}
      </AnimatePresence>
      <AddMembersModal />
    </div>
  );
}

function ForwardChatList({ onSelect, currentUser }: { onSelect: (chatId: string) => void, currentUser: FirebaseUser | null }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) console.log("No user");
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser?.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  if (false) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {chats.map(chat => {
        const isPrivate = chat.type === 'private' || chat.type === 'direct';
        const name = isPrivate ? (chat.otherUser?.displayName || "مستخدم") : chat.name;
        return (
          <button 
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800 rounded-2xl transition-all border border-transparent hover:border-zinc-700 group"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden text-white font-bold">
               {isPrivate ? (
                  <img 
                    src={chat.otherUser?.photoURL || `https://ui-avatars.com/api/?name=${chat.id}&background=random`} 
                    className="w-full h-full object-cover" 
                  />
               ) : (
                  <div className={`w-full h-full flex items-center justify-center ${chat.type === 'group' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                    {chat.avatarUrl ? <img src={chat.avatarUrl} className="w-full h-full object-cover" style={getAvatarStyle(chat)} /> : <Users className="w-6 h-6" />}
                  </div>
               )}
            </div>
            <div className="text-right flex-1">
              <p className="font-black text-white group-hover:text-blue-400 transition-colors">{name}</p>
              <p className="text-xs text-zinc-500 font-bold">{isPrivate ? 'محادثة خاصة' : chat.type === 'group' ? 'مجموعة' : 'قناة'}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700" />
          </button>
        );
      })}
    </div>
  );
}



export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoadingState] = useState(false);
  const [firestoreError, setFirestoreError] = useState<FirestoreErrorInfo | null>(null);
  
  // Connect the global error and loading handlers to the UI state
  useEffect(() => {
    globalErrorSetter = setFirestoreError;
    globalLoadingSetter = setGlobalLoadingState;
    return () => { 
      globalErrorSetter = null; 
      globalLoadingSetter = null;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'home' | 'lives' | 'search' | 'reels' | 'profile' | 'ai' | 'chat' | 'settings' | 'user-profile' | 'create-post' | 'create-story' | 'create-reel'>('home');
  const [isDirty, setIsDirty] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const activeScrollElRef = useRef<HTMLElement | null>(null);

  // Reset scroll top button state when active tab changes
  useEffect(() => {
    setShowScrollTop(false);
    activeScrollElRef.current = null;
  }, [activeTab]);

  // Implement a smooth elastic bounce animation effect on all scrollbars with class "custom-scrollbar"
  // And track the active custom-scrollbar element for a floating "Back to Top" button
  useEffect(() => {
    const elementScrollStates = new Map<HTMLElement, { isAtTop: boolean; isAtBottom: boolean; timer?: any }>();

    const handleScrollCapture = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el || !el.classList || !el.classList.contains('custom-scrollbar')) return;

      const currentScrollTop = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      
      // Track scroll position for "Back to Top" button
      if (currentScrollTop > 300) {
        activeScrollElRef.current = el;
        setShowScrollTop(true);
      } else {
        if (activeScrollElRef.current === el) {
          setShowScrollTop(false);
        }
      }

      // Do not trigger bounce if content isn't scrollable or is extremely small
      if (maxScroll <= 5) return;

      const currentAtTop = currentScrollTop <= 3;
      const currentAtBottom = Math.abs(maxScroll - currentScrollTop) <= 3;

      let state = elementScrollStates.get(el);
      if (!state) {
        state = { isAtTop: currentAtTop, isAtBottom: currentAtBottom };
        elementScrollStates.set(el, state);
      }

      if (currentAtTop && !state.isAtTop) {
        el.classList.remove('bounce-bottom');
        el.classList.remove('bounce-top');
        // Force reflow
        void el.offsetWidth;
        el.classList.add('bounce-top');
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(() => {
          el.classList.remove('bounce-top');
        }, 450);
      } else if (currentAtBottom && !state.isAtBottom) {
        el.classList.remove('bounce-top');
        el.classList.remove('bounce-bottom');
        // Force reflow
        void el.offsetWidth;
        el.classList.add('bounce-bottom');
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(() => {
          el.classList.remove('bounce-bottom');
        }, 450);
      }

      state.isAtTop = currentAtTop;
      state.isAtBottom = currentAtBottom;
    };

    window.addEventListener('scroll', handleScrollCapture, true);
    return () => {
      window.removeEventListener('scroll', handleScrollCapture, true);
      for (const [_, state] of elementScrollStates.entries()) {
        if (state.timer) clearTimeout(state.timer);
      }
    };
  }, []);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const requestTabChange = (newTab: any) => {
    if (isDirty) {
      setPendingTab(newTab);
      setShowConfirmModal(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmTabChange = () => {
    setIsDirty(false);
    setShowConfirmModal(false);
    if (pendingTab) {
      setActiveTab(pendingTab as any);
      setPendingTab(null);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleOpenPremium = () => setShowPremiumModal(true);
    const handleNavigate = (e: any) => {
      if (e.detail?.tab) {
        requestTabChange(e.detail.tab);
      }
    };
    window.addEventListener('open-premium-modal', handleOpenPremium);
    window.addEventListener('navigate-to-tab', handleNavigate);
    return () => {
      window.removeEventListener('open-premium-modal', handleOpenPremium);
      window.removeEventListener('navigate-to-tab', handleNavigate);
    };
  }, []);
  const [createMode, setCreateMode] = useState<'posts' | 'reels'>('posts');
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<{url: string, type: 'image' | 'video'} | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeLiveStreamId, setActiveLiveStreamId] = useState<string | null>(null);
  const [isGoLiveActive, setIsGoLiveActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{file: File, preview: string, type: 'image' | 'video'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size (e.g., 50MB max for video, 5MB for image)
    const isVideo = file.type.startsWith('video/');
    if (createMode === 'reels' && !isVideo) {
      alert("مقاطع الريلز يجب أن تكون فيديو فقط");
      return;
    }
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      alert(`حجم الملف كبير جداً. الحد الأقصى هو ${isVideo ? '500MB' : '10MB'}`);
      return;
    }

    const type = isVideo ? 'video' : 'image';
    const preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview, type: type as 'image' | 'video' });
    requestTabChange('create-post');
    // Important: clear the input value so selecting the same file again triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      // If reels mode, limit to videos only for better UX
      fileInputRef.current.accept = createMode === 'reels' ? "video/*" : "image/*,video/*";
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [lockedChatToOpen, setLockedChatToOpen] = useState<{id: string, name?: string} | null>(null);
  const [authenticatedChats, setAuthenticatedChats] = useState<Set<string>>(new Set());

  const handleNavigateToChat = async (id: string, chatData?: any) => {
    let data = chatData;
    if (!data) {
      try {
        const docSnap = await getDoc(doc(db, 'chats', id));
        if (docSnap.exists()) data = docSnap.data();
      } catch (e) {
        console.error("Error fetching chat data for navigation", e);
      }
    }

    if (data?.isLocked && !authenticatedChats.has(id)) {
      setLockedChatToOpen({ id, name: data.name });
      return;
    }
    setSelectedChatId(id);
    setActiveTab('chat');
  };
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<'main' | 'personal' | 'email' | 'security' | 'privacy' | 'nav-icons' | 'profile-design' | 'appearance'>('main');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (userProfile?.theme) {
      setTheme(userProfile.theme);
    }
  }, [userProfile?.theme]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  }, [theme]);

  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', user?.uid));
    
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount && data.unreadCount[user?.uid]) {
          count += data.unreadCount[user?.uid];
        }
      });
      setTotalUnreadCount(count);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user?.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user?.uid}`);
    });
    return () => unsub();
  }, [user]);

  const [activeToast, setActiveToast] = useState<{
    title: string;
    body: string;
    icon?: string;
    streamId?: string;
    notificationId?: string;
  } | null>(null);
  const appStartTime = useRef(Date.now());

  const markNotificationAsRead = async (notifId: string) => {
    if (!user) console.log("No user 1");
    try {
      await updateDoc(doc(db, "users", user?.uid, "notifications", notifId), {
        read: true
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  useEffect(() => {
    if (!user || !userProfile) console.log("No profile 1");

    // 1. Message Notifications
    const chatsRef = collection(db, 'chats');
    const qMessages = query(chatsRef, where('participants', 'array-contains', user?.uid));
    
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const settings = userProfile.notificationSettings || { messages: true, lives: true, browserEnabled: false };
          
          if (
            data.lastSenderId && 
            data.lastSenderId !== user?.uid && 
            data.lastMessageAt?.toMillis &&
            data.lastMessageAt.toMillis() > appStartTime.current &&
            settings.messages
          ) {
            const title = data.isGroup ? `رسالة في ${data.name || 'مجموعة'}` : 'رسالة جديدة';
            const body = data.lastMessage || 'وصلتك رسالة جديدة';
            
            setActiveToast({ title, body });
            if (settings.browserEnabled && Notification.permission === 'granted') {
              new Notification(title, { body });
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    // 2. Follower Live Notifications
    const notifsRef = collection(db, 'users', user?.uid, 'notifications');
    const qNotifs = query(notifsRef, where('read', '==', false));
    
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const settings = userProfile.notificationSettings || { messages: true, lives: true, browserEnabled: false };
          
          if (
            data.createdAt?.toMillis &&
            data.createdAt.toMillis() > appStartTime.current && 
            settings.lives
          ) {
            setActiveToast({ 
              title: data.title, 
              body: data.body, 
              icon: data.hostPhoto || "",
              streamId: data.streamId || undefined,
              notificationId: change.doc.id
            });
            if (settings.browserEnabled && Notification.permission === 'granted') {
              new Notification(data.title, { body: data.body, icon: data.hostPhoto });
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user?.uid}/notifications`);
    });

    return () => {
      unsubMessages();
      unsubNotifs();
    };
  }, [user, userProfile?.notificationSettings]);

  // --- E2EE Key Management Hook ---
  useEffect(() => {
    if (!user || userProfile === null) console.log("No profile 2");

    const setupEncryption = async () => {
      const localPrivateKeyStr = localStorage.getItem(`trucast_private_key_${user?.uid}`);
      
      if (!localPrivateKeyStr || !userProfile?.publicKey) {
        // If we don't have BOTH, we generate a new pair to be safe and consistent
        console.log("🔐 Setting up E2EE keys...");
        try {
          const keys = await generateEncryptionKeys();
          const priStr = await exportPrivateKeyStr(keys.privateKey);
          const pubStr = await exportPublicKeyStr(keys.publicKey);
          
          localStorage.setItem(`trucast_private_key_${user?.uid}`, priStr);
          
          await updateDoc(doc(db, 'users', user?.uid), {
            publicKey: pubStr,
            updatedAt: serverTimestamp()
          });
          console.log("✅ E2EE Keys ready.");
        } catch (e) {
          console.error("E2EE Setup error:", e);
        }
      }
    };

    setupEncryption();
  }, [user, userProfile?.publicKey]);

  // Username auto-registration for legacy users
  useEffect(() => {
    if (user && userProfile?.username) {
      const regUsername = async () => {
        const normalized = userProfile.username!.toLowerCase().trim();
        const docRef = doc(db, 'usernames', normalized);
        try {
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            console.log(`Auto-registering legacy username: ${normalized}`);
            await setDoc(docRef, { uid: user?.uid, createdAt: serverTimestamp() });
          }
        } catch (e) {
          console.error("Auto-registration check failed", e);
        }
      };
      regUsername();
    }
  }, [user, userProfile?.username]);

  useEffect(() => {
    if (!user) console.log("No user 1");
    
    const params = new URLSearchParams(window.location.search);
    const inviteChatId = params.get('chatId');
    const inviteCallId = params.get('callId');

    if (inviteChatId && inviteCallId) {
      // Clear URL params
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Navigate to the chat
      handleNavigateToChat(inviteChatId);
      setActiveTab('chat');
      
      // The ChatDetailScreen will detect the active call automatically 
      // when it loads and opens the StageScreen if needed.
    }
  }, [user]);

  useEffect(() => {
    // 1. Diagnostic Config Check
    const checkConfig = () => {
      console.log("--- Firebase Configuration Validation ---");
      // @ts-ignore
      import('../firebase-applet-config.json').then(config => {
        const confObj = config.default as any;
        const required = ['projectId', 'apiKey', 'appId'];
        const missing = required.filter(k => !confObj[k]);
        if (missing.length > 0) {
          console.error("❌ CRITICAL: Missing Firebase configuration keys:", missing);
          handleFirestoreError(new Error(`إعدادات Firebase غير مكتملة: ${missing.join(', ')}`), OperationType.GET, 'config');
        } else {
          console.log("✅ Basic Config Keys Present");
          console.log("Project ID:", confObj.projectId);
        }
      });
    };
    checkConfig();

    // 2. Test Connection Handshake (Critical for diagnosing config issues)
    const testConnection = async () => {
      try {
        console.log("Attempting Firestore server handshake...");
        // Force server fetch to bypass local cache
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("✅ Firestore connection established successfully.");
        if (globalErrorSetter) globalErrorSetter(null); // Clear any transient errors
      } catch (error: any) {
        console.error("❌ Firestore initialization failed:", error);
        
        // Detailed log based on error code
        if (error.code === 'permission-denied') {
          console.error("Check firestore.rules for /test/connection. It must be 'allow read: if true;'");
        } else if (error.code === 'unavailable') {
          console.error("Possible network issue or Firebase service down.");
        }
        
        handleFirestoreError(error, OperationType.GET, 'test/connection');
      }
    };
    testConnection();

    // 3. Auth Lifecycle
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      console.log("Auth state changed. User:", u?.uid || 'GUEST');
      try {
        setUser(u);
        if (u) {
          // Update user presence and meta - wrap in try catch to avoid blocking the whole app
          try {
            const userRef = doc(db, 'users', u.uid);
            await setDoc(userRef, {
              uid: u.uid,
              displayName: u.displayName || "مستخدم جديد",
              photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName || 'User'}&background=random`,
              email: u.email,
              lastSeen: serverTimestamp()
            }, { merge: true });
            console.log("✅ User metadata synced to Firestore.");
          } catch (syncErr: any) {
            console.warn("User metadata sync failed (likely rules):", syncErr.code);
            // We don't show a banner for this to keep the UI clean
          }
        }
      } catch (e: any) {
        console.error("Auth lifecycle error:", e);
      } finally {
        setLoading(false);
      }
    }, (error: any) => {
      console.error("Auth monitoring error:", error);
      // Suppress permission-denied for auth monitoring if it's transient
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, 'auth-init');
      }
      setLoading(false);
    });

    // Timeout to force hide loading spinner after 5 seconds no matter what
    const forceHideLoading = setTimeout(() => setLoading(false), 5000);

    // Handle presence updates
    const updatePresence = async () => {
      if (auth.currentUser) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser?.uid), {
            lastSeen: serverTimestamp()
          });
        } catch (e) {
          // Ignore background update errors
        }
      }
    };

    const presenceInterval = setInterval(updatePresence, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubAuth();
      clearTimeout(forceHideLoading);
      clearInterval(presenceInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 600);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-blue-600/20">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">TruCast</h1>
          <p className="text-zinc-500 text-lg mb-10 font-medium">منصة التواصل الاجتماعي الذكية لمبدعي المستقبل</p>
          <button 
            onClick={login}
            className="w-full bg-white text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-4 hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="" />
            تسجيل الدخول باستخدام جوجل
          </button>
        </motion.div>
      </div>
    );
  }

  // Ensure user has a username (Registration step for Google users)
  if (user && userProfile && !userProfile.username) {
    return <ProfileSetupScreen user={user} onComplete={() => {}} />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row select-none">
      <TopLoadingBar active={isNavigating || globalLoading} />
      <AnimatePresence>
        {firestoreError && (
          <FirestoreErrorBanner 
            error={firestoreError} 
            onDismiss={() => setFirestoreError(null)} 
          />
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*" 
        onChange={handleFileSelect} 
      />

      <AnimatePresence>
        {isDiscoverOpen && (
          <DiscoverScreen 
            currentUser={user} 
            onClose={() => setIsDiscoverOpen(false)} 
            onNavigateToChat={(id, data) => {
              setIsDiscoverOpen(false);
              handleNavigateToChat(id, data);
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Top Header (SafeArea-ish) */}
      <div className="md:hidden sticky top-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 p-4 z-[60] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-black text-white tracking-tight">TruCast</h1>
        </div>
        <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-zinc-800" alt="" />
      </div>

      {/* Sidebar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-24 lg:w-64 bg-zinc-950/90 backdrop-blur-xl md:backdrop-blur-none border-t md:border-t-0 md:border-l border-zinc-800 p-2 md:p-6 z-50 flex flex-row md:flex-col justify-between items-center lg:items-stretch">
        <div className="hidden lg:flex flex-col items-start gap-1 px-4 py-8 mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-black text-white tracking-tight">TruCast</h1>
          </div>
          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mt-1">حريتك في التعبير محمية بخصوصية مطلقة</p>
        </div>

        <div className="flex flex-row md:flex-col gap-1 w-full justify-around lg:justify-start pt-2">
          {[
            { id: 'home', label: 'الرئيسية', iconName: userProfile?.customIcons?.home || 'Home' },
            { id: 'lives', label: 'البث المباشر', iconName: 'Radio' },
            { id: 'add', label: 'إضافة', iconName: userProfile?.customIcons?.add || 'Plus', isAction: true },
            { id: 'reels', label: 'ريلز', iconName: userProfile?.customIcons?.reels || 'Play' },
            { id: 'profile', label: 'حسابي', iconName: userProfile?.customIcons?.profile || 'User' },
          ].map(item => {
            const IconComponent = NAV_ICONS[item.iconName] || Home;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAction) {
                    setIsAddMenuOpen(true);
                  } else {
                    requestTabChange(item.id as any);
                  }
                }}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 px-2 py-2 md:px-4 md:py-3 rounded-2xl transition-all relative ${
                  item.isAction 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 z-[60]'
                    : activeTab === item.id 
                      ? 'text-blue-500 md:bg-blue-600 md:text-white shadow-lg md:shadow-blue-900/20' 
                      : 'text-zinc-500 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <div className="md:w-6 md:h-6 flex items-center justify-center">
                  <IconComponent className="w-6 h-6" />
                </div>
                <span className="text-[10px] md:text-sm lg:text-base font-black tracking-tight">
                  {item.label}
                </span>
                {item.id === 'chat' && totalUnreadCount > 0 && (
                  <div className="absolute -top-1 right-0 md:top-2 md:right-4 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg shadow-red-900/20">
                    <span className="text-[9px] font-black text-white leading-none">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  </div>
                )}
                {activeTab === item.id && !item.isAction && (
                  <motion.div layoutId="nav-dot" className="absolute -bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full md:hidden" />
                )}
              </button>
            );
          })}
        </div>

        <button 
          onClick={logout}
          className="hidden md:flex items-center gap-4 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all mt-auto"
        >
          <LogOut className="w-6 h-6" />
          <span className="hidden lg:block font-bold">تسجيل الخروج</span>
        </button>
      </nav>

      {/* Main Content Areas */}
      <main className="flex-1 overflow-y-auto pb-32 md:pb-10 bg-zinc-950">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <Feed 
                currentUser={user} 
                onViewMedia={(url, type) => setFullscreenMedia({ url, type })} 
                onNavigateToChat={() => requestTabChange('chat')} 
                unreadMessagesCount={totalUnreadCount}
                onNavigateToSearch={() => requestTabChange('search')} 
                onNavigateToUser={(uid) => {
                  setSelectedUserId(uid);
                  requestTabChange('user-profile');
                }}
                onTriggerMediaUpload={triggerFilePicker}
                onNavigateToAI={() => requestTabChange('ai')}
                onWatchLive={(id) => setActiveLiveStreamId(id)}
              />
            </motion.div>
          )}
          {activeTab === 'lives' && (
            <motion.div 
              key="lives"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full"
            >
              <LivesExplorerScreen 
                onWatchLive={(id) => setActiveLiveStreamId(id)}
                onNavigateToUser={(uid) => {
                  setSelectedUserId(uid);
                  requestTabChange('user-profile');
                }}
              />
            </motion.div>
          )}
          {activeTab === 'search' && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full"
            >
              <SearchScreen 
                onNavigateToUser={(uid) => {
                  setSelectedUserId(uid);
                  requestTabChange('user-profile');
                }} 
                onViewMedia={(url, type) => setFullscreenMedia({ url, type })}
                currentUser={user}
              />
            </motion.div>
          )}
          {activeTab === 'reels' && (
            <motion.div 
              key="reels"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full"
            >
              <ReelsScreen 
                currentUser={user} 
                onNavigateToUser={(uid) => {
                  setSelectedUserId(uid);
                  requestTabChange('user-profile');
                }} 
              />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <Profile 
                currentUser={user} 
                onViewMedia={(url, type) => setFullscreenMedia({ url, type })} 
                onNavigate={(tab, sub) => {
                  requestTabChange(tab);
                  if (sub) setSettingsSubView(sub);
                  else setSettingsSubView('main');
                }} 
                onNavigateToUser={(uid) => {
                  setSelectedUserId(uid);
                  requestTabChange('user-profile');
                }}
              />
            </motion.div>
          )}
          {activeTab === 'user-profile' && selectedUserId && (
            <motion.div 
              key="user-profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full"
            >
              <UserProfileScreen 
                userId={selectedUserId} 
                currentUser={user} 
                onBack={() => requestTabChange('home')} 
                onViewMedia={(url, type) => setFullscreenMedia({ url, type })} 
                onNavigateToUser={(uid) => {
                  setSelectedUserId(uid);
                  requestTabChange('user-profile');
                }} 
                onNavigateToChat={(id, data) => {
                  handleNavigateToChat(id, data);
                  requestTabChange('chat');
                }}
                onNavigate={(tab, sub) => {
                  requestTabChange(tab);
                  if (sub) setSettingsSubView(sub);
                  else setSettingsSubView('main');
                }}
              />
            </motion.div>
          )}
          {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <AIImageGen onDirtyChange={setIsDirty} />
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="h-full"
            >
              {activeSubTab === 'create-group' ? (
                <CreateGroupScreen 
                  currentUser={user} 
                  onBack={() => setActiveSubTab(null)} 
                  onNavigateToChat={(id, data) => {
                    handleNavigateToChat(id, data);
                    setActiveSubTab(null);
                  }}
                />
              ) : activeSubTab === 'create-channel' ? (
                <CreateChannelScreen 
                  currentUser={user} 
                  onBack={() => setActiveSubTab(null)} 
                  onNavigateToChat={(id, data) => {
                    handleNavigateToChat(id, data);
                    setActiveSubTab(null);
                  }}
                />
              ) : selectedChatId ? (
                <ChatDetailScreen 
                  chatId={selectedChatId} 
                  currentUser={user}
                  currentUserProfile={userProfile}
                  onBack={() => setSelectedChatId(null)} 
                  onViewMedia={(url, type) => setFullscreenMedia({ url, type })}
                  onNavigateToUser={(uid) => {
                    setSelectedUserId(uid);
                    setSelectedChatId(null);
                    requestTabChange('user-profile');
                  }}
                />
              ) : (
                <ChatListScreen 
                  currentUser={user}
                  userProfile={userProfile}
                  onNavigateToChat={(id, data) => handleNavigateToChat(id, data)} 
                  onNavigateToCreate={(type) => setActiveSubTab(type === 'group' ? 'create-group' : 'create-channel')}
                  onNavigateToUser={(uid) => {
                    setSelectedUserId(uid);
                    requestTabChange('user-profile');
                  }}
                  isDiscoverOpen={isDiscoverOpen}
                  setIsDiscoverOpen={setIsDiscoverOpen}
                />
              )}
            </motion.div>
          )}
          {activeTab === 'create-post' && selectedFile && (
            <motion.div 
              key="create-post"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <CreateMediaPostScreen 
                selectedMedia={selectedFile} 
                currentUser={user} 
                collectionPath={createMode}
                onDirtyChange={setIsDirty}
                onCancel={() => {
                  setIsDirty(false);
                  setSelectedFile(null);
                  setActiveTab('home');
                }} 
                onComplete={() => {
                  setIsDirty(false);
                  setSelectedFile(null);
                  setActiveTab(createMode === 'reels' ? 'reels' : 'home');
                }} 
              />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsScreen 
                userProfile={userProfile} 
                initialSubView={settingsSubView}
                onBack={() => {
                  requestTabChange('profile');
                  setSettingsSubView('main');
                }} 
              />
            </motion.div>
          )}
          {activeTab === 'create-story' && (
            <motion.div 
              key="create-story"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <CreateStory 
                currentUser={user} 
                onCancel={() => {
                  currentRouterState = null;
                  setActiveTab('home');
                }}
                onComplete={() => {
                  currentRouterState = null;
                  setActiveTab('home');
                }}
              />
            </motion.div>
          )}
          {activeTab === 'create-reel' && (
            <motion.div 
              key="create-reel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <CreateReel 
                currentUser={user} 
                onCancel={() => {
                  currentRouterState = null;
                  setActiveTab('reels');
                }}
                onComplete={() => {
                  currentRouterState = null;
                  setActiveTab('reels');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Live Stream Screen */}
      <AnimatePresence>
        {isGoLiveActive && (
          <LiveStreamScreen 
            currentUser={user}
            userProfile={userProfile}
            isHost={true}
            onClose={() => setIsGoLiveActive(false)}
            onNavigateToUser={(uid) => {
              setSelectedUserId(uid);
              requestTabChange('user-profile');
              setIsGoLiveActive(false);
            }}
            onShareCommentToStory={(comment) => {
              currentRouterState = { sharedComment: comment };
              setActiveTab('create-story');
              setIsGoLiveActive(false);
            }}
          />
        )}
        {activeLiveStreamId && (
          <LiveStreamScreen 
            currentUser={user}
            userProfile={userProfile}
            streamId={activeLiveStreamId}
            isHost={false}
            onClose={() => setActiveLiveStreamId(null)}
            onNavigateToUser={(uid) => {
              setSelectedUserId(uid);
              requestTabChange('user-profile');
              setActiveLiveStreamId(null);
            }}
            onShareCommentToStory={(comment) => {
              currentRouterState = { sharedComment: comment };
              setActiveTab('create-story');
              setActiveLiveStreamId(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeToast && (
          <NotificationToast 
            {...activeToast} 
            onClose={() => setActiveToast(null)} 
            onClick={() => {
              if (activeToast.streamId) {
                setActiveLiveStreamId(activeToast.streamId);
                if (activeToast.notificationId) {
                  markNotificationAsRead(activeToast.notificationId);
                }
              }
              setActiveToast(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">تنبيه: تغيرات غير محفوظة</h3>
              <p className="text-zinc-400 text-sm font-medium mb-8 leading-relaxed">
                لديك تغييرات لم يتم حفظها. هل أنت متأكد أنك تريد المغادرة وفقدان هذه البيانات؟
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-colors"
                >
                  البقاء
                </button>
                <button 
                  onClick={confirmTabChange}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-colors"
                >
                  المغادرة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Menu Modal */}
      <AnimatePresence>
        {isAddMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end md:items-center justify-center p-4"
            onClick={() => setIsAddMenuOpen(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-[40px] md:rounded-[40px] p-10 shadow-2xl relative"
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-zinc-800 rounded-full mb-8 md:hidden" />
              
              <div className="text-center mb-10">
                <h3 className="text-2xl font-black text-white">إنشاء جديد</h3>
                <p className="text-zinc-500 text-sm mt-1 font-bold">اختر نوع المحتوى الذي تود مشاركته</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'ذكاء اصطناعي', icon: <Sparkles className="w-7 h-7" />, color: 'bg-emerald-600', action: () => { requestTabChange('ai'); setIsAddMenuOpen(false); } },
                  { label: 'بث مباشر', icon: <Radio className="w-7 h-7" />, color: 'bg-red-600', action: () => { setIsGoLiveActive(true); setIsAddMenuOpen(false); } },
                  { label: 'منشور نصي', icon: <Edit2 className="w-7 h-7" />, color: 'bg-zinc-800', action: () => { requestTabChange('home'); setCreateMode('posts'); setIsAddMenuOpen(false); } },
                  { label: 'صورة / فيديو', icon: <ImageIcon className="w-7 h-7" />, color: 'bg-blue-600', action: () => { setCreateMode('posts'); triggerFilePicker(); setIsAddMenuOpen(false); } },
                  { label: 'مقطع ريلز', icon: <Video className="w-7 h-7" />, color: 'bg-gradient-to-br from-purple-600 to-pink-600', action: () => { setCreateMode('reels'); triggerFilePicker(); setIsAddMenuOpen(false); } },
                ].map((item, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={item.action}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className={`w-16 h-16 ${item.color} rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-black/20`}>
                      {item.icon}
                    </div>
                    <span className="text-zinc-400 font-black text-[11px] whitespace-nowrap">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Viewer Modal */}
      <AnimatePresence>
        {fullscreenMedia && (
          <FullscreenViewer 
            mediaUrl={fullscreenMedia.url} 
            mediaType={fullscreenMedia.type}
            onClose={() => setFullscreenMedia(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPremiumModal && userProfile && (
          <PremiumSubscriptionModal 
            user={userProfile} 
            onClose={() => setShowPremiumModal(false)} 
            onSuccess={() => {
              setShowPremiumModal(false);
              setActiveToast({
                title: "مبارك!",
                body: "لقد أصبحت الآن عضواً متميزاً في TruCast!",
                icon: "gem"
              });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lockedChatToOpen && (
          <ChatPasscodeModal 
            chatName={lockedChatToOpen.name}
            onCorrect={() => {
              const chatId = lockedChatToOpen.id;
              const nextAuth = new Set(authenticatedChats);
              nextAuth.add(chatId);
              setAuthenticatedChats(nextAuth);
              setSelectedChatId(chatId);
              setActiveTab('chat');
              setLockedChatToOpen(null);
            }}
            onCancel={() => setLockedChatToOpen(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating Back to Top button for scrollbar feeds */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (activeScrollElRef.current) {
                activeScrollElRef.current.scrollTo({
                  top: 0,
                  behavior: 'smooth'
                });
              }
            }}
            className="fixed bottom-24 md:bottom-8 left-6 md:left-8 z-[80] p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl shadow-blue-600/40 border border-blue-500/30 flex items-center justify-center transition-all group cursor-pointer"
            title="الرجوع للأعلى"
          >
            <ChevronUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
