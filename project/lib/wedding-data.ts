import { getServerSupabase } from '@/lib/supabase/server';
import type { Wedding, Memory, Guest, MemoryMedia } from '@/lib/types';

export async function getWeddingBySlug(slug: string): Promise<Wedding | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('weddings')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return null;
  return data as Wedding | null;
}

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
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as unknown as Memory[];
}

export async function getStats(weddingId: string) {
  const supabase = getServerSupabase();
  const [photos, videos, messages, voices, guests] = await Promise.all([
    supabase.from('memories').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('type', 'photo'),
    supabase.from('memories').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('type', 'video'),
    supabase.from('memories').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('type', 'text'),
    supabase.from('memories').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('type', 'voice'),
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('wedding_id', weddingId),
  ]);
  return {
    photos: photos.count || 0,
    videos: videos.count || 0,
    messages: messages.count || 0,
    voices: voices.count || 0,
    guests: guests.count || 0,
    total: (photos.count || 0) + (videos.count || 0) + (messages.count || 0) + (voices.count || 0),
  };
}
