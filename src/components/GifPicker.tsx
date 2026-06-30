import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    tinygif?: {
      url: string;
    };
    gif?: {
      url: string;
    };
  };
}

const POPULAR_TAGS = [
  { label: "ضحك", query: "funny laughing" },
  { label: "متحمس", query: "excited" },
  { label: "شكراً", query: "thank you" },
  { label: "مبروك", query: "congratulations" },
  { label: "مندهش", query: "shocked surprised" },
  { label: "حزين", query: "sad" },
  { label: "غاضب", query: "angry" },
  { label: "نعم", query: "yes" },
  { label: "لا", query: "no" },
  { label: "سلام", query: "hello wave" },
];

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGifs = async (query: string = "") => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = "LIVDTRZ9VRRA"; // Public/Developer Test Key for Tenor v2
      const limit = 24;
      const clientKey = "trucast";
      
      let url = "";
      if (query.trim() === "") {
        url = `https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=${limit}&client_key=${clientKey}`;
      } else {
        url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=${limit}&client_key=${clientKey}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("فشل الاتصال بخدمة GIFs");
      }
      const data = await res.json();
      if (data && data.results) {
        setGifs(data.results);
      } else {
        setGifs([]);
      }
    } catch (err: any) {
      console.error("Error fetching GIFs:", err);
      setError("تعذر تحميل صور GIF. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch trending on mount
  useEffect(() => {
    fetchGifs("");
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGifs(searchQuery);
  };

  const handleTagClick = (tagQuery: string) => {
    setSearchQuery(tagQuery);
    fetchGifs(tagQuery);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.5 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-[32px] md:rounded-[32px] overflow-hidden flex flex-col h-[85vh] md:h-[600px] z-10"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-white text-base">إدراج صورة GIF</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-zinc-900">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن صور GIF..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-4 pr-11 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-right"
              dir="rtl"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              ) : (
                <button type="submit">
                  <Search className="w-4 h-4 hover:text-violet-400 transition-colors" />
                </button>
              )}
            </div>
          </form>

          {/* Tags */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mt-3 scrollbar-none no-scrollbar" dir="rtl">
            <button
              onClick={() => {
                setSearchQuery("");
                fetchGifs("");
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                searchQuery === ""
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/60'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              الشائع
            </button>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag.label}
                onClick={() => handleTagClick(tag.query)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  searchQuery === tag.query
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/60'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* GIF Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" dir="rtl">
          {error && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-zinc-400 text-sm font-bold">{error}</p>
              <button
                onClick={() => fetchGifs(searchQuery)}
                className="mt-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black text-white hover:bg-zinc-800 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {!error && loading && gifs.length === 0 && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          )}

          {!error && !loading && gifs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500 font-bold">
              <p>لم يتم العثور على نتائج</p>
            </div>
          )}

          {!error && gifs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gifs.map((gif) => {
                const previewUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || "";
                const fullUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || "";
                if (!previewUrl) return null;

                return (
                  <button
                    key={gif.id}
                    onClick={() => onSelect(fullUrl)}
                    className="aspect-video relative rounded-xl overflow-hidden bg-zinc-900 hover:ring-2 hover:ring-violet-500 transition-all active:scale-95 group"
                  >
                    <img
                      src={previewUrl}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-start p-1.5">
                      <span className="text-[9px] text-zinc-300 truncate font-semibold">
                        {gif.title || "GIF"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
