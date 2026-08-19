'use client';

import { useState, useMemo, useEffect } from 'react';
import { Play, Heart, X, ChevronLeft, ChevronRight, Shuffle, Mic, Quote } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import { formatDateLong } from '@/lib/format';
import type { Memory, Wedding } from '@/lib/types';
import { getMediaUrl } from '@/lib/media-url';

type Filter = 'all' | 'photo' | 'video' | 'text' | 'voice';
type Sort = 'newest' | 'oldest' | 'random';

interface Props {
  wedding: Wedding;
  initialMemories: Memory[];
}

export function Gallery({ wedding, initialMemories }: Props) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const sessionId = useSessionId();
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Load reactions
  useEffect(() => {
    if (initialMemories.length === 0) return;
    const supabase = getSupabase();
    const ids = initialMemories.map((m) => m.id);
    supabase.from('reactions').select('memory_id, session_id').in('memory_id', ids).then(({ data }) => {
      if (!data) return;
      const c: Record<string, number> = {};
      const r = new Set<string>();
      data.forEach((rx) => {
        c[rx.memory_id] = (c[rx.memory_id] || 0) + 1;
        if (rx.session_id === sessionId) r.add(rx.memory_id);
      });
      setCounts(c);
      setReacted(r);
    });
  }, [initialMemories, sessionId]);

  const filtered = useMemo(() => {
    let list = memories;
    if (filter !== 'all') list = list.filter((m) => m.type === filter);
    if (sort === 'newest') list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sort === 'oldest') list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (sort === 'random') list = [...list].sort(() => Math.random() - 0.5);
    return list;
  }, [memories, filter, sort]);

  const toggleReaction = async (memoryId: string) => {
    const supabase = getSupabase();
    if (reacted.has(memoryId)) {
      setReacted((prev) => { const n = new Set(prev); n.delete(memoryId); return n; });
      setCounts((prev) => ({ ...prev, [memoryId]: Math.max(0, (prev[memoryId] || 1) - 1) }));
      await supabase.from('reactions').delete().eq('memory_id', memoryId).eq('session_id', sessionId);
    } else {
      setReacted((prev) => new Set(prev).add(memoryId));
      setCounts((prev) => ({ ...prev, [memoryId]: (prev[memoryId] || 0) + 1 }));
      await supabase.from('reactions').insert({ memory_id: memoryId, session_id: sessionId, reaction_type: 'love' });
    }
  };

  const showRandom = () => {
    if (filtered.length === 0) return;
    const idx = Math.floor(Math.random() * filtered.length);
    setLightbox(idx);
  };

  const next = () => setLightbox((i) => i === null ? null : (i + 1) % filtered.length);
  const prev = () => setLightbox((i) => i === null ? null : (i - 1 + filtered.length) % filtered.length);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'photo', label: 'Fotoğraflar' },
    { key: 'video', label: 'Videolar' },
    { key: 'text', label: 'Mesajlar' },
    { key: 'voice', label: 'Ses' },
  ];

  if (memories.length === 0) {
    return (
      <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm animate-fade-up">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-secondary" />
          <h1 className="font-serif text-3xl font-light text-charcoal">İlk anı henüz bırakılmadı.</h1>
          <p className="mt-3 font-serif text-lg text-muted-foreground font-light italic">
            "Belki ilk kare senden gelir."
          </p>
          <a
            href={`/w/${wedding.slug}/upload`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            İlk Anıyı Bırak
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 font-serif text-3xl font-light text-charcoal">Anılar</h1>
        <p className="mb-6 text-sm text-muted-foreground font-light">{memories.length} anı paylaşıldı</p>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-charcoal'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-charcoal outline-none"
            >
              <option value="newest">En Yeniler</option>
              <option value="oldest">En Eskiler</option>
              <option value="random">Rastgele</option>
            </select>
            <button
              onClick={showRandom}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-charcoal transition-colors hover:bg-secondary"
            >
              <Shuffle className="h-3.5 w-3.5" /> Rastgele
            </button>
          </div>
        </div>

        {/* Masonry grid */}
        <div className="masonry columns-2 md:columns-3 lg:columns-4">
          {filtered.map((m, i) => (
            <MemoryCard
              key={m.id}
              memory={m}
              onOpen={() => setLightbox(i)}
              reacted={reacted.has(m.id)}
              count={counts[m.id] || 0}
              onReact={() => toggleReaction(m.id)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <Lightbox
          memory={filtered[lightbox]}
          reacted={reacted.has(filtered[lightbox].id)}
          count={counts[filtered[lightbox].id] || 0}
          onReact={() => toggleReaction(filtered[lightbox].id)}
          onClose={() => setLightbox(null)}
          onNext={next}
          onPrev={prev}
        />
      )}
    </div>
  );
}

function MemoryCard({
  memory, onOpen, reacted, count, onReact,
}: {
  memory: Memory;
  onOpen: () => void;
  reacted: boolean;
  count: number;
  onReact: () => void;
}) {
  const media = memory.memory_media?.[0];
  const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
  const guestName = memory.guests?.display_name || (memory.guests?.is_anonymous ? 'Anonim' : 'Bir misafir');

  if (memory.type === 'text') {
    return (
      <div
        onClick={onOpen}
        className="group relative min-h-56 cursor-pointer overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-secondary/45 to-accent/40 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
      >
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-125" />
        <Quote className="h-8 w-8 text-primary/30" strokeWidth={1.5} />
        <p className="relative mt-4 font-serif text-xl font-light leading-relaxed text-charcoal line-clamp-6 italic">
          {memory.story}
        </p>
        <div className="relative mt-6 flex items-end justify-between gap-3 border-t border-primary/10 pt-4">
          <div>
            <p className="text-xs font-medium text-charcoal">{guestName}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateLong(memory.created_at)}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onReact(); }} className="flex items-center gap-1 transition-colors hover:text-primary">
            <Heart className={`h-3.5 w-3.5 ${reacted ? 'fill-primary text-primary' : ''}`} />
            {count > 0 && count}
          </button>
        </div>
      </div>
    );
  }

  if (memory.type === 'voice') {
    return (
      <div
        onClick={onOpen}
        className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-8 text-center transition-all hover:shadow-md"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mic className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-4 text-sm font-medium text-charcoal">Sesli Mesaj</p>
        <p className="mt-1 text-xs text-muted-foreground">{guestName}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button onClick={(e) => { e.stopPropagation(); onReact(); }} className="flex items-center gap-1 transition-colors hover:text-primary">
            <Heart className={`h-3.5 w-3.5 ${reacted ? 'fill-primary text-primary' : ''}`} />
            {count > 0 && count}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-muted cursor-pointer" onClick={onOpen}>
      {url && media?.media_type === 'video' ? (
        <video src={url} muted playsInline preload="metadata" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={memory.caption || 'Anı'} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
      )}
      {media?.media_type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-10 w-10 text-white/90" fill="currentColor" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        {memory.caption && <p className="text-xs font-medium text-white line-clamp-1">{memory.caption}</p>}
        <p className="text-[10px] text-white/70">{guestName}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onReact(); }}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-xs backdrop-blur-sm transition-colors hover:bg-white"
      >
        <Heart className={`h-3.5 w-3.5 ${reacted ? 'fill-primary text-primary' : 'text-charcoal'}`} />
        {count > 0 && <span className="text-charcoal">{count}</span>}
      </button>
    </div>
  );
}

