'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize, Minimize, Mic, Play } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import type { Memory } from '@/lib/types';
import { getMediaUrl } from '@/lib/media-url';
import { ReliableAudio, ReliableImage, ReliableVideo } from '@/components/media/reliable-media';

interface Props {
  weddingId: string;
  names: string;
  initialMemories: Memory[];
}

export function LiveWall({ weddingId, names, initialMemories }: Props) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll for new memories
  useEffect(() => {
    const supabase = getSupabase();
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('memories')
        .select(`*, guests (*), memory_media (*)`)
        .eq('wedding_id', weddingId)
        .in('status', ['approved'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (data && data.length > memories.length) {
        setMemories(data as unknown as Memory[]);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [weddingId, memories.length]);

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % Math.max(1, memories.length));
  }, [memories.length]);

  useEffect(() => {
    if (memories.length <= 1) return;
    const interval = setInterval(advance, 5000);
    return () => clearInterval(interval);
  }, [advance, memories.length]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (memories.length === 0) {
    return (
      <div ref={containerRef} className="flex min-h-screen items-center justify-center bg-charcoal">
        <div className="text-center">
          <p className="font-serif text-3xl font-light text-white/80">Canlı Anı Duvarı</p>
          <p className="mt-3 text-sm text-white/50">Anılar yüklendikçe burada belirecek</p>
          <p className="mt-8 font-serif text-xl text-white/40">{names}</p>
        </div>
      </div>
    );
  }

  const m = memories[current];
  const media = m.memory_media?.[0];
  const url = getMediaUrl(media?.storage_path || media?.thumbnail_path);

  return (
    <div ref={containerRef} className="relative min-h-screen w-full overflow-hidden bg-charcoal">
      {/* Content */}
      <div key={m.id} className="absolute inset-0 flex items-center justify-center animate-fade-in">
        {media?.media_type === 'video' && url ? (
          <ReliableVideo src={url} autoPlay loop className="h-full w-full" mediaClassName="object-cover" />
        ) : media?.media_type === 'audio' || m.type === 'voice' ? (
          <div className="flex flex-col items-center gap-8">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10 animate-pulse">
              <Mic className="h-16 w-16 text-white/80" />
            </div>
            {url && <ReliableAudio src={url} autoPlay />}
            <p className="font-serif text-2xl text-white/70 italic">"{m.caption || 'Sesli mesaj'}"</p>
          </div>
        ) : m.type === 'text' ? (
          <div className="max-w-2xl px-8 text-center">
            <p className="font-serif text-3xl sm:text-4xl font-light text-white/90 italic leading-relaxed animate-fade-up">
              "{m.story}"
            </p>
            <p className="mt-6 text-sm text-white/50">— {m.guests?.display_name || 'Anonim'}</p>
          </div>
        ) : url ? (
          <ReliableImage src={url} alt={m.caption || ''} eager className="h-full w-full" mediaClassName="object-cover" />
        ) : null}
      </div>

      {/* Overlay info */}
      {(m.caption || m.guests?.display_name) && m.type !== 'text' && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
          {m.caption && <p className="font-serif text-2xl text-white font-light">{m.caption}</p>}
          {m.guests?.display_name && <p className="mt-1 text-sm text-white/60">— {m.guests.display_name}</p>}
        </div>
      )}

      {/* Top bar */}
      <div className="absolute left-6 top-6 z-10">
        <p className="font-serif text-xl text-white/80 font-light tracking-wide">{names}</p>
        <p className="text-xs text-white/40">Canlı Anı Duvarı</p>
      </div>

      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute right-6 top-6 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </button>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
        {memories.slice(0, 20).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === current % 20 ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
