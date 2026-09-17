import { getSupabase } from '@/lib/supabase/client';
import { emptyUsage, type GuestUsage, type QuotaKind } from '@/lib/guest-limits';
export async function getGuestUsage(weddingId: string, sessionId: string): Promise<GuestUsage> {
  if (!sessionId) throw new Error('Misafir bilgilerin hazırlanıyor. Biraz sonra tekrar dene.');
  const { data: result, error: rpcError } = await getSupabase().rpc('guest_media_usage', { event_id: weddingId, guest_session: sessionId });
  if (!rpcError && result) return result as GuestUsage;
  // Compatibility before the privacy migration. After migration the RPC also counts private voices.
  if (rpcError && rpcError.code !== 'PGRST202' && rpcError.code !== '42883') throw new Error('Paylaşım hakların kontrol edilemedi.');
  const usage = emptyUsage();
  // Count individual media, including old multi-file memories and all moderation statuses.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabase().from('memory_media')
      .select('id, media_type, memories!inner(wedding_id, guests!inner(session_id))')
      .eq('memories.wedding_id', weddingId).eq('memories.guests.session_id', sessionId)
      .order('id').range(offset, offset + 499);
    if (error) throw new Error('Paylaşım hakların kontrol edilemedi. Bağlantını kontrol edip tekrar dene.');
    for (const row of data || []) {
      if (row.media_type === 'image' || row.media_type === 'video' || row.media_type === 'audio') {
        usage[row.media_type as QuotaKind]++; usage.ids.push(row.id);
      }
    }
    if (!data || data.length < 500) return usage;
  }
}
export async function getOrCreateGuest(weddingId: string, sessionId: string, name: string, anonymous: boolean): Promise<string> {
  if (!sessionId) throw new Error('Misafir bilgilerin hazırlanıyor.');
  const client = getSupabase();
  const { data: existing, error } = await client.from('guests').select('id').eq('wedding_id', weddingId)
    .eq('session_id', sessionId).order('created_at').limit(1).maybeSingle();
  if (error) throw error;
  const values = { display_name: anonymous ? '' : name.trim(), is_anonymous: anonymous };
  if (existing) {
    const { error: updateError } = await client.from('guests').update(values).eq('id', existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }
  const { data, error: insertError } = await client.from('guests').insert({ wedding_id: weddingId, session_id: sessionId, ...values }).select('id').single();
  if (insertError || !data) throw insertError || new Error('Misafir kaydı oluşturulamadı.');
  return data.id;
}
