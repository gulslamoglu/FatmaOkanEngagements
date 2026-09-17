import { getServerSupabase } from '@/lib/supabase/server';
import type { Wedding, Memory, Guest, MemoryMedia } from '@/lib/types';
import { engagementGuide, engagementLocation } from '@/lib/event-guide';
import { cache } from 'react';

export const getWeddingBySlug = cache(async (slug: string): Promise<Wedding | null> => {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('weddings')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  const wedding = data as Wedding;
  if (slug === 'fatma-okan') {
    if (!wedding.location || wedding.location.trim().toLocaleLowerCase('tr') === 'istanbul') wedding.location = engagementLocation;
    if (!wedding.event_guide) {
      wedding.event_guide = engagementGuide;

    }
  }
  return wedding;
});

export async function getApprovedMemories(weddingId: string, limit = 100): Promise<Memory[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('memories')
    .select(`
      *,
      guests (*),
      memory_media (*)
    `)
    .eq('wedding_id', weddingId)
    .in('status', ['approved'])
    .in('type', ['photo', 'video'])
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as unknown as Memory[];
}

export async function getStats(weddingId: string) {
  const supabase = getServerSupabase();
  const [photos, videos] = await Promise.all([
    supabase.from('memory_media').select('id, memories!inner(wedding_id,status,type)', { count: 'exact', head: true }).eq('memories.wedding_id', weddingId).eq('media_type', 'image').eq('memories.type', 'photo').eq('memories.status', 'approved'),
    supabase.from('memory_media').select('id, memories!inner(wedding_id,status,type)', { count: 'exact', head: true }).eq('memories.wedding_id', weddingId).eq('media_type', 'video').eq('memories.type', 'video').eq('memories.status', 'approved'),
  ]);
  return { photos: photos.count || 0, videos: videos.count || 0, messages: 0, voices: 0, guests: 0, total: (photos.count || 0) + (videos.count || 0) };
}
