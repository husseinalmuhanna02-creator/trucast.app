import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';
import { User as FirebaseUser } from 'firebase/auth';
import { Chat, CallSession } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
  ParticipantView,
} from '@stream-io/video-react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  X, 
  Monitor, 
  Menu, 
  Sliders, 
  VolumeX, 
  Edit2, 
  Sparkles,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { getApiUrl } from '../config';

const WhiteboardPanel = ({ onClose }: { onClose: () => void }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = color;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="absolute inset-y-4 right-4 w-80 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 z-[60] flex flex-col shadow-2xl font-sans" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h4 className="text-white font-black text-sm">{t("السبورة الذكية التفاعلية")} 📋</h4>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-all bg-zinc-900/50 rounded-lg hover:bg-zinc-800">
          <X className="w-4 h-4" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={272}
        height={340}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl cursor-crosshair touch-none"
      />
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button onClick={clearCanvas} className="text-xs text-zinc-400 hover:text-red-400 font-black transition-colors px-3 py-1.5 bg-zinc-900 rounded-xl border border-zinc-800">
          {t("مسح اللوحة")}
        </button>
      </div>
    </div>
  );
};

const PrivateCallContent = ({ 
  currentUser,
  chat,
  callSession,
  onClose 
}: { 
  currentUser: FirebaseUser | null,
  chat: Chat,
  callSession: CallSession,
  onClose: () => void 
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

  const localParticipant = participants.find(p => p.isLocalParticipant);
  const remoteParticipant = participants.find(p => !p.isLocalParticipant);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [muteNew, setMuteNew] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const toggleCamera = async () => {
    try {
      if (call) await call.camera.toggle();
    } catch (err) {
      console.error("Error toggling camera:", err);
    }
  };

  const toggleMic = async () => {
    try {
      if (call) await call.microphone.toggle();
    } catch (err) {
      console.error("Error toggling microphone:", err);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (call) await call.screenShare.toggle();
    } catch (err) {
      console.error("Error toggling screen share:", err);
    }
  };

  const handleLeaveClick = () => {
    const isOwner = (call?.state as any)?.createdByUserId === currentUser?.uid || (call?.state as any)?.createdBy?.id === currentUser?.uid || currentUser?.uid === (chat as any)?.createdById;
    if (isOwner) {
      setShowLeaveConfirm(true);
    } else {
      executeLeave();
    }
  };

  const executeLeave = async () => {
    try {
      if (call) await call.leave();
    } catch (err) {
      console.warn("Error leaving call:", err);
    }
    onClose();
  };

  const executeEndCall = async () => {
    try {
      if (chat?.id && callSession?.id) {
        await updateDoc(doc(db, 'chats', chat.id, 'calls', callSession.id), { 
          active: false,
          status: 'ended',
          endedAt: serverTimestamp()
        }).catch(err => console.warn("Firestore update failed:", err));
        
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
      if (call) await call.endCall();
    } catch (err) {
      console.warn("Error ending call:", err);
    }

    if (typeof (window as any).navigate === 'function') {
      (window as any).navigate('/home');
    }
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col relative h-full">
      <div className="absolute top-6 left-6 z-[70] font-sans" dir="rtl">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 bg-zinc-950/85 hover:bg-zinc-900 text-white px-4 py-3 rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95"
        >
          <Menu className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-black">{t("خيارات المكالمة")}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-64 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl space-y-1.5 z-[70] animate-in fade-in slide-in-from-top-3">
            <button
              onClick={() => {
                setNoiseReduction(!noiseReduction);
                triggerToast(!noiseReduction ? t("تم تفعيل عزل الضوضاء 🎙️") : t("تم إلغاء تفعيل عزل الضوضاء"));
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900/50 text-right transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sliders className={`w-4.5 h-4.5 ${noiseReduction ? 'text-emerald-500' : 'text-zinc-400'}`} />
                <span className="text-xs font-bold text-white">{t("تقليل الضوضاء النشط")}</span>
              </div>
              {noiseReduction && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative bg-slate-950">
        <AnimatePresence mode="wait">
          {remoteParticipant ? (
            <motion.div 
              key="active-call"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              {(() => {
                const isRemoteCamOn = !!(
                  remoteParticipant.videoStream || 
                  (remoteParticipant as any).isVideoEnabled || 
                  (remoteParticipant as any).hasVideo || 
                  (remoteParticipant as any).videoStreamTrack ||
                  remoteParticipant.publishedTracks?.includes(2)
                );
                return isRemoteCamOn ? (
                  <ParticipantView
                    participant={remoteParticipant}
                    trackType="videoTrack"
                    className="w-full h-full object-cover"
                    ParticipantViewUI={null}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-zinc-950/95" style={{ direction: 'rtl' }}>
                    <div className="absolute top-0 left-0 w-1 h-1 opacity-0 overflow-hidden pointer-events-none z-[-50]">
                      <ParticipantView participant={remoteParticipant} trackType="none" ParticipantViewUI={null} />
                    </div>
                    <div className="relative mb-6">
                      <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center relative z-10 shadow-2xl">
                        {remoteParticipant.image ? (
                          <img src={remoteParticipant.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl font-black text-indigo-400">
                            {(remoteParticipant.name || remoteParticipant.userId).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-white font-black text-lg mb-1">{remoteParticipant.name || remoteParticipant.userId}</h3>
                    <p className="text-zinc-500 font-bold text-xs">{t("الكاميرا مغلقة حالياً")}</p>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950 via-zinc-950 to-slate-950"
              style={{ direction: 'rtl' }}
            >
              <div className="relative mb-6">
                <div className="absolute -inset-6 bg-indigo-500/15 rounded-full blur-3xl animate-pulse" />
                <div className="w-20 h-20 bg-indigo-600/10 text-indigo-400 rounded-full flex items-center justify-center relative border border-indigo-500/20 animate-bounce">
                  <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-white font-black text-base mb-2">{t("في انتظار انضمام الطرف الآخر...")}</h3>
            </motion.div>
          )}
        </AnimatePresence>

        {localParticipant && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-28 right-6 w-32 h-44 md:w-40 md:h-56 bg-zinc-950/90 border border-white/10 rounded-[24px] overflow-hidden shadow-2xl z-40 group hover:border-indigo-500/40 transition-all duration-300"
            style={{ direction: 'rtl' }}
          >
            {isCamOn ? (
              <ParticipantView
                participant={localParticipant}
                trackType="videoTrack"
                className="w-full h-full object-cover scale-x-[-1]"
                ParticipantViewUI={null}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center mb-2 shadow-inner">
                  {localParticipant.image ? (
                    <img src={localParticipant.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm font-black text-zinc-400">
                      {(localParticipant.name || localParticipant.userId).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl z-50">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-2xl transition-all active:scale-95 ${
            !isMicOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {!isMicOn ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={handleLeaveClick}
          className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-lg shadow-red-600/30 active:scale-95"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        <button
          onClick={toggleCamera}
          className={`p-4 rounded-2xl transition-all active:scale-95 ${
            !isCamOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {!isCamOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};
export const PrivateCallScreen = ({
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
  const { t } = useLanguage();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [streamCall, setStreamCall] = useState<any>(null);
  
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    let streamClient: StreamVideoClient | null = null;
    let myCall: any = null;

    const requestMediaPermissions = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.warn("Camera/Mic permission failed. Trying audio only.", err);
        try {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (audioErr: any) {
          throw new Error("لم يتم منح صلاحيات الميكروفون أو الكاميرا. يرجى تفعيلها من إعدادات الهاتف.");
        }
      }
    };

    const initStream = async () => {
      try {
        setCallError(null);
        await requestMediaPermissions();

        const response = await fetch(getApiUrl('/api/stream/credentials'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        });
        
        if (!response.ok) {
           throw new Error(`فشل الاتصال بالخادم الداخلي للمكالمات (الرمز: ${response.status})`);
        }
        
        const { apiKey, token } = await response.json();

        if (!active) return;

        const user = {
          id: currentUser.uid,
          name: currentUser.displayName || t('مستخدم'),
          image: currentUser.photoURL || '',
        };

        streamClient = new StreamVideoClient({
          apiKey,
          user,
          tokenProvider: async (): Promise<string> => token,
        });

        setClient(streamClient);

        const channelName = call.id || chat.id || "private_call";
        myCall = streamClient.call('default', channelName);

        await myCall.join({ create: true });
        await myCall.camera.disable();

        if (!active) {
          myCall.leave().catch(() => {});
          streamClient.disconnectUser().catch(() => {});
          return;
        }
        setStreamCall(myCall);
      } catch (err: any) {
        console.error("Error joining Stream Video Call:", err);
        setCallError(err.message || "حدث خطأ غير معروف أثناء تهيئة المكالمة");
      }
    };

    initStream();

    return () => {
      active = false;
      if (myCall) myCall.leave().catch(() => {});
      if (streamClient) streamClient.disconnectUser().catch(() => {});
    };
  }, [currentUser, call.id, chat.id]);

  if (callError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 relative font-sans" dir="rtl">
        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-zinc-800/50">
          <X className="w-5 h-5" />
        </button>
        <div className="w-20 h-20 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black mb-3 text-red-400">فشل بدء المكالمة</h3>
        <p className="text-zinc-300 font-bold text-sm text-center max-w-sm mb-8 leading-relaxed">
          {callError}
        </p>
        <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl font-black transition-colors">
          عودة للدردشة
        </button>
      </div>
    );
  }

  if (!client || !streamCall) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-zinc-900/85 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all border border-zinc-800/50">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
            <Video className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="text-xl font-black mb-2">{t("جاري بدء الاتصال...")}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <StreamVideo client={client}>
        <StreamCall call={streamCall}>
          <PrivateCallContent currentUser={currentUser} chat={chat} callSession={call} onClose={onClose} />
        </StreamCall>
      </StreamVideo>
    </div>
  );
};
            
