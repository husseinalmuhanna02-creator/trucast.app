import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useLanguage } from '../localization';
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
  ParticipantView,
  useStreamVideoClient,
} from '@stream-io/video-react-sdk';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Radio, 
  X, 
  LogOut, 
  Eye, 
  Send, 
  ArrowDown,
  RefreshCw,
  Info,
  Monitor,
  Volume2,
  Sparkles,
  Image,
  Settings,
  UserPlus,
  Users,
  Zap,
  BarChart2,
  HelpCircle,
  Copy,
  Check,
  Trophy,
  Play,
  Pause,
  Square,
  VolumeX,
  SlidersHorizontal,
  Flame,
  AlertCircle,
  Heart,
  Pin,
  ShieldCheck,
  Ban,
  Share2,
  Maximize2,
  Palette
} from 'lucide-react';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { getApiUrl } from '../config';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc,
  getDoc,
  getDocs,
  writeBatch,
  where,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { StreamAudioPlayer } from './StreamAudioPlayer';

// Sub-component to safely consume Stream Video contexts/hooks
const LiveStreamContent = ({ 
  isHost,
  streamId,
  currentUser,
  userProfile,
  onClose,
  onNavigateToUser
}: { 
  isHost: boolean,
  streamId?: string,
  currentUser: FirebaseUser | null,
  userProfile?: any,
  onClose: () => void,
  onNavigateToUser?: (uid: string) => void
}) => {
  const call = useCall();
  const { t, isRtl } = useLanguage();
  const { 
    useCameraState, 
    useMicrophoneState, 
    useScreenShareState, 
    useParticipants, 
    useParticipantCount,
    useRemoteParticipants,
    useHasPermissions,
    useCallEndedAt
  } = useCallStateHooks();
  const { status: camStatus } = useCameraState();
  const { status: micStatus } = useMicrophoneState();
  const { isEnabled: isScreenSharing } = useScreenShareState();
  const participants = useParticipants();
  const participantCount = useParticipantCount();
  const remoteParticipants = useRemoteParticipants();

  // Find host participant early
  const localParticipant = participants.find(p => p.isLocalParticipant);
  const broadcaster = remoteParticipants.find(p => {
    const roles = p.roles || [];
    const isCreator = p.userId === call?.state?.createdBy?.id;
    return isCreator || roles.includes('admin') || roles.includes('host') || roles.includes('broadcaster');
  }) || remoteParticipants.find(p => p.roles?.includes('host') || p.roles?.includes('admin')) || remoteParticipants[0];

  const streamHostParticipant = isHost ? localParticipant : (broadcaster || localParticipant);

  const endedAt = useCallEndedAt();
  const isCallEnded = endedAt !== null && endedAt !== undefined;

  const [isGuestApproved, setIsGuestApproved] = useState(false);
  const hasAudioPermission = useHasPermissions('send-audio');
  const hasVideoPermission = useHasPermissions('send-video');
  const isApprovedGuest = !isHost && hasAudioPermission && isGuestApproved;

  const [hadAudioPermissionOnce, setHadAudioPermissionOnce] = useState(false);

  useEffect(() => {
    if (isGuestApproved && hasAudioPermission) {
      setHadAudioPermissionOnce(true);
    } else if (!isGuestApproved) {
      setHadAudioPermissionOnce(false);
    }
  }, [isGuestApproved, hasAudioPermission]);

  // الاستماع الحي لسحب الصلاحية أو النزول للجمهور (Revocation Detection)
  useEffect(() => {
    if (isHost || !call) return;

    // إذا كان المستخدم ضيفاً معتمداً، وتم سحب صلاحية الصوت منه (hasAudioPermission أصبحت false) بعد أن كانت true
    if (isGuestApproved && !hasAudioPermission && hadAudioPermissionOnce) {
      call.camera.disable().catch((e) => console.warn("Error disabling camera on permission revoke:", e));
      call.microphone.disable().catch((e) => console.warn("Error disabling microphone on permission revoke:", e));
      setIsGuestApproved(false);
      setShowApprovedNotification(false);
      setHasRequestedJoin(false);
      setHadAudioPermissionOnce(false);
      triggerToast("👥 تم سحب صلاحية التحدث والعودة للجمهور.");
    }
  }, [hasAudioPermission, isGuestApproved, isHost, call, hadAudioPermissionOnce]);

  // Force disable mic & camera for non-hosts (viewers) on join, except approved guests
  useEffect(() => {
    if (!isHost && !isApprovedGuest && !isGuestApproved && call) {
      call.camera.disable().catch((e) => console.warn("Error disabling camera:", e));
      call.microphone.disable().catch((e) => console.warn("Error disabling microphone:", e));
    }
  }, [isHost, isApprovedGuest, isGuestApproved, call]);

  // Requirement 1: Force disable camera & microphone for the host on initial load of the livestream content
  useEffect(() => {
    if (isHost && call) {
      call.camera.disable().catch((e) => console.warn("Error disabling host camera on mount:", e));
      call.microphone.disable().catch((e) => console.warn("Error disabling host microphone on mount:", e));
    }
  }, [isHost, call]);

  const isCamOn = camStatus === 'enabled';
  const isMicOn = micStatus === 'enabled';

  const [comments, setComments] = useState<any[]>([]);
  const [joinNotifications, setJoinNotifications] = useState<any[]>([]);
  const [likesCount, setLikesCount] = useState<number>(() => (call?.state?.custom as any)?.likes_count || 0);
  const [flyingHearts, setFlyingHearts] = useState<Array<{ id: string; left: number; color: string; scale: number; speed: number; xOffset: number }>>([]);
  const [newComment, setNewComment] = useState("");
  const [isConfessionMode, setIsConfessionMode] = useState<boolean>(false);
  const [confessionEndTime, setConfessionEndTime] = useState<any>(null);
  const [confessionTimeLeft, setConfessionTimeLeft] = useState<number>(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showViewerLeaveConfirm, setShowViewerLeaveConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isControlPanelVisible, setIsControlPanelVisible] = useState(true);

  const client = useStreamVideoClient();
  const [pendingGuestInvite, setPendingGuestInvite] = useState<any>(null);
  const [hasReceivedInvite, setHasReceivedInvite] = useState(false);
  const [pendingCohostInvite, setPendingCohostInvite] = useState<any>(null);
  const isLocalCohostRef = useRef(false);

  // Active Co-Host State Tracking
  const [coHostStreamId, setCoHostStreamId] = useState<string | null>(null);
  const [coHostName, setCoHostName] = useState<string | null>(null);
  const [coHostPhoto, setCoHostPhoto] = useState<string | null>(null);
  const [coHostActive, setCoHostActive] = useState<boolean>(false);
  const [coHostUserId, setCoHostUserId] = useState<string | null>(null);

  // Request to Join States
  const [hasRequestedJoin, setHasRequestedJoin] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Array<{ senderId: string, senderName: string, senderPhoto?: string }>>([]);
  const [showApprovedNotification, setShowApprovedNotification] = useState(false);
  const [inviteActiveTab, setInviteActiveTab] = useState<'guests' | 'cohosts'>('guests');
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [fetchingCalls, setFetchingCalls] = useState(false);

  // Real-Time Interaction and Modals States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Settings State Values
  const [videoQuality, setVideoQuality] = useState('720p');
  const [audioVolume, setAudioVolume] = useState(80);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'general' | 'moderators' | 'muted' | 'banned' | 'requests'>('general');
  const [activeGuestOptionsUserId, setActiveGuestOptionsUserId] = useState<string | null>(null);
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  // Guest Context Menu States & Timing
  const [activeContextMenuUserId, setActiveContextMenuUserId] = useState<string | null>(null);
  const [contextMenuCoords, setContextMenuCoords] = useState<{ x: number, y: number } | null>(null);
  const guestLongPressTimerRef = useRef<any>(null);

  const [isFollowingTarget, setIsFollowingTarget] = useState<boolean>(false);
  const [targetFollowingMe, setTargetFollowingMe] = useState<boolean>(false);

  const [isFollowingHost, setIsFollowingHost] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser || !streamHostParticipant?.userId) {
      setIsFollowingHost(false);
      return;
    }

    if (currentUser.uid === streamHostParticipant.userId) {
      setIsFollowingHost(false);
      return;
    }

    const checkHostFollow = async () => {
      try {
        const followingRef = doc(db, 'users', currentUser.uid, 'following', streamHostParticipant.userId);
        const followingSnap = await getDoc(followingRef);
        setIsFollowingHost(followingSnap.exists());
      } catch (err) {
        console.warn("Error checking host follow status:", err);
      }
    };

    checkHostFollow();
  }, [streamHostParticipant?.userId, currentUser]);

  useEffect(() => {
    if (!currentUser || !activeContextMenuUserId) {
      setIsFollowingTarget(false);
      setTargetFollowingMe(false);
      return;
    }

    const checkFollowStatuses = async () => {
      try {
        const followingRef = doc(db, 'users', currentUser.uid, 'following', activeContextMenuUserId);
        const followingSnap = await getDoc(followingRef);
        setIsFollowingTarget(followingSnap.exists());

        const followersRef = doc(db, 'users', currentUser.uid, 'followers', activeContextMenuUserId);
        const followersSnap = await getDoc(followersRef);
        setTargetFollowingMe(followersSnap.exists());
      } catch (err) {
        console.warn("Error checking follow statuses:", err);
      }
    };

    checkFollowStatuses();
  }, [activeContextMenuUserId, currentUser]);

  const handleToggleFollowHost = async () => {
    if (!currentUser || !streamHostParticipant?.userId) return;
    const targetUserId = streamHostParticipant.userId;
    const targetName = streamHostParticipant.name || 'المضيف';
    const targetPhoto = streamHostParticipant.image || '';
    const activeId = streamId || "live_stream";

    const batch = writeBatch(db);
    const followerRef = doc(db, 'users', targetUserId, 'followers', currentUser.uid);
    const followingRef = doc(db, 'users', currentUser.uid, 'following', targetUserId);
    const targetUserRef = doc(db, 'users', targetUserId);
    const currentUserRef = doc(db, 'users', currentUser.uid);

    try {
      if (isFollowingHost) {
        // Unfollow
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
        await batch.commit();
        setIsFollowingHost(false);
        triggerToast(`تم إلغاء متابعة ${targetName}`);
      } else {
        // Follow
        batch.set(followerRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'مستمع',
          userPhoto: currentUser.photoURL || '',
          createdAt: serverTimestamp()
        });
        batch.set(followingRef, {
          userId: targetUserId,
          userName: targetName,
          userPhoto: targetPhoto,
          createdAt: serverTimestamp()
        });
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
        
        // Add follow notification
        const notifRef = doc(collection(db, "users", targetUserId, "notifications"));
        batch.set(notifRef, {
          title: "متابعة جديدة 👤",
          body: `${currentUser.displayName || "المستمع"} بدأ في متابعتك`,
          type: "follow",
          senderId: currentUser.uid,
          senderName: currentUser.displayName || "المستمع",
          senderPhoto: currentUser.photoURL || "",
          read: false,
          createdAt: serverTimestamp()
        });

        await batch.commit();
        setIsFollowingHost(true);
        triggerToast(`تمت متابعة ${targetName}`);

        // Write a follow_notice comment in live comments collection
        try {
          await addDoc(collection(db, "lives", activeId, "comments"), {
            text: `تابع المضيف 👤`,
            userId: currentUser.uid,
            userName: userProfile?.displayName || currentUser.displayName || "مستمع",
            userPhoto: userProfile?.avatarUrl || currentUser.photoURL || "",
            createdAt: serverTimestamp(),
            type: "follow_notice"
          });

          // Increment comments count on the live stream document for Trending score
          updateDoc(doc(db, "lives", activeId), {
            commentsCount: increment(1),
            trendingScore: increment(3)
          }).catch(e => console.warn("Failed to increment commentsCount:", e));
        } catch (commentErr) {
          console.warn("Failed to post follow notice comment:", commentErr);
        }
      }
    } catch (err) {
      console.error("Error toggling follow host:", err);
      triggerToast("عذراً، فشل تنفيذ العملية");
    }
  };

  const handleToggleFollowGuest = async (targetUserId: string, targetName: string, targetPhoto: string) => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    const followerRef = doc(db, 'users', targetUserId, 'followers', currentUser.uid);
    const followingRef = doc(db, 'users', currentUser.uid, 'following', targetUserId);
    const targetUserRef = doc(db, 'users', targetUserId);
    const currentUserRef = doc(db, 'users', currentUser.uid);

    try {
      if (isFollowingTarget) {
        // Unfollow
        batch.delete(followerRef);
        batch.delete(followingRef);
        batch.update(targetUserRef, { followersCount: increment(-1) });
        batch.update(currentUserRef, { followingCount: increment(-1) });
        await batch.commit();
        setIsFollowingTarget(false);
        triggerToast(`تم إلغاء متابعة ${targetName}`);
      } else {
        // Follow
        batch.set(followerRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || 'مستضيف',
          userPhoto: currentUser.photoURL || '',
          createdAt: serverTimestamp()
        });
        batch.set(followingRef, {
          userId: targetUserId,
          userName: targetName || 'ضيف',
          userPhoto: targetPhoto || '',
          createdAt: serverTimestamp()
        });
        batch.update(targetUserRef, { followersCount: increment(1) });
        batch.update(currentUserRef, { followingCount: increment(1) });
        
        // Add follow notification
        const notifRef = doc(collection(db, "users", targetUserId, "notifications"));
        batch.set(notifRef, {
          title: "متابعة جديدة 👤",
          body: `${currentUser.displayName || "المستضيف"} بدأ في متابعتك`,
          type: "follow",
          senderId: currentUser.uid,
          senderName: currentUser.displayName || "المستضيف",
          senderPhoto: currentUser.photoURL || "",
          read: false,
          createdAt: serverTimestamp()
        });

        await batch.commit();
        setIsFollowingTarget(true);
        triggerToast(`تمت متابعة ${targetName}`);
      }
    } catch (err) {
      console.error("Error toggling follow guest:", err);
      triggerToast("عذراً، فشل تنفيذ العملية");
    }
  };

  const startGuestLongPress = (e: React.MouseEvent | React.TouchEvent, userId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (guestLongPressTimerRef.current) clearTimeout(guestLongPressTimerRef.current);

    guestLongPressTimerRef.current = setTimeout(() => {
      setActiveContextMenuUserId(userId);
      setContextMenuCoords({ x: clientX, y: clientY });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const cancelGuestLongPress = () => {
    if (guestLongPressTimerRef.current) {
      clearTimeout(guestLongPressTimerRef.current);
      guestLongPressTimerRef.current = null;
    }
  };

  const handleGuestContextMenu = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    setActiveContextMenuUserId(userId);
    setContextMenuCoords({ x: e.clientX, y: e.clientY });
  };

  // Whiteboard, Mute on Entry, and custom audio role states
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [whiteboardLines, setWhiteboardLines] = useState<any[]>([]);
  const [isGuestMutedByHost, setIsGuestMutedByHost] = useState(false);
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [hostMutedParticipants, setHostMutedParticipants] = useState<string[]>([]);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [localMutedUsers, setLocalMutedUsers] = useState<string[]>([]);

  // Moderation States
  const [pinnedComment, setPinnedComment] = useState<any | null>(null);
  const [moderators, setModerators] = useState<string[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [firestoreApprovedGuests, setFirestoreApprovedGuests] = useState<string[]>([]);
  const [selectedCommentForMod, setSelectedCommentForMod] = useState<any | null>(null);
  const [streamHostId, setStreamHostId] = useState<string | null>(null);

  const longPressTimerRef = useRef<any>(null);

  const chatStreamItems = useMemo(() => {
    const getTimestampMs = (createdAt: any) => {
      if (!createdAt) return Date.now();
      if (typeof createdAt.toMillis === 'function') return createdAt.toMillis();
      if (createdAt.seconds !== undefined) return createdAt.seconds * 1000;
      if (createdAt instanceof Date) return createdAt.getTime();
      if (typeof createdAt === 'number') return createdAt;
      return Date.now();
    };

    const merged = [
      ...comments.map(c => ({ ...c, isJoinNotice: false })),
      ...joinNotifications.map(j => ({ ...j, isJoinNotice: true }))
    ];
    return merged.sort((a, b) => getTimestampMs(a.createdAt) - getTimestampMs(b.createdAt));
  }, [comments, joinNotifications]);

  const isModerator = currentUser ? moderators.includes(currentUser.uid) : false;

  const startLongPress = (comment: any) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedCommentForMod(comment);
      setActiveBottomSheet('moderation');
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const getUserDetails = (uid: string) => {
    const foundInComments = comments.find((c: any) => c.userId === uid);
    if (foundInComments) {
      return {
        displayName: foundInComments.userName,
        photoURL: foundInComments.userPhoto
      };
    }
    const foundInParticipants = participants.find((p: any) => p.userId === uid);
    if (foundInParticipants) {
      return {
        displayName: foundInParticipants.name || uid,
        photoURL: foundInParticipants.image
      };
    }
    return {
      displayName: `مستخدم (${uid.substring(0, 5)}...)`,
      photoURL: ""
    };
  };

  const pinComment = async (comment: any) => {
    if (!(isHost || isModerator)) return;
    try {
      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        pinnedComment: {
          id: comment.id,
          text: comment.text,
          userName: comment.userName,
          userPhoto: comment.userPhoto || "",
          userId: comment.userId
        }
      });
      triggerToast("تم تثبيت التعليق بنجاح 📌");
    } catch (err) {
      console.error("Error pinning comment:", err);
    }
  };

  const unpinComment = async () => {
    if (!(isHost || isModerator)) return;
    try {
      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        pinnedComment: null
      });
      triggerToast("تم إلغاء تثبيت التعليق 📌");
    } catch (err) {
      console.error("Error unpinning comment:", err);
    }
  };

  const handleKickGuest = async (userId: string, userName: string) => {
    if (!call) return;
    try {
      await call.revokePermissions(userId, ['send-audio', 'send-video']);
      
      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        approvedGuests: arrayRemove(userId)
      }).catch(e => console.warn("Failed to remove from approvedGuests:", e));

      call.sendCustomEvent({
        type: 'revoke_guest',
        custom: {
          type: 'revoke_guest',
          targetUserId: userId
        }
      }).catch((err: any) => console.warn(err));
      triggerToast(`👥 تم إنزال الضيف ${userName || userId} للجمهور.`);
    } catch (err) {
      console.error(err);
      triggerToast("فشل إنزال الضيف");
    }
  };

  const handleStepDown = async () => {
    if (!call || !currentUser) return;
    try {
      await call.camera.disable().catch((e: any) => console.warn("StepDown: camera.disable error:", e));
      await call.microphone.disable().catch((e: any) => console.warn("StepDown: microphone.disable error:", e));
      
      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        approvedGuests: arrayRemove(currentUser.uid)
      }).catch((e: any) => console.warn("Failed to remove from approvedGuests:", e));

      await call.sendCustomEvent({
        type: 'revoke_guest',
        custom: {
          type: 'revoke_guest',
          targetUserId: currentUser.uid
        }
      }).catch((err: any) => console.warn(err));

      setIsGuestApproved(false);
      setShowApprovedNotification(false);
      setHasRequestedJoin(false);
      
      triggerToast("👥 قمت بالنزول من منصة التحدث إلى الجمهور.");
    } catch (err) {
      console.error("Error stepping down:", err);
      triggerToast("فشل النزول من المنصة");
    }
  };

  const toggleParticipantMuteFirestore = async (userId: string, targetName: string, isCurrentlyMuted: boolean) => {
    let updatedMutedList = [...hostMutedParticipants];
    const isMe = userId === (call?.currentUserId || currentUser?.uid);
    const activeId = streamId || "live_stream";
    
    if (isCurrentlyMuted) {
      // Unmute
      updatedMutedList = updatedMutedList.filter(uid => uid !== userId);
      
      // Immediate UI State Update
      setHostMutedParticipants(updatedMutedList);
      
      // Update Firestore Database in real-time
      try {
        await updateDoc(doc(db, "lives", activeId), {
          hostMutedParticipants: updatedMutedList
        });
      } catch (err) {
        console.error("Firestore update failed:", err);
      }

      // SDK / Custom Event Action
      if (isMe) {
        try {
          if (!isMicOn) {
            await toggleMic();
          }
        } catch (err) {
          console.error("Error toggling mic:", err);
        }
      } else {
        if (call) {
          call.sendCustomEvent({
            type: 'host_unmute_user',
            custom: {
              type: 'host_unmute_user',
              targetUserId: userId
            }
          }).catch((err: any) => console.warn(err));
        }
        triggerToast(`🔊 تم إرسال طلب تشغيل الصوت لـ ${targetName}`);
      }
    } else {
      // Mute
      if (!updatedMutedList.includes(userId)) {
        updatedMutedList.push(userId);
      }
      
      // Immediate UI State Update
      setHostMutedParticipants(updatedMutedList);
      
      // Update Firestore Database in real-time
      try {
        await updateDoc(doc(db, "lives", activeId), {
          hostMutedParticipants: updatedMutedList
        });
      } catch (err) {
        console.error("Firestore update failed:", err);
      }

      // SDK / Custom Event Action
      if (isMe) {
        try {
          if (isMicOn) {
            await toggleMic();
          }
        } catch (err) {
          console.error("Error toggling mic:", err);
        }
      } else {
        if (call) {
          call.muteUser(userId, 'audio').catch((err: any) => console.warn(err));
          call.sendCustomEvent({
            type: 'host_mute_user',
            custom: {
              type: 'host_mute_user',
              targetUserId: userId
            }
          }).catch((err: any) => console.warn(err));
        }
        triggerToast(`🔇 تم كتم صوت ${targetName}`);
      }
    }
  };

  const promoteToModerator = async (userId: string, userName: string) => {
    if (!isHost) return;
    try {
      const activeId = streamId || "live_stream";
      const updatedMods = [...moderators];
      if (!updatedMods.includes(userId)) {
        updatedMods.push(userId);
      }
      await updateDoc(doc(db, "lives", activeId), {
        moderators: updatedMods
      });
      triggerToast(`تم ترقية ${userName} إلى مشرف بنجاح 🛡️`);
    } catch (err) {
      console.error("Error promoting to moderator:", err);
    }
  };

  const demoteFromModerator = async (userId: string, userName: string) => {
    if (!isHost) return;
    try {
      const activeId = streamId || "live_stream";
      const updatedMods = moderators.filter(id => id !== userId);
      await updateDoc(doc(db, "lives", activeId), {
        moderators: updatedMods
      });
      triggerToast(`تم إزالة صلاحيات الإشراف عن ${userName} 🛡️`);
    } catch (err) {
      console.error("Error demoting moderator:", err);
    }
  };

  const muteUser = async (userId: string, userName: string) => {
    try {
      const activeId = streamId || "live_stream";
      const updatedMuted = [...mutedUsers];
      if (!updatedMuted.includes(userId)) {
        updatedMuted.push(userId);
      }
      await updateDoc(doc(db, "lives", activeId), {
        mutedUsers: updatedMuted
      });
      triggerToast(`تم كتم المستخدم ${userName} وحذف تعليقاته 🔇`);
    } catch (err) {
      console.error("Error muting user:", err);
    }
  };

  const unmuteUser = async (userId: string, userName: string) => {
    try {
      const activeId = streamId || "live_stream";
      const updatedMuted = mutedUsers.filter(id => id !== userId);
      await updateDoc(doc(db, "lives", activeId), {
        mutedUsers: updatedMuted
      });
      triggerToast(`تم فك كتم المستخدم ${userName} 🔊`);
    } catch (err) {
      console.error("Error unmuting user:", err);
    }
  };

  const banUser = async (userId: string, userName: string) => {
    try {
      const activeId = streamId || "live_stream";
      const updatedBanned = [...bannedUsers];
      if (!updatedBanned.includes(userId)) {
        updatedBanned.push(userId);
      }
      if (call) {
        call.revokePermissions(userId, ['send-audio', 'send-video']).catch(e => console.warn(e));
      }
      await updateDoc(doc(db, "lives", activeId), {
        bannedUsers: updatedBanned
      });
      await purgeUserComments(userId);
      triggerToast(`تم حظر وطرد المستخدم ${userName} من البث 🚫`);
    } catch (err) {
      console.error("Error banning user:", err);
    }
  };

  const unbanUser = async (userId: string, userName: string) => {
    try {
      const activeId = streamId || "live_stream";
      const updatedBanned = bannedUsers.filter(id => id !== userId);
      await updateDoc(doc(db, "lives", activeId), {
        bannedUsers: updatedBanned
      });
      triggerToast(`تم إلغاء حظر المستخدم ${userName} 🔓`);
    } catch (err) {
      console.error("Error unbanning user:", err);
    }
  };

  const purgeUserComments = async (userId: string) => {
    try {
      const activeId = streamId || "live_stream";
      const q = query(collection(db, "lives", activeId, "comments"), where("userId", "==", userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.log(`Successfully deleted/purged all comments for user: ${userId}`);
    } catch (err) {
      console.error("Error purging user comments:", err);
    }
  };

  // Active Poll State
  const [activePoll, setActivePoll] = useState<{
    question: string;
    optionA: string;
    optionB: string;
    votesA: number;
    votesB: number;
    userVoted?: 'A' | 'B';
    totalVotes: number;
  } | null>(null);

  // Poll Forms Inputs
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptionA, setPollOptionA] = useState("");
  const [pollOptionB, setPollOptionB] = useState("");

  // Bottom Sheets States
  const [activeBottomSheet, setActiveBottomSheet] = useState<'background' | 'filters' | 'sound' | 'truth' | 'pk' | 'moderation' | 'share' | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);

  // Fetch active private/direct chats for internal sharing
  useEffect(() => {
    if (!currentUser || activeBottomSheet !== 'share') return;
    
    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const privateChats = chatList.filter((c: any) => c.type === 'private' || c.type === 'direct');
      setActiveChats(privateChats);
    }, (error) => {
      console.error("Error fetching chats for sharing:", error);
    });
    
    return () => unsub();
  }, [currentUser, activeBottomSheet]);

  // Listen to server call state changes to keep likesCount perfectly synchronized
  useEffect(() => {
    if (!call) return;
    const serverLikes = (call.state.custom as any)?.likes_count || 0;
    setLikesCount(serverLikes);
  }, [call, (call?.state?.custom as any)?.likes_count]);

  // Listen to server call state changes to keep expandedParticipantId perfectly synchronized for all participants
  useEffect(() => {
    if (!call) return;
    const serverExpandedId = (call.state.custom as any)?.expanded_participant_id || null;
    setExpandedParticipantId(serverExpandedId);
  }, [call, (call?.state?.custom as any)?.expanded_participant_id]);

  // Listen to custom co-hosting & guest events
  useEffect(() => {
    if (!call) return;

    const handleCustomEvent = (event: any) => {
      if (event.type === 'like_reaction' || (event.custom && event.custom.type === 'like_reaction')) {
        setLikesCount(prevCount => prevCount + 1);
        const colors = ['#ef4444', '#ec4899', '#f43f5e', '#e11d48', '#ff007f', '#ff5a5f', '#d946ef', '#a855f7'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomLeft = 15 + Math.random() * 70;
        const randomScale = 0.7 + Math.random() * 0.7;
        const randomSpeed = 1.5 + Math.random() * 1.0;
        const randomXOffset = (Math.random() - 0.5) * 120;
        const id = Math.random().toString(36).substring(2, 9);
        setFlyingHearts(prev => [...prev, { id, left: randomLeft, color: randomColor, scale: randomScale, speed: randomSpeed, xOffset: randomXOffset }]);
        setTimeout(() => {
          setFlyingHearts(prev => prev.filter(h => h.id !== id));
        }, 2500);
        return;
      }
      const data = event.custom;
      if (!data) return;

      const eventType = data.type || event.custom?.type || event.type;

      if (eventType === 'invite_guest' && data.targetUserId === call.currentUserId) {
        setPendingGuestInvite(data);
      } else if (eventType === 'invite_cohost' && data.targetUserId === call.currentUserId) {
        setPendingCohostInvite(data);
      } else if (eventType === 'request_to_join' && isHost) {
        const senderId = data.senderId || data.userId || event.user?.id || event.userId;
        const senderName = data.senderName || data.userName || event.user?.name || "مشاهد";
        const senderPhoto = data.senderPhoto || data.userPhoto || event.user?.image || "";
        if (!senderId) return;
        setPendingRequests(prev => {
          if (prev.some(req => req.senderId === senderId)) return prev;
          return [...prev, { senderId, senderName, senderPhoto }];
        });
        triggerToast(`طلب انضمام جديد من ${senderName} ✋`);
      } else if (eventType === 'accept_invite_response' && isHost) {
        const targetUserId = data.viewerId || data.userId || event.user?.id || event.userId;
        const viewerName = data.viewerName || "ضيف";
        if (!targetUserId) return;
        call.grantPermissions(targetUserId, ['send-audio', 'send-video'])
          .then(async () => {
            const activeId = streamId || "live_stream";
            await updateDoc(doc(db, "lives", activeId), {
              approvedGuests: arrayUnion(targetUserId)
            }).catch(e => console.warn(e));
            triggerToast(`تم قبول الدعوة! تم منح صلاحية التحدث والكاميرا للضيف ${viewerName} 🎉`);
          })
          .catch(err => {
            console.error("Error granting permissions:", err);
            triggerToast(`فشل منح الصلاحية للضيف: ${viewerName}`);
          });
      } else if (eventType === 'accept_cohost_response' && isHost) {
        const targetUserId = data.otherHostId || data.userId || event.user?.id || event.userId;
        const otherHostName = data.otherHostName || "مضيف مشترك";
        if (!targetUserId) return;
        call.grantPermissions(targetUserId, ['send-audio', 'send-video'])
          .then(() => {
            triggerToast(`تم قبول دعوة البث المشترك! تم دمج المضيف المشترك ${otherHostName} 👥`);
          })
          .catch(err => {
            console.error("Error granting co-host permissions:", err);
            triggerToast(`فشل دمج المضيف المشترك: ${otherHostName}`);
          });
      } else if (eventType === 'disconnect_cohost') {
        triggerToast("تم إنهاء البث المشترك وفصل الربط من قبل المضيف الآخر 👥🛑");
      }
    };

    const unsubscribe = call.on('custom', handleCustomEvent);
    return () => {
      unsubscribe();
    };
  }, [call, isHost, currentUser, userProfile]);

  // Dedicated useEffect to listen to guest invitations for viewers (Requirement 4)
  useEffect(() => {
    if (isHost || !call || !currentUser) return;

    let isMounted = true;
    const currentUserId = call.currentUserId || currentUser?.uid;

    const handleViewerCustomEvent = async (event: any) => {
      if (!event.custom) return;

      const targetId = event.custom?.targetUserId || event.custom?.custom?.targetUserId;

      if (targetId === currentUserId) {
        if (event.custom.type === 'guest_request_approved' || event.custom.custom?.type === 'guest_request_approved') {
          if (!isMounted) return;
          setIsGuestApproved(true);
          setShowApprovedNotification(true);
          
          try {
            // First: Force Connection Upgrade
            try {
              await call.requestPermissions({ permissions: ['send-audio', 'send-video'] });
            } catch (permErr) {
              console.warn("Failed requesting send-audio/send-video, trying publish_audio/publish_video:", permErr);
              try {
                await call.requestPermissions({ permissions: ['publish_audio', 'publish_video'] });
              } catch (permErr2) {
                console.warn("Failed both permission requests:", permErr2);
              }
            }

            try {
              await call.join();
            } catch (joinErr) {
              console.warn("Error calling call.join() during upgrade, continuing anyway:", joinErr);
            }
            
            // Second: Enable microphone, disable camera (optional control by guest)
            try {
              await call.microphone.enable();
            } catch (micErr) {
              console.warn("Error enabling microphone:", micErr);
            }
            
            try {
              await call.camera.disable();
            } catch (camErr) {
              console.warn("Error disabling camera:", camErr);
            }
          } catch (e) {
            console.warn("Error during guest connection upgrade:", e);
          }

          if (isMounted) {
            triggerToast("🎉 تمت الموافقة على طلب الصعود للمايك! يمكنك الآن التحدث.");
          }
        }
        if (event.custom.type === 'host_invite_guest' || event.custom.custom?.type === 'host_invite_guest') {
          if (isMounted) {
            setPendingGuestInvite({
              hostId: event.custom.hostId || event.custom.custom?.hostId || 'host',
              hostName: event.custom.hostName || event.custom.custom?.hostName || 'المضيف'
            });
            setHasReceivedInvite(true); // لإظهار نافذة الموافقة أو الرفض للمشاهد
          }
        }
      }

      // ثالثاً: الاستماع لسحب الدعوة أو التنزيل
      if ((event.custom.type === 'revoke_guest' || event.custom.custom?.type === 'revoke_guest') && targetId === currentUserId) {
        try {
          await call.camera.disable();
          await call.microphone.disable();
        } catch (e) {
          console.warn("Error disabling tracks on revoke:", e);
        }
        if (isMounted) {
          setIsGuestApproved(false);
          setShowApprovedNotification(false);
          setHasRequestedJoin(false);
          setHasReceivedInvite(false);
          triggerToast("👥 تم إنزالك من منصة التحدث إلى الجمهور.");
        }
      }
    };

    const unsubscribe = call.on('custom', handleViewerCustomEvent);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [call, isHost, currentUser]);

  // Global custom events sync for Whiteboard, Raise Hand and host Muting
  useEffect(() => {
    if (!call) return;
    
    const handleGlobalCustomEvent = (event: any) => {
      if (!event.custom) return;
      
      const payload = event.custom.custom || {};
      const currentUserId = call.currentUserId || currentUser?.uid;

      // 1. Whiteboard state sync for everyone
      if (event.custom.type === 'whiteboard_state') {
        const isDrawer = (isHost || isModerator) && (event.user?.id === call.currentUserId);
        if (!isDrawer) {
          setIsWhiteboardOpen(!!payload.isOpen);
          if (payload.lines) {
            setWhiteboardLines(payload.lines);
          }
        }
      }
      
      // 2. Raise hand notification for hosts/moderators
      if (event.custom.type === 'raise_hand_unmute') {
        if (isHost || isModerator) {
          triggerToast(`✋ الضيف ${payload.userName || 'غير معروف'} يطلب فك الكتم!`);
        }
      }

      // 3. Host mute notification for the specific guest
      if (event.custom.type === 'host_mute_user' && payload.targetUserId === currentUserId) {
        setIsGuestMutedByHost(true);
        triggerToast("🔇 لقد تم كتم صوتك من قبل المضيف/المشرف.");
        call.microphone.disable().catch((e: any) => console.warn(e));
      }

      // 4. Host unmute notification for the specific guest
      if (event.custom.type === 'host_unmute_user' && payload.targetUserId === currentUserId) {
        setIsGuestMutedByHost(false);
        triggerToast("🔊 سمح لك المضيف/المشرف بالحديث الآن! يمكنك تشغيل المايك.");
      }

      // 5. Host disable video notification for the specific guest
      if (event.custom.type === 'host_disable_video' && payload.targetUserId === currentUserId) {
        triggerToast("📷 لقد تم إيقاف الكاميرا الخاصة بك من قبل المضيف/المشرف.");
        call.camera.disable().catch((e: any) => console.warn(e));
      }

      // 6. Host request to enable video notification for the specific guest
      if (event.custom.type === 'host_enable_video' && payload.targetUserId === currentUserId) {
        triggerToast("📷 يطلب منك المضيف/المشرف تشغيل الكاميرا الخاصة بك.");
      }
    };

    const unsubscribe = call.on('custom', handleGlobalCustomEvent);
    return () => unsubscribe();
  }, [call, isHost, isModerator, currentUser]);

  // Dedicated useEffect to listen to join requests and accept responses for the host (Requirement 4)
  useEffect(() => {
    if (!isHost || !call || !currentUser) return;

    const handleHostCustomEvent = (event: any) => {
      const data = event.custom || event || {};
      const eventType = data.type || event.type || '';

      if (eventType === 'request_to_join') {
        const senderId = data.senderId || data.userId || event.user?.id || event.userId;
        const senderName = data.senderName || data.userName || event.user?.name || "مشاهد";
        const senderPhoto = data.senderPhoto || data.userPhoto || event.user?.image || "";
        if (!senderId) return;
        setPendingRequests(prev => {
          if (prev.some(req => req.senderId === senderId)) return prev;
          return [...prev, { senderId, senderName, senderPhoto }];
        });
        triggerToast(`طلب انضمام جديد من ${senderName} ✋`);
      } else if (eventType === 'accept_invite_response') {
        const targetUserId = data.viewerId || data.userId || event.user?.id || event.userId;
        const viewerName = data.viewerName || "ضيف";
        if (!targetUserId) return;
        call.grantPermissions(targetUserId, ['send-audio', 'send-video'])
          .then(async () => {
            const activeId = streamId || "live_stream";
            await updateDoc(doc(db, "lives", activeId), {
              approvedGuests: arrayUnion(targetUserId)
            }).catch(e => console.warn(e));
            triggerToast(`تم قبول الدعوة! تم منح صلاحية التحدث والكاميرا للضيف ${viewerName} 🎉`);
          })
          .catch((err: any) => {
            console.error("Error granting permissions:", err);
            triggerToast(`فشل منح الصلاحية للضيف: ${viewerName}`);
          });
      } else if (eventType === 'accept_cohost_response') {
        const targetUserId = data.otherHostId || data.userId || event.user?.id || event.userId;
        const otherHostName = data.otherHostName || "مضيف مشترك";
        if (!targetUserId) return;
        call.grantPermissions(targetUserId, ['send-audio', 'send-video'])
          .then(() => {
            triggerToast(`تم قبول دعوة البث المشترك! تم دمج المضيف المشترك ${otherHostName} 👥`);
          })
          .catch((err: any) => {
            console.error("Error granting co-host permissions:", err);
            triggerToast(`فشل دمج المضيف المشترك: ${otherHostName}`);
          });
      }
    };

    const unsubscribe = call.on('custom', handleHostCustomEvent);
    return () => {
      unsubscribe();
    };
  }, [call, isHost, currentUser]);

  // Listen to participant joined event (Join Notification)
  useEffect(() => {
    if (!call) return;
    const processedJoins = new Set<string>();

    const handleJoin = (event: any) => {
      const user = event.participant?.user || event.user;
      if (user) {
        if (user.id === currentUser?.uid) return;
        
        // Deduplicate events for the same user within 5 seconds
        const key = `${user.id}-${Math.floor(Date.now() / 5000)}`;
        if (processedJoins.has(key)) return;
        processedJoins.add(key);

        const name = user.name || user.custom?.name || user.id || "مشاهد جديد";
        setJoinNotifications(prev => [
          ...prev,
          {
            id: `join-${user.id}-${Date.now()}-${Math.random()}`,
            isJoinNotice: true,
            userName: name,
            createdAt: new Date()
          }
        ]);

        if (muteOnEntry && (isHost || isModerator)) {
          call.muteUser(user.id, 'audio').catch((e: any) => console.warn("Error muting joined user audio:", e));
          call.muteUser(user.id, 'video').catch((e: any) => console.warn("Error muting joined user video:", e));
          triggerToast(`🔇 تم كتم المنضم الجديد تلقائياً: ${name}`);
        }
      }
    };

    const unsub1 = call.on('call.session_participant_joined', handleJoin);
    const unsub2 = call.on('participantJoined', handleJoin);
    
    return () => {
      unsub1();
      unsub2();
    };
  }, [call, currentUser, muteOnEntry, isHost, isModerator]);

  // Auto-enable camera and microphone when granted permissions and explicitly approved!
  useEffect(() => {
    if (!call || isHost || !isGuestApproved) return;
    const hasAudioPerm = call.state.ownCapabilities?.includes('send-audio');
    const hasVideoPerm = call.state.ownCapabilities?.includes('send-video');
    if (hasAudioPerm) {
      call.microphone.enable().catch(e => console.warn("Auto microphone enable failed:", e));
    }
    if (hasVideoPerm) {
      if (isLocalCohostRef.current) {
        call.camera.enable().catch(e => console.warn("Auto camera enable failed for co-host:", e));
      }
      // بالنسبة للضيوف العاديين، نترك لهم حرية تشغيل وإطفاء الكاميرا يدوياً عبر أزرار التحكم دون فرض الإغلاق التلقائي هنا
    }
  }, [call, isHost, isGuestApproved]);

  // Show approval notification when viewer is promoted to guest
  useEffect(() => {
    if (isApprovedGuest) {
      setShowApprovedNotification(true);
    } else {
      setShowApprovedNotification(false);
    }
  }, [isApprovedGuest]);

  const inviteGuest = async (targetUserId: string, targetName: string) => {
    if (!call) return;

    // Check limit: how many active guests (non-hosts who have send-audio permission or are speaking/on-stage)?
    const currentGuests = participants.filter(p => p.userId !== call.currentUserId && (((p as any).permissions?.includes('send-audio')) || p.roles?.includes('speaker')));
    if (currentGuests.length >= 8) {
      triggerToast("خطأ: لا يمكن تجاوز الحد الأقصى للضيوف (8 ضيوف نشطين)! ⚠️");
      return;
    }

    try {
      await call.sendCustomEvent({ type: 'host_invite_guest', custom: { targetUserId: targetUserId } });
      triggerToast(`تم إرسال دعوة الصعود للضيف ${targetName} ✉️`);
    } catch (err) {
      console.error("Error in inviteGuest wrapper:", err);
    }
  };

  const inviteCohost = async (targetUserId: string, targetName: string, targetStreamId?: string) => {
    if (!call) return;

    // Check limit: how many active hosts (co-hosts + primary host)?
    const currentHosts = participants.filter(p => p.roles?.includes('host') || ((p as any).permissions?.includes('send-audio')));
    if (currentHosts.length >= 4) {
      triggerToast("خطأ: لا يمكن تجاوز الحد الأقصى للمضيفين البث المشترك (4 مضيفين)! ⚠️");
      return;
    }

    try {
      // 1. Send via Stream Video custom event (for backward compatibility / same call sync)
      call.sendCustomEvent({
        type: 'invite_cohost',
        custom: {
          type: 'invite_cohost',
          targetUserId,
          hostId: call.currentUserId,
          hostName: userProfile?.displayName || currentUser?.displayName || 'المضيف',
          streamId: streamId || "live_stream"
        }
      }).catch(err => {
        console.error("Error sending co-host invite:", err);
      });

      // 2. Write to Firestore to ensure 100% reliable cross-stream delivery
      const targetId = targetStreamId || targetUserId;
      if (targetId) {
        await updateDoc(doc(db, "lives", targetId), {
          cohostInvite: {
            type: 'invite_cohost',
            targetUserId,
            hostId: currentUser?.uid || call.currentUserId,
            hostName: userProfile?.displayName || currentUser?.displayName || 'المضيف',
            hostPhoto: userProfile?.photoURL || currentUser?.photoURL || '',
            streamId: streamId || "live_stream",
            status: 'pending',
            createdAt: Date.now()
          }
        });
      }

      triggerToast(`تم إرسال دعوة بث مشترك إلى ${targetName} 👥`);
    } catch (err) {
      console.error("Error in inviteCohost wrapper:", err);
      triggerToast(`فشل إرسال الدعوة عبر قاعدة البيانات: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleAcceptGuestInvite = async () => {
    if (!call) return;
    try {
      setIsGuestApproved(true);

      call.sendCustomEvent({
        type: 'accept_invite_response',
        custom: {
          type: 'accept_invite_response',
          viewerId: call.currentUserId,
          viewerName: userProfile?.displayName || currentUser?.displayName || 'ضيف'
        }
      }).catch(err => {
        console.error("Error sending accept guest response:", err);
      });
      setPendingGuestInvite(null);
      setHasReceivedInvite(false);
      triggerToast("تم قبول الدعوة بنجاح! جاري الاتصال بالبث... 🎙️");
    } catch (err) {
      console.error("Error in handleAcceptGuestInvite wrapper:", err);
    }
  };

  const handleAcceptCohostInvite = async () => {
    if (!call || !pendingCohostInvite) return;
    try {
      isLocalCohostRef.current = true;
      call.sendCustomEvent({
        type: 'accept_cohost_response',
        custom: {
          type: 'accept_cohost_response',
          otherHostId: call.currentUserId,
          otherHostName: userProfile?.displayName || currentUser?.displayName || 'مضيف مشترك'
        }
      }).catch(err => {
        console.error("Error sending accept cohost response:", err);
      });

      const activeId = streamId || "live_stream";

      // 1. Write acceptance status and link cohost fields to Host A's stream document in Firestore
      if (pendingCohostInvite.streamId) {
        await updateDoc(doc(db, "lives", pendingCohostInvite.streamId), {
          cohostInvite: {
            hostId: currentUser?.uid || call.currentUserId,
            hostName: userProfile?.displayName || currentUser?.displayName || 'مضيف مشترك',
            streamId: activeId,
            status: 'accepted',
            createdAt: Date.now()
          },
          coHostStreamIds: arrayUnion(activeId),
          coHosts: arrayUnion({
            id: activeId,
            hostName: userProfile?.displayName || currentUser?.displayName || 'مضيف مشترك',
            hostPhoto: userProfile?.photoURL || currentUser?.photoURL || ''
          }),
          coHostStreamId: activeId,
          coHostName: userProfile?.displayName || currentUser?.displayName || 'مضيف مشترك',
          coHostPhoto: userProfile?.photoURL || currentUser?.photoURL || '',
          coHostActive: true,
          coHostUserId: currentUser?.uid || call.currentUserId
        }).catch(err => {
          console.error("Error writing cohost accept response to Host A's stream:", err);
        });
      }

      // 2. Clear cohostInvite and link cohost fields on Host B's (our own) stream document
      await updateDoc(doc(db, "lives", activeId), {
        cohostInvite: null,
        coHostStreamIds: arrayUnion(pendingCohostInvite.streamId),
        coHosts: arrayUnion({
          id: pendingCohostInvite.streamId,
          hostName: pendingCohostInvite.hostName || 'المضيف',
          hostPhoto: pendingCohostInvite.hostPhoto || ''
        }),
        coHostStreamId: pendingCohostInvite.streamId,
        coHostName: pendingCohostInvite.hostName || 'المضيف',
        coHostPhoto: pendingCohostInvite.hostPhoto || '',
        coHostActive: true,
        coHostUserId: pendingCohostInvite.hostId || null
      }).catch(err => {
        console.error("Error setting cohost fields on own stream:", err);
      });

      // 3. Add system comments to both streams to notify chats
      await addDoc(collection(db, "lives", activeId, "comments"), {
        userId: "system",
        userName: "البث المشترك 👥",
        userPhoto: "",
        text: `👥 بدأ البث المشترك الآن مع المضيف @${pendingCohostInvite.hostName}! تم دمج البثين والتعليقات بنجاح.`,
        createdAt: serverTimestamp()
      }).catch(err => console.error(err));

      if (pendingCohostInvite.streamId) {
        await addDoc(collection(db, "lives", pendingCohostInvite.streamId, "comments"), {
          userId: "system",
          userName: "البث المشترك 👥",
          userPhoto: "",
          text: `👥 بدأ البث المشترك الآن مع المضيف @${userProfile?.displayName || currentUser?.displayName || 'مضيف مشترك'}! تم دمج البثين والتعليقات بنجاح.`,
          createdAt: serverTimestamp()
        }).catch(err => console.error(err));
      }

      setPendingCohostInvite(null);
      triggerToast("تم قبول دعوة البث المشترك بنجاح! 🎙️👥");
    } catch (err) {
      console.error("Error in handleAcceptCohostInvite wrapper:", err);
    }
  };

  const handleDeclineCohostInvite = async () => {
    if (!call || !pendingCohostInvite) return;
    try {
      if (pendingCohostInvite.streamId) {
        await updateDoc(doc(db, "lives", pendingCohostInvite.streamId), {
          cohostInvite: {
            hostId: currentUser?.uid || call.currentUserId,
            hostName: userProfile?.displayName || currentUser?.displayName || 'مضيف مشترك',
            streamId: streamId || "live_stream",
            status: 'declined',
            createdAt: Date.now()
          }
        }).catch(err => console.error("Error writing decline response:", err));
      }

      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        cohostInvite: null
      }).catch(err => console.error("Error clearing cohostInvite on own stream:", err));

      setPendingCohostInvite(null);
      triggerToast("تم رفض دعوة البث المشترك 🛑");
    } catch (err) {
      console.error("Error in handleDeclineCohostInvite:", err);
      setPendingCohostInvite(null);
    }
  };

  const handleDisconnectCohost = async () => {
    try {
      const activeId = streamId || "live_stream";
      
      // 1. Clear cohost fields from our own stream document
      await updateDoc(doc(db, "lives", activeId), {
        coHostStreamId: null,
        coHostName: null,
        coHostPhoto: null,
        coHostActive: null,
        coHostStreamIds: [],
        coHosts: [],
        pkBattle: null
      });

      // 2. Clear cohost fields from the other host's stream document if we know their stream ID
      if (coHostStreamId) {
        await updateDoc(doc(db, "lives", coHostStreamId), {
          coHostStreamId: null,
          coHostName: null,
          coHostPhoto: null,
          coHostActive: null,
          coHostStreamIds: [],
          coHosts: [],
          pkBattle: null
        }).catch(err => console.error("Error clearing co-host stream document:", err));

        // Send custom event to notify the other host if they are active
        if (call) {
          call.sendCustomEvent({
            type: 'disconnect_cohost',
            custom: {
              type: 'disconnect_cohost',
              senderStreamId: activeId
            }
          }).catch(err => console.error("Error sending disconnect event:", err));
        }

        // Add system comments to both streams to notify chats about the split
        await addDoc(collection(db, "lives", activeId, "comments"), {
          userId: "system",
          userName: "البث المشترك 👥",
          userPhoto: "",
          text: `⚠️ انتهى البث المشترك وتم فصل الربط بنجاح.`,
          createdAt: serverTimestamp()
        }).catch(err => console.error(err));

        await addDoc(collection(db, "lives", coHostStreamId, "comments"), {
          userId: "system",
          userName: "البث المشترك 👥",
          userPhoto: "",
          text: `⚠️ انتهى البث المشترك وتم فصل الربط بنجاح.`,
          createdAt: serverTimestamp()
        }).catch(err => console.error(err));
      }

      triggerToast("تم إنهاء البث المشترك وفصل البثين بنجاح 👥🛑");
    } catch (err) {
      console.error("Error in handleDisconnectCohost:", err);
      triggerToast("حدث خطأ أثناء فصل البث المشترك");
    }
  };

  const handleRequestToJoin = async () => {
    if (!call) return;
    try {
      call.sendCustomEvent({
        type: 'request_to_join',
        custom: {
          type: 'request_to_join',
          senderId: call.currentUserId,
          senderName: userProfile?.displayName || currentUser?.displayName || 'مشاهد',
          senderPhoto: userProfile?.photoURL || currentUser?.photoURL || ''
        }
      }).catch(err => {
        console.error("Error sending request to join:", err);
      });
      setHasRequestedJoin(true);
      triggerToast("✋ تم إرسال طلب الانضمام بنجاح! بانتظار قبول المضيف...");
    } catch (err) {
      console.error("Error in handleRequestToJoin wrapper:", err);
    }
  };

  const handleAcceptRequest = async (requestingUserId: string, requestingUserName: string) => {
    if (!call) return;
    try {
      await call.grantPermissions(requestingUserId, ['send-audio', 'send-video']);
      
      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        approvedGuests: arrayUnion(requestingUserId)
      }).catch(e => console.warn("Failed to update approvedGuests in Firestore:", e));

      await call.sendCustomEvent({ type: 'guest_request_approved', custom: { targetUserId: requestingUserId } });
      triggerToast(`تم قبول طلب الصعود للضيف ${requestingUserName} 🎉`);
      setPendingRequests(prev => prev.filter(req => req.senderId !== requestingUserId));
    } catch (err) {
      console.error("Error granting permissions to requesting guest:", err);
      triggerToast("فشل منح صلاحيات الضيف");
    }
  };

  const handleRejectRequest = (requestingUserId: string) => {
    setPendingRequests(prev => prev.filter(req => req.senderId !== requestingUserId));
    triggerToast("تم رفض طلب الانضمام");
  };

  const fetchActiveStreamsForCohost = async () => {
    if (!client || !call) return;
    setFetchingCalls(true);
    try {
      const response = await client.queryCalls({
        filter_conditions: {
          type: 'default'
        },
        limit: 10
      });
      const otherCalls = response.calls.filter(c => c.id !== call.id);
      setActiveCalls(otherCalls);
    } catch (err) {
      console.error("Error querying active streams:", err);
      triggerToast("فشل جلب قائمة البثوث النشطة");
    } finally {
      setFetchingCalls(false);
    }
  };

  useEffect(() => {
    if (inviteActiveTab === 'cohosts' && showInviteModal) {
      fetchActiveStreamsForCohost();
    }
  }, [inviteActiveTab, showInviteModal]);

  // Video Filter & Background State
  const [selectedFilter, setSelectedFilter] = useState('none');
  const filterRef = useRef<string>('none');
  useEffect(() => {
    filterRef.current = selectedFilter;
  }, [selectedFilter]);

  useEffect(() => {
    if (!isHost || !call || !call.camera || selectedFilter === 'none') return;

    let active = true;
    let registeredFilter: any = null;

    const filter = (input: MediaStream) => {
      const video = document.createElement('video');
      video.srcObject = input;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(e => console.warn("Video play error in beauty filter:", e));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      };

      const render = () => {
        if (!active) return;
        if (video.readyState >= 2 && ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }
          const w = canvas.width;
          const h = canvas.height;

          // Draw original frame
          ctx.drawImage(video, 0, 0, w, h);

          // Apply skin smoothing based on beauty level
          const currentFilter = filterRef.current;
          if (currentFilter !== 'none') {
            let blurVal = 0;
            let opacityVal = 0;
            let brightnessVal = 1.0;
            let saturateVal = 1.0;
            let warmTintVal = false;

            if (currentFilter === 'light') {
              blurVal = 2;
              opacityVal = 0.35;
              brightnessVal = 1.04;
            } else if (currentFilter === 'medium') {
              blurVal = 4;
              opacityVal = 0.45;
              brightnessVal = 1.08;
              saturateVal = 1.05;
            } else if (currentFilter === 'high') { // Cinematic beauty
              blurVal = 6;
              opacityVal = 0.55;
              brightnessVal = 1.10;
              saturateVal = 1.10;
              warmTintVal = true;
            }

            if (blurVal > 0) {
              ctx.save();
              ctx.filter = `blur(${blurVal}px)`;
              ctx.globalAlpha = opacityVal;
              // Blending a blurred overlay smooths skin tones while preserving original details
              ctx.drawImage(canvas, 0, 0, w, h);
              ctx.restore();
            }

            if (brightnessVal > 1.0 || saturateVal > 1.0 || warmTintVal) {
              ctx.save();
              if (warmTintVal) {
                // Soft peach tint for warm glow
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(255, 230, 220, 0.05)';
                ctx.fillRect(0, 0, w, h);
              }
              ctx.restore();

              ctx.save();
              if (brightnessVal > 1.0) {
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = `rgba(255, 255, 255, ${(brightnessVal - 1.0) * 0.4})`;
                ctx.fillRect(0, 0, w, h);
              }
              ctx.restore();
            }
          }
        }
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);

      const outputStream = canvas.captureStream(30);
      input.getAudioTracks().forEach(t => outputStream.addTrack(t));

      return {
        output: outputStream,
        stop: () => {
          active = false;
          video.pause();
          video.srcObject = null;
          outputStream.getTracks().forEach(t => t.stop());
        }
      };
    };

    try {
      registeredFilter = call.camera.registerFilter(filter);
      console.log("Registered custom skin smoothing/beauty video filter successfully on the active call camera!");
    } catch (err) {
      console.warn("Failed to register custom skin smoothing/beauty video filter:", err);
    }

    return () => {
      active = false;
      if (registeredFilter && registeredFilter.unregister) {
        registeredFilter.unregister().catch((e: any) => console.warn("Error unregistering filter:", e));
      }
    };
  }, [call, isHost, selectedFilter]);
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [customBackgroundImage, setCustomBackgroundImage] = useState<string | null>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);

  // Truth Mode Question
  const [activeTruthQuestion, setActiveTruthQuestion] = useState<string | null>(null);

  // PK Challenge State
  const [pkBattle, setPkBattle] = useState<{
    title: string;
    redPoints: number;
    bluePoints: number;
    duration: number;
    timeLeft: number;
    active: boolean;
  } | null>(null);

  const [pkTitleInput, setPkTitleInput] = useState("تحدي البث المثير ⚔️");
  const [pkDurationInput, setPkDurationInput] = useState(180);

  // PK Battle countdown timer
  useEffect(() => {
    if (!pkBattle || !pkBattle.active) return;
    if (pkBattle.timeLeft <= 0) {
      triggerToast("انتهى تحدي PK الحماسي والمثير! 🏆");
      setPkBattle(prev => prev ? { ...prev, active: false } : null);
      return;
    }
    const timer = setInterval(() => {
      setPkBattle(prev => {
        if (!prev) return null;
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pkBattle?.active, pkBattle?.timeLeft]);

  // Auto-scroll chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Load comments
  useEffect(() => {
    const activeId = streamId || "live_stream";
    const qComments = query(
      collection(db, "lives", activeId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(qComments, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(msgs.slice(-50)); // Keep last 50 comments
    }, (error) => {
      console.warn("Live stream comments warning:", error);
    });
    return () => unsub();
  }, [streamId]);

  // Listen to the live document for custom background image synchronization (real-time for viewer)
  useEffect(() => {
    const activeId = streamId || "live_stream";
    const liveDocRef = doc(db, "lives", activeId);
    const unsub = onSnapshot(liveDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.hostId) {
          setStreamHostId(data.hostId);
        }
        if (data.customBackgroundImage) {
          setCustomBackgroundImage(data.customBackgroundImage);
        }
        if (data.backgroundType) {
          setSelectedBackground(data.backgroundType);
        }
        setPinnedComment(data.pinnedComment || null);
        setModerators(data.moderators || []);
        setMutedUsers(data.mutedUsers || []);
        setBannedUsers(data.bannedUsers || []);
        setIsConfessionMode(!!data.isConfessionMode);
        setConfessionEndTime(data.confessionEndTime || null);
        if (data.hostMutedParticipants) {
          setHostMutedParticipants(data.hostMutedParticipants);
        }
        if (data.approvedGuests) {
          setFirestoreApprovedGuests(data.approvedGuests);
        } else {
          setFirestoreApprovedGuests([]);
        }

        // Update expanded/maximized guest screen state from Firestore
        if (data.expandedParticipantId !== undefined) {
          setExpandedParticipantId(data.expandedParticipantId || null);
        }

        // Update active co-host state in real-time
        setCoHostStreamId(data.coHostStreamId || null);
        setCoHostName(data.coHostName || null);
        setCoHostPhoto(data.coHostPhoto || null);
        setCoHostActive(!!data.coHostActive);
        setCoHostUserId(data.coHostUserId || null);

        // Handle co-host invitation updates
        if (isHost) {
          if (data.cohostInvite) {
            const invite = data.cohostInvite;
            // Case 1: We (Host B) are receiving a pending co-host invitation from Host A
            if (invite.status === 'pending' && invite.targetUserId === (currentUser?.uid || (call && call.currentUserId))) {
              setPendingCohostInvite({
                hostId: invite.hostId,
                hostName: invite.hostName,
                streamId: invite.streamId
              });
            } 
            // Case 2: We (Host A) are receiving an acceptance response from Host B
            else if (invite.status === 'accepted') {
              const targetUserId = invite.hostId;
              const otherHostName = invite.hostName || "مضيف مشترك";
              if (targetUserId) {
                call?.grantPermissions(targetUserId, ['send-audio', 'send-video'])
                  .then(() => {
                    triggerToast(`تم قبول دعوة البث المشترك! تم دمج المضيف المشترك ${otherHostName} 👥`);
                    // Clean up cohostInvite on Host A's stream document
                    updateDoc(liveDocRef, { cohostInvite: null }).catch(err => console.error("Error clearing cohostInvite:", err));
                  })
                  .catch((err: any) => {
                    console.error("Error granting co-host permissions:", err);
                    triggerToast(`فشل دمج المضيف المشترك: ${otherHostName}`);
                  });
              }
            }
          }
        }
      }
    }, (error) => {
      console.warn("Live stream metadata sync warning:", error);
    });
    return () => unsub();
  }, [streamId, isHost, currentUser, call]);

  // Handle automatic eviction if user is banned
  useEffect(() => {
    if (currentUser && bannedUsers.includes(currentUser.uid)) {
      triggerToast("لقد تم حظرك من هذا البث من قبل الإدارة! ⚠️");
      setTimeout(() => {
        executeLeave();
      }, 2000);
    }
  }, [bannedUsers, currentUser]);

  // Confession/Candor Mode Countdown & Auto Deactivation Effect
  useEffect(() => {
    if (!isConfessionMode || !confessionEndTime) {
      setConfessionTimeLeft(0);
      return;
    }

    const updateTimer = async () => {
      const getMs = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val.seconds !== undefined) return val.seconds * 1000;
        if (val instanceof Date) return val.getTime();
        return Number(val);
      };

      const endTimeMs = getMs(confessionEndTime);
      const nowMs = Date.now();
      const remaining = Math.max(0, Math.floor((endTimeMs - nowMs) / 1000));

      if (remaining > 0) {
        setConfessionTimeLeft(remaining);
      } else {
        setConfessionTimeLeft(0);
        if (isHost) {
          try {
            const activeId = streamId || "live_stream";
            await updateDoc(doc(db, "lives", activeId), {
              isConfessionMode: false,
              confessionEndTime: null
            });
            triggerToast("🔒 انتهت مدة وضع الصراحة (5 دقائق) وتم إغلاق الوضع تلقائياً.");
          } catch (e) {
            console.error("Error auto-ending confession mode:", e);
          }
        }
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [isConfessionMode, confessionEndTime, isHost, streamId]);

  const handleToggleConfessionMode = async () => {
    const activeId = streamId || "live_stream";
    try {
      if (isConfessionMode) {
        await updateDoc(doc(db, "lives", activeId), {
          isConfessionMode: false,
          confessionEndTime: null
        });
        triggerToast("🔒 تم إلغاء وضع الصراحة.");
      } else {
        const endTime = new Date(Date.now() + 5 * 60 * 1000);
        await updateDoc(doc(db, "lives", activeId), {
          isConfessionMode: true,
          confessionEndTime: endTime
        });
        triggerToast("🤫 تم تفعيل وضع الصراحة لمدة 5 دقائق! التعليقات الآن مجهولة تماماً.");
      }
    } catch (e) {
      console.error("Error toggling confession mode:", e);
      triggerToast("فشل تفعيل وضع الصراحة");
    }
  };

  // Handle uploading and setting custom background image
  const handleCustomBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const localUrl = URL.createObjectURL(file);
      setCustomBackgroundImage(localUrl);
      setSelectedBackground('custom');
      triggerToast("تم تعيين غلاف مخصص للبث من الاستوديو 🖼️");

      // Programmatically load and downscale the image to save memory and network payload
      const img = new window.Image();
      img.src = localUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Downscale image to a reasonable resolution (max width/height of 640px)
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to a compressed JPEG data URL to keep Base64 size lightweight
        const base64Data = canvas.toDataURL('image/jpeg', 0.75);

        // 1. Sync custom cover image to Stream Video Server
        if (call) {
          (call as any).update({
            custom: {
              ...((call as any).state?.custom || {}),
              cover_image: base64Data
            }
          }).then(() => {
            console.log("Successfully synced cover_image with Stream Video server!");
          }).catch((err: any) => {
            console.warn("Failed to update custom property on Stream call:", err);
          });
        }

        // 2. Sync to Firestore lives collection
        const activeId = streamId || "live_stream";
        updateDoc(doc(db, "lives", activeId), {
          customBackgroundImage: base64Data,
          backgroundType: 'custom'
        }).catch(e => console.warn("Failed to sync custom bg to Firestore:", e));

        // Revoke the temporary local object URL to free memory
        URL.revokeObjectURL(localUrl);
      };
    } catch (err) {
      console.error("Error reading custom background image:", err);
    }
  };

  // Handle camera & mic toggle for Host
  const toggleCamera = async () => {
    try {
      if (call) {
        if (isCamOn) {
          await call.camera.disable();
          if (typeof call.stopPublish === 'function') {
            await call.stopPublish(2).catch(e => console.warn("stopPublish video error:", e)); // 2 is TrackType.VIDEO
          }
          triggerToast("تم إغلاق الكاميرا 📹");
        } else {
          await call.camera.enable();
          if (typeof call.publishVideoStream === 'function') {
            await (call as any).publishVideoStream().catch((e: any) => console.warn("publishVideoStream error:", e));
          }
          triggerToast("تم تشغيل الكاميرا 📹");
        }
      }
    } catch (err) {
      console.error("Error toggling camera:", err);
    }
  };

  const toggleMic = async () => {
    try {
      if (call) {
        if (isMicOn) {
          await call.microphone.disable();
          if (typeof call.stopPublish === 'function') {
            await call.stopPublish(1).catch(e => console.warn("stopPublish audio error:", e)); // 1 is TrackType.AUDIO
          }
          triggerToast("تم كتم المايكروفون 🎙️");
        } else {
          await call.microphone.enable();
          if (typeof call.publishAudioStream === 'function') {
            await (call as any).publishAudioStream().catch((e: any) => console.warn("publishAudioStream error:", e));
          }
          triggerToast("تم تشغيل المايكروفون 🎙️");
        }
      }
    } catch (err) {
      console.error("Error toggling mic:", err);
    }
  };

  const stepDownToAudience = async () => {
    try {
      if (call && currentUser) {
        // 1. Stop camera & mic first programmatically
        await call.camera.disable();
        await call.microphone.disable();
        
        // 2. Revoke audio & video publishing permissions for current user
        if (typeof call.revokePermissions === 'function') {
          await call.revokePermissions(currentUser.uid, ['send-audio', 'send-video']);
        }
        
        const activeId = streamId || "live_stream";
        await updateDoc(doc(db, "lives", activeId), {
          approvedGuests: arrayRemove(currentUser.uid)
        }).catch(e => console.warn("Failed to remove from approvedGuests:", e));

        // 3. Update local state to hide the guest window immediately
        setIsGuestApproved(false);
        setHasRequestedJoin(false);
        setShowApprovedNotification(false);
        
        triggerToast("عدت إلى رتبة مشاهد عادي 👥");
      }
    } catch (err) {
      console.error("Error stepping down to audience:", err);
      triggerToast("فشل النزول للجمهور");
    }
  };

  const flipCamera = async () => {
    try {
      if (!call) {
        throw new Error("لم يتم تهيئة غرفة البث المباشر");
      }
      if (typeof call.camera.flip === 'function') {
        await call.camera.flip();
        triggerToast("تم تدوير الكاميرا بنجاح 🔄");
      } else {
        throw new Error("دالة تدوير الكاميرا المدمجة غير مدعومة");
      }
    } catch (err: any) {
      console.warn("Direct call.camera.flip failed, attempting programmatic fallback:", err);
      try {
        if (call && typeof call.camera.select === 'function') {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          if (videoDevices.length > 1) {
            const currentDevice = (call.camera as any).selectedDevice;
            const otherDevice = videoDevices.find(d => d.deviceId !== currentDevice?.deviceId) || videoDevices[0];
            await call.camera.select(otherDevice.deviceId);
            triggerToast(`تم تبديل الكاميرا برمجياً إلى: ${otherDevice.label || 'الكاميرا البديلة'} 🔄`);
          } else {
            throw new Error("لا توجد كاميرات إضافية متاحة للتبديل");
          }
        } else {
          throw new Error("تبديل الكاميرات غير مدعوم في هذا المتصفح");
        }
      } catch (fallbackErr: any) {
        console.error("Fallback camera select failed:", fallbackErr);
        triggerToast("فشل تدوير الكاميرا: " + (fallbackErr.message || "جهاز غير مدعوم"));
      }
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleLeaveClick = () => {
    if (isHost) {
      setShowLeaveConfirm(true);
    } else {
      setShowViewerLeaveConfirm(true);
    }
  };

  const executeLeave = async () => {
    try {
      if (currentUser) {
        const activeId = streamId || "live_stream";
        await updateDoc(doc(db, "lives", activeId), {
          approvedGuests: arrayRemove(currentUser.uid)
        }).catch(e => console.warn("Failed to remove from approvedGuests:", e));
      }
      if (call) {
        await call.leave();
      }
    } catch (err) {
      console.warn("Error leaving stream:", err);
    }
    onClose();
  };

  const executeEndCall = async () => {
    try {
      const activeId = streamId || "live_stream";
      await updateDoc(doc(db, "lives", activeId), {
        status: "ended",
        endedAt: serverTimestamp()
      }).catch((e) => console.warn("Firestore status update failed:", e));

      if (call) {
        await call.endCall();
      }
    } catch (err) {
      console.error("Error ending stream call:", err);
    }
    onClose();
    if (typeof (window as any).navigate === 'function') {
      (window as any).navigate('/home');
    }
  };

  const sendComment = async (textToSend?: string) => {
    const text = textToSend || newComment.trim();
    if (!text || !currentUser) return;

    if (mutedUsers.includes(currentUser.uid)) {
      triggerToast("لا يمكنك إرسال تعليقات لأنك مكتوم من قبل الإدارة! 🔇");
      return;
    }

    try {
      const activeId = streamId || "live_stream";
      const isCommentAnon = isConfessionMode;
      await addDoc(collection(db, "lives", activeId, "comments"), {
        text,
        userId: currentUser.uid,
        userName: isCommentAnon ? "مستخدم مجهول" : (userProfile?.displayName || currentUser.displayName || "مستمع"),
        userPhoto: isCommentAnon ? "" : (userProfile?.avatarUrl || currentUser.photoURL || ""),
        createdAt: serverTimestamp(),
        type: "text",
        isAnonymous: isCommentAnon
      });
      if (!textToSend) setNewComment("");

      // Increment comments count on the live stream document for Trending score
      updateDoc(doc(db, "lives", activeId), {
        commentsCount: increment(1),
        trendingScore: increment(3)
      }).catch(e => console.warn("Failed to increment commentsCount:", e));
    } catch (err) {
      console.error("Error sending comment:", err);
    }
  };

  const isHostCamEnabled = isHost 
    ? isCamOn 
    : (streamHostParticipant ? ((streamHostParticipant as any).hasVideo || (streamHostParticipant as any).isVideoEnabled || !!streamHostParticipant.videoStream || !!(streamHostParticipant as any).videoStreamTrack) : false);
  const activeCoverImage = isHost ? customBackgroundImage : ((call as any)?.state?.custom?.cover_image as string | undefined);

  const activeViewers = participantCount !== undefined ? participantCount : participants.length;

  const onStageParticipants = participants.filter(p => {
    // If this is the host participant, always include them on stage!
    if (isHost && p.isLocalParticipant) return true;
    
    const roles = p.roles || [];
    const isSpecialRole = roles.includes('admin') || roles.includes('host') || roles.includes('broadcaster') || roles.includes('speaker') || p.userId === call?.state?.createdBy?.id;
    if (isSpecialRole) return true;
    
    const hasAudio = (p as any).permissions?.includes('send-audio') || (p as any).permissions?.includes('send-video');
    const isPublishingMedia = p.publishedTracks && p.publishedTracks.length > 0;
    const isLocalApprovedGuest = p.isLocalParticipant && isGuestApproved;
    const isFirestoreApproved = firestoreApprovedGuests.includes(p.userId);
    
    return hasAudio || isPublishingMedia || isLocalApprovedGuest || isFirestoreApproved;
  });

  const guestsOnStage = (participants || []).filter(p => {
    if (p.userId === streamHostParticipant?.userId) return false;
    if (coHostActive && p.userId === coHostUserId) return false;
    const roles = p.roles || [];
    const hasGuestRole = roles.includes('guest') || roles.includes('speaker') || roles.includes('broadcaster');
    const hasPublishPermission = (p as any).permissions?.includes('send-audio') || (p as any).permissions?.includes('send-video');
    const isPublishingMedia = p.publishedTracks && p.publishedTracks.length > 0;
    const isLocalApprovedGuest = p.isLocalParticipant && isGuestApproved;
    const isFirestoreApproved = firestoreApprovedGuests.includes(p.userId);
    
    return hasGuestRole || hasPublishPermission || isPublishingMedia || isLocalApprovedGuest || isFirestoreApproved;
  });

  const getFilterClass = () => {
    switch (selectedFilter) {
      case 'warm': return 'sepia-[0.35] brightness-105 saturate-110';
      case 'vintage': return 'sepia contrast-110 saturate-[0.8] brightness-95';
      case 'cool': return 'hue-rotate-30 saturate-120 brightness-105';
      case 'bw': return 'grayscale contrast-125';
      case 'sparkles': return 'contrast-115 brightness-110 saturate-150';
      case 'cyberpunk': return 'hue-rotate-180 saturate-200 contrast-125';
      default: return '';
    }
  };

  // Drawing states & refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushWidth, setBrushWidth] = useState(4);

  // Re-draw whiteboard lines when whiteboardLines changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all completed lines
    whiteboardLines.forEach((line: any) => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = line.color || '#ef4444';
      ctx.lineWidth = line.width || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });
  }, [whiteboardLines, isWhiteboardOpen]);

  // Handle canvas drawing interactions with scale factoring
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isHost && !isModerator) return; // View Only!
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    isDrawingRef.current = true;
    const newLine = {
      color: brushColor,
      width: brushWidth,
      points: [{ x, y }]
    };
    setWhiteboardLines(prev => [...prev, newLine]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || (!isHost && !isModerator)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setWhiteboardLines(prev => {
      if (prev.length === 0) return prev;
      const lastLine = prev[prev.length - 1];
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, { x, y }]
      };
      return [...prev.slice(0, -1), updatedLine];
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    // Send state sync update to everyone!
    if (call) {
      call.sendCustomEvent({
        type: 'whiteboard_state',
        custom: {
          isOpen: true,
          lines: whiteboardLines
        }
      }).catch((err: any) => console.warn(err));
    }
  };

  // Touch Events for mobile device responsive drawing
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isHost && !isModerator) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;

    isDrawingRef.current = true;
    const newLine = {
      color: brushColor,
      width: brushWidth,
      points: [{ x, y }]
    };
    setWhiteboardLines(prev => [...prev, newLine]);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || (!isHost && !isModerator)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;

    setWhiteboardLines(prev => {
      if (prev.length === 0) return prev;
      const lastLine = prev[prev.length - 1];
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, { x, y }]
      };
      return [...prev.slice(0, -1), updatedLine];
    });
  };

  // Clear whiteboard (Host/Moderators only)
  const handleClearWhiteboard = () => {
    setWhiteboardLines([]);
    if (call) {
      call.sendCustomEvent({
        type: 'whiteboard_state',
        custom: {
          isOpen: true,
          lines: []
        }
      }).catch((err: any) => console.warn(err));
    }
    triggerToast("🎨 تم مسح السبورة الذكية للجميع.");
  };

  // Close whiteboard
  const handleCloseWhiteboard = () => {
    setIsWhiteboardOpen(false);
    if (isHost || isModerator) {
      if (call) {
        call.sendCustomEvent({
          type: 'whiteboard_state',
          custom: {
            isOpen: false,
            lines: whiteboardLines
          }
        }).catch((err: any) => console.warn(err));
      }
      triggerToast("🎨 تم إغلاق السبورة للجميع.");
    } else {
      triggerToast("🎨 تم إغلاق السبورة محلياً.");
    }
  };

  const getBackgroundStyles = () => {
    switch (selectedBackground) {
      case 'blur':
        return 'backdrop-blur-md bg-black/40';
      case 'studio':
        return 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950';
      case 'neon':
        return 'bg-gradient-to-br from-rose-950 via-black to-blue-950';
      case 'beach':
        return 'bg-gradient-to-br from-amber-950 via-teal-900 to-sky-950';
      default:
        return 'bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950';
    }
  };

  const votePoll = (option: 'A' | 'B') => {
    if (activePoll?.userVoted) return;
    setActivePoll(prev => {
      if (!prev) return null;
      const newVotesA = prev.votesA + (option === 'A' ? 1 : 0);
      const newVotesB = prev.votesB + (option === 'B' ? 1 : 0);
      const total = newVotesA + newVotesB;
      return {
        ...prev,
        votesA: newVotesA,
        votesB: newVotesB,
        totalVotes: total,
        userVoted: option
      };
    });
    triggerToast("تم تسجيل تصويتك بنجاح! 📊");
  };

  const handleDoubleTap = async () => {
    if (!call) return;
    try {
      // Local increment of likes for instant responsiveness
      setLikesCount(prev => prev + 1);

      // Local flying heart trigger
      const colors = ['#ef4444', '#ec4899', '#f43f5e', '#e11d48', '#ff007f', '#ff5a5f', '#d946ef', '#a855f7'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomLeft = 15 + Math.random() * 70;
      const randomScale = 0.7 + Math.random() * 0.7;
      const randomSpeed = 1.5 + Math.random() * 1.0;
      const randomXOffset = (Math.random() - 0.5) * 120;
      const id = Math.random().toString(36).substring(2, 9);
      setFlyingHearts(prev => [...prev, { id, left: randomLeft, color: randomColor, scale: randomScale, speed: randomSpeed, xOffset: randomXOffset }]);
      setTimeout(() => {
        setFlyingHearts(prev => prev.filter(h => h.id !== id));
      }, 2500);

      // Update server state for permanent persistent sync (Only Host is authorized to update call custom state)
      if (isHost) {
        const currentLikes = (call.state.custom as any)?.likes_count || 0;
        await call.update({ custom: { ...(call.state.custom || {}), likes_count: currentLikes + 1 } }).catch(e => console.warn(e));
      }

      // Send to other participants
      call.sendCustomEvent({ type: 'like_reaction' }).catch(err => {
        console.error("Error sending like reaction custom event:", err);
      });

      // Increment likes count on the live stream document for Trending score
      const activeId = streamId || "live_stream";
      updateDoc(doc(db, "lives", activeId), {
        likesCount: increment(1)
      }).catch(e => console.warn("Failed to increment likesCount:", e));
    } catch (err) {
      console.error("Error sending like reaction custom event / update:", err);
    }
  };

  if (isCallEnded) {
    return (
      <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-zinc-950 p-6 text-center font-sans" dir="rtl">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-red-600/10 animate-ping" />
          <div className="relative w-24 h-24 rounded-full border-4 border-zinc-850 bg-zinc-900 flex items-center justify-center shadow-2xl">
            <Radio className="w-10 h-10 text-zinc-400" />
          </div>
        </div>
        <h2 className="text-white font-black text-2xl mb-2">تم إنهاء البث المباشر 🛑</h2>
        <p className="text-zinc-400 text-sm max-w-xs mb-8">نشكرك على حضورك ومتابعتك البث! لقد قام المضيف بإنهاء البث بنجاح.</p>
        <button
          onClick={onClose}
          className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-black rounded-2xl shadow-xl shadow-red-950/40 transition-all active:scale-95"
        >
          العودة للرئيسية 🏠
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. CINEMATIC VIDEO BACKGROUND WITH DYNAMIC FILTERS & STAGES */}
      <div 
        onDoubleClick={handleDoubleTap}
        className={`absolute inset-0 w-full h-full z-0 overflow-hidden transition-all duration-500 cursor-pointer pointer-events-auto ${getFilterClass()}`}
      >
        {(() => {
          const coHostPart = coHostActive && coHostUserId ? participants.find(p => p.userId === coHostUserId) : null;
          
          if (coHostActive && coHostPart) {
            const hostPart = streamHostParticipant;
            if (!hostPart) return null;

            const isHostLocal = hostPart.isLocalParticipant;
            const isHostCamEnabled = isHostLocal
              ? isCamOn
              : !!(hostPart.videoStream || (hostPart as any).isVideoEnabled);

            const isCoHostLocal = coHostPart.isLocalParticipant;
            const isCoHostCamEnabled = isCoHostLocal
              ? isCamOn
              : !!(coHostPart.videoStream || (coHostPart as any).isVideoEnabled);

            return (
              <div className="w-full h-full flex flex-col md:flex-row relative bg-zinc-950">
                {/* Host Screen (Left / Top) */}
                <div className="flex-1 h-1/2 md:h-full relative border-b md:border-b-0 md:border-l border-zinc-800/50 overflow-hidden bg-zinc-900/40">
                  <ParticipantView 
                    participant={hostPart}
                    trackType="videoTrack"
                    className={`w-full h-full object-cover ${isHostLocal ? 'scale-x-[-1]' : ''}`}
                    ParticipantViewUI={null}
                  />
                  {!isHostCamEnabled && (
                    <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 rounded-full border border-red-500/20 bg-zinc-900 flex items-center justify-center mb-2">
                        {hostPart?.image ? (
                          <img src={hostPart.image} alt={hostPart.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <Radio className="w-6 h-6 text-red-500 animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 font-bold">@{hostPart?.name || 'المضيف'}</span>
                    </div>
                  )}
                  {/* Name Tag */}
                  <div className="absolute bottom-4 right-4 z-10 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-black text-white">@{hostPart?.name || 'المضيف'}</span>
                  </div>
                </div>

                {/* Co-Host Screen (Right / Bottom) */}
                <div className="flex-1 h-1/2 md:h-full relative overflow-hidden bg-zinc-900/40">
                  <ParticipantView 
                    participant={coHostPart}
                    trackType="videoTrack"
                    className={`w-full h-full object-cover ${isCoHostLocal ? 'scale-x-[-1]' : ''}`}
                    ParticipantViewUI={null}
                  />
                  {!isCoHostCamEnabled && (
                    <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 rounded-full border border-emerald-500/20 bg-zinc-900 flex items-center justify-center mb-2">
                        {coHostPart?.image ? (
                          <img src={coHostPart.image} alt={coHostPart.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                          <Radio className="w-6 h-6 text-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 font-bold">@{coHostPart?.name || 'مضيف مشترك'}</span>
                    </div>
                  )}
                  {/* Name Tag */}
                  <div className="absolute bottom-4 left-4 z-10 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-white">@{coHostPart?.name || 'مضيف مشترك'}</span>
                  </div>
                </div>
              </div>
            );
          }

          const mainParticipant = onStageParticipants.find(p => p.userId === expandedParticipantId) || streamHostParticipant;
          const isMainLocal = mainParticipant?.isLocalParticipant;
          const isMainCamEnabled = isMainLocal
            ? isCamOn
            : (mainParticipant ? !!(mainParticipant.videoStream || (mainParticipant as any).isVideoEnabled) : false);

          if (mainParticipant) {
            return (
              <div className="w-full h-full relative">
                {/* Always render ParticipantView to ensure video track is decoded and displayed */}
                <ParticipantView 
                  participant={mainParticipant}
                  trackType="videoTrack"
                  className={`w-full h-full object-cover ${isMainLocal ? 'scale-x-[-1]' : ''}`}
                  ParticipantViewUI={null}
                />
                
                {/* Only show the fallback screen / cover image / overlay if the main participant's camera is actually disabled/off */}
                {!isMainCamEnabled && (
                  <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 transition-all duration-500 ${getBackgroundStyles()}`}>
                    {activeCoverImage ? (
                      <img 
                        src={activeCoverImage} 
                        alt="Custom Live Cover" 
                        className="absolute inset-0 w-full h-full object-cover z-0 transition-all duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping" />
                        <div className="relative w-28 h-28 rounded-full border-4 border-red-500 overflow-hidden shadow-2xl bg-zinc-800 flex items-center justify-center">
                          {mainParticipant?.image ? (
                            <img 
                              src={mainParticipant.image} 
                              alt="Main participant" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Radio className="w-10 h-10 text-red-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio player fallback for viewers just in case if main is remote */}
                {!isMainLocal && (
                  <div className="absolute top-0 left-0 w-1 h-1 opacity-0 overflow-hidden pointer-events-none z-[-1]">
                    <ParticipantView 
                      participant={mainParticipant}
                      trackType="none"
                      ParticipantViewUI={null}
                    />
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                <div className="text-center">
                  <Radio className="w-10 h-10 text-zinc-700 animate-pulse mx-auto mb-2" />
                  <span className="text-xs text-zinc-500 font-bold">بانتظار بدء البث...</span>
                </div>
              </div>
            );
          }
        })()}
        {/* Soft vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-1" />
      </div>

      {/* Host Info & Likes Counter in Top-Right */}
      <div className="absolute top-[72px] right-4 z-30 flex items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2 shadow-xl font-sans text-right" dir="rtl">
        <div 
          onClick={() => {
            if (onNavigateToUser && streamHostParticipant?.userId) {
              onNavigateToUser(streamHostParticipant.userId);
            }
          }}
          className="relative w-9 h-9 rounded-full border-2 border-red-500 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
          title="عرض الملف الشخصي للمضيف"
        >
          {streamHostParticipant?.image ? (
            <img src={streamHostParticipant.image} alt={streamHostParticipant.name || "Host"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-white font-black text-xs">{streamHostParticipant?.name?.charAt(0) || "H"}</span>
          )}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-white text-xs font-black truncate max-w-[120px]">
            {streamHostParticipant?.name || 'المضيف الأساسي'}
          </span>
          <div className="flex items-center gap-1 mt-0.5 text-rose-500">
            <Heart className="w-3.5 h-3.5 fill-rose-500 animate-pulse" />
            <span className="text-[11px] font-extrabold font-mono tracking-tight">{likesCount}</span>
          </div>
        </div>
        {!isHost && currentUser && streamHostParticipant?.userId && currentUser.uid !== streamHostParticipant.userId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFollowHost();
            }}
            className={`mr-2 px-2.5 py-1 text-[10px] font-bold rounded-full transition-all duration-300 flex items-center gap-1 shrink-0 ${
              isFollowingHost 
                ? 'bg-zinc-700/80 hover:bg-zinc-650 text-zinc-300 border border-white/10' 
                : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-lg shadow-sky-500/20'
            }`}
          >
            {isFollowingHost ? (
              <>
                <Check className="w-2.5 h-2.5" />
                <span>متابع</span>
              </>
            ) : (
              <>
                <UserPlus className="w-2.5 h-2.5" />
                <span>متابعة</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Flying Hearts Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[40]">
        {flyingHearts.map(heart => (
          <div
            key={heart.id}
            className="flying-heart"
            style={{
              left: `${heart.left}%`,
              color: heart.color,
              animationDuration: `${heart.speed}s`,
              transform: `scale(${heart.scale})`,
              '--x-offset': `${heart.xOffset}px`
            } as React.CSSProperties}
          >
            <Heart className="w-8 h-8 fill-current drop-shadow-2xl" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes floatUpAndFade {
          0% {
            transform: translateY(105vh) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-15vh) translateX(var(--x-offset, 0px)) scale(1.5) rotate(-20deg);
            opacity: 0;
          }
        }
        .flying-heart {
          position: absolute;
          bottom: -50px;
          animation-name: floatUpAndFade;
          animation-timing-function: cubic-bezier(0.08, 0.82, 0.17, 1);
          animation-fill-mode: forwards;
          pointer-events: none;
        }
      `}</style>

      {/* 1B. DYNAMIC STREAM INTERACTIVE OVERLAYS */}
      <div className="absolute inset-x-0 top-24 z-20 px-4 space-y-3 pointer-events-auto max-h-[45%] overflow-y-auto no-scrollbar" dir="rtl">
        {/* PK Battle Overlay */}
        {pkBattle && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/65 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-4 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-blue-500" />
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-[11px] font-black text-white">{pkBattle.title}</span>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                <span>المتبقي: {Math.floor(pkBattle.timeLeft / 60)}:{String(pkBattle.timeLeft % 60).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="relative w-full h-6 bg-zinc-800 rounded-full overflow-hidden flex border border-white/5 mb-3">
              <motion.div 
                className="bg-gradient-to-r from-red-600 to-rose-500 h-full flex items-center justify-start px-3 text-white text-[10px] font-black"
                style={{ width: `${(pkBattle.redPoints / (pkBattle.redPoints + pkBattle.bluePoints || 1)) * 100}%` }}
                animate={{ width: `${(pkBattle.redPoints / (pkBattle.redPoints + pkBattle.bluePoints || 1)) * 100}%` }}
              >
                <span>{pkBattle.redPoints}</span>
              </motion.div>
              <motion.div 
                className="bg-gradient-to-l from-blue-600 to-sky-500 h-full flex items-center justify-end px-3 text-white text-[10px] font-black"
                style={{ width: `${(pkBattle.bluePoints / (pkBattle.redPoints + pkBattle.bluePoints || 1)) * 100}%` }}
                animate={{ width: `${(pkBattle.bluePoints / (pkBattle.redPoints + pkBattle.bluePoints || 1)) * 100}%` }}
              >
                <span>{pkBattle.bluePoints}</span>
              </motion.div>
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-yellow-400 z-10 shadow-lg shadow-yellow-500" />
            </div>

            {/* Interaction Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPkBattle(prev => prev ? { ...prev, redPoints: prev.redPoints + Math.floor(Math.random() * 8) + 1 } : null)}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-[10px] rounded-xl active:scale-95 transition-all shadow-md shadow-red-950/40"
              >
                🔥 تشجيع الأحمر (+نقاط)
              </button>
              <button
                onClick={() => setPkBattle(prev => prev ? { ...prev, bluePoints: prev.bluePoints + Math.floor(Math.random() * 8) + 1 } : null)}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-[10px] rounded-xl active:scale-95 transition-all shadow-md shadow-blue-950/40"
              >
                ⚡ تشجيع الأزرق (+نقاط)
              </button>
              {isHost && (
                <button
                  onClick={() => {
                    setPkBattle(null);
                    triggerToast("تم إلغاء تحدي PK 🛑");
                  }}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all"
                  title="إنهاء التحدي"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Live Poll Overlay */}
        {activePoll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/65 backdrop-blur-xl border border-pink-500/20 rounded-3xl p-4 shadow-2xl relative overflow-hidden text-right"
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-pink-500 animate-pulse" />
                <span className="text-xs font-black text-white">{activePoll.question}</span>
              </div>
              {isHost && (
                <button
                  onClick={() => {
                    setActivePoll(null);
                    triggerToast("تم إنهاء التصويت 📊");
                  }}
                  className="p-1 bg-zinc-800 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-all"
                  title="حذف التصويت"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Option A */}
              <div className="relative">
                <button
                  disabled={!!activePoll.userVoted}
                  onClick={() => votePoll('A')}
                  className={`w-full py-3 px-4 rounded-2xl text-right font-bold text-xs border transition-all flex items-center justify-between relative overflow-hidden ${
                    activePoll.userVoted === 'A'
                      ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="z-10 flex items-center gap-2">
                    <span>{activePoll.optionA}</span>
                    {activePoll.userVoted === 'A' && <Check className="w-3.5 h-3.5 text-pink-500" />}
                  </div>
                  <span className="z-10 font-mono font-bold text-[10px]">
                    {activePoll.totalVotes > 0 
                      ? Math.round((activePoll.votesA / activePoll.totalVotes) * 100) 
                      : 0}% ({activePoll.votesA})
                  </span>
                  {/* Progress background fill */}
                  <motion.div 
                    className="absolute top-0 right-0 bottom-0 bg-pink-500/10 pointer-events-none"
                    initial={{ width: 0 }}
                    animate={{ width: `${activePoll.totalVotes > 0 ? (activePoll.votesA / activePoll.totalVotes) * 100 : 0}%` }}
                  />
                </button>
              </div>

              {/* Option B */}
              <div className="relative">
                <button
                  disabled={!!activePoll.userVoted}
                  onClick={() => votePoll('B')}
                  className={`w-full py-3 px-4 rounded-2xl text-right font-bold text-xs border transition-all flex items-center justify-between relative overflow-hidden ${
                    activePoll.userVoted === 'B'
                      ? 'bg-pink-600/20 border-pink-500/40 text-pink-400'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="z-10 flex items-center gap-2">
                    <span>{activePoll.optionB}</span>
                    {activePoll.userVoted === 'B' && <Check className="w-3.5 h-3.5 text-pink-500" />}
                  </div>
                  <span className="z-10 font-mono font-bold text-[10px]">
                    {activePoll.totalVotes > 0 
                      ? Math.round((activePoll.votesB / activePoll.totalVotes) * 100) 
                      : 0}% ({activePoll.votesB})
                  </span>
                  {/* Progress background fill */}
                  <motion.div 
                    className="absolute top-0 right-0 bottom-0 bg-pink-500/10 pointer-events-none"
                    initial={{ width: 0 }}
                    animate={{ width: `${activePoll.totalVotes > 0 ? (activePoll.votesB / activePoll.totalVotes) * 100 : 0}%` }}
                  />
                </button>
              </div>
            </div>
            {activePoll.userVoted && (
              <p className="text-[9px] text-zinc-500 font-bold mt-2 text-center">نشكرك على مشاركة رأيك في البث المباشر!</p>
            )}
          </motion.div>
        )}

        {/* Truth Mode Question Card */}
        {activeTruthQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-gradient-to-r from-violet-950 via-purple-900 to-black border border-violet-500/30 rounded-3xl p-4 shadow-2xl relative text-right flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <HelpCircle className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">🤫 وضع الصراحة والأسئلة</span>
                {isHost && (
                  <button
                    onClick={() => {
                      setActiveTruthQuestion(null);
                      triggerToast("تم إخفاء سؤال الصراحة 🤫");
                    }}
                    className="p-1 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-white text-xs font-bold leading-relaxed mt-1.5">{activeTruthQuestion}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* 2. TOP HEADER (LIVE badge + viewer count + Exit/End stream button) */}
      <div className="relative z-10 w-full p-4 flex items-center justify-between pointer-events-auto">
        {/* Left: LIVE Badge + Viewers Count & Confession Timer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg select-none">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-600 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">مباشر LIVE</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300 font-bold text-xs px-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{activeViewers}</span>
            </div>
          </div>

          {isConfessionMode && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 bg-violet-600/35 border border-violet-500/50 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg select-none text-violet-300 font-black text-[10px]"
            >
              <span className="animate-pulse">🤫 وضع الصراحة:</span>
              <span className="font-mono">
                {Math.floor(confessionTimeLeft / 60)}:{(confessionTimeLeft % 60) < 10 ? '0' : ''}{confessionTimeLeft % 60}
              </span>
            </motion.div>
          )}
        </div>

        {/* Right: Close/End button & Toggle Button for Host */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => setIsControlPanelVisible(!isControlPanelVisible)}
              className={`p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all border border-white/10 shadow-lg active:scale-95 ${
                isControlPanelVisible ? 'text-rose-400 border-rose-500/30 bg-rose-500/15' : ''
              }`}
              title="إظهار/إخفاء لوحة التحكم"
            >
              <Settings className={`w-4 h-4 ${isControlPanelVisible ? 'animate-spin-slow' : ''}`} />
            </button>
          )}

          {isHost ? (
            <div className="flex items-center gap-2">
              {coHostActive && (
                <button
                  onClick={handleDisconnectCohost}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white text-[11px] font-black rounded-full transition-all shadow-lg active:scale-95 border border-white/10"
                  title={t("فصل البث المشترك والعودة للبث المستقل")}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t("فصل البث المشترك 👥🛑")}</span>
                </button>
              )}
              <button
                onClick={handleLeaveClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-[11px] font-black rounded-full transition-all shadow-lg shadow-red-600/20 active:scale-95 border border-white/10"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
                <span>{t("إنهاء البث 🛑")}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLeaveClick}
              className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all border border-white/10 shadow-lg active:scale-95"
              title={t("مغادرة البث")}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. FLOATING CONTROL PANEL (ONLY FOR HOST) */}
      {isHost && isControlPanelVisible && (
        <div className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-[340px] px-4 pointer-events-auto">
          <div className="bg-black/65 backdrop-blur-xl border border-white/10 rounded-[24px] p-4 shadow-2xl flex flex-col gap-2.5">
            <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest text-center flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              لوحة التحكم العائمة للمضيف
            </div>
            <div className="grid grid-cols-4 gap-2 text-center" dir="rtl">
              <button
                onClick={async () => {
                  try {
                    if (call) {
                      await call.screenShare.toggle();
                      triggerToast(isScreenSharing ? "تم إيقاف مشاركة الشاشة 📺" : "تم بدء مشاركة الشاشة 📺");
                    }
                  } catch (err) {
                    console.error("Error toggling screen share:", err);
                    triggerToast("خطأ في تشغيل مشاركة الشاشة");
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 border rounded-2xl active:scale-95 transition-all ${
                  isScreenSharing 
                    ? 'bg-rose-500/25 border-rose-500/30 text-rose-400' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-200'
                }`}
              >
                <Monitor className="w-4 h-4 text-rose-400" />
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">مشاركة الشاشة</span>
              </button>
              
              <button
                onClick={() => setActiveBottomSheet('sound')}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl active:scale-95 transition-all ${
                  activeBottomSheet === 'sound'
                    ? 'bg-rose-500/25 border border-rose-500/30 text-rose-400'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-200'
                }`}
              >
                <Volume2 className="w-4 h-4 text-rose-400" />
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">الصوتيات</span>
              </button>
              
              <button
                onClick={() => setActiveBottomSheet('filters')}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl active:scale-95 transition-all ${
                  activeBottomSheet === 'filters'
                    ? 'bg-rose-500/25 border border-rose-500/30 text-rose-400'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">الفلاتر</span>
              </button>

              <button
                onClick={() => setActiveBottomSheet('background')}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl active:scale-95 transition-all ${
                  activeBottomSheet === 'background'
                    ? 'bg-rose-500/25 border border-rose-500/30 text-rose-400'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-200'
                }`}
              >
                <Image className="w-4 h-4 text-rose-400" />
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">الخلفية</span>
              </button>

              <button
                onClick={flipCamera}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl text-zinc-200 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">قلب الكاميرا</span>
              </button>

              <button
                onClick={toggleMic}
                className={`flex flex-col items-center justify-center gap-1 p-2 border rounded-2xl active:scale-95 transition-all ${
                  isMicOn 
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 hover:bg-zinc-700' 
                    : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
                }`}
              >
                {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-red-500" />}
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">{isMicOn ? "كتم المايك" : "تشغيل المايك"}</span>
              </button>

              <button
                onClick={toggleCamera}
                className={`flex flex-col items-center justify-center gap-1 p-2 border rounded-2xl active:scale-95 transition-all col-span-2 ${
                  isCamOn 
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 hover:bg-zinc-700' 
                    : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
                }`}
              >
                {isCamOn ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-red-500" />}
                <span className="text-[9px] font-black tracking-tight whitespace-nowrap">{isCamOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VERTICAL GUEST LIST (Flexbox Column Layout - Aligned on the Right) */}
      <div 
        className="absolute w-0 h-0 opacity-0 overflow-hidden pointer-events-none z-[-10]" 
        style={{ flexDirection: 'column', alignItems: 'flex-end' }} 
        dir="rtl"
      >
        {guestsOnStage.map(g => {
          const isParticipantCamEnabled = !!(g.videoStream || (g as any).isVideoEnabled);
          const isMe = g.isLocalParticipant;
          
          return (
            <div 
              key={g.sessionId || g.userId} 
              onClick={() => {
                setActiveGuestOptionsUserId(activeGuestOptionsUserId === g.userId ? null : g.userId);
              }}
              className="Sidebar flex flex-row items-center gap-3 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-2.5 shrink-0 cursor-pointer w-full h-20 hover:border-zinc-700 transition-all active:scale-95 relative overflow-visible shadow-lg select-none"
            >
              {/* Avatar / Camera feed on the right (first child in RTL) */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
                {isParticipantCamEnabled ? (
                  <ParticipantView 
                    participant={g}
                    trackType="videoTrack"
                    className="w-full h-full object-cover rounded-full"
                    ParticipantViewUI={null}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
                    {!isMe && (
                      <div className="absolute top-0 left-0 w-1 h-1 opacity-0 overflow-hidden pointer-events-none z-[-1]">
                        <ParticipantView 
                          participant={g}
                          trackType="none"
                          ParticipantViewUI={null}
                        />
                      </div>
                    )}
                    {g.image ? (
                      <img src={g.image} alt={g.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-white font-black text-sm">{g.name?.charAt(0) || g.userId?.charAt(0)}</span>
                    )}
                  </div>
                )}
                
                {/* Status indicator badge (Mute/Unmute) on the avatar */}
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border border-zinc-950 flex items-center justify-center bg-zinc-900 shadow-sm z-10">
                  {!(g as any).isMuted ? (
                    <Mic className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <MicOff className="w-2.5 h-2.5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Middle Section: Name & Bio */}
              <div className="flex flex-col justify-center flex-1 text-right min-w-0">
                <span 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startGuestLongPress(e, g.userId);
                  }}
                  onMouseUp={cancelGuestLongPress}
                  onMouseLeave={cancelGuestLongPress}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    startGuestLongPress(e, g.userId);
                  }}
                  onTouchEnd={cancelGuestLongPress}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    handleGuestContextMenu(e, g.userId);
                  }}
                  className="text-xs text-zinc-100 font-bold truncate cursor-pointer select-none hover:text-red-400 transition-colors"
                  title="اضغط مطولاً لفتح القائمة السريعة"
                >
                  {g.name || g.userId} {isMe ? '(أنت)' : ''}
                </span>
                <span className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans leading-tight">
                  {(g.custom as any)?.bio || (g as any).user?.custom?.bio || 'عضو في البث المباشر 🎙️'}
                </span>
              </div>

              {/* Toggle Switch next to guest (Left side) */}
              <div className="flex items-center justify-center shrink-0 pl-1 z-10">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const isMuted = hostMutedParticipants.includes(g.userId) || (g as any).isMuted;
                    await toggleParticipantMuteFirestore(g.userId, g.name || g.userId, isMuted);
                  }}
                  disabled={!(isHost || isModerator || g.isLocalParticipant)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ease-in-out focus:outline-none p-0.5 ${
                    !(hostMutedParticipants.includes(g.userId) || (g as any).isMuted)
                      ? 'bg-emerald-500/20 border-emerald-500/40 justify-end'
                      : 'bg-zinc-800 border-zinc-700 justify-start'
                  } ${
                    (isHost || isModerator || g.isLocalParticipant) ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
                  }`}
                  title={
                    (isHost || isModerator || g.isLocalParticipant)
                      ? (hostMutedParticipants.includes(g.userId) || (g as any).isMuted)
                        ? "تشغيل الصوت"
                        : "كتم الصوت"
                      : "لا تملك صلاحية تعديل الصوت"
                  }
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full shadow-md transition duration-200 ease-in-out ${
                      !(hostMutedParticipants.includes(g.userId) || (g as any).isMuted)
                        ? 'bg-emerald-400'
                        : 'bg-zinc-500'
                    }`}
                  />
                </button>
              </div>

              {/* Active options highlight ring */}
              {activeGuestOptionsUserId === g.userId && (
                <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* 4. LIVE CHAT OVERLAY (Bottom-half overlay - Left-aligned) */}
      <div className="relative z-10 w-full md:max-w-lg mr-auto ml-0 p-4 flex flex-col justify-end gap-3 pointer-events-auto bg-gradient-to-t from-black/95 via-transparent to-transparent pt-12 pl-4 pr-16 md:pr-4">
        {/* Pinned Comment Banner */}
        {pinnedComment && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 bg-zinc-950/90 backdrop-blur-xl border border-red-500/30 rounded-2xl px-4 py-2.5 mx-1 shadow-lg relative"
            dir="rtl"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-900 border border-red-500/20 shrink-0">
                {pinnedComment.userPhoto ? (
                  <img src={pinnedComment.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold bg-zinc-800">
                    {(pinnedComment.userName || 'M').charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-red-400">تعليق مثبت 📌</span>
                  <span className="text-[9px] font-bold text-zinc-400">• {pinnedComment.userName}</span>
                </div>
                <p className="text-[11px] font-medium text-white truncate mt-0.5">{pinnedComment.text}</p>
              </div>
            </div>
            {(isHost || isModerator) && (
              <button
                onClick={unpinComment}
                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all shrink-0"
                title="إلغاء التثبيت"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}

        {/* Comments stream area */}
        <div className="w-full max-h-[180px] overflow-y-auto space-y-2 pb-2 pr-1" style={{ direction: 'rtl' }}>
          <div className="flex flex-col gap-2">
            {chatStreamItems.filter(item => item.isJoinNotice || !mutedUsers.includes(item.userId)).map((item, idx) => {
              if (item.isJoinNotice) {
                return (
                  <motion.div
                    key={item.id ? `join-${item.id}` : `join-idx-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5 self-start max-w-[85%] select-none"
                  >
                    <span className="text-[10px] font-black text-indigo-400">👋</span>
                    <span className="text-[11px] font-semibold text-indigo-300">
                      انضم <span className="font-extrabold text-indigo-200">{item.userName}</span>
                    </span>
                  </motion.div>
                );
              }

              if (item.type === "follow_notice") {
                return (
                  <motion.div
                    key={item.id ? `follow-${item.id}` : `follow-idx-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 self-start max-w-[85%] select-none cursor-pointer hover:bg-emerald-500/20 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigateToUser && item.userId) {
                        onNavigateToUser(item.userId);
                      }
                    }}
                  >
                    <span className="text-[10px] font-black text-emerald-400">👤</span>
                    <span className="text-[11px] font-semibold text-emerald-300">
                      <span className="font-extrabold text-emerald-200">{item.userName}</span> تابع المضيف
                    </span>
                  </motion.div>
                );
              }

              const isCommentAnon = item.userId !== "system" && (
                item.isAnonymous === true ||
                (item.isAnonymous === undefined && isConfessionMode)
              );

              return (
                <motion.div
                  key={item.id ? `comment-${item.id}` : `comment-idx-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  onPointerDown={() => !isCommentAnon && startLongPress(item)}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onTouchStart={() => !isCommentAnon && startLongPress(item)}
                  onTouchEnd={cancelLongPress}
                  onContextMenu={(e) => {
                    if (isCommentAnon) return;
                    e.preventDefault();
                    setSelectedCommentForMod(item);
                    setActiveBottomSheet('moderation');
                  }}
                  onClick={() => {
                    if (isCommentAnon) return;
                    if (item.userName) {
                      setNewComment(prev => {
                        const mention = `@${item.userName} `;
                        if (prev.includes(mention)) return prev;
                        return `${mention}${prev}`;
                      });
                    }
                  }}
                  className="flex items-start gap-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl px-3 py-2 max-w-[85%] self-start cursor-pointer live-comment-item active:bg-white/5 transition-colors"
                  title={isCommentAnon ? undefined : "اضغط ضغطة سريعة للمنشن، أو مطولاً للخيارات"}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCommentAnon) return;
                      if (onNavigateToUser && item.userId) {
                        onNavigateToUser(item.userId);
                      }
                    }}
                    className={`w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0 ${isCommentAnon ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform duration-200'}`}
                  >
                    {isCommentAnon ? (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-violet-400 font-extrabold bg-zinc-900 border border-violet-500/20 select-none">
                        م
                      </div>
                    ) : item.userPhoto ? (
                      <img 
                        src={item.userPhoto} 
                        alt="" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold bg-zinc-800">
                        {(item.userName || 'M').charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black ${isCommentAnon ? 'text-violet-400' : 'text-amber-400'}`}>
                        {isCommentAnon ? "مستخدم مجهول" : (item.userName || "مستمع")}
                      </span>
                      {!isCommentAnon && moderators.includes(item.userId) && (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded-md shadow-sm">مشرف 🛡️</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-zinc-100 mt-0.5 break-words">
                      {item.text}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            {chatStreamItems.filter(item => item.isJoinNotice || !mutedUsers.includes(item.userId)).length === 0 && (
              <div className="text-zinc-500 text-xs font-bold pr-2 py-4 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-600" />
                <span>لا توجد تعليقات بعد. كن أول من يكتب!</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Interaction Badges (أزرار التفاعل السفلية) - Visible for Host & Moderators */}
        {(isHost || isModerator) && (
          <div className="w-full overflow-x-auto no-scrollbar py-1.5 flex items-center gap-2 self-start scroll-smooth" style={{ direction: 'rtl' }}>
            {[
              { label: 'إعدادات البث', emoji: '⚙️', icon: <Settings className="w-3 h-3 text-red-400" />, action: () => setShowSettingsModal(true) },
              { label: 'دعوة ضيف', emoji: '👤', icon: <UserPlus className="w-3 h-3 text-emerald-400" />, action: () => setShowInviteModal(true) },
              { label: 'بث مشترك', emoji: '👥', icon: <Users className="w-3 h-3 text-sky-400" />, action: () => setShowInviteModal(true) },
              { label: 'تحدي PK', emoji: '⚔️', icon: <Zap className="w-3 h-3 text-amber-400" />, action: () => setActiveBottomSheet('pk') },
              { label: 'إنشاء تصويت', emoji: '📊', icon: <BarChart2 className="w-3 h-3 text-pink-400" />, action: () => setShowPollModal(true) },
              { label: 'وضع الصراحة', emoji: '🤫', icon: <HelpCircle className="w-3 h-3 text-violet-400" />, action: () => setActiveBottomSheet('truth') }
            ].map((badge, idx) => (
              <button
                key={idx}
                onClick={badge.action}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full border border-white/10 backdrop-blur-md shadow-md text-[10px] font-black transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <span>{badge.emoji}</span>
                <span className="whitespace-nowrap">{badge.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-center gap-2 w-full mt-1" style={{ direction: 'rtl' }}>
          {/* Share Button (For everyone - Host, Moderators, Viewers) */}
          <button
            onClick={() => setActiveBottomSheet('share')}
            className="p-3 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-95 transition-all shrink-0 flex items-center justify-center shadow-lg backdrop-blur-md"
            title="مشاركة البث المباشر"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Request to Join / Raise Hand Button (Only for Normal Viewers) */}
          {!isHost && !isApprovedGuest && (
            <button
              onClick={handleRequestToJoin}
              disabled={hasRequestedJoin}
              className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-full font-black text-xs transition-all duration-300 active:scale-95 shrink-0 select-none border border-white/10 ${
                hasRequestedJoin
                  ? 'bg-zinc-800/80 text-emerald-400 border-emerald-500/20'
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-600/20'
              }`}
            >
              <span className="text-sm">✋</span>
              <span className="whitespace-nowrap">
                {hasRequestedJoin ? 'تم إرسال الطلب' : 'طلب انضمام'}
              </span>
            </button>
          )}

          <div className="relative flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendComment();
              }}
              disabled={mutedUsers.includes(currentUser?.uid || "")}
              placeholder={mutedUsers.includes(currentUser?.uid || "") ? "لقد تم كتمك من الكتابة في هذا البث 🔇" : "اكتب تعليقاً..."}
              className="w-full py-3 pl-12 pr-4 bg-black/60 border border-white/10 text-white placeholder-zinc-500 rounded-full focus:outline-none focus:ring-1.5 focus:ring-red-500/50 backdrop-blur-lg text-xs font-bold leading-none animate-none disabled:opacity-50"
            />
            <button
              onClick={() => sendComment()}
              disabled={!newComment.trim() || mutedUsers.includes(currentUser?.uid || "")}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all active:scale-95 ${
                newComment.trim() && !mutedUsers.includes(currentUser?.uid || "")
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700' 
                  : 'text-zinc-600 bg-transparent'
              }`}
            >
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Step Down (نزول) button for approved guests only */}
      {!isHost && isApprovedGuest && (
        <button
          onClick={handleStepDown}
          className="absolute bottom-24 right-4 z-[1000] flex flex-col items-center justify-center gap-1 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all border border-red-500/20 group cursor-pointer"
          title="نزول من المنصة"
          id="btn-guest-step-down"
        >
          <ArrowDown className="w-5 h-5 text-white group-hover:translate-y-0.5 transition-transform" />
          <span className="text-[10px] font-black tracking-tight text-white/90">نزول</span>
        </button>
      )}

      {/* Guest Sidebar on the Right */}
      {guestsOnStage.map((activeGuest, idx) => {
        const isSwappedToHost = !!(expandedParticipantId && activeGuest.userId === expandedParticipantId);
        const participantToRender = isSwappedToHost ? streamHostParticipant : activeGuest;
        if (!participantToRender) return null;

        const isMeSwapped = participantToRender.isLocalParticipant;
        const isMeGuest = activeGuest.isLocalParticipant;
        const isGuestCamEnabled = activeGuest.isLocalParticipant
          ? isCamOn
          : !!((activeGuest as any).hasVideo || (activeGuest as any).isVideoEnabled || activeGuest.videoStream || (activeGuest as any).videoStreamTrack);
        const isGuestMicEnabled = activeGuest.isLocalParticipant
          ? isMicOn
          : (!(activeGuest as any).isMuted && !hostMutedParticipants.includes(activeGuest.userId));

        const isRenderedCamEnabled = isSwappedToHost
          ? (isHost ? isCamOn : (streamHostParticipant ? ((streamHostParticipant as any).hasVideo || (streamHostParticipant as any).isVideoEnabled || !!streamHostParticipant.videoStream || !!(streamHostParticipant as any).videoStreamTrack) : false))
          : isGuestCamEnabled;

        const isRenderedMicEnabled = isSwappedToHost
          ? (isHost ? isMicOn : (streamHostParticipant ? !(streamHostParticipant as any).isMuted : true))
          : isGuestMicEnabled;

        // Connection quality evaluation
        const q = participantToRender.connectionQuality as any;
        const statusLabel = 
          q === 1 || q === 'poor' ? { text: 'ضعيف ⚠️', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' } :
          q === 2 || q === 'good' ? { text: 'جيد 🟢', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' } :
          q === 3 || q === 'excellent' ? { text: 'ممتاز 💎', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' } :
          { text: 'متصل 🟢', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };

        // Dynamic border color: Green if both on, Red if both off, Amber if one off
        const avatarBorderColor = (isRenderedMicEnabled && isRenderedCamEnabled) 
          ? 'border-emerald-500' 
          : (!isRenderedMicEnabled && !isRenderedCamEnabled) 
            ? 'border-red-500 shadow-red-500/10' 
            : 'border-amber-500 shadow-amber-500/10';

        return (
          <div 
            key={activeGuest.sessionId || activeGuest.userId}
            className="Sidebar bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col items-center justify-between"
            style={{
              position: 'absolute',
              right: 10,
              top: 150 + idx * 195,
              width: 120,
              height: 180,
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column'
            }}
            dir="rtl"
          >
            {/* Guarantee remote audio is always subscribed, decoded and played regardless of camera state */}
            {!isMeSwapped && (
              <div className="absolute top-0 left-0 w-1 h-1 opacity-0 overflow-hidden pointer-events-none z-[-50]">
                <ParticipantView 
                  participant={participantToRender}
                  trackType="none"
                  ParticipantViewUI={null}
                />
              </div>
            )}

            {/* Upper: Avatar & Name */}
            <div className="flex flex-col items-center w-full">
              {/* Guest's video/avatar */}
              <div 
                onClick={(e) => {
                  if (isHost) {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = rect.left + (rect.width / 2);
                    const y = rect.top + (rect.height / 2);
                    setActiveContextMenuUserId(activeGuest.userId);
                    setContextMenuCoords({ x, y });
                  }
                }}
                className={`relative w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border-2 ${avatarBorderColor} shadow-lg shrink-0 flex items-center justify-center mb-1 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 z-30`}
              >
                {/* Always render video track to ensure subscription and decoding work flawlessly */}
                <div className={`absolute inset-0 w-full h-full pointer-events-none ${isRenderedCamEnabled ? 'opacity-100 z-0' : 'opacity-0 z-[-1]'}`}>
                  <ParticipantView 
                    participant={participantToRender}
                    trackType="videoTrack"
                    className="w-full h-full object-cover rounded-full pointer-events-none"
                    ParticipantViewUI={null}
                  />
                </div>

                {/* If camera is disabled, show avatar placeholder on top */}
                {!isRenderedCamEnabled && (
                  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-zinc-950 z-10 pointer-events-none">
                    {participantToRender.image ? (
                      <img src={participantToRender.image} alt={participantToRender.name} className="w-full h-full object-cover rounded-full pointer-events-none" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-white font-black text-xs pointer-events-none">{(participantToRender.name || participantToRender.userId || 'G').charAt(0)}</span>
                    )}
                  </div>
                )}
                {/* Microstatus bubble inside avatar */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-white/10 px-1 py-0.5 rounded-full flex items-center gap-0.5 shadow-md z-10 scale-75 pointer-events-none">
                  {isRenderedMicEnabled ? (
                    <Mic className="w-2 h-2 text-emerald-400" />
                  ) : (
                    <MicOff className="w-2 h-2 text-red-500" />
                  )}
                  {isRenderedCamEnabled ? (
                    <Video className="w-2 h-2 text-emerald-400" />
                  ) : (
                    <VideoOff className="w-2 h-2 text-red-500" />
                  )}
                </div>
              </div>

              {/* Guest name */}
              <span className="text-[10px] font-black text-zinc-100 truncate w-full text-center leading-tight mb-1">
                {participantToRender.name || (isSwappedToHost ? 'المستضيف' : 'ضيف البث')}
              </span>
              
              {/* Connection Quality */}
              <span className={`text-[8px] font-black px-1 py-0.5 rounded-full border shrink-0 ${statusLabel.color} tracking-tight scale-90`}>
                {statusLabel.text}
              </span>
            </div>

            {/* Smart Conditional Controls based on user role */}
            <div className="flex items-center gap-2 mt-2 w-full justify-center">
              {isHost ? (
                // Host controls: ktem mic or stop camera
                <>
                  {/* Mute toggle for host */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const isCurrentlyMuted = hostMutedParticipants.includes(activeGuest.userId) || !isGuestMicEnabled;
                      await toggleParticipantMuteFirestore(activeGuest.userId, activeGuest.name || activeGuest.userId, isCurrentlyMuted);
                    }}
                    className={`p-1.5 rounded-full border transition-all active:scale-95 ${
                      isGuestMicEnabled
                        ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
                    }`}
                    title={isGuestMicEnabled ? "كتم صوت الضيف" : "تشغيل صوت الضيف"}
                  >
                    {isGuestMicEnabled ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    )}
                  </button>

                  {/* Camera toggle for host to disable/request guest camera */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (call) {
                        if (isGuestCamEnabled) {
                          // Disable guest camera
                          await call.sendCustomEvent({
                            type: 'host_disable_video',
                            custom: {
                              type: 'host_disable_video',
                              targetUserId: activeGuest.userId
                            }
                          }).catch((err: any) => console.warn("Failed to send host_disable_video event:", err));
                          triggerToast(`📷 تم إيقاف الكاميرا للضيف ${activeGuest.name || activeGuest.userId}`);
                        } else {
                          // Send request to enable camera
                          await call.sendCustomEvent({
                            type: 'host_enable_video',
                            custom: {
                              type: 'host_enable_video',
                              targetUserId: activeGuest.userId
                            }
                          }).catch((err: any) => console.warn("Failed to send host_enable_video event:", err));
                          triggerToast(`📷 تم إرسال طلب تشغيل الكاميرا للضيف ${activeGuest.name || activeGuest.userId}`);
                        }
                      }
                    }}
                    className={`p-1.5 rounded-full border transition-all active:scale-95 ${
                      isGuestCamEnabled
                        ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
                    }`}
                    title={isGuestCamEnabled ? "إيقاف الكاميرا للضيف" : "طلب تشغيل الكاميرا للضيف"}
                  >
                    {isGuestCamEnabled ? (
                      <Video className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    )}
                  </button>
                </>
              ) : isMeGuest ? (
                // Guest self controls: Toggle their own mic & camera
                <>
                  {/* Toggle own mic */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleMic();
                    }}
                    className={`p-1.5 rounded-full border transition-all active:scale-95 ${
                      isMicOn
                        ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
                    }`}
                    title={isMicOn ? "إيقاف المايك" : "تشغيل المايك"}
                  >
                    {isMicOn ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    )}
                  </button>

                  {/* Toggle own camera */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await toggleCamera();
                    }}
                    className={`p-1.5 rounded-full border transition-all active:scale-95 ${
                      isCamOn
                        ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 border-red-500/30 text-red-500 hover:bg-red-500/30'
                    }`}
                    title={isCamOn ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
                  >
                    {isCamOn ? (
                      <Video className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    )}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}



      {/* 5. LEAVE / END CALL CONFIRMATION DIALOG (FOR HOST) */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-sans" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-6 max-w-sm w-full text-center shadow-2xl relative"
            >
              <div className="w-14 h-14 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Radio className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{t("إنهاء البث المباشر؟")}</h3>
              <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
                {t("هل تريد إنهاء البث المباشر للجميع؟ سيتم إغلاق البث وستنقطع كاميرات الصوت والصوت لجميع المشاهدين.")}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setShowLeaveConfirm(false);
                    await executeEndCall();
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-red-600/10 text-xs"
                >
                  {t("نعم، إنهاء البث 🛑")}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black transition-all active:scale-95 text-xs text-zinc-300"
                >
                  {t("إلغاء والتراجع")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5.1 LEAVE CONFIRMATION DIALOG (FOR VIEWERS/GUESTS) */}
      <AnimatePresence>
        {showViewerLeaveConfirm && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-sans" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-6 max-w-sm w-full text-center shadow-2xl relative"
            >
              <div className="w-14 h-14 bg-amber-600/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{t("مغادرة البث المباشر؟")}</h3>
              <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
                {t("هل أنت متأكد من رغبتك في مغادرة البث المباشر الحالي والعودة للخارج؟")}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    setShowViewerLeaveConfirm(false);
                    await executeLeave();
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-red-600/10 text-xs"
                >
                  نعم، مغادرة 🚪
                </button>
                <button
                  onClick={() => setShowViewerLeaveConfirm(false)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black transition-all active:scale-95 text-xs text-zinc-300"
                >
                  إلغاء والتراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-20 left-1/2 bg-red-600 text-white px-4 py-2.5 rounded-full shadow-2xl text-[11px] font-black z-[1000] flex items-center gap-1.5 border border-red-500/30"
          >
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- REAL INTERACTIVE MODALS --- */}
      <AnimatePresence>
        {/* 1. Invite Modal (نافذة دعوة ضيف / بث مشترك) */}
        {showInviteModal && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 max-w-md w-full shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 mb-5 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <h3 className="text-white font-black text-base">إدارة الدعوات المباشرة 👥</h3>
                  <p className="text-zinc-500 text-[10px] font-bold mt-0.5">ادعُ ضيوف من الجمهور أو ادمج البث مع مضيفين آخرين</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 mb-4">
                <button
                  onClick={() => setInviteActiveTab('guests')}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    inviteActiveTab === 'guests' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  دعوة ضيف (الجمهور) 👤
                </button>
                <button
                  onClick={() => setInviteActiveTab('cohosts')}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    inviteActiveTab === 'cohosts' ? 'bg-emerald-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  بث مشترك (المضيفين) 👥
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar min-h-[150px] max-h-[300px] mb-4 space-y-2">
                {inviteActiveTab === 'guests' ? (
                  (() => {
                    const viewers = participants.filter(p => !p.isLocalParticipant && !(p as any).permissions?.includes('send-audio'));
                    if (viewers.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-900/20 border border-dashed border-zinc-850 rounded-2xl">
                          <Users className="w-8 h-8 text-zinc-600 mb-2" />
                          <span className="text-xs text-zinc-500 font-bold">لا يوجد مستمعين في الانتظار حالياً 👥</span>
                        </div>
                      );
                    }
                    return viewers.map(v => (
                      <div key={v.sessionId || v.userId} className="flex items-center justify-between p-3 bg-zinc-900/60 rounded-2xl border border-zinc-850">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                            {v.image ? (
                              <img src={v.image} alt={v.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-zinc-300 font-black text-xs">{v.name?.charAt(0) || v.userId?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <span className="text-xs text-white font-bold truncate max-w-[120px]">{v.name || v.userId}</span>
                        </div>
                        <button
                          onClick={() => inviteGuest(v.userId, v.name || v.userId)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all active:scale-95"
                        >
                          إرسال دعوة 🎙️
                        </button>
                      </div>
                    ));
                  })()
                ) : (
                  <div>
                    {fetchingCalls ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                        <span className="text-xs text-zinc-500 font-bold">جاري البحث عن البثوث النشطة...</span>
                      </div>
                    ) : activeCalls.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-900/20 border border-dashed border-zinc-850 rounded-2xl">
                        <Radio className="w-8 h-8 text-zinc-600 mb-2" />
                        <span className="text-xs text-zinc-500 font-bold">لا توجد بثوث نشطة أخرى حالياً للبث المشترك 📡</span>
                      </div>
                    ) : (
                      activeCalls.map(c => {
                        const callHostName = c.state?.createdBy?.name || c.id;
                        const callHostId = c.state?.createdBy?.id || c.id;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-900/60 rounded-2xl border border-zinc-850">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <Radio className="w-4 h-4" />
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-white font-bold truncate max-w-[150px]">{callHostName}</p>
                                <p className="text-[9px] text-zinc-500 font-bold">بث رقم: {c.id}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => inviteCohost(callHostId, callHostName, c.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-all active:scale-95"
                            >
                              دعوة دمج 👥
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Share link fallback */}
              <div className="border-t border-zinc-850 pt-4 bg-zinc-950/60 rounded-b-2xl">
                <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-850">
                  <p className="text-zinc-400 text-[10px] font-bold mb-2 text-right">
                    يمكنك أيضاً نسخ رابط البث المباشر ومشاركته يدوياً:
                  </p>
                  
                  <div className="flex items-center gap-2 bg-black/60 rounded-xl p-1.5 border border-white/5">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/?live=${streamId || "live_stream"}`}
                      className="flex-1 bg-transparent border-none text-zinc-500 text-[10px] font-mono font-bold pr-2 focus:outline-none select-all text-left"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?live=${streamId || "live_stream"}`);
                        setCopiedLink(true);
                        triggerToast("تم نسخ رابط البث بنجاح! 📋");
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                      className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                        copiedLink ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Guest Invite Acceptance Modal */}
        {pendingGuestInvite && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-sans text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 mx-auto">
                <Mic className="w-8 h-8 animate-bounce" />
              </div>

              <h3 className="text-white font-black text-center text-lg mb-2">دعوة للصعود للمايك! 🎙️</h3>
              <p className="text-zinc-400 text-xs font-bold text-center mb-6 leading-relaxed">
                لقد دعاك المضيف <span className="text-amber-400 font-extrabold">{pendingGuestInvite.hostName}</span> للمشاركة كضيف متحدث في هذا البث. هل تقبل الصعود والتحدث؟
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptGuestInvite}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition-all shadow-lg active:scale-95"
                >
                  نعم، أريد الصعود! 👍
                </button>
                <button
                  onClick={() => setPendingGuestInvite(null)}
                  className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-black rounded-xl transition-all border border-zinc-800"
                >
                  رفض الدعوة ❌
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Co-host Invite Acceptance Modal */}
        {pendingCohostInvite && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-sans text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 mx-auto">
                <Radio className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="text-white font-black text-center text-lg mb-2">دعوة للبث المشترك! 👥</h3>
              <p className="text-zinc-400 text-xs font-bold text-center mb-6 leading-relaxed">
                لقد دعاك المضيف <span className="text-rose-400 font-extrabold">{pendingCohostInvite.hostName}</span> للمشاركة كمضيف مشترك لدمج البث المباشر. هل تقبل الانضمام والدمج؟
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptCohostInvite}
                  className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-black rounded-xl transition-all shadow-lg active:scale-95"
                >
                  موافق، دمج البث! 🤝
                </button>
                <button
                  onClick={handleDeclineCohostInvite}
                  className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-black rounded-xl transition-all border border-zinc-800"
                >
                  رفض الدمج ❌
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. Settings Modal (إعدادات البث) */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 max-w-lg w-full shadow-2xl relative text-right"
            >
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 mb-5 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base">{t("إعدادات البث المباشر ⚙️")}</h3>
                  <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{t("لوحة التحكم الإدارية للمضيف وإشراف البث")}</p>
                </div>
              </div>

              {/* Tabs Bar */}
              <div className="flex border-b border-zinc-850 mb-5 overflow-x-auto no-scrollbar gap-1.5" dir="rtl">
                {[
                  { id: 'general', label: t('عام ⚙️') },
                  { id: 'requests', label: `${t('الطلبات ✋')} (${pendingRequests.length})` },
                  { id: 'moderators', label: `${t('المشرفون 🛡️')} (${moderators.length})` },
                  { id: 'muted', label: `${t('المكتومون 🔇')} (${mutedUsers.length})` },
                  { id: 'banned', label: `${t('المحظورون 🚫')} (${bannedUsers.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsActiveTab(tab.id as any)}
                    className={`pb-3 px-3.5 text-xs font-black transition-all border-b-2 whitespace-nowrap active:scale-95 ${
                      settingsActiveTab === tab.id
                        ? 'border-red-500 text-red-400 font-bold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="mb-6 min-h-[220px]">
                {/* A. General Tab */}
                {settingsActiveTab === 'general' && (
                  <div className="space-y-6">
                    {/* Video Quality Selection */}
                    <div className="space-y-2">
                      <label className="text-zinc-300 text-xs font-black pr-1">{t("جودة بث الفيديو")}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: '1080p', label: '1080p', tag: 'FHD' },
                          { id: '720p', label: '720p', tag: 'HD' },
                          { id: '480p', label: '480p', tag: 'SD' },
                          { id: '360p', label: '360p', tag: 'Low' }
                        ].map(quality => (
                          <button
                            key={quality.id}
                            onClick={() => {
                              setVideoQuality(quality.id);
                              triggerToast(`${t("تم تحديد جودة البث:")} ${quality.label} 📺`);
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                              videoQuality === quality.id
                                ? 'bg-red-500/20 border-red-500/40 text-red-400 font-bold'
                                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            <span className="text-xs font-black">{quality.label}</span>
                            <span className="text-[8px] font-bold opacity-60">{quality.tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Audio Volume Slider */}
                    <div className="space-y-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-850">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300 text-xs font-black">{t("حجم صوت المايكروفون")}</span>
                        <span className="text-red-400 font-mono text-xs font-black">{audioVolume}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setAudioVolume(prev => prev > 0 ? 0 : 80);
                            triggerToast(audioVolume > 0 ? t("تم كتم الصوت 🔇") : t("تم إلغاء كتم الصوت 🔊"));
                          }}
                          className="text-zinc-400 hover:text-white"
                        >
                          {audioVolume === 0 ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-red-400" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={audioVolume}
                          onChange={(e) => setAudioVolume(Number(e.target.value))}
                          className="flex-1 accent-red-600 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Requests Tab */}
                {settingsActiveTab === 'requests' && (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar" dir="rtl text-right">
                    {pendingRequests.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 text-xs font-bold">
                        {t("لا توجد طلبات انضمام معلقة حالياً ✋")}
                      </div>
                    ) : (
                      pendingRequests.map(req => (
                        <div key={req.senderId} className="flex items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-850 p-3 rounded-2xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-850 border border-white/5 shrink-0">
                              {req.senderPhoto ? (
                                <img src={req.senderPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold bg-zinc-850">
                                  {req.senderName?.charAt(0) || "U"}
                                </div>
                              )}
                            </div>
                            <span className="text-white text-xs font-black truncate">{req.senderName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptRequest(req.senderId, req.senderName)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-950/40"
                            >
                              {t("قبول 👍")}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.senderId)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 text-[10px] font-black rounded-xl transition-all active:scale-95"
                            >
                              {t("رفض")}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* B. Moderators Tab */}
                {settingsActiveTab === 'moderators' && (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar">
                    {moderators.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-xs font-bold">
                        {t("لا يوجد مشرفون معينون لهذا البث حالياً 🛡️")}
                      </div>
                    ) : (
                      moderators.map(uid => {
                        const details = getUserDetails(uid);
                        return (
                           <div key={uid} className="flex items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-850 p-3 rounded-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-850 border border-white/5 shrink-0">
                                {details.photoURL ? (
                                  <img src={details.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold bg-zinc-850">
                                    {details.displayName?.charAt(0) || "U"}
                                  </div>
                                )}
                              </div>
                              <span className="text-white text-xs font-black truncate">{details.displayName}</span>
                            </div>
                            <button
                              onClick={() => demoteFromModerator(uid, details.displayName)}
                              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black rounded-xl transition-all"
                            >
                              {t("إلغاء الإشراف 🛡️")}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* C. Muted Tab */}
                {settingsActiveTab === 'muted' && (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar">
                    {mutedUsers.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-xs font-bold">
                        {t("لا يوجد مستخدمون مكتومون في هذا البث حالياً 🔇")}
                      </div>
                    ) : (
                      mutedUsers.map(uid => {
                        const details = getUserDetails(uid);
                        return (
                          <div key={uid} className="flex items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-850 p-3 rounded-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-850 border border-white/5 shrink-0">
                                {details.photoURL ? (
                                  <img src={details.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold bg-zinc-850">
                                    {details.displayName?.charAt(0) || "U"}
                                  </div>
                                )}
                              </div>
                              <span className="text-white text-xs font-black truncate">{details.displayName}</span>
                            </div>
                            <button
                              onClick={() => unmuteUser(uid, details.displayName)}
                              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-xl transition-all"
                            >
                              {t("فك الكتم 🔊")}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* D. Banned Tab */}
                {settingsActiveTab === 'banned' && (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto no-scrollbar">
                    {bannedUsers.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-xs font-bold">
                        {t("لا يوجد مستخدمون محظورون من هذا البث حالياً 🚫")}
                      </div>
                    ) : (
                      bannedUsers.map(uid => {
                        const details = getUserDetails(uid);
                        return (
                          <div key={uid} className="flex items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-850 p-3 rounded-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-850 border border-white/5 shrink-0">
                                {details.photoURL ? (
                                  <img src={details.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400 font-bold bg-zinc-850">
                                    {details.displayName?.charAt(0) || "U"}
                                  </div>
                                )}
                              </div>
                              <span className="text-white text-xs font-black truncate">{details.displayName}</span>
                            </div>
                            <button
                              onClick={() => unbanUser(uid, details.displayName)}
                              className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-xl transition-all"
                            >
                              {t("إلغاء الحظر 🔓")}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-red-950/20"
              >
                {t("تطبيق وحفظ التعديلات ✅")}
              </button>
            </motion.div>
          </div>
        )}

        {/* 3. Poll Modal (إنشاء تصويت) */}
        {showPollModal && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 max-w-md w-full shadow-2xl relative text-right"
            >
              <button 
                onClick={() => setShowPollModal(false)}
                className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 mb-5 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base">إنشاء تصويت تفاعلي 📊</h3>
                  <p className="text-zinc-500 text-[10px] font-bold mt-0.5">اسأل جمهورك وشاركهم الآراء مباشرة على شاشة البث</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-zinc-300 text-xs font-black pr-1">سؤال الاستطلاع / التصويت</label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="مثال: هل أعجبكم أداء المنتخب اليوم؟"
                    className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-xs font-bold focus:outline-none focus:border-pink-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-zinc-300 text-xs font-black pr-1">الخيار الأول</label>
                    <input
                      type="text"
                      value={pollOptionA}
                      onChange={(e) => setPollOptionA(e.target.value)}
                      placeholder="نعم بالتأكيد 👍"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-xs font-bold focus:outline-none focus:border-pink-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-zinc-300 text-xs font-black pr-1">الخيار الثاني</label>
                    <input
                      type="text"
                      value={pollOptionB}
                      onChange={(e) => setPollOptionB(e.target.value)}
                      placeholder="ليس تماماً 👎"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-xs font-bold focus:outline-none focus:border-pink-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!pollQuestion.trim() || !pollOptionA.trim() || !pollOptionB.trim()) {
                      triggerToast("يرجى ملء جميع حقول التصويت أولاً ⚠️");
                      return;
                    }
                    setActivePoll({
                      question: pollQuestion.trim(),
                      optionA: pollOptionA.trim(),
                      optionB: pollOptionB.trim(),
                      votesA: 0,
                      votesB: 0,
                      totalVotes: 0
                    });
                    setPollQuestion("");
                    setPollOptionA("");
                    setPollOptionB("");
                    setShowPollModal(false);
                    triggerToast("تم نشر التصويت للمشاهدين بنجاح! 📊");
                  }}
                  className="flex-1 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-pink-950/20"
                >
                  نشر التصويت الآن 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- REAL INTERACTIVE BOTTOM SHEETS FOR EFFECTS --- */}
      <div 
        className={`fixed inset-0 z-[1150] flex items-end justify-center transition-all duration-300 ${
          activeBottomSheet 
            ? 'bg-black/65 backdrop-blur-sm pointer-events-auto opacity-100' 
            : 'bg-black/0 backdrop-blur-none pointer-events-none opacity-0'
        }`} 
        dir="rtl"
      >
        {/* Click outside backdrop to close */}
        <div className="absolute inset-0 z-0" onClick={() => setActiveBottomSheet(null)} />
        
        <div
          className={`bg-zinc-950/95 border-t border-white/10 rounded-t-[36px] w-full max-w-lg p-6 shadow-2xl relative z-10 font-sans text-right transition-transform duration-500 ease-out ${
            activeBottomSheet ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ transform: activeBottomSheet ? 'translateY(0)' : 'translateY(100%)' }}
        >
          {/* Top notch handle */}
          <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />
          
          <button
            onClick={() => setActiveBottomSheet(null)}
            className="absolute top-4 left-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Bottom Sheet Views based on type - kept always mounted to prevent unmounting audio player */}

          {/* A. Background Selection Sheet */}
          <div className={activeBottomSheet === 'background' ? 'space-y-4' : 'hidden'}>
            <div>
              <h3 className="text-white font-black text-lg">{t("تغيير خلفية البث المباشر 🖼️")}</h3>
              <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{t("اختر استوديو افتراضي أو نمط خلفية ملون يظهر عند إيقاف الكاميرا")}</p>
            </div>
            
            {/* Hidden Input for Gallery Upload */}
            <input 
              type="file" 
              ref={customBgInputRef} 
              accept="image/*" 
              onChange={handleCustomBgChange} 
              className="hidden" 
            />

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-2">
              {[
                { id: 'none', label: 'طبيعي', style: 'bg-zinc-900 border-zinc-850' },
                { id: 'blur', label: 'تغبيش', style: 'bg-zinc-800/80 backdrop-blur-md border-zinc-700' },
                { id: 'studio', label: 'استوديو', style: 'bg-gradient-to-br from-indigo-950 via-purple-900 to-zinc-950 border-purple-500/20' },
                { id: 'neon', label: 'نيون ريترو', style: 'bg-gradient-to-br from-rose-950 via-zinc-950 to-blue-950 border-rose-500/20' },
                { id: 'beach', label: 'شاطئ تيل', style: 'bg-gradient-to-br from-amber-950 via-teal-950 to-sky-950 border-teal-500/20' }
              ].map(bg => (
                <button
                  key={bg.id}
                  onClick={async () => {
                    setSelectedBackground(bg.id);
                    triggerToast(`${t("تم تطبيق خلفية:")} ${t(bg.label)} 🖼️`);
                    if (isHost) {
                      const activeId = streamId || "live_stream";
                      await updateDoc(doc(db, "lives", activeId), {
                        backgroundType: bg.id
                      }).catch(e => console.warn("Failed to sync backgroundType:", e));
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                    selectedBackground === bg.id
                      ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border border-white/10 ${bg.style}`} />
                  <span className="text-[10px] font-black tracking-tight">{t(bg.label)}</span>
                </button>
              ))}

              {/* Phone Studio Gallery Button */}
              <button
                onClick={() => customBgInputRef.current?.click()}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                  selectedBackground === 'custom'
                    ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                    : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                <div className="w-8 h-8 rounded-full border border-white/10 bg-zinc-800 flex items-center justify-center">
                  <Image className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-[10px] font-black tracking-tight">{t("استوديو الهاتف")}</span>
              </button>
            </div>
          </div>

          {/* B. Video Filters Sheet */}
          <div className={activeBottomSheet === 'filters' ? 'space-y-4' : 'hidden'}>
            <div>
              <h3 className="text-white font-black text-lg">{t("مستويات تصفية وتنعيم البشرة ✨")}</h3>
              <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{t("تحكم بمستوى تنعيم الوجه وتصفية البشرة في الوقت الفعلي خلال البث الحي")}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2">
              {[
                { id: 'none', label: 'طبيعي', color: 'from-zinc-500 to-zinc-700' },
                { id: 'light', label: 'تصفية خفيفة', color: 'from-emerald-400 to-teal-500' },
                { id: 'medium', label: 'تنعيم عالي', color: 'from-rose-400 to-pink-500' },
                { id: 'high', label: 'تصفية سينمائية', color: 'from-amber-400 to-orange-500' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setSelectedFilter(filter.id);
                    triggerToast(`${t("تم تفعيل:")} ${t(filter.label)} ✨`);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                    selectedFilter === filter.id
                      ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${filter.color} border border-white/10`} />
                  <span className="text-[10px] font-black tracking-tight">{t(filter.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* C. Audio Player Sheet */}
          <div className={activeBottomSheet === 'sound' ? 'space-y-4' : 'hidden'}>
            <div>
              <h3 className="text-white font-black text-lg">{t("مشغل وبث الصوتيات 🎵")}</h3>
              <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{t("اختر ملف صوتي (MP3) لبثه مباشرة للمشاهدين بنقاء رقمي عالي")}</p>
            </div>

            <StreamAudioPlayer
              isHost={isHost}
              call={call}
              triggerToast={triggerToast}
            />
          </div>

          {/* D. Truth Mode Sheet */}
          <div className={activeBottomSheet === 'truth' ? 'space-y-4 text-right' : 'hidden'}>
            <div>
              <h3 className="text-white font-black text-lg">{t("وضع الصراحة والأسئلة الشجاعة 🤫")}</h3>
              <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{t("اختر سؤالاً صريحاً لعرضه مباشرة على شاشة البث للمناقشة والرد")}</p>
            </div>

            {/* Candor Mode Toggle Control for Host & Moderators */}
            {(isHost || isModerator) && (
              <div className="p-3.5 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex flex-col gap-2" style={{ direction: 'rtl' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤫</span>
                    <div className="text-right">
                      <h4 className="text-white text-xs font-black">{t("وضع الصراحة (الأسئلة مجهولة الهوية)")}</h4>
                      <p className="text-zinc-400 text-[9px] font-bold mt-0.5">
                        {t("عند التفعيل، يبدأ مؤقت 5 دقائق وكل التعليقات تُعرض بأسماء وصور مجهولة دائماً.")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleConfessionMode}
                    className={`px-4.5 py-2 rounded-xl text-[10px] font-black transition-all shrink-0 active:scale-95 ${
                      isConfessionMode
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                        : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                  >
                    {isConfessionMode 
                      ? `${t("تعطيل")} (${Math.floor(confessionTimeLeft / 60)}:${(confessionTimeLeft % 60) < 10 ? '0' : ''}${confessionTimeLeft % 60}) 🛑` 
                      : t("تفعيل الوضع 🤫")
                    }
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
              {[
                "ما هو القرار الذي اتخذته وندمت عليه كثيراً في حياتك؟",
                "إذا ربحت مليون دولار فجأة، ما هو أول شيء ستشتريه؟",
                "ما هي الصفة التي تكرهها جداً في الأشخاص القريبين منك؟",
                "لو أتيحت لك فرصة الاعتذار لشخص واحد اليوم، من سيكون؟",
                "ما هو الحلم الأكبر الذي تسعى لتحقيقه قبل نهاية العام?"
              ].map((qText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveTruthQuestion(qText);
                    setActiveBottomSheet(null);
                    triggerToast(t("تم تفعيل ونشر سؤال الصراحة 🤫"));
                  }}
                  className="w-full p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 rounded-xl text-right text-[11px] font-bold text-zinc-300 transition-all flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-violet-600/15 border border-violet-500/30 text-violet-400 flex items-center justify-center text-[10px] shrink-0 font-bold">{idx+1}</span>
                  <span className="truncate">{t(qText)}</span>
                </button>
              ))}
            </div>

            {/* Custom question input */}
            <div className="flex gap-2 items-center pt-2">
              <input
                type="text"
                id="customTruthInput"
                placeholder={t("اكتب سؤال صراحة مخصص لمتابعيك...")}
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-xs font-bold focus:outline-none"
              />
              <button
                onClick={() => {
                  const inputEl = document.getElementById('customTruthInput') as HTMLInputElement;
                  if (inputEl && inputEl.value.trim()) {
                    setActiveTruthQuestion(inputEl.value.trim());
                    inputEl.value = "";
                    setActiveBottomSheet(null);
                    triggerToast(t("تم نشر سؤالك الصريح المخصص! 🤫"));
                  }
                }}
                className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-black text-xs rounded-xl active:scale-95"
              >
                {t("نشر الآن")}
              </button>
            </div>
          </div>

          {/* E. PK Battle Sheet */}
          <div className={activeBottomSheet === 'pk' ? 'space-y-4 text-right' : 'hidden'}>
            <div>
              <h3 className="text-white font-black text-lg">{t("بدء تحدي المنافسة PK الحماسي ⚔️")}</h3>
              <p className="text-zinc-500 text-[10px] font-bold mt-0.5">{t("أطلق معركة تصويت تفاعلية بين فريقين بسباق سرعة ونقاط تشجيع")}</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 text-xs font-black">{t("عنوان أو فكرة التحدي")}</label>
                <input
                  type="text"
                  value={pkTitleInput}
                  onChange={(e) => setPkTitleInput(e.target.value)}
                  placeholder={t("مثال: تحدي الضحك، جولة تبرعات، أسئلة ذكاء...")}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-xs font-bold focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-300 text-xs font-black">{t("مدة التحدي")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 60, label: 'دقيقة واحدة' },
                    { val: 180, label: '3 دقائق (موصى به)' },
                    { val: 300, label: '5 دقائق' }
                  ].map(tItem => (
                    <button
                      key={tItem.val}
                      onClick={() => setPkDurationInput(tItem.val)}
                      className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                        pkDurationInput === tItem.val
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                      }`}
                    >
                      {t(tItem.label)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setPkBattle({
                    title: pkTitleInput.trim() || t("تحدي PK البث المباشر ⚔️"),
                    redPoints: 10,
                    bluePoints: 10,
                    duration: pkDurationInput,
                    timeLeft: pkDurationInput,
                    active: true
                  });
                  setActiveBottomSheet(null);
                  triggerToast(t("تم إطلاق معركة تحدي PK الحماسية! ⚔️🔥"));
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-950/20 active:scale-95"
              >
                {t("بدء معركة PK الآن ⚔️🚀")}
              </button>
            </div>
          </div>
          <div className={activeBottomSheet === 'moderation' && selectedCommentForMod ? 'space-y-4 text-right' : 'hidden'}>
            {selectedCommentForMod && (() => {
               const targetUserId = selectedCommentForMod.userId;
               const isTargetHost = targetUserId === streamHostId || selectedCommentForMod.user?.role === 'host';
               const isTargetModerator = moderators.includes(targetUserId) || selectedCommentForMod.user?.role === 'moderator';
               const isTargetNormalViewer = !isTargetHost && !isTargetModerator;

               return (
                 <>
                   <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                     <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                       {selectedCommentForMod.userPhoto ? (
                         <img src={selectedCommentForMod.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 font-bold bg-zinc-800">
                           {(selectedCommentForMod.userName || 'M').charAt(0)}
                         </div>
                       )}
                     </div>
                     <div className="min-w-0">
                       <h3 className="text-white font-black text-sm">{selectedCommentForMod.userName || t("مستمع")}</h3>
                       <p className="text-zinc-500 text-[10px] font-bold mt-0.5 truncate max-w-[250px]">{selectedCommentForMod.text}</p>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 gap-2 pt-2">
                     {/* Option A: Copy Comment (Everyone) */}
                     <button
                       onClick={() => {
                         navigator.clipboard.writeText(selectedCommentForMod.text);
                         triggerToast(t("تم نسخ التعليق إلى الحافظة 📋"));
                         setActiveBottomSheet(null);
                       }}
                       className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-800/80 text-white text-xs font-black rounded-2xl border border-zinc-850 transition-all text-right justify-start"
                     >
                       <Copy className="w-4 h-4 text-blue-400 shrink-0" />
                       <span>{t("نسخ نص التعليق 📋")}</span>
                     </button>

                     {/* Option B: Pin Comment (Host or Moderator) */}
                     {(isHost || isModerator) && (
                       <button
                         onClick={() => {
                           pinComment(selectedCommentForMod);
                           setActiveBottomSheet(null);
                         }}
                         className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-800/80 text-white text-xs font-black rounded-2xl border border-zinc-850 transition-all text-right justify-start"
                       >
                         <Pin className="w-4 h-4 text-red-400 shrink-0" />
                         <span>{t("تثبيت هذا التعليق 📌")}</span>
                       </button>
                     )}

                     {/* Option C: Set/Remove Moderator (Host Only, and Target must be a normal viewer) */}
                     {isHost && isTargetNormalViewer && (
                       <button
                         onClick={() => {
                           if (moderators.includes(selectedCommentForMod.userId)) {
                             demoteFromModerator(selectedCommentForMod.userId, selectedCommentForMod.userName);
                           } else {
                             promoteToModerator(selectedCommentForMod.userId, selectedCommentForMod.userName);
                           }
                           setActiveBottomSheet(null);
                         }}
                         className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-800/80 text-white text-xs font-black rounded-2xl border border-zinc-850 transition-all text-right justify-start"
                       >
                         <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                         <span>
                           {moderators.includes(selectedCommentForMod.userId) ? t("إلغاء الإشراف عن المستخدم 🛡️") : t("تعيين كمشرف للبث 🛡️")}
                         </span>
                       </button>
                     )}

                     {/* Option D: Mute User (Host or Moderator, and Target must be a normal viewer) */}
                     {(isHost || isModerator) && isTargetNormalViewer && (
                       <button
                         onClick={() => {
                           muteUser(selectedCommentForMod.userId, selectedCommentForMod.userName);
                           purgeUserComments(selectedCommentForMod.userId);
                           setActiveBottomSheet(null);
                         }}
                         className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-800/80 text-white text-xs font-black rounded-2xl border border-zinc-850 transition-all text-right justify-start"
                       >
                         <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
                         <span>{t("كتم تعليقات هذا المستخدم 🔇")}</span>
                       </button>
                     )}

                     {/* Option E: Ban User (Host or Moderator, and Target must be a normal viewer) */}
                     {(isHost || isModerator) && isTargetNormalViewer && (
                       <button
                         onClick={() => {
                           banUser(selectedCommentForMod.userId, selectedCommentForMod.userName);
                           setActiveBottomSheet(null);
                         }}
                         className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900/60 hover:bg-zinc-800/80 text-rose-400 text-xs font-black rounded-2xl border border-rose-950/20 transition-all text-right justify-start"
                       >
                         <Ban className="w-4 h-4 text-red-500 shrink-0" />
                         <span>{t("حظر وطرد هذا المستخدم نهائياً 🚫")}</span>
                       </button>
                     )}
                   </div>
                 </>
               );
            })()}
          </div>

          {/* G. Share Bottom Sheet */}
          <div className={activeBottomSheet === 'share' ? 'space-y-6 text-right' : 'hidden'} dir="rtl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <Share2 className="w-5 h-5 text-red-500" />
                <span>{t("مشاركة البث المباشر 📢")}</span>
              </h3>
              <button 
                onClick={() => setActiveBottomSheet(null)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* أولاً: خيار نسخ رابط البث */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4">
              <h4 className="text-white font-bold text-xs mb-2">{t("رابط البث السريع")}</h4>
              <div className="flex items-center gap-2 bg-black/40 rounded-xl p-2 border border-white/5">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/?live=${streamId || "live_stream"}`}
                  className="flex-1 bg-transparent text-zinc-400 text-xs font-mono select-all outline-none text-left" 
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/?live=${streamId || "live_stream"}`);
                      triggerToast(t("تم نسخ رابط البث بنجاح"));
                    } catch (err) {
                      console.error("Failed to copy", err);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] rounded-lg transition-all active:scale-95 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t("نسخ الرابط")}</span>
                </button>
              </div>
            </div>

            {/* ثانياً: خيار المشاركة للمحادثات الخاصة والدخول المباشر */}
            <div className="space-y-3">
              <h4 className="text-white font-black text-xs">{t("المشاركة للمحادثات الخاصة والدخول المباشر 💬")}</h4>
              <p className="text-zinc-500 text-[10px] font-medium leading-relaxed">
                {t("حدد الأشخاص لإرسال بطاقة بث مباشر تفاعلية لهم داخل المحادثة الخاصة لتمكينهم من الدخول مباشرة للتطبيق.")}
              </p>

              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeChats.length === 0 ? (
                  <p className="text-zinc-600 text-center py-4 text-xs font-bold">{t("لا توجد محادثات خاصة نشطة حالياً")}</p>
                ) : (
                  activeChats.map((chat: any) => {
                    const isPrivate = chat.type === 'private' || chat.type === 'direct';
                    const name = isPrivate ? (chat.otherUser?.displayName || t("مستخدم")) : chat.name;
                    const photo = isPrivate ? chat.otherUser?.photoURL : chat.avatarUrl;
                    const isSelected = selectedChannels.includes(chat.id);

                    return (
                      <label 
                        key={chat.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-900/30 border-indigo-500/40' 
                            : 'bg-zinc-950/40 border-white/5 hover:bg-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedChannels(prev => prev.filter(id => id !== chat.id));
                              } else {
                                setSelectedChannels(prev => [...prev, chat.id]);
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-700 bg-zinc-800"
                          />
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                            {photo ? (
                              <img src={photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400 bg-zinc-700">
                                {name?.charAt(0) || 'C'}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-white text-xs font-black block text-right">{name}</span>
                            <span className="text-zinc-500 text-[9px] font-bold block text-right">{t("محادثة خاصة")}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {activeChats.length > 0 && (
                <button
                  onClick={async () => {
                    if (selectedChannels.length === 0) {
                      triggerToast(t("الرجاء تحديد قناة واحدة على الأقل للإرسال"));
                      return;
                    }
                    try {
                      // Send custom dynamic internal link card to all selected channels
                      const streamCode = streamId || "live_stream";
                      const streamTitleText = (call?.state?.custom as any)?.title || t("بث مباشر حي");

                      for (const chatId of selectedChannels) {
                        // 1. Add message of type 'livestream'
                        await addDoc(collection(db, 'chats', chatId, 'messages'), {
                          senderId: currentUser?.uid,
                          senderName: currentUser?.displayName || t("مستخدم"),
                          type: 'livestream',
                          text: `🎙️ ${t("انضم إلى البث المباشر المثير:")} "${streamTitleText}"! ${t("اضغط على البطاقة للدخول الفوري.")}`,
                          streamId: streamCode,
                          createdAt: serverTimestamp()
                        });

                        // 2. Update parent chat last message info
                        await updateDoc(doc(db, 'chats', chatId), {
                          lastMessage: `🔴 ${t("بطاقة مشاركة بث مباشر تفاعلية")}`,
                          lastMessageAt: serverTimestamp(),
                          lastSenderId: currentUser?.uid,
                          updatedAt: serverTimestamp()
                        });
                      }

                      triggerToast(t("تمت مشاركة البث للمحادثات المحددة بنجاح! 🎉"));
                      setSelectedChannels([]);
                      setActiveBottomSheet(null);
                    } catch (err) {
                      console.error("Error sending internal share message", err);
                      triggerToast(t("حدث خطأ أثناء الإرسال"));
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95"
                >
                  {t("إرسال للمحادثات المحددة")} ({selectedChannels.length}) ✉️
                </button>
              )}
            </div>

            {/* ثالثاً: خيار المشاركة لمواقع التواصل الاجتماعي الأخرى */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <h4 className="text-white font-black text-xs">{t("المشاركة للتطبيقات الخارجية 📲")}</h4>
              
              {/* Quick direct share icons */}
              <div className="flex items-center justify-around py-2">
                <button 
                  onClick={() => {
                    const text = encodeURIComponent(`🎙️ ${t("🎙️ شارك وانضم للبث المباشر الآن للاستماع والتفاعل!")} ${window.location.origin}/?live=${streamId || "live_stream"}`);
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 flex items-center justify-center transition-colors">
                    <span className="text-sm">💬</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{t("واتساب")}</span>
                </button>

                <button 
                  onClick={() => {
                    const url = encodeURIComponent(`${window.location.origin}/?live=${streamId || "live_stream"}`);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 flex items-center justify-center transition-colors">
                    <span className="text-sm">👤</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{t("فيسبوك")}</span>
                </button>

                <button 
                  onClick={() => {
                    const text = encodeURIComponent(`🎙️ ${t("🎙️ شارك وانضم للبث المباشر الآن للاستماع والتفاعل!")}`);
                    const url = encodeURIComponent(`${window.location.origin}/?live=${streamId || "live_stream"}`);
                    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 flex items-center justify-center transition-colors">
                    <span className="text-sm">✈️</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{t("تليجرام")}</span>
                </button>

                <button 
                  onClick={() => {
                    const text = encodeURIComponent(`🎙️ ${t("🎙️ شارك وانضم للبث المباشر الآن للاستماع والتفاعل!")} ${window.location.origin}/?live=${streamId || "live_stream"}`);
                    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                  }}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors">
                    <span className="text-sm">𝕏</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">{t("إكس")}</span>
                </button>
              </div>

              {/* Native mobile web share API */}
              <button
                onClick={async () => {
                  const title = t("البث المباشر الحي 🔴");
                  const text = t("🎙️ شارك وانضم للبث المباشر الآن للاستماع والتفاعل!");
                  const url = `${window.location.origin}/?live=${streamId || "live_stream"}`;
                  
                  if (navigator.share) {
                    try {
                      await navigator.share({ title, text, url });
                      triggerToast(t("تم فتح نافذة المشاركة بنجاح"));
                    } catch (err) {
                      console.error("Error calling native navigator.share", err);
                    }
                  } else {
                    // Fallback to Clipboard copy if not supported on desktop
                    try {
                      await navigator.clipboard.writeText(url);
                      triggerToast(t("تم نسخ الرابط بنجاح (المتصفح لا يدعم المشاركة الأصلية)"));
                    } catch (err) {
                      console.error("Failed to copy link", err);
                    }
                  }
                }}
                className="w-full py-3 bg-zinc-900 border border-white/10 hover:bg-zinc-800 hover:border-white/20 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-pink-500 animate-pulse" />
                <span>{t("فتح قائمة مشاركة الهاتف الأصلية 📱")}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

        {/* 6. PREMIUM ROLES & CONTEXT MENU (Bottom Sheet) */}
        <AnimatePresence>
          {activeGuestOptionsUserId && (
            (() => {
              const targetGuest = guestsOnStage.find(g => g.userId === activeGuestOptionsUserId);
              if (!targetGuest) return null;
              const isTargetHost = targetGuest.userId === (call?.state?.createdBy?.id || streamHostParticipant?.userId);
              const isTargetModerator = moderators.includes(targetGuest.userId);
              const isTargetNormalMember = !isTargetHost && !isTargetModerator;
              const isPresserHostOrModerator = isHost || isModerator;
              const isMe = targetGuest.userId === currentUser?.uid;

              return (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1050] flex items-end justify-center font-sans" dir={isRtl ? "rtl" : "ltr"} onClick={() => setActiveGuestOptionsUserId(null)}>
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] w-full max-w-lg p-6 flex flex-col gap-6 text-start shadow-2xl relative max-h-[85vh] overflow-y-auto no-scrollbar"
                    onClick={(e) => e.stopPropagation()} // Prevent closing
                  >
                    {/* Drag indicator bar */}
                    <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto" />

                    {/* Profile Card Header */}
                    <div className="flex items-center gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/40">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                        {targetGuest.image ? (
                           <img src={targetGuest.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-400">
                            {targetGuest.name?.charAt(0) || targetGuest.userId?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-start min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white truncate">{targetGuest.name || targetGuest.userId}</h3>
                          {isTargetHost && (
                            <span className="text-[9px] bg-red-500/20 text-red-400 font-black px-2 py-0.5 rounded-full border border-red-500/20">{t("مالك البث 👑")}</span>
                          )}
                          {isTargetModerator && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-500/20">{t("مشرف البث 🛡️")}</span>
                          )}
                          {isTargetNormalMember && (
                            <span className="text-[9px] bg-sky-500/20 text-sky-400 font-black px-2 py-0.5 rounded-full border border-sky-500/20">{t("عضو عادي 👥")}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 font-bold leading-relaxed mt-1 line-clamp-2">
                          {(targetGuest.custom as any)?.bio || (targetGuest as any).user?.custom?.bio || t('عضو نشط ومتميز في مجتمع البث المباشر 🌟')}
                        </p>
                      </div>
                    </div>

                    {/* Volume Controller (For everyone) */}
                    <div className="space-y-2 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-black text-white">{t("التحكم في الصوت")}</span>
                        </div>
                        <span className="text-xs font-mono text-rose-400 font-black">
                          {participantVolumes[targetGuest.userId] !== undefined ? participantVolumes[targetGuest.userId] : 100}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={isPresserHostOrModerator ? "1000" : "100"}
                        value={participantVolumes[targetGuest.userId] !== undefined ? participantVolumes[targetGuest.userId] : 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setParticipantVolumes(prev => ({ ...prev, [targetGuest.userId]: val }));
                          // Stored locally in participantVolumes for track rendering reference
                        }}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                      />
                      <p className="text-[9px] text-zinc-500 font-bold">
                        {isPresserHostOrModerator 
                          ? t("بصفتك مضيف/مشرف، يمكنك رفع صوت المشارك حتى 1000% لتضخيمه للجميع.")
                          : t("التحكم في صوت هذا المشارك محلياً على جهازك فقط.")}
                      </p>
                    </div>

                    {/* Action Buttons Grid */}
                    <div className="flex flex-col gap-2">
                      {/* Case 1: Host/Moderator targeting a Normal Member */}
                      {isPresserHostOrModerator && isTargetNormalMember && (
                        <>
                          {/* Server-Side Mute / Unmute */}
                          <button
                            onClick={async () => {
                              const isCurrentlyMuted = hostMutedParticipants.includes(targetGuest.userId);
                              await toggleParticipantMuteFirestore(targetGuest.userId, targetGuest.name || targetGuest.userId, isCurrentlyMuted);
                              setActiveGuestOptionsUserId(null);
                            }}
                            className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-2xl border border-zinc-800/50 transition-all flex items-center justify-center gap-2"
                          >
                            {hostMutedParticipants.includes(targetGuest.userId) ? (
                              <>
                                <Mic className="w-4 h-4 text-emerald-400" />
                                <span>{t("إلغاء كتم الصوت (عبر الخادم) 🔊")}</span>
                              </>
                            ) : (
                              <>
                                <MicOff className="w-4 h-4 text-red-500" />
                                <span>{t("كتم الصوت (عبر الخادم) 🔇")}</span>
                              </>
                            )}
                          </button>

                          {/* Remove Member / Kick */}
                          <button
                            onClick={async () => {
                              if (!call) return;
                              try {
                                await call.revokePermissions(targetGuest.userId, ['send-audio', 'send-video']);
                                call.sendCustomEvent({
                                  type: 'revoke_guest',
                                  custom: {
                                    type: 'revoke_guest',
                                    targetUserId: targetGuest.userId
                                  }
                                }).catch((err: any) => console.warn(err));
                                triggerToast(`👥 ${t("تم إنزال الضيف")} ${targetGuest.name || targetGuest.userId} ${t("للجمهور.")}`);
                                setActiveGuestOptionsUserId(null);
                              } catch (err) {
                                console.error(err);
                                triggerToast(t("فشل إنزال الضيف"));
                              }
                            }}
                            className="w-full py-3.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 hover:text-white font-black text-xs rounded-2xl border border-red-500/10 transition-all flex items-center justify-center gap-2"
                          >
                            <ArrowDown className="w-4 h-4 text-red-400" />
                            <span>{t("إزالة وإنزال للجمهور 👎")}</span>
                          </button>
                        </>
                      )}

                      {/* Case 2: Host/Moderator targeting another Moderator */}
                      {isPresserHostOrModerator && isTargetModerator && (
                        <div className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-xl text-center text-[10px] font-black text-zinc-400">
                          {t("🔒 لا يمكن كتم أو طرد المشرفين الآخرين لحفظ سلامة الغرفة. يمكنك فقط ضبط مستوى الصوت محلياً.")}
                        </div>
                      )}

                      {/* Case 3: Normal Member targeting ANY user (or Local Mute fallback for anyone) */}
                      {(!isPresserHostOrModerator || isMe) && (
                        <button
                          onClick={() => {
                            const isMuted = localMutedUsers.includes(targetGuest.userId);
                            if (isMuted) {
                              setLocalMutedUsers(prev => prev.filter(uid => uid !== targetGuest.userId));
                              setParticipantVolumes(prev => ({ ...prev, [targetGuest.userId]: 100 }));
                              triggerToast(`🔊 ${t("تم إلغاء الكتم المحلي لـ")} ${targetGuest.name || targetGuest.userId}`);
                            } else {
                              setLocalMutedUsers(prev => [...prev, targetGuest.userId]);
                              setParticipantVolumes(prev => ({ ...prev, [targetGuest.userId]: 0 }));
                              triggerToast(`🔇 ${t("تم كتم صوت")} ${targetGuest.name || targetGuest.userId} ${t("محلياً لديك.")}`);
                            }
                            setActiveGuestOptionsUserId(null);
                          }}
                          className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-2xl border border-zinc-800/50 transition-all flex items-center justify-center gap-2"
                        >
                          {localMutedUsers.includes(targetGuest.userId) ? (
                            <>
                              <Volume2 className="w-4 h-4 text-emerald-400" />
                              <span>{t("إلغاء كتم الصوت محلياً 🔊")}</span>
                            </>
                          ) : (
                            <>
                              <VolumeX className="w-4 h-4 text-red-500" />
                              <span>{t("كتم الصوت محلياً (لي فقط) 🔇")}</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Close Button */}
                      <button
                        onClick={() => setActiveGuestOptionsUserId(null)}
                        className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black text-xs rounded-2xl transition-all text-center mt-2"
                      >
                        {t("إغلاق القائمة")}
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })()
          )}
        </AnimatePresence>

        {/* Guest Context Menu (Long-press / Right-click) */}
        <AnimatePresence>
          {activeContextMenuUserId && contextMenuCoords && (
            (() => {
              const targetGuest = guestsOnStage.find(g => g.userId === activeContextMenuUserId);
              if (!targetGuest) return null;
              const isTargetModerator = moderators.includes(targetGuest.userId);

              return (
                <div 
                  className="fixed inset-0 z-[2000] font-sans" 
                  onClick={() => {
                    setActiveContextMenuUserId(null);
                    setContextMenuCoords(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveContextMenuUserId(null);
                    setContextMenuCoords(null);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'fixed',
                      top: Math.min(contextMenuCoords.y, window.innerHeight - 200),
                      left: Math.max(10, Math.min(contextMenuCoords.x - 120, window.innerWidth - 250)),
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-52 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 text-start"
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <div className="px-3 py-2 border-b border-white/5 flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-white truncate">{targetGuest.name || targetGuest.userId}</span>
                      <span className="text-[8px] font-mono text-zinc-500 truncate">{targetGuest.userId}</span>
                    </div>

                    {/* Actions for Host */}
                    {isHost && (
                      <>
                        {/* 1- Follow / Unfollow / Follow Back */}
                        <button
                          onClick={async () => {
                            setActiveContextMenuUserId(null);
                            setContextMenuCoords(null);
                            await handleToggleFollowGuest(targetGuest.userId, targetGuest.name || targetGuest.userId, targetGuest.image || "");
                          }}
                          className="w-full px-3 py-2 text-start text-xs font-bold text-sky-400 hover:bg-sky-500/10 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            {isFollowingTarget 
                              ? t('إلغاء المتابعة 👤') 
                              : (targetFollowingMe ? t('رد المتابعة 👥') : t('متابعة 👤'))
                            }
                          </span>
                        </button>

                        {/* 2- Expand / Shrink (توسيع / تصغير) */}
                        <button
                          onClick={async () => {
                            setActiveContextMenuUserId(null);
                            setContextMenuCoords(null);
                            const newId = expandedParticipantId === targetGuest.userId ? null : targetGuest.userId;
                            setExpandedParticipantId(newId);
                            if (newId) {
                              triggerToast(`🔍 ${t("تم توسيع شاشة")} ${targetGuest.name || targetGuest.userId}`);
                            } else {
                              triggerToast(`🔍 ${t("تم تصغير شاشة")} ${targetGuest.name || targetGuest.userId}`);
                            }
                            
                            // Update Firestore to synchronize the layout change with all viewers and guests
                            const activeId = streamId || "live_stream";
                            await updateDoc(doc(db, "lives", activeId), {
                              expandedParticipantId: newId
                            }).catch(err => console.error("Error updating expandedParticipantId on Firestore:", err));

                            if (call) {
                              await call.update({
                                custom: {
                                  ...(call.state.custom || {}),
                                  expanded_participant_id: newId
                                }
                              }).catch(e => console.warn("Failed to update custom call state:", e));
                            }
                          }}
                          className="w-full px-3 py-2 text-start text-xs font-bold text-violet-400 hover:bg-violet-500/10 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-violet-400" />
                          <span>{expandedParticipantId === targetGuest.userId ? t('تصغير 🔍') : t('توسيع 🔍')}</span>
                        </button>

                        {/* 3- Drop/Kick Guest Action (إنزال) */}
                        <button
                          onClick={async () => {
                            setActiveContextMenuUserId(null);
                            setContextMenuCoords(null);
                            await handleKickGuest(targetGuest.userId, targetGuest.name || targetGuest.userId);
                          }}
                          className="w-full px-3 py-2 text-start text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-red-400" />
                          <span>{t('إنزال 👎')}</span>
                        </button>

                        {/* Promote/Demote moderator action - Host only */}
                        <button
                          onClick={async () => {
                            setActiveContextMenuUserId(null);
                            setContextMenuCoords(null);
                            if (isTargetModerator) {
                              await demoteFromModerator(targetGuest.userId, targetGuest.name || targetGuest.userId);
                            } else {
                              await promoteToModerator(targetGuest.userId, targetGuest.name || targetGuest.userId);
                            }
                          }}
                          className={`w-full px-3 py-2 text-start text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                            isTargetModerator 
                              ? 'text-amber-400 hover:bg-amber-500/10' 
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{isTargetModerator ? t('إلغاء صلاحيات المشرف 👥') : t('تحويل لمشرف 🛡️')}</span>
                        </button>
                      </>
                    )}

                    {/* Actions for Moderator only (not host) */}
                    {!isHost && isModerator && (
                      <button
                        onClick={async () => {
                          setActiveContextMenuUserId(null);
                          setContextMenuCoords(null);
                          await handleKickGuest(targetGuest.userId, targetGuest.name || targetGuest.userId);
                        }}
                        className="w-full px-3 py-2 text-start text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                        <span>{t('طرد وإنزال للجمهور 👎')}</span>
                      </button>
                    )}

                    {/* Copy Guest ID Action (Visible to everyone) */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(targetGuest.userId);
                        triggerToast(t("📋 تم نسخ معرف الضيف بنجاح!"));
                        setActiveContextMenuUserId(null);
                        setContextMenuCoords(null);
                      }}
                      className="w-full px-3 py-2 text-start text-xs font-bold text-zinc-300 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t('نسخ معرف الضيف 📋')}</span>
                    </button>

                    {/* Close Action */}
                    <button
                      onClick={() => {
                        setActiveContextMenuUserId(null);
                        setContextMenuCoords(null);
                      }}
                      className="w-full px-3 py-1.5 text-center text-[10px] font-black text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors mt-1 border-t border-white/5"
                    >
                      {t('إغلاق')}
                    </button>
                  </motion.div>
                </div>
              );
            })()
          )}
        </AnimatePresence>

        {/* 7. DYNAMIC WHITEBOARD OVERLAY */}
        <AnimatePresence>
          {false && (
            <div className="fixed inset-0 bg-black/95 z-[1060] flex flex-col font-sans" dir={isRtl ? "rtl" : "ltr"}>
              {/* Header / Toolbar */}
              <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <div>
                    <h3 className="text-white text-xs font-black">{t("السبورة الذكية التفاعلية 🎨")}</h3>
                    <p className="text-zinc-500 text-[9px] font-bold mt-0.5">
                      {(isHost || isModerator) ? t('أنت ترسم الآن على سبورة مشتركة يراها الجميع بالوقت الفعلي 🎙️') : t('وضع المشاهدة فقط - يقوم المشرف بالرسم حالياً 🔒')}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleCloseWhiteboard}
                  className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title={t("إغلاق")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawing Canvas Board */}
              <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className={`max-w-full max-h-full aspect-[4/3] bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl ${
                    (isHost || isModerator) ? 'cursor-crosshair touch-none' : 'pointer-events-none'
                  }`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasMouseUp}
                />
              </div>

              {/* Bottom Tools bar (Visible for Host & Moderators ONLY) */}
              {(isHost || isModerator) ? (
                <div className="p-4 bg-zinc-900 border-t border-zinc-800/80 shrink-0 flex flex-wrap items-center justify-between gap-4">
                  {/* Colors picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-[10px] font-bold">{t("اللون:")}</span>
                    <div className="flex items-center gap-1.5">
                      {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBrushColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full border transition-transform ${
                            brushColor === color ? 'scale-125 border-white ring-2 ring-rose-500/50' : 'border-zinc-700 hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Brush size slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-[10px] font-bold">{t("الحجم:")}</span>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={brushWidth}
                      onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                      className="w-28 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                    <span className="text-white text-[10px] font-mono font-black">{brushWidth}px</span>
                  </div>

                  {/* Clear Board & Close Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearWhiteboard}
                      className="px-4 py-2 bg-red-950/40 hover:bg-red-900/30 text-red-400 hover:text-white font-black text-[10px] rounded-xl border border-red-500/10 transition-all active:scale-95"
                    >
                      🗑️ {t("مسح الكل")}
                    </button>
                    <button
                      onClick={handleCloseWhiteboard}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-[10px] rounded-xl transition-all active:scale-95 shadow-md shadow-red-600/15"
                    >
                      🔒 {t("إنهاء السبورة للجميع")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-zinc-900 border-t border-zinc-800/80 shrink-0 text-center">
                  <span className="inline-flex items-center gap-1.5 text-yellow-500 text-[10px] font-black bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/10">
                    🔒 {t("وضع المشاهدة فقط (المضيف يقوم بالشرح والرسم الآن)")}
                  </span>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

    </div>
  );
};

export const LiveStreamScreen = ({
  currentUser,
  userProfile,
  streamId,
  isHost = false,
  onClose,
  onNavigateToUser
}: {
  currentUser: FirebaseUser | null,
  userProfile?: any,
  streamId?: string,
  isHost?: boolean,
  onClose: () => void,
  onNavigateToUser?: (uid: string) => void
}) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [streamCall, setStreamCall] = useState<any>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(!isHost || !!streamId);
  const { t, isRtl } = useLanguage();
  const [streamTitle, setStreamTitle] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | undefined>(streamId);
  const [streamData, setStreamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeStreamId) return;
    const liveDocRef = doc(db, "lives", activeStreamId);
    const unsub = onSnapshot(liveDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setStreamData(snapshot.data());
      }
    });
    return () => unsub();
  }, [activeStreamId]);

  const coHostActive = !!streamData?.coHostActive;
  const coHostStreamId = streamData?.coHostStreamId;
  const callChannelId = (coHostActive && coHostStreamId && activeStreamId)
    ? (activeStreamId < coHostStreamId ? activeStreamId : coHostStreamId)
    : activeStreamId;

  useEffect(() => {
    if (!currentUser) return;
    if (isHost && !callChannelId) return; // Wait for Pre-join screen to handle setup and dynamic join

    let active = true;
    let streamClient: StreamVideoClient | null = null;
    let myCall: any = null;

    const initStream = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(getApiUrl('/api/stream/credentials'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        });
        if (!response.ok) throw new Error('Failed to fetch stream credentials');
        const { apiKey, token } = await response.json();

        if (!active) return;

        const user = {
          id: currentUser.uid,
          name: userProfile?.displayName || currentUser.displayName || t('مستضيف'),
          image: userProfile?.avatarUrl || currentUser.photoURL || '',
        };

        streamClient = new StreamVideoClient({
          apiKey,
          user,
          tokenProvider: async (): Promise<string> => token,
        });

        setClient(streamClient);

        const channelName = callChannelId || "live_stream";
        myCall = streamClient.call('default', channelName);

        // Join the call (viewers join with create: false)
        await myCall.join({ create: isHost });
        
        // Strict settings based on Host vs Viewer
        if (isHost) {
          await myCall.camera.disable();
          await myCall.microphone.disable();
          try {
            if (typeof myCall.publishAudioStream === 'function') {
              await (myCall as any).publishAudioStream();
            }
          } catch (e) {
            console.warn("initStream: publishAudioStream error:", e);
          }
          try {
            if (typeof myCall.publishVideoStream === 'function') {
              await (myCall as any).publishVideoStream();
            }
          } catch (e) {
            console.warn("initStream: publishVideoStream error:", e);
          }
        } else {
          // Force viewer role: absolutely no camera or microphone publishing
          await myCall.camera.disable();
          await myCall.microphone.disable();

          if (activeStreamId) {
            updateDoc(doc(db, "lives", activeStreamId), {
              viewerCount: increment(1),
              trendingScore: increment(5)
            }).catch(err => console.warn("Failed to update viewerCount/trendingScore on join:", err));
          }
        }

        if (!active) {
          myCall.leave().catch(() => {});
          streamClient.disconnectUser().catch(() => {});
          return;
        }
        setStreamCall(myCall);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error joining Stream Video Call in LiveStreamScreen:", err);
        setError(err.message || String(err));
        setIsLoading(false);
      }
    };

    initStream();

    return () => {
      active = false;
      if (myCall) {
        myCall.leave().catch((err: any) => {
          console.warn("Error leaving call in LiveStreamScreen:", err);
        });
      }
      if (streamClient) {
        streamClient.disconnectUser().catch((err: any) => {
          console.warn("Error disconnecting stream user:", err);
        });
      }
      if (!isHost && activeStreamId) {
        updateDoc(doc(db, "lives", activeStreamId), {
          viewerCount: increment(-1),
          trendingScore: increment(-2)
        }).catch(err => console.warn("Failed to update viewerCount/trendingScore on leave:", err));
      }
    };
  }, [currentUser, callChannelId, isHost, activeStreamId]);

  // Pre-join Screen for Host when starting a new stream
  if (isHost && !isSetupComplete) {
    return (
      <div className="fixed inset-0 w-full h-screen bg-slate-950 text-white p-6 z-[999] flex flex-col items-center justify-center font-sans" dir={isRtl ? "rtl" : "ltr"}>
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-3 bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-zinc-800/50 z-[1000] active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ambient background decoration */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl z-10 text-center">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <h3 className="text-2xl font-black text-white mb-2">{t("تجهيز البث المباشر 🔴")}</h3>
          <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
            {t("أهلاً بك في استوديو البث الخاص بـ TruCast. يرجى كتابة عنوان جذاب لبثك لكي يتمكن المتابعون من الانضمام والتفاعل معك.")}
          </p>

          <div className="flex flex-col gap-4 text-start mb-6">
            <label className="text-zinc-300 text-xs font-black pr-1">{t("عنوان البث")}</label>
            <input
              type="text"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder={t("مثال: دردشة رمضانية، بث ألعاب، نقاش مفتوح...")}
              className="w-full px-5 py-4 bg-black/50 border border-white/10 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-xs font-bold transition-all"
            />
          </div>

          <button
            onClick={async () => {
              if (isJoining || !currentUser) return;
              setIsJoining(true);
              setIsLoading(true);
              setError(null);
              try {
                // 1. Create lives document in Firestore
                const titleText = streamTitle.trim() || t("بث مباشر جديد");
                const liveRef = await addDoc(collection(db, "lives"), {
                  hostId: currentUser.uid,
                  hostName: userProfile?.displayName || currentUser.displayName || t("مستضيف"),
                  hostPhoto: userProfile?.avatarUrl || currentUser.photoURL || "",
                  title: titleText,
                  status: 'active',
                  startedAt: serverTimestamp(),
                  lastActiveAt: serverTimestamp(),
                  viewerCount: 1,
                  trendingScore: 0,
                  cameraEnabled: true,
                  micEnabled: true,
                  approvedGuests: []
                });

                const generatedStreamId = liveRef.id;
                setActiveStreamId(generatedStreamId);

                // Send notifications to all followers (chunked for batches of up to 400)
                try {
                  const { getDocs, writeBatch } = await import('firebase/firestore');
                  const followersSnap = await getDocs(collection(db, "users", currentUser.uid, "followers"));
                  if (!followersSnap.empty) {
                    const docs = followersSnap.docs;
                    const chunkSize = 400;
                    for (let i = 0; i < docs.length; i += chunkSize) {
                      const chunk = docs.slice(i, i + chunkSize);
                      const batch = writeBatch(db);
                      chunk.forEach(followerDoc => {
                        const followerId = followerDoc.id;
                        const notifRef = doc(collection(db, "users", followerId, "notifications"));
                        batch.set(notifRef, {
                          title: t("بث مباشر جديد 🔴"),
                          body: `${t("بدأ المذيع")} ${userProfile?.displayName || currentUser.displayName || t("مستضيف")} ${t("بثاً مباشراً جديداً:")} ${titleText}`,
                          type: "live_start",
                          streamId: generatedStreamId,
                          hostId: currentUser.uid,
                          hostName: userProfile?.displayName || currentUser.displayName || t("مستضيف"),
                          hostPhoto: userProfile?.avatarUrl || currentUser.photoURL || "",
                          read: false,
                          createdAt: serverTimestamp()
                        });
                      });
                      await batch.commit();
                    }
                  }
                } catch (err) {
                  console.error("Error sending start live notifications in Pre-join Screen:", err);
                }

                setIsSetupComplete(true);
              } catch (err: any) {
                console.error("Error setting up live stream:", err);
                setError(err.message || String(err));
                setIsLoading(false);
              } finally {
                setIsJoining(false);
              }
            }}
            disabled={isJoining}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-red-600/30 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white"></div>
                <span>{t("جاري إنشاء غرف البث الآمنة...")}</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-white animate-pulse" />
                <span>{t("بدء البث المباشر الآن 🚀")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 w-full h-screen bg-slate-950 text-white p-6 z-[999] flex flex-col items-center justify-center font-sans text-center" dir={isRtl ? "rtl" : "ltr"}>
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-3 bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-zinc-800/50 z-[1000] active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black mb-2">{t("فشل الاتصال بالبث المباشر 🔴")}</h3>
        <p className="text-zinc-400 font-bold text-xs mb-6 max-w-sm leading-relaxed">
          {error === "Failed to fetch stream credentials" ? t("فشل التحقق من الهوية وصلاحية البث المباشر. يرجى المحاولة لاحقاً.") : error}
        </p>
        <button 
          onClick={onClose} 
          className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-2xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-red-600/25"
        >
          {t("العودة للرئيسية")}
        </button>
      </div>
    );
  }

  if (isLoading || !client || !streamCall) {
    return (
      <div className="fixed inset-0 w-full h-screen bg-slate-950 text-white p-6 z-[999] flex flex-col items-center justify-center font-sans">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-3 bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-zinc-800/50 z-[1000]"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500"></div>
            <Radio className="w-6 h-6 text-red-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="text-xl font-black mb-2">{t("جاري تجهيز البث...")}</h3>
          <p className="text-zinc-500 font-bold text-sm">{t("يتم الآن تهيئة اتصال البث الآمن عبر خوادم TruCast")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-screen bg-slate-950 flex flex-col z-[999] overflow-hidden">
      <StreamVideo client={client}>
        <StreamCall call={streamCall}>
          <LiveStreamContent 
            isHost={isHost} 
            streamId={activeStreamId}
            currentUser={currentUser}
            userProfile={userProfile}
            onClose={onClose} 
            onNavigateToUser={onNavigateToUser}
          />
        </StreamCall>
      </StreamVideo>
    </div>
  );
};

export function useLiveStreamMedia(
  isHost: boolean,
  stream: any,
  remoteVideoRef: any,
  remoteVideoRefStandard: any,
  viewerVideoStreamRef: any,
  remoteAudioRef?: any,
  remoteAudioRefStandard?: any,
  viewerAudioStreamRef?: any
) {
  return null;
}