function Lightbox({
  memory, reacted, count, onReact, onClose, onNext, onPrev,
}: {
  memory: Memory;
  reacted: boolean;
  count: number;
  onReact: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const media = memory.memory_media?.[0];
  const url = getMediaUrl(media?.storage_path);
  const guestName = memory.guests?.display_name || (memory.guests?.is_anonymous ? 'Anonim' : 'Bir misafir');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in" onClick={onClose}>
      <button className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20" onClick={onClose}>
        <X className="h-6 w-6" />
      </button>
      <button className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20" onClick={(e) => { e.stopPropagation(); onNext(); }}>
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="flex max-h-full w-full max-w-3xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex max-h-[70svh] w-full items-center justify-center p-4">
          {media?.media_type === 'video' && url ? (
            <video src={url} controls playsInline preload="metadata" className="max-h-[70svh] max-w-full rounded-lg" />
          ) : media?.media_type === 'audio' || memory.type === 'voice' ? (
            <div className="flex flex-col items-center gap-6 p-12">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/10">
                <Mic className="h-14 w-14 text-white" />
              </div>
              {url && <audio src={url} controls preload="metadata" className="w-72" />}
            </div>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={memory.caption || 'Anı'} className="max-h-[70svh] max-w-full rounded-lg object-contain" />
          ) : memory.type === 'text' ? (
            <div className="mx-5 max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-md sm:p-12">
              <Quote className="mx-auto h-10 w-10 text-white/30" strokeWidth={1.5} />
              <p className="mt-6 font-serif text-2xl font-light leading-relaxed text-white italic sm:text-3xl">{memory.story}</p>
              <div className="mx-auto mt-7 h-px w-12 bg-white/25" />
              <p className="mt-4 text-sm text-white/65">{guestName}</p>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-2xl rounded-b-lg bg-black/40 p-5 text-center backdrop-blur-sm">
          {memory.caption && <p className="font-serif text-lg text-white font-light">{memory.caption}</p>}
          {memory.story && memory.type !== 'text' && (
            <p className="mt-2 text-sm text-white/70 italic font-light">"{memory.story}"</p>
          )}
          <p className="mt-3 text-xs text-white/50">{guestName} · {formatDateLong(memory.created_at)}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onReact(); }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <Heart className={`h-4 w-4 ${reacted ? 'fill-white' : ''}`} />
            {reacted ? 'Sevildi' : 'Bu anı sevdim'} {count > 0 && `· ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}
