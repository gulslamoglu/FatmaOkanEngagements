'use client';

import Link from 'next/link';
import { Play, Quote } from 'lucide-react';
import { getMediaUrl } from '@/lib/media-url';

interface PreviewMemory {
  id: string;
  type: string;
  caption: string;
  story: string;
  created_at: string;
  memory_media?: { storage_path: string; thumbnail_path: string; media_type?: 'image' | 'video' | 'audio' }[];
}

export function MemoryGridPreview({ memories, slug }: { memories: PreviewMemory[]; slug: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      {memories.map((m, i) => {
        const media = m.memory_media?.[0];
        const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
        const isVideo = media?.media_type === 'video' || m.type === 'video';
        return (
          <Link
            key={m.id}
            href={`/w/${slug}/gallery`}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted animate-scale-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {url && isVideo ? (
              <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={m.caption || 'Anı'} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary via-card to-accent/50 p-4 text-center transition-transform duration-500 group-hover:scale-105">
                <Quote className="mb-2 h-5 w-5 text-primary/35" strokeWidth={1.5} />
                <p className="font-serif text-sm italic leading-snug text-charcoal line-clamp-4">{m.story || m.caption}</p>
              </div>
            )}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-8 w-8 text-white/90" fill="currentColor" />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
