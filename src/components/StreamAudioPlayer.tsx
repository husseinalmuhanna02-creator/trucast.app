import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  RefreshCw,
  X
} from 'lucide-react';
import { useLanguage } from '../localization';

interface StreamAudioPlayerProps {
  isHost: boolean;
  call: any;
  triggerToast: (msg: string) => void;
}

export const StreamAudioPlayer: React.FC<StreamAudioPlayerProps> = React.memo(({
  isHost,
  call,
  triggerToast
}) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const elapsedTextRef = useRef<HTMLSpanElement>(null);
  const durationTextRef = useRef<HTMLSpanElement>(null);
  
  // Web Audio Context refs for mixing
  const audioContextRef = useRef<AudioContext | null>(null);
  const registeredFilterRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const publishedTrackRef = useRef<MediaStreamTrack | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      unpublishCustomTrack();
      cleanupWebAudio();
      if (audioRef.current && audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const unpublishCustomTrack = () => {
    if (publishedTrackRef.current) {
      const track = publishedTrackRef.current;
      track.stop();
      if (isHost && call) {
        if (typeof call.stopPublish === 'function') {
          call.stopPublish(1) // 1 corresponds to TrackType.AUDIO
            .then(() => console.log("Unpublished custom audio track successfully using stopPublish."))
            .catch((err: any) => console.warn("Failed to stopPublish custom audio track:", err));
        } else if (typeof call.unpublishAudioTrack === 'function') {
          call.unpublishAudioTrack()
            .then(() => console.log("Unpublished custom audio track successfully."))
            .catch((err: any) => console.warn("Failed to unpublish custom audio track:", err));
        }
      }
      publishedTrackRef.current = null;
    }
  };

  const cleanupWebAudio = () => {
    if (registeredFilterRef.current && registeredFilterRef.current.unregister) {
      registeredFilterRef.current.unregister().catch((e: any) => {
        console.warn("Error unregistering audio filter:", e);
      });
      registeredFilterRef.current = null;
    }
    unpublishCustomTrack();
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn("Error closing audio context:", e));
      }
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Start animation loop to update progress bar and timer using direct DOM refs (Zero re-renders!)
  const startProgressLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const updateProgress = () => {
      const audio = audioRef.current;
      if (!audio) return;

      const cur = audio.currentTime || 0;
      const dur = audio.duration || 0;

      if (progressRef.current) {
        const percentage = dur > 0 ? (cur / dur) * 100 : 0;
        progressRef.current.style.width = `${percentage}%`;
      }

      if (elapsedTextRef.current) {
        elapsedTextRef.current.textContent = formatTime(cur);
      }

      if (durationTextRef.current) {
        durationTextRef.current.textContent = formatTime(dur);
      }

      if (audio.paused || audio.ended) {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up previous setup
    stopAudio();
    cleanupWebAudio();
    if (audioRef.current && audioRef.current.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }

    setSelectedFile(file);
    setIsPlaying(false);

    const fileUrl = URL.createObjectURL(file);
    
    // Create new HTML5 Audio element as strictly required
    const audio = new Audio(fileUrl);
    audio.crossOrigin = "anonymous";
    audio.muted = false;
    audio.volume = 1.0;
    audioRef.current = audio;

    // Direct event listener for automatic end
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      if (progressRef.current) progressRef.current.style.width = '0%';
      if (elapsedTextRef.current) elapsedTextRef.current.textContent = '00:00';
    });

    audio.addEventListener('loadedmetadata', () => {
      if (durationTextRef.current) {
        durationTextRef.current.textContent = formatTime(audio.duration || 0);
      }
    });

    // If host, set up high-quality streaming via microphone filter
    if (isHost && call && call.microphone) {
      setupAudioMixing(audio);
    }

    triggerToast(`${t("تم تحميل الملف الصوتي: ")}${file.name} 🎵`);
  };

  // Web Audio mixing system to route audio to both local speakers and live stream
  const setupAudioMixing = (audio: HTMLAudioElement) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const micFilter = (input: MediaStream) => {
      // Create new AudioContext specifically for this filter session
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const dest = ctx.createMediaStreamDestination();
      
      // Connect microphone input
      const micSource = ctx.createMediaStreamSource(input);
      micSource.connect(dest);

      // Connect local music element to the stream destination and ALSO local speakers
      try {
        const audioSource = ctx.createMediaElementSource(audio);
        audioSource.connect(dest);
        
        // This is crucial: connect to ctx.destination so host can hear it through speakers
        audioSource.connect(ctx.destination);
      } catch (err) {
        console.warn("Web Audio element binding warning:", err);
      }

      // Return the mixed stream
      const outputStream = new MediaStream();
      dest.stream.getAudioTracks().forEach(t => outputStream.addTrack(t));

      return {
        output: outputStream,
        stop: () => {
          try {
            micSource.disconnect();
            if (ctx.state !== 'closed') {
              ctx.close();
            }
          } catch (e) {
            console.warn("Error cleaning up audio nodes:", e);
          }
        }
      };
    };

    try {
      registeredFilterRef.current = call.microphone.registerFilter(micFilter);
      console.log("StreamAudioPlayer: Custom mixing filter registered successfully.");
    } catch (err) {
      console.warn("StreamAudioPlayer: Failed to register custom mixing filter:", err);
    }
  };

  const playAudio = () => {
    if (!audioRef.current || !selectedFile) return;

    // Resume AudioContext if suspended (browser security)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        startProgressLoop();

        // Extract custom track and publish to call
        if (isHost && call && audioRef.current) {
          try {
            const audio = audioRef.current;
            let stream: MediaStream | null = null;
            if (typeof (audio as any).captureStream === 'function') {
              stream = (audio as any).captureStream();
            } else if (typeof (audio as any).mozCaptureStream === 'function') {
              stream = (audio as any).mozCaptureStream();
            }

            if (stream) {
              const customTrack = stream.getAudioTracks()[0];
              if (customTrack) {
                publishedTrackRef.current = customTrack;
                if (typeof call.publishAudioStream === 'function') {
                  call.publishAudioStream(stream)
                    .then(() => {
                      console.log("StreamAudioPlayer: Custom audio stream successfully published to call via publishAudioStream!");
                    })
                    .catch((err: any) => {
                      console.error("StreamAudioPlayer: Error publishing custom audio stream:", err);
                    });
                } else if (typeof call.publish === 'function') {
                  // Fallback to standard publish with TrackType.AUDIO (value 1)
                  call.publish(stream, 1)
                    .then(() => {
                      console.log("StreamAudioPlayer: Custom audio stream successfully published to call via standard publish!");
                    })
                    .catch((err: any) => {
                      console.error("StreamAudioPlayer: Error publishing custom audio stream via standard publish:", err);
                    });
                } else if (typeof call.publishAudioTrack === 'function') {
                  call.publishAudioTrack(customTrack)
                    .then(() => {
                      console.log("StreamAudioPlayer: Custom audio track successfully published to call via publishAudioTrack!");
                    })
                    .catch((err: any) => {
                      console.error("StreamAudioPlayer: Error publishing custom audio track:", err);
                    });
                }
              }
            }
          } catch (e) {
            console.warn("StreamAudioPlayer: Capture/Publish error:", e);
          }
        }
      })
      .catch(err => {
        console.error("Local play error:", err);
        triggerToast(t("فشل تشغيل الملف الصوتي محلياً"));
      });
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      unpublishCustomTrack();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      unpublishCustomTrack();
      
      if (progressRef.current) progressRef.current.style.width = '0%';
      if (elapsedTextRef.current) elapsedTextRef.current.textContent = '00:00';
    }
  };

  const resetFile = () => {
    stopAudio();
    unpublishCustomTrack();
    cleanupWebAudio();
    if (audioRef.current && audioRef.current.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }
    audioRef.current = null;
    setSelectedFile(null);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-4">
      {/* Hidden native input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!selectedFile ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl p-8 hover:border-rose-500/50 transition-all group cursor-pointer bg-zinc-900/10"
        >
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform">
            <Volume2 className="w-8 h-8" />
          </div>
          <span className="text-sm font-black text-white">{t("اختر ملف صوتي من جهازك (MP3)")}</span>
          <span className="text-xs text-zinc-500 font-bold mt-1">{t("سيتم بث الصوت مباشرة بنقاء رقمي كامل")}</span>
        </div>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
          {/* File Name & Size Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Volume2 className={`w-6 h-6 ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-white font-bold text-sm truncate">{selectedFile.name}</p>
              <p className="text-zinc-500 text-[10px] font-bold mt-0.5">
                {t("الحجم:")} {(selectedFile.size / (1024 * 1024)).toFixed(2)} {t("ميجابايت")}
              </p>
            </div>
          </div>

          {/* Direct DOM Progress Bar (Zero-Render Slider) */}
          <div className="space-y-1.5">
            <div 
              className="relative w-full h-2 bg-zinc-800 rounded-full cursor-pointer overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const pct = clickX / width;
                if (audioRef.current && isFinite(audioRef.current.duration)) {
                  audioRef.current.currentTime = pct * audioRef.current.duration;
                  if (progressRef.current) {
                    progressRef.current.style.width = `${pct * 100}%`;
                  }
                  if (elapsedTextRef.current) {
                    elapsedTextRef.current.textContent = formatTime(audioRef.current.currentTime);
                  }
                }
              }}
            >
              <div 
                ref={progressRef}
                className="h-full bg-gradient-to-r from-rose-500 to-pink-600 rounded-full transition-all duration-75" 
                style={{ width: '0%' }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] font-bold text-zinc-500">
              <span ref={durationTextRef}>00:00</span>
              <span ref={elapsedTextRef}>00:00</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {/* Stop button */}
            <button
              onClick={stopAudio}
              className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-750 text-white flex items-center justify-center transition-all active:scale-90"
              title={t("إيقاف تام")}
            >
              <Square className="w-4 h-4 fill-white" />
            </button>

            {/* Play/Pause Button */}
            {isPlaying ? (
              <button
                onClick={pauseAudio}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:scale-105 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-rose-500/20"
                title={t("إيقاف مؤقت")}
              >
                <Pause className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                onClick={playAudio}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:scale-105 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-rose-500/20"
                title={t("تشغيل")}
              >
                <Play className="w-5 h-5 fill-white mr-0.5" />
              </button>
            )}

            {/* Reset / Clear File */}
            <button
              onClick={resetFile}
              className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-750 text-white flex items-center justify-center transition-all active:scale-90"
              title={t("تغيير الملف")}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
