'use client';

import { useMemo } from 'react';
import { Play, Mic } from 'lucide-react';
import { formatTime } from '@/lib/format';
import type { Memory } from '@/lib/types';
import { getMediaUrl } from '@/lib/media-url';

export function Timeline({ memories }: { memories: Memory[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, Memory[]> = {};
    const sorted = [...memories].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const m of sorted) {
      const key = formatTime(m.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return Object.entries(groups);
  }, [memories]);

  if (memories.length === 0) {
    return (
      <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-3xl font-light text-charcoal">Zaman çizelgesi henüz boş</h1>
        <p className="mt-3 text-sm text-muted-foreground font-light">Anılar yüklendikçe burada saat saat görünecek.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-light text-charcoal">Bugünün Anıları</h1>
        <p className="mt-2 text-sm text-muted-foreground font-light">
          Düğün günü saat saat yaşananlar
        </p>

        <div className="mt-10 space-y-8">
          {grouped.map(([time, items]) => (
            <div key={time} className="relative animate-fade-up">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif text-sm font-light">
                  {time}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="mt-4 ml-16 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {items.map((m) => {
                  const media = m.memory_media?.[0];
                  const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
                  if (m.type === 'text') {
                    return (
                      <div key={m.id} className="col-span-3 rounded-xl border border-border bg-card p-4">
                        <p className="font-serif text-sm text-charcoal italic line-clamp-3">"{m.story}"</p>
                        <p className="mt-2 text-xs text-muted-foreground">— {m.guests?.display_name || 'Anonim'}</p>
                      </div>
                    );
                  }
                  if (m.type === 'voice') {
                    return (
                      <div key={m.id} className="flex aspect-square items-center justify-center rounded-xl bg-secondary">
                        <Mic className="h-6 w-6 text-primary" />
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      {url && media?.media_type === 'video' ? (
                        <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={m.caption || ''} className="h-full w-full object-cover" loading="lazy" />
                      )}
                      {media?.media_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-8 w-8 text-white/90" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
