import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  postId?: string;
  currentUser?: any;
}

export default function CreateStoryModal({ isOpen, onClose, videoUrl, postId, currentUser }: CreateStoryModalProps) {
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePublish = async () => {
    // جلب المستخدم الحالي تلقائياً إذا لم يُمرَّر
    const activeUser = currentUser || auth.currentUser;

    if (!activeUser) {
alert("يرجى تسجيل الدخول لنشر القصة");
      return;
    }

    try {
      setIsSubmitting(true);
      
      await addDoc(collection(db, 'stories'), {
        userId: activeUser.uid,
        userName: activeUser.displayName || activeUser.name || 'مستخدم',
        userPhoto: activeUser.photoURL || activeUser.avatar || '',
        mediaUrl: videoUrl,
        type: 'video',
        caption: caption,
        postId: postId || null,
        createdAt: serverTimestamp(),
      });

      alert("تم مشاركة الفيديو في القصة بنجاح! 🎉");
      setCaption('');
      onClose();
    } catch (error) {
      console.error("Error publishing story:", error);
      alert("حدث خطأ أثناء نشر القصة، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* شريط العنوان */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white">نشر بالقصة</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* المعاينة وجسم النافذة */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {videoUrl ? (
            <div className="relative aspect-[9/16] w-full max-h-[360px] bg-black rounded-2xl overflow-hidden border border-zinc-800 mx-auto flex items-center justify-center">
              <video
                src={`${videoUrl}#t=0.001`}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          ) : (

            <div className="p-8 text-center text-zinc-500 text-sm">
              لم يتم العثور على رابط الفيديو.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">
              إضافة نص للقصة (اختياري)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب شيئاً حول الفيديو..."
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none h-20"
            />
          </div>
        </div>

        {/* أزرار النشر والتراجع */}
        <div className="p-4 border-t border-zinc-900 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl text-xs transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSubmitting || !videoUrl}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري النشر...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                نشر الآن
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
