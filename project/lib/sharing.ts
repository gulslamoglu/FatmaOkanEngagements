import { getSupabase } from '@/lib/supabase/client';
// Version of the visible submission flow; this is not a browser permission receipt.
export const PUBLIC_SUBMISSION_VERSION = 'public-media-v1';
export const PRIVATE_SUBMISSION_VERSION = 'private-voice-v1';
export async function ensureSharingReady(weddingId: string) {
  const { data, error } = await getSupabase().rpc('sharing_ready', { event_id: weddingId });
  if (error || data !== true) throw new Error('Paylaşım alanının gizlilik ayarları henüz hazır değil. Lütfen daha sonra tekrar dene.');
}
