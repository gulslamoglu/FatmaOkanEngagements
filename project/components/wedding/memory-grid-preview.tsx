'use client';

import Link from 'next/link';
import { Play, Quote, Mic } from 'lucide-react';
import { getMediaUrl } from '@/lib/media-url';
import { ReliableImage, ReliableVideo } from '@/components/media/reliable-media';

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
      {memories.filter(memory => memory.type === 'photo' || memory.type === 'video').map((m, i) => {
        const media = m.memory_media?.[0];
        const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
        const isVideo = media?.media_type === 'video' || m.type === 'video';
        const isAudio = media?.media_type === 'audio' || m.type === 'voice';
        return (
          <Link
            key={m.id}
            href={`/w/${slug}/gallery`}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted animate-scale-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {isAudio ? (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary via-card to-accent/50 p-4 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 font-serif text-sm text-charcoal">Sesli mesaj</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Dinlemek için dokun</p>
              </div>
            ) : url && isVideo ? (
              <ReliableVideo src={url} className="h-full w-full" mediaClassName="object-cover" />
            ) : url ? (
              <ReliableImage src={url} alt={m.caption || 'Anı'} className="h-full w-full" mediaClassName="object-cover group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary via-card to-accent/50 p-4 text-center transition-transform duration-500 group-hover:scale-105">
                <Quote className="mb-2 h-5 w-5 text-primary/35" strokeWidth={1.5} />
                <p className="font-serif text-sm italic leading-snug text-charcoal line-clamp-4">{m.story || m.caption}</p>
              </div>
            )}
            {isVideo && !isAudio && (
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
