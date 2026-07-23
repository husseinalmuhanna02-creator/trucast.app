import React, { useState, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useLanguage } from '../localization';
import { User as FirebaseUser } from 'firebase/auth';
import { Chat, CallSession } from '../types';
import { UserProfileScreen } from '../App';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, collection, arrayUnion, arrayRemove } from 'firebase/firestore';
import {
  const ScreenShare = registerPlugin<{ startScreenShare(): Promise<any> }>('ScreenShare');
  StreamVideo,
  StreamCall,
  SpeakerLayout,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
  ParticipantView,
} from '@stream-io/video-react-sdk';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  X, 
  Monitor, 
  Menu, 
  Settings, 
  Sliders, 
  VolumeX, 
  Volume2,
  Palette,
  Edit2, 
  Check, 
  ChevronDown,
  Lock,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { getApiUrl } from '../config';

// Interactive and synchronized whiteboard sub-component
const WhiteboardPanel = ({ 
  call, 
  isOwnerOrAdmin, 
  onClose 
}: { 
  call: any; 
  isOwnerOrAdmin: boolean; 
  onClose: () => void; 
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const pendingSegmentsRef = useRef<{ x0: number; y0: number; x1: number; y1: number; color: string }[]>([]);
  const flushTimerRef = useRef<any>(null);
  const lastSentTimeRef = useRef<number>(0);

  const flushPendingSegments = () => {
    if (pendingSegmentsRef.current.length === 0) return;
    if (!call || !isOwnerOrAdmin) {
      pendingSegmentsRef.current = [];
      return;
    }

    const now = Date.now();
    const timePassed = now - lastSentTimeRef.current;
    if (timePassed < 400) {
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushPendingSegments();
        }, 400 - timePassed);
      }
      return;
    }

    const segmentsToSend = [...pendingSegmentsRef.current];
    pendingSegmentsRef.current = [];
    lastSentTimeRef.current = now;

    call.sendCustomEvent({
      type: 'draw-lines-batch',
      custom: { lines: segmentsToSend }
    }).catch((err: any) => console.error("Error sending draw-lines-batch custom event:", err));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  const drawLine = (x0: number, y0: number, x1: number, y1: number, lineColor: string, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = lineColor;
    ctx.stroke();

    if (emit && call && isOwnerOrAdmin) {
      pendingSegmentsRef.current.push({ x0, y0, x1, y1, color: lineColor });
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushPendingSegments();
        }, 400);
      }
    }
  };

  const getCoordinates = (e: any): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    const x = (clickX / rect.width) * 800;
    const y = (clickY / rect.height) * 600;
    return { x, y };
  };

  const startDrawing = (e: any) => {
    if (!isOwnerOrAdmin) return;
    const pos = getCoordinates(e);
    if (!pos) return;
    setLastPos(pos);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing || !lastPos || !isOwnerOrAdmin) return;
    const pos = getCoordinates(e);
    if (!pos) return;
    drawLine(lastPos.x, lastPos.y, pos.x, pos.y, color, true);
    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
    flushPendingSegments();
  };

  const clearCanvas = (emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 600);

    if (emit && call && isOwnerOrAdmin) {
      call.sendCustomEvent({
        type: 'clear-board',
        custom: {}
      }).catch((err: any) => console.error("Error sending clear custom event:", err));
    }
  };

  // Listen to incoming drawing custom events from Stream Call
  useEffect(() => {
    if (!call) return;
    const handleCustomEvent = (event: any) => {
      if (event.type === 'draw-line') {
        const { x0, y0, x1, y1, color: lineColor } = event.custom;
        drawLine(x0, y0, x1, y1, lineColor, false);
      } else if (event.type === 'draw-lines-batch') {
        const { lines } = event.custom;
        if (Array.isArray(lines)) {
          lines.forEach((line: any) => {
            drawLine(line.x0, line.y0, line.x1, line.y1, line.color, false);
          });
        }
      } else if (event.type === 'clear-board') {
        clearCanvas(false);
      }
    };
    const unsubscribe = call.on('custom', handleCustomEvent);
    return () => {
      unsubscribe();
    };
  }, [call, color, isOwnerOrAdmin]);

  return (
    <div className="fixed inset-4 md:inset-12 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 z-[80] flex flex-col shadow-2xl font-sans" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="text-white font-black text-base">{t("السبورة الذكية التفاعلية")} 📋</h4>
          {!isOwnerOrAdmin && (
            <span className="text-xs bg-zinc-900 text-zinc-400 px-3 py-1 rounded-full border border-white/5">{t("وضع المشاهدة فقط 👁️")}</span>
          )}
        </div>
        {isOwnerOrAdmin && (
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-all bg-zinc-900/50 rounded-full hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 relative flex flex-col justify-center items-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-2">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: 'none' }}
          className={`w-full h-full max-w-full max-h-full object-contain rounded-xl cursor-crosshair ${
            isOwnerOrAdmin ? 'pointer-events-auto' : 'pointer-events-none opacity-90'
          }`}
        />
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          {isOwnerOrAdmin && ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {isOwnerOrAdmin && (
          <button onClick={() => clearCanvas(true)} className="text-xs text-zinc-400 hover:text-red-400 font-black transition-colors px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
            {t("مسح اللوحة للجميع 🧼")}
          </button>
        )}
      </div>
    </div>
  );
};

// Sub-component to safely consume Stream Video contexts/hooks
const GroupCallContent = ({ 
  currentUser,
  chat,
  callSession,
  onClose,
  onNavigateToUser,
  onMinimize
}: { 
  currentUser: FirebaseUser | null,
  chat: Chat,
  callSession: CallSession,
  onClose: () => void,
  onNavigateToUser: (uid: string) => void,
  onMinimize?: () => void
}) => {
  const { t } = useLanguage();
  const call = useCall();
  const { useCameraState, useMicrophoneState, useScreenShareState, useParticipants } = useCallStateHooks();
  const { status: camStatus } = useCameraState();
  const { status: micStatus } = useMicrophoneState();
  const { isEnabled: isScreenSharing } = useScreenShareState();
  const participants = useParticipants();

  const isCamOn = camStatus === 'enabled';
  const isMicOn = micStatus === 'enabled';

  const localParticipant = participants.find(p => p.userId === currentUser?.uid);
  const [hardMutedUserIds, setHardMutedUserIds] = useState<string[]>(() => {
    return call?.state?.custom?.hardMutedUserIds || [];
  });

  const isLocalHardMuted = 
    (localParticipant && 
    ((localParticipant as any).capabilities?.includes('send-audio') === false || 
     (localParticipant as any).permissions?.includes('send-audio') === false ||
     (localParticipant as any).capabilities?.includes('send-video') === false || 
     (localParticipant as any).permissions?.includes('send-video') === false)) ||
    (currentUser?.uid && hardMutedUserIds.includes(currentUser.uid));

  // State toggles
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [muteNew, setMuteNew] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  // Premium states
  const [localMutedUsers, setLocalMutedUsers] = useState<string[]>([]);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [selectedParticipantUserId, setSelectedParticipantUserId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [raisedHandUserIds, setRaisedHandUserIds] = useState<string[]>([]);

  // Define isOwnerOrAdmin role check
  const isOwnerOrAdmin = 
    (call?.state as any)?.createdByUserId === currentUser?.uid || 
    (call?.state as any)?.createdBy?.id === currentUser?.uid || 
    currentUser?.uid === (chat as any)?.createdById ||
    chat?.admins?.includes(currentUser?.uid || "") || 
    chat?.creatorId === currentUser?.uid ||
    (call?.state as any)?.members?.some((m: any) => m.user_id === currentUser?.uid && (m.role === 'admin' || m.role === 'host'));

  // Listen to call custom state for whiteboard
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(() => {
    return !!call?.state?.custom?.whiteboard_active;
  });
  const showWhiteboard = isWhiteboardActive;

  const resetCallUIStates = () => {
    setIsMenuOpen(false);
    setShowLeaveConfirm(false);
    setShowToast(null);
    setSelectedParticipantUserId(null);
    setSelectedProfileId(null);
    setIsWhiteboardActive(false);
  };
  
        const toggleCamera = async () => {
    try {
      const activeCall = typeof call !== 'undefined' ? call : (typeof streamCall !== 'undefined' ? streamCall : null);
      if (!activeCall) return alert("❌ خطأ: كائن المكالمة غير متصل.");
      if (!activeCall.camera) return alert("❌ خطأ: الكاميرا غير مدعومة في هذا المتصفح/الجهاز.");
      
      await activeCall.camera.toggle();
    } catch (err: any) {
      alert("❌ فشل تشغيل الكاميرا:\n" + (err.message || String(err)));
    }
  };

  const toggleMic = async () => {
    try {
      const activeCall = typeof call !== 'undefined' ? call : (typeof streamCall !== 'undefined' ? streamCall : null);
      if (!activeCall) return alert("❌ خطأ: كائن المكالمة غير متصل.");
      if (!activeCall.microphone) return alert("❌ خطأ: المايكروفون غير مدعوم في هذا المتصفح/الجهاز.");
      
      await activeCall.microphone.toggle();
    } catch (err: any) {
      alert("❌ فشل تشغيل المايك:\n" + (err.message || String(err)));
    }
  };

  const toggleScreenShare = async () => {
    try {
      const activeCall = typeof call !== 'undefined' ? call : (typeof streamCall !== 'undefined' ? streamCall : null);
      if (!activeCall) return alert("❌ خطأ: كائن المكالمة غير متصل.");
      if (!activeCall.screenShare) return alert("❌ خطأ: مشاركة الشاشة غير مدعومة هنا.");
      
      await activeCall.screenShare.toggle();
    } catch (err: any) {
      alert("❌ فشل مشاركة الشاشة:\n" + (err.message || String(err)));
    }
  };
  
  const navigation = {
    goBack: () => {
      resetCallUIStates();
      onClose();
    },
    navigate: (screenName: string) => {
      resetCallUIStates();
      onClose();
    }
  };

  // Subscribe to call custom state for whiteboard_active and hardMutedUserIds
  useEffect(() => {
    if (!call) return;
    setIsWhiteboardActive(!!call.state.custom?.whiteboard_active);
    setHardMutedUserIds(call.state.custom?.hardMutedUserIds || []);
    const subscription = call.state.custom$.subscribe((customData: any) => {
      setIsWhiteboardActive(!!customData?.whiteboard_active);
      setHardMutedUserIds(customData?.hardMutedUserIds || []);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [call]);

  // Subscribe to participants in firestore to sync raised hands in real-time
  useEffect(() => {
    if (!chat?.id || !callSession?.id) return;
    const partsColRef = collection(db, 'chats', chat.id, 'calls', callSession.id, 'participants');
    const unsubscribe = onSnapshot(partsColRef, (snapshot) => {
      const raisedIds: string[] = [];
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.isHandRaised) {
          raisedIds.push(docSnap.id);
        }
      });
      setRaisedHandUserIds(raisedIds);
    }, (error) => {
      console.warn("Error listening to call participants hand raise:", error);
    });
    return () => unsubscribe();
  }, [chat?.id, callSession?.id]);

  // Realtime DB Listener for call ending/inactive state
  useEffect(() => {
    if (!chat?.id || !callSession?.id || !call) return;

    const callDocRef = doc(db, 'chats', chat.id, 'calls', callSession.id);
    const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && (data.active === false || data.status === 'ended')) {
          try {
            await call.leave();
          } catch (err) {
            console.warn("Error leaving call in real-time listener:", err);
          }
          resetCallUIStates();
          navigation.goBack();
        }
      }
    }, (error) => {
      console.error("Error in real-time call status listener:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [chat?.id, callSession?.id, call]);

  // Sync whiteboard state from custom events for other participants
  useEffect(() => {
    if (!call) return;
    const handleCustomEvent = (event: any) => {
      if (event.type === 'whiteboard-toggle') {
        setIsWhiteboardActive(!!event.custom.open);
      }
    };
    const unsubscribe = call.on('custom', handleCustomEvent);
    return () => {
      unsubscribe();
    };
  }, [call]);

  // Listen for hand raise event to request unmute
  useEffect(() => {
    if (!call) return;
    const handleCustomEvent = (event: any) => {
      if (event.type === 'raise_hand_unmute' || event.type === 'request_unmute') {
        const { userId, userName } = event.custom;
        setRaisedHandUserIds(prev => {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        });
        if (isOwnerOrAdmin) {
          triggerToast(`✋ ${t("قام")} ${userName} ${t("برفع اليد لطلب إلغاء الكتم والتحدث!")}`);
        }
      } else if (event.type === 'unmute_notification') {
        const { targetUserId } = event.custom;
        setRaisedHandUserIds(prev => prev.filter(uid => uid !== targetUserId));
        setHardMutedUserIds(prev => prev.filter(uid => uid !== targetUserId));
      } else if (event.type === 'mute_notification') {
        const { targetUserId } = event.custom;
        setRaisedHandUserIds(prev => prev.filter(uid => uid !== targetUserId));
        setHardMutedUserIds(prev => {
          if (prev.includes(targetUserId)) return prev;
          return [...prev, targetUserId];
        });
      }
    };
    const unsubscribe = call.on('custom', handleCustomEvent);
    return () => {
      unsubscribe();
    };
  }, [call, isOwnerOrAdmin, t]);

  // Handle Mute on Entry (كتم المشاركين الجدد)
  useEffect(() => {
    if (!call || !muteNew || !isOwnerOrAdmin) return;
    
    const handleParticipantJoined = (event: any) => {
      const joinedUser = event.participant?.user;
      if (joinedUser && joinedUser.id !== currentUser?.uid) {
        // Mute this new user via Stream API call.muteUser
        call.muteUser(joinedUser.id, 'audio').catch((err: any) => {
          console.warn("Failed to mute new participant on entry:", err);
        });
        triggerToast(`🔇 ${t("تم كتم المنضم الجديد تلقائياً:")} ${joinedUser.name || joinedUser.id}`);
      }
    };

    const unsubscribe = call.on('participantJoined', handleParticipantJoined);
    return () => {
      unsubscribe();
    };
  }, [call, muteNew, isOwnerOrAdmin, currentUser?.uid]);

  // Forcibly lock/disable microphone and camera of hard muted members
  useEffect(() => {
    if (isLocalHardMuted && call) {
      if (isMicOn) {
        call.microphone.disable().catch((err: any) => console.warn("Auto-disable mic failed:", err));
      }
      if (isCamOn) {
        call.camera.disable().catch((err: any) => console.warn("Auto-disable cam failed:", err));
      }
    }
  }, [isLocalHardMuted, isMicOn, isCamOn, call]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLeaveCall = async () => {
    try {
      const activeCall = call || streamCall;
      if (activeCall) {
        await activeCall.leave();
      }
    } catch (err) {
      console.error("Error leaving call:", err);
    }
  };

  const toggleHardMuteParticipant = async (targetParticipant: any) => {
    if (!call) return;
    const targetUserId = targetParticipant.userId;
    const isCurrentlyHardMuted = hardMutedUserIds.includes(targetUserId);

    if (isCurrentlyHardMuted) {
      // Unmute: grant permissions
      try {
        await call.grantPermissions(targetUserId, ['send-audio', 'send-video', 'screenshare']);
        
        const nextMutedList = (call.state.custom?.hardMutedUserIds || []).filter((uid: string) => uid !== targetUserId);
        await call.update({
          custom: {
            ...(call.state.custom || {}),
            hardMutedUserIds: nextMutedList
          }
        });

        // Update hand raise state and mute state in Firestore
        const partRef = doc(db, 'chats', chat.id, 'calls', callSession.id, 'participants', targetUserId);
        await updateDoc(partRef, {
          isHandRaised: false,
          isMuted: false,
          isMutedByAdmin: false
        }).catch((e: any) => console.warn("Failed to update participant in firestore:", e));

        call.sendCustomEvent({
          type: 'unmute_notification',
          custom: { targetUserId }
        }).catch((e: any) => console.warn(e));
        
        setRaisedHandUserIds(prev => prev.filter(uid => uid !== targetUserId));
        setHardMutedUserIds(nextMutedList);
        triggerToast(`🔊 ${t("تم إلغاء الكتم الإجباري واستعادة صلاحيات")} ${targetParticipant.name || targetParticipant.userId}`);
      } catch (err) {
         console.error(err);
         triggerToast(t("فشل استعادة صلاحيات العضو"));
      }
    } else {
      // Mute: revoke permissions and mute user audio & video
      try {
        await call.muteUser(targetUserId, 'audio').catch((e: any) => console.warn(e));
        await call.muteUser(targetUserId, 'video').catch((e: any) => console.warn(e));
        await call.revokePermissions(targetUserId, ['send-audio', 'send-video', 'screenshare']);
        
        const currentList = call.state.custom?.hardMutedUserIds || [];
        const nextMutedList = currentList.includes(targetUserId) ? currentList : [...currentList, targetUserId];
        await call.update({
          custom: {
            ...(call.state.custom || {}),
            hardMutedUserIds: nextMutedList
          }
        });

        // Update hand raise state and mute state in Firestore
        const partRef = doc(db, 'chats', chat.id, 'calls', callSession.id, 'participants', targetUserId);
        await updateDoc(partRef, {
          isHandRaised: false,
          isMuted: true,
          isMutedByAdmin: true
        }).catch((e: any) => console.warn("Failed to update participant in firestore:", e));

        call.sendCustomEvent({
          type: 'mute_notification',
          custom: { targetUserId }
        }).catch((e: any) => console.warn(e));
        
        setRaisedHandUserIds(prev => prev.filter(uid => uid !== targetUserId));
        setHardMutedUserIds(nextMutedList);
        triggerToast(`🔇 ${t("تم كتم")} ${targetParticipant.name || targetParticipant.userId} ${t("إجبارياً وسحب صلاحياته")}`);
      } catch (err) {
        console.error(err);
        triggerToast(t("فشل كتم صوت العضو إجبارياً"));
      }
    }
  };

  const handleLeaveClick = () => {
    if (isOwnerOrAdmin) {
      setShowLeaveConfirm(true);
    } else {
      executeLeave();
    }
  };

  const executeLeave = async () => {
    try {
      if (call) {
        await call.leave().catch(err => console.warn("leave failed or already left in executeLeave:", err));
      }
    } catch (err) {
      console.warn("Error leaving call in GroupCallContent:", err);
    }
    resetCallUIStates();
    navigation.goBack();
  };

  const executeEndCall = async () => {
    try {
      if (chat?.id && callSession?.id) {
        // Mark the call session as inactive
        await updateDoc(doc(db, 'chats', chat.id, 'calls', callSession.id), { 
          active: false,
          status: 'ended',
          endedAt: serverTimestamp()
        }).catch(err => console.warn("Firestore status update failed:", err));
        
        // Clear active call fields on parent chat
        await updateDoc(doc(db, 'chats', chat.id), {
          activeCallId: null,
          activeCallHostId: null,
          activeCallHostName: null,
          activeCallHostPhoto: null,
          activeCallType: null,
          activeCallStartedAt: null
        }).catch(err => console.warn("Firestore activeCallId clear failed:", err));
      }
    } catch (dbErr) {
      console.error("Failed to update database for ending call:", dbErr);
    }

    try {
      if (call) {
        await call.leave().catch(err => console.warn("leave failed or already left in executeEndCall:", err));
        await call.endCall().catch(err => console.warn("endCall failed or already ended:", err));
      }
    } catch (err) {
      console.error("Critical error in call.leave / endCall (GroupCall):", err);
    }
    
    resetCallUIStates();
    navigation.goBack();
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row relative h-full bg-slate-950 overflow-hidden select-none font-sans" dir="rtl">
      
      {/* 1. Sidebar Panel (Vertical Ladder Layout - شكل السلم) */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col shrink-0 bg-zinc-950/90 border-b md:border-b-0 md:border-l border-white/5 z-40">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5">
          {/* Right side: Room Branding */}
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <h2 className="text-white font-black text-xs">{t("مكالمة TruCast الجماعية 🎧")}</h2>
          </div>
          
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2.5 py-0.5 rounded-full font-bold shrink-0">
            ● {t("مباشر")} ({participants.length})
          </span>
        </div>

        {/* Participant Settings */}
        {isOwnerOrAdmin && (
          <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400 font-bold">{t("كتم المنضمين تلقائياً 🔇")}</span>
            <button
              onClick={() => {
                setMuteNew(!muteNew);
                triggerToast(!muteNew ? t("تم قفل المايك للمشاركين الجدد تلقائياً 🔇") : t("تم إلغاء قفل كتم المنضمين"));
              }}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${muteNew ? 'bg-purple-600' : 'bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${muteNew ? 'translate-x-0' : '-translate-x-4'}`} />
            </button>
          </div>
        )}

        {/* Scrollable List of Participant Rows */}
        <div className="flex-1 flex flex-col gap-2.5 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {participants.map((p) => {
            const isTargetHostOrAdmin = 
              (call?.state as any)?.createdByUserId === p.userId || 
              (call?.state as any)?.createdBy?.id === p.userId || 
              p.userId === (chat as any)?.createdById ||
              (call?.state as any)?.members?.some((m: any) => m.user_id === p.userId && (m.role === 'admin' || m.role === 'host'));
            const isTargetHardMuted = hardMutedUserIds.includes(p.userId);

            return (
              <div 
                key={p.userId} 
                onClick={() => setSelectedParticipantUserId(p.userId)}
                className="flex items-center justify-between w-full bg-zinc-900/50 hover:bg-zinc-850/80 border border-white/5 hover:border-white/10 p-3 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] text-right"
              >
                {/* Right (Avatar) & Middle (Name/Bio) */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Right side: Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-850 border border-white/10 flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xs font-black text-zinc-400">
                          {(p.name || p.userId).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-zinc-900 ${(p as any).isMuted ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  </div>

                  {/* Middle side: Name & Bio underneath */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white truncate">{p.name || p.userId}</span>
                      {p.userId === currentUser?.uid && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md font-black shrink-0">{t("أنت")}</span>
                      )}
                      {raisedHandUserIds.includes(p.userId) && (
                        <span className="text-xs animate-bounce" title={t("طلب التحدث / رفع اليد")}>✋</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {(p.custom as any)?.bio || (p as any).user?.custom?.bio || t('عضو نشط ومتميز 🌟')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOwnerOrAdmin && !isTargetHostOrAdmin && p.userId !== currentUser?.uid && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation(); // Avoid opening the details modal
                        await toggleHardMuteParticipant(p);
                      }}
                      className={`px-3 py-1.5 text-[11px] font-black rounded-xl border transition-all ${
                        !isTargetHardMuted
                          ? 'bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/20'
                          : 'bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/20'
                      }`}
                    >
                      {!isTargetHardMuted ? t("كتم") : t("إلغاء كتم")}
                    </button>
                  )}
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Top bar over the video area containing options and whiteboard button for admin */}
        <div className="absolute top-4 right-4 left-4 flex items-center justify-between z-40 font-sans" dir="rtl">
          {/* Options & Minimize group */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 bg-zinc-950/90 hover:bg-zinc-900 text-white px-3.5 py-2 rounded-xl border border-white/10 shadow-2xl transition-all active:scale-95"
              >
                <Menu className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold">{t("خيارات متقدمة")}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl space-y-1 z-[70]">
                  <button
                    onClick={() => {
                      setNoiseReduction(!noiseReduction);
                      triggerToast(!noiseReduction ? t("تم تفعيل عزل الضوضاء بالذكاء الاصطناعي 🎙️") : t("تم إلغاء تفعيل عزل الضوضاء"));
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900/50 text-right transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className={`w-4 h-4 ${noiseReduction ? 'text-emerald-500' : 'text-zinc-400'}`} />
                      <span className="text-xs font-bold text-white">{t("تقليل الضوضاء النشط")}</span>
                    </div>
                    {noiseReduction && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onMinimize && onMinimize()}
              className="flex items-center gap-2 bg-zinc-950/90 hover:bg-zinc-900 text-white px-3.5 py-2 rounded-xl border border-white/10 shadow-2xl transition-all active:scale-95"
              title={t("تصغير شاشة المكالمة")}
            >
              <Minimize2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold hidden sm:inline">{t("تصغير الشاشة")}</span>
            </button>
          </div>

          {/* Whiteboard button - ONLY FOR ADMINS/OWNERS */}
          {isOwnerOrAdmin && (
            <button
              onClick={async () => {
                const nextState = !isWhiteboardActive;
                if (call) {
                  try {
                    await call.update({ 
                      custom: { 
                        ...(call.state.custom || {}), 
                        whiteboard_active: nextState 
                      } 
                    });
                    await call.sendCustomEvent({
                      type: 'whiteboard-toggle',
                      custom: { open: nextState }
                    });
                  } catch (err: any) {
                    console.error("Error sending whiteboard toggle:", err);
                  }
                }
                triggerToast(nextState ? t("🎨 تم فتح السبورة التفاعلية!") : t("🎨 تم إغلاق السبورة"));
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all ${
                isWhiteboardActive 
                  ? 'bg-amber-500 border-amber-400 text-white shadow-lg' 
                  : 'bg-zinc-950/90 border-white/10 text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <Palette className="w-4 h-4 text-amber-500" />
              <span>{t("السبورة الذكية")}</span>
            </button>
          )}
        </div>

        {/* Speaker Layout Area for Video stream rendering - Cyber Grid Layout */}
        <div className="flex-1 min-h-0 relative z-10 p-4 sm:p-6 flex flex-col justify-center bg-slate-950/20">
          {participants.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/80 rounded-3xl border border-white/5 m-4">
              <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                <div className="w-16 h-16 rounded-full border border-indigo-500/20 bg-zinc-900 flex items-center justify-center mb-4">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              </div>
              <h3 className="text-white font-black text-sm">{t("جاري الاتصال والتحقق من القنوات...")}</h3>
              <p className="text-zinc-500 font-bold text-[10px] mt-1">{t("يرجى الانتظار لحين تحميل بث المشاركين")}</p>
            </div>
          ) : (
            <div className={`w-full h-full grid gap-4 transition-all duration-500 ${
              participants.length === 1 ? 'grid-cols-1 grid-rows-1 max-w-4xl mx-auto' :
              participants.length === 2 ? 'grid-cols-1 md:grid-cols-2 grid-rows-1 max-w-5xl mx-auto' :
              participants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
              participants.length <= 6 ? 'grid-cols-2 md:grid-cols-3 grid-rows-2' :
              'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-rows-3'
            }`}>
              {participants.map((p) => {
                const isMe = p.userId === currentUser?.uid;
                const isPCamEnabled = isMe ? isCamOn : !!(
                  p.videoStream || 
                  (p as any).isVideoEnabled || 
                  (p as any).hasVideo || 
                  (p as any).videoStreamTrack ||
                  p.publishedTracks?.includes(2)
                );
                const isPMicEnabled = isMe ? isMicOn : !((p as any).isMuted);
                const isSpeaking = p.isSpeaking;

                return (
                  <div 
                    key={p.sessionId || p.userId} 
                    className={`relative bg-zinc-900/40 backdrop-blur-md border rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all duration-300 ${
                      isSpeaking 
                        ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/30' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {isPCamEnabled ? (
                      <ParticipantView
                        participant={p}
                        trackType="videoTrack"
                        className={`w-full h-full object-cover ${isMe ? 'scale-x-[-1]' : ''}`}
                        ParticipantViewUI={null}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-6 relative">
                        {/* Audio track guarantee for remote users */}
                        {!isMe && (
                          <div className="absolute top-0 left-0 w-1 h-1 opacity-0 overflow-hidden pointer-events-none z-[-50]">
                            <ParticipantView
                              participant={p}
                              trackType="none"
                              ParticipantViewUI={null}
                            />
                          </div>
                        )}
                        
                        {/* Center Avatar */}
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg relative z-10">
                            {p.image ? (
                              <img src={p.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-xl font-black text-indigo-400">
                                {(p.name || p.userId).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          {/* Pulsing indicator for active speaker when camera is off */}
                          {isSpeaking && (
                            <span className="absolute -inset-2 rounded-full border-2 border-indigo-500 animate-ping opacity-75 z-0" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Left/Bottom Controls Overlay for Admins (like mute options or status) */}
                    <div className="absolute top-3 left-3 flex gap-2 z-20">
                      {!isPMicEnabled && (
                        <span className="bg-rose-500/95 backdrop-blur-md text-white p-1.5 rounded-lg border border-rose-500/30 shadow-md">
                          <MicOff className="w-3 h-3" />
                        </span>
                      )}
                      {!isPCamEnabled && (
                        <span className="bg-zinc-900/90 backdrop-blur-md text-zinc-400 p-1.5 rounded-lg border border-white/5 shadow-md">
                          <VideoOff className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Participant Name Badge & Real-time Speaking Wave */}
                    <div className="absolute bottom-3 right-3 bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black text-white border border-white/5 flex items-center gap-2 z-20" style={{ direction: 'rtl' }}>
                      <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-indigo-500 animate-pulse' : (isPMicEnabled ? 'bg-emerald-500' : 'bg-rose-500')}`} />
                      <span>{p.name || p.userId}</span>
                      {isMe && <span className="text-[9px] bg-indigo-600/30 text-indigo-400 px-1.5 py-0.5 rounded font-black">{t("أنت")}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Smart Whiteboard Overlay */}
      {showWhiteboard && (
        <WhiteboardPanel 
          call={call} 
          isOwnerOrAdmin={isOwnerOrAdmin} 
          onClose={async () => {
            if (isOwnerOrAdmin && call) {
              try {
                await call.update({ 
                  custom: { 
                    ...(call.state.custom || {}), 
                    whiteboard_active: false 
                  } 
                });
                await call.sendCustomEvent({
                  type: 'whiteboard-toggle',
                  custom: { open: false }
                });
              } catch (err: any) {
                console.error(err);
              }
            }
          }} 
        />
      )}

      {/* 5. Role-Based Bottom Sheet Context Menu */}
      <AnimatePresence>
        {selectedParticipantUserId && (
          (() => {
            const targetParticipant = participants.find(p => p.userId === selectedParticipantUserId);
            if (!targetParticipant) return null;

            const isTargetHostOrAdmin = 
              (call?.state as any)?.createdByUserId === targetParticipant.userId || 
              (call?.state as any)?.createdBy?.id === targetParticipant.userId || 
              targetParticipant.userId === (chat as any)?.createdById ||
              (call?.state as any)?.members?.some((m: any) => m.user_id === targetParticipant.userId && (m.role === 'admin' || m.role === 'host'));

            const isMe = targetParticipant.userId === currentUser?.uid;

            return (
              <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center font-sans" 
                dir="rtl"
                onClick={() => setSelectedParticipantUserId(null)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="bg-zinc-950 border-t border-white/10 rounded-t-[32px] w-full max-w-lg p-6 flex flex-col gap-5 text-right shadow-2xl relative max-h-[85vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag Indicator bar */}
                  <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto shrink-0" />

                  {/* Header/Info card */}
                  <div className="flex items-center gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-white/5 shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                      {targetParticipant.image ? (
                        <img src={targetParticipant.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-sm font-black text-zinc-400">
                          {targetParticipant.name?.charAt(0) || targetParticipant.userId?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white truncate">{targetParticipant.name || targetParticipant.userId}</h3>
                        {isTargetHostOrAdmin ? (
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/20">{t("مشرف 🛡️")}</span>
                        ) : (
                          <span className="text-[10px] bg-sky-500/20 text-sky-400 font-bold px-2 py-0.5 rounded-full border border-sky-500/20">{t("عضو 👥")}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mt-1 line-clamp-2">
                        {(targetParticipant.custom as any)?.bio || (targetParticipant as any).user?.custom?.bio || t('عضو نشط ومتميز في مجتمع TruCast 🌟')}
                      </p>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="flex flex-col gap-3">
                    
                    {/* CASE 1: للمالك/المشرف ضد عضو عادي */}
                    {isOwnerOrAdmin && !isTargetHostOrAdmin && !isMe && (
                      <>
                        {/* Audio Volume Slider (0-1000%) */}
                        <div className="space-y-2 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{t("التحكم في تضخيم الصوت")}</span>
                            <span className="text-xs font-mono text-rose-400 font-black">
                              {participantVolumes[targetParticipant.userId] !== undefined ? participantVolumes[targetParticipant.userId] : 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1000"
                            value={participantVolumes[targetParticipant.userId] !== undefined ? participantVolumes[targetParticipant.userId] : 100}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setParticipantVolumes(prev => ({ ...prev, [targetParticipant.userId]: val }));
                              if (val === 0) {
                                if (!localMutedUsers.includes(targetParticipant.userId)) {
                                  setLocalMutedUsers(prev => [...prev, targetParticipant.userId]);
                                }
                              } else {
                                setLocalMutedUsers(prev => prev.filter(uid => uid !== targetParticipant.userId));
                              }
                              if (call && (call as any).speaker) {
                                const normalizedVal = val / 1000;
                                try {
                                  (call as any).speaker.setParticipantVolume(targetParticipant.sessionId, normalizedVal);
                                } catch (err) {
                                  console.warn(err);
                                }
                              }
                            }}
                            className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                          />
                        </div>

                        {/* Profile View */}
                        <button
                          onClick={() => {
                            const targetUserId = targetParticipant?.userId;
                            if (!targetUserId) return;
                            setSelectedParticipantUserId(null);
                            setSelectedProfileId(targetUserId);
                          }}
                          className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                        >
                          👤 {t("عرض الملف الشخصي للعضو")}
                        </button>

                        {/* Hard Mute Toggler (revokePermissions/grantPermissions) */}
                        {(() => {
                          const isTargetHardMuted = hardMutedUserIds.includes(targetParticipant.userId);

                          return isTargetHardMuted ? (
                            <button
                              onClick={async () => {
                                await toggleHardMuteParticipant(targetParticipant);
                                setSelectedParticipantUserId(null);
                              }}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                            >
                              🔊 {t("إلغاء الكتم الإجباري (استعادة الصلاحيات)")}
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                await toggleHardMuteParticipant(targetParticipant);
                                setSelectedParticipantUserId(null);
                              }}
                              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                            >
                              🔇 {t("كتم إجباري (سحب الصلاحيات والمايك والكاميرا)")}
                            </button>
                          );
                        })()}

                        {/* Kick/Remove from Group */}
                        <button
                          onClick={async () => {
                            try {
                              const targetUserId = targetParticipant.userId;
                              if (call) {
                                try {
                                  if (typeof (call as any).kickUser === 'function') {
                                    await (call as any).kickUser({ user_id: targetUserId });
                                  }
                                } catch (callErr) {
                                  console.warn("Failed to kick user via kickUser:", callErr);
                                }
                                try {
                                  if (typeof (call as any).updateCallMembers === 'function') {
                                    await (call as any).updateCallMembers({ remove_members: [targetUserId] });
                                  }
                                } catch (callErr) {
                                  console.warn("Failed to remove member via updateCallMembers:", callErr);
                                }
                              }
                              
                              if (chat?.id) {
                                const chatRef = doc(db, 'chats', chat.id);
                                await updateDoc(chatRef, {
                                  participants: arrayRemove(targetUserId),
                                  bannedMembers: arrayUnion(targetUserId)
                                });
                              }

                              if (chat?.id && callSession?.id) {
                                const partRef = doc(db, 'chats', chat.id, 'calls', callSession.id, 'participants', targetUserId);
                                try {
                                  await deleteDoc(partRef);
                                } catch (partErr) {
                                  console.warn("Failed to delete participant doc in Firestore:", partErr);
                                }
                              }
                              
                              triggerToast(`❌ ${t("تم طرد العضو")} ${targetParticipant.name || targetParticipant.userId} ${t("وإزالته من المجموعة بنجاح")}`);
                            } catch (err) {
                              console.error(err);
                              triggerToast(t("فشل طرد العضو من المجموعة"));
                            }
                            setSelectedParticipantUserId(null);
                          }}
                          className="w-full py-3 bg-red-950/40 hover:bg-red-900/30 text-red-400 hover:text-white font-bold text-xs rounded-xl border border-red-500/10 transition-colors"
                        >
                          ❌ {t("إزالة من المجموعة")}
                        </button>
                      </>
                    )}

                    {/* CASE 2: للمالك/المشرف ضد مشرف آخر */}
                    {isOwnerOrAdmin && isTargetHostOrAdmin && !isMe && (
                      <>
                        {/* Audio Volume Slider (0-1000%) */}
                        <div className="space-y-2 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{t("التحكم في تضخيم الصوت")}</span>
                            <span className="text-xs font-mono text-rose-400 font-black">
                              {participantVolumes[targetParticipant.userId] !== undefined ? participantVolumes[targetParticipant.userId] : 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1000"
                            value={participantVolumes[targetParticipant.userId] !== undefined ? participantVolumes[targetParticipant.userId] : 100}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setParticipantVolumes(prev => ({ ...prev, [targetParticipant.userId]: val }));
                              if (val === 0) {
                                if (!localMutedUsers.includes(targetParticipant.userId)) {
                                  setLocalMutedUsers(prev => [...prev, targetParticipant.userId]);
                                }
                              } else {
                                setLocalMutedUsers(prev => prev.filter(uid => uid !== targetParticipant.userId));
                              }
                              if (call && (call as any).speaker) {
                                const normalizedVal = val / 1000;
                                try {
                                  (call as any).speaker.setParticipantVolume(targetParticipant.sessionId, normalizedVal);
                                } catch (err) {
                                  console.warn(err);
                                }
                              }
                            }}
                            className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                          />
                        </div>

                        {/* Profile View */}
                        <button
                          onClick={() => {
                            const targetUserId = targetParticipant?.userId;
                            if (!targetUserId) return;
                            setSelectedParticipantUserId(null);
                            setSelectedProfileId(targetUserId);
                          }}
                          className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                        >
                          👤 {t("عرض الملف الشخصي للمشرف")}
                        </button>
                      </>
                    )}

                    {/* CASE 3: للعضو العادي ضد أي شخص أو لنفسه */}
                    {(!isOwnerOrAdmin || isMe) && (
                      <>
                        {/* Audio Volume Slider (0-100%) */}
                        <div className="space-y-2 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{t("التحكم في مستوى الصوت")}</span>
                            <span className="text-xs font-mono text-rose-400 font-black">
                              {participantVolumes[targetParticipant.userId] !== undefined ? participantVolumes[targetParticipant.userId] : 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={participantVolumes[targetParticipant.userId] !== undefined ? participantVolumes[targetParticipant.userId] : 100}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setParticipantVolumes(prev => ({ ...prev, [targetParticipant.userId]: val }));
                              if (val === 0) {
                                if (!localMutedUsers.includes(targetParticipant.userId)) {
                                  setLocalMutedUsers(prev => [...prev, targetParticipant.userId]);
                                }
                              } else {
                                setLocalMutedUsers(prev => prev.filter(uid => uid !== targetParticipant.userId));
                              }
                              if (call && (call as any).speaker) {
                                const normalizedVal = val / 100;
                                try {
                                  (call as any).speaker.setParticipantVolume(targetParticipant.sessionId, normalizedVal);
                                } catch (err) {
                                  console.warn(err);
                                }
                              }
                            }}
                            className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                          />
                        </div>

                        {/* Profile View */}
                        <button
                          onClick={() => {
                            const targetUserId = targetParticipant?.userId;
                            if (!targetUserId) return;
                            setSelectedParticipantUserId(null);
                            setSelectedProfileId(targetUserId);
                          }}
                          className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                        >
                          👤 {t("عرض الملف الشخصي")}
                        </button>

                        {/* "كتم عندي فقط" (local mute) */}
                        {!isMe && (
                          <button
                            onClick={() => {
                              const isMuted = localMutedUsers.includes(targetParticipant.userId);
                              if (isMuted) {
                                setLocalMutedUsers(prev => prev.filter(uid => uid !== targetParticipant.userId));
                                setParticipantVolumes(prev => ({ ...prev, [targetParticipant.userId]: 100 }));
                                if (call && (call as any).speaker) {
                                  try {
                                    (call as any).speaker.setParticipantVolume(targetParticipant.sessionId, 1);
                                  } catch (err) {
                                    console.warn(err);
                                  }
                                }
                                triggerToast(`🔊 ${t("تم إلغاء الكتم المحلي لـ")} ${targetParticipant.name || targetParticipant.userId}`);
                              } else {
                                setLocalMutedUsers(prev => [...prev, targetParticipant.userId]);
                                setParticipantVolumes(prev => ({ ...prev, [targetParticipant.userId]: 0 }));
                                if (call && (call as any).speaker) {
                                  try {
                                    (call as any).speaker.setParticipantVolume(targetParticipant.sessionId, 0);
                                  } catch (err) {
                                    console.warn(err);
                                  }
                                }
                                triggerToast(`🔇 ${t("تم كتم")} ${targetParticipant.name || targetParticipant.userId} ${t("محلياً لديك")}`);
                              }
                              setSelectedParticipantUserId(null);
                            }}
                            className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs rounded-xl border border-white/5 transition-colors"
                          >
                            {localMutedUsers.includes(targetParticipant.userId) ? t('🔊 إلغاء الكتم محلياً') : t('🔇 كتم عندي فقط (محلي)')}
                          </button>
                        )}
                      </>
                    )}

                    {/* Raise Hand request if user is muted (وللعضو المكتوم يظهر زر رفع اليد) */}
                    {isMe && isLocalHardMuted && (
                      <button
                        onClick={() => {
                          if (call) {
                            call.sendCustomEvent({
                              type: 'request_unmute',
                              custom: {
                                userId: currentUser?.uid || '',
                                userName: currentUser?.displayName || currentUser?.email || t('مستمع')
                              }
                            }).then(() => {
                              triggerToast(t("✋ تم إرسال طلب رفع اليد لفك الكتم إلى المشرفين!"));
                            }).catch((err: any) => console.error(err));
                          }
                          // Update hand raise state in Firestore
                          if (currentUser?.uid && chat?.id && callSession?.id) {
                            const partRef = doc(db, 'chats', chat.id, 'calls', callSession.id, 'participants', currentUser.uid);
                            updateDoc(partRef, {
                              isHandRaised: true
                            }).catch((err) => console.warn("Failed to update hand raise in firestore:", err));
                          }
                          setSelectedParticipantUserId(null);
                        }}
                        className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-black text-xs rounded-xl transition-all animate-pulse"
                      >
                        ✋ {t("رفع اليد لطلب إلغاء الكتم")}
                      </button>
                    )}

                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedParticipantUserId(null)}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white font-black text-xs rounded-xl transition-all mt-2"
                    >
                      {t("إلغاء وإغلاق")}
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })()
        )}
      </AnimatePresence>

      {/* 6. Toast Notification */}
      {showToast && (
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-black z-[80] flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>{showToast}</span>
        </div>
      )}

      {/* 7. Floating control icons for call actions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl z-50">
        {isLocalHardMuted ? (
          <>
            {/* Raise Hand Button for Hard Muted Users */}
            <button
              onClick={() => {
                if (call) {
                  call.sendCustomEvent({
                    type: 'request_unmute',
                    custom: {
                      userId: currentUser?.uid || '',
                      userName: currentUser?.displayName || currentUser?.email || t('مستمع')
                    }
                  }).then(() => {
                    triggerToast(t("✋ تم إرسال طلب رفع اليد لفك الكتم إلى المشرفين!"));
                  }).catch((err: any) => console.error(err));
                }
                // Update hand raise state in Firestore
                if (currentUser?.uid && chat?.id && callSession?.id) {
                  const partRef = doc(db, 'chats', chat.id, 'calls', callSession.id, 'participants', currentUser.uid);
                  updateDoc(partRef, {
                    isHandRaised: true
                  }).catch((err) => console.warn("Failed to update hand raise in firestore:", err));
                }
              }}
              className="px-6 py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-2xl font-black text-xs transition-all animate-pulse flex items-center gap-2 shadow-lg shadow-yellow-600/20 active:scale-95"
              title={t("رفع اليد لطلب التحدث")}
            >
              <span>✋ {t("طلب التحدث (رفع اليد)")}</span>
            </button>

            {/* Leave button is preserved */}
            <button
              onClick={handleLeaveClick}
              className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-lg shadow-red-600/30 active:scale-95"
              title={t("مغادرة")}
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
         ) : (
          <>
            <button
              onClick={toggleMic}
              className={`p-4 rounded-2xl transition-all active:scale-95 ${
                !isMicOn 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title={!isMicOn ? t("تشغيل المايك") : t("كتم المايك")}
            >
              {!isMicOn ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-2xl transition-all active:scale-95 ${
                isScreenSharing 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title={isScreenSharing ? t("إيقاف مشاركة الشاشة") : t("مشاركة الشاشة")}
            >
              <Monitor className="w-6 h-6" />
            </button>

            <button
              onClick={handleLeaveClick}
              className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-lg shadow-red-600/30 active:scale-95"
              title={t("مغادرة")}
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              onClick={toggleCamera}
              className={`p-4 rounded-2xl transition-all active:scale-95 ${
                !isCamOn 
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title={!isCamOn ? t("تشغيل الكاميرا") : t("إغلاق الكاميرا")}
            >
              {!isCamOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          </>
        )}
      </div>

      {/* Leave / End Call Confirmation Dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md font-sans" dir="rtl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl relative animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <PhoneOff className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{t("إنهاء المكالمة أم مغادرتها؟")}</h3>
            <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-6">
              {t("بصفتك منشئ أو مشرف هذه المكالمة الجماعية، يمكنك مغادرتها بمفردك أو إنهائها بالكامل لجميع المشاركين.")}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setShowLeaveConfirm(false);
                  await executeEndCall();
                }}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-red-600/20 text-sm"
              >
                {t("إنهاء المكالمة لجميع الأعضاء 🛑")}
              </button>
              <button
                onClick={async () => {
                  setShowLeaveConfirm(false);
                  await executeLeave();
                }}
                className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black transition-all active:scale-95 text-sm"
              >
                {t("مغادرة بمفردي فقط 🚪")}
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="w-full py-3 bg-transparent text-zinc-500 hover:text-white rounded-2xl font-black transition-all text-xs"
              >
                {t("تراجع وإلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Overlay Modal */}
      {selectedProfileId && (
        <div className="fixed inset-0 bg-zinc-950 z-[999] flex flex-col font-sans" dir="rtl">
          <UserProfileScreen 
            userId={selectedProfileId}
            currentUser={currentUser}
            onBack={() => setSelectedProfileId(null)}
            onViewMedia={(url, type) => {
              console.log("View media in call profile overlay:", url, type);
            }}
            onNavigateToUser={(uid) => {
              setSelectedProfileId(uid);
            }}
            onNavigateToChat={(chatId) => {
              triggerToast(t("يرجى مغادرة المكالمة للذهاب إلى الدردشة 💬"));
            }}
            onNavigate={(tab, sub) => {
              triggerToast(t("يرجى مغادرة المكالمة أولاً ⚠️"));
            }}
          />
        </div>
      )}
    </div>
  );
};

// Mini / Floating Call Widget (View Only & Control to restore/end)
const GroupCallMini = ({
  chat,
  onClose,
  setIsMinimized,
  callInstance
}: {
  chat: Chat,
  onClose: () => void,
  setIsMinimized: (val: boolean) => void,
  callInstance: any
}) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const { t } = useLanguage();
  
  // Find speaking participant, or fallback to first participant
  const activeSpeaker = participants.find(p => p.isSpeaking) || participants[0];

  const handleEndCall = async () => {
    try {
      if (callInstance) {
        await callInstance.leave();
      }
    } catch (err) {
      console.error("Error leaving from mini widget:", err);
    }
    onClose();
  };

  return (
    <div 
      className="w-72 bg-zinc-950/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 font-sans animate-in fade-in-50 slide-in-from-bottom-5 duration-300 pointer-events-auto" 
      dir="rtl"
    >
      {/* Right: Speaker Thumbnail & Call Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center">
            {activeSpeaker?.image ? (
              <img src={activeSpeaker.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-sm font-black text-zinc-400">
                {(activeSpeaker?.name || activeSpeaker?.userId || chat.name || 'C').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {activeSpeaker?.isSpeaking && (
            <span className="absolute -bottom-1 -left-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black text-white truncate max-w-[130px]">
            {chat.name || t('مكالمة جماعية')}
          </span>
          <span className="text-[10px] text-zinc-400 font-bold truncate mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {activeSpeaker?.name || activeSpeaker?.userId || t('متحدث...')}
          </span>
        </div>
      </div>

      {/* Left: Action controls (Restore, End call) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setIsMinimized(false)}
          className="p-2 bg-zinc-900 hover:bg-zinc-800 text-amber-500 hover:text-amber-400 rounded-xl border border-white/5 transition-all duration-200 active:scale-95"
          title={t("توسيع الشاشة")}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleEndCall}
          className="p-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-500/10 transition-all duration-200 active:scale-95"
          title={t("إنهاء المكالمة")}
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const GroupCallScreen = ({
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
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [streamCall, setStreamCall] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const { t } = useLanguage();
  const [callError, setCallError] = useState<string | null>(null);

      useEffect(() => {
    if (!currentUser) return;
    let active = true;
    let joinedCall: any = null;

    const initStream = async () => {
      try {
        if (!active) return;

        let activeClient = client;
        if (!activeClient) {
          const generateToken = async (userId: string, secret: string) => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = { user_id: userId };
            const b64Url = (str: string) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            const encodedHeader = b64Url(JSON.stringify(header));
            const encodedPayload = b64Url(JSON.stringify(payload));
            const dataToSign = `${encodedHeader}.${encodedPayload}`;
            
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey(
              'raw', encoder.encode(secret),
              { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );
            
            const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
            const signatureString = String.fromCharCode(...new Uint8Array(signature));
            const encodedSignature = btoa(signatureString).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            
            return `${dataToSign}.${encodedSignature}`;
          };

          const apiKey = "93v2eu284nry";
          const secret = "vp3rtevs3svsa7zr798f83xyasv9yray9ks4nz6t9b5hkcdmushzvmznp68t7vrc";
          const validToken = await generateToken(currentUser.uid, secret);

          activeClient = new StreamVideoClient({ 
            apiKey: apiKey, 
            user: { 
              id: currentUser.uid, 
              name: currentUser.displayName || 'TruCast User' 
            },
            token: validToken
          });
          setClient(activeClient);
        }

        const channelName = call?.id || chat?.id || "group_call";
        const myCall = activeClient.call('default', channelName);

        if (myCall) {
          await myCall.join({ create: true });
          await myCall.camera.disable();
          
          if (active) {
            joinedCall = myCall;
            setStreamCall(myCall);
          } else {
            await myCall.leave();
          }
        }
      } catch (err: any) {
        console.error("Error joining Stream Video Call:", err);
        setCallError(err.message || 'Call error');
      }
    };

    initStream();

    return () => {
      active = false;
      if (joinedCall) {
        joinedCall.leave().catch(console.error);
      }
    };

  }, [currentUser, client, call, chat]);

  if (callError) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
      <h3 className="text-xl font-bold text-red-500">حدث خطأ في المكالمة:</h3>
      <p>{callError}</p>
      <button onClick={onClose} className="bg-zinc-800 p-4 rounded-xl mt-4">إغلاق</button>
    </div>
  );
  }
  if (!client || !streamCall) {
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
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
            <Video className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="text-xl font-black mb-2">{t("جاري بدء مكالمة المجموعة...")}</h3>
          <p className="text-zinc-500 font-bold text-sm">{t("يتم الآن تهيئة اتصال مشفر وآمن عبر خوادم TruCast")}</p>
        </div>
      </div>
    );
  }

  // Render the modern UI Layout with SpeakerLayout and custom controls
  return (
    <div className={isMinimized ? "fixed bottom-[80px] right-[20px] z-[999] overflow-hidden rounded-2xl shadow-2xl" : "fixed inset-0 w-full h-screen bg-slate-950 flex flex-col z-[999] overflow-hidden"}>
      <StreamVideo client={client}>
        <StreamCall call={streamCall}>
          {isMinimized ? (
            <GroupCallMini 
              chat={chat} 
              onClose={onClose} 
              setIsMinimized={setIsMinimized} 
              callInstance={streamCall}
            />
          ) : (
            <GroupCallContent 
              currentUser={currentUser} 
              chat={chat} 
              callSession={call}
              onClose={onClose} 
              onNavigateToUser={onNavigateToUser} 
              onMinimize={() => setIsMinimized(true)}
            />
          )}
        </StreamCall>
      </StreamVideo>
    </div>
  );
};
