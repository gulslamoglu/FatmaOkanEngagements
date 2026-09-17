import type { Memory } from '@/lib/types';
export type GalleryItem = Memory & { cardId: string };
export function expandMemories(memories: Memory[]): GalleryItem[] {
  return memories.flatMap(memory => {
    if (memory.type === 'text') return [{ ...memory, cardId: memory.id }];
    // Existing batches stay intact in storage, but every attachment gets its own card.
    return (memory.memory_media || []).map(media => ({
      ...memory, cardId: media.id, memory_media: [media],
      type: media.media_type === 'image' ? 'photo' as const : media.media_type === 'video' ? 'video' as const : 'voice' as const,
    }));
  });
}
