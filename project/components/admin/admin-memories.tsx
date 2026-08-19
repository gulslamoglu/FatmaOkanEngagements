'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, X, Trash2, Star, Eye, Download, Play, Mic } from 'lucide-react';
import type { Memory } from '@/lib/types';
import { getMediaUrl } from '@/lib/media-url';

export function AdminMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'photo' | 'video' | 'text' | 'voice'>('all');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Memory | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    let q = supabase.from('memories').select(`*, guests (*), memory_media (*)`).order('created_at', { ascending: false });
    if (filter === 'pending') q = q.eq('status', 'pending');
    else if (filter === 'approved') q = q.eq('status', 'approved');
    else if (filter === 'photo' || filter === 'video' || filter === 'text' || filter === 'voice') q = q.eq('type', filter);
    const { data } = await q.limit(200);
    setMemories((data || []) as unknown as Memory[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('memories').update({ status }).eq('id', id);
    if (error) { toast.error('Güncellenemedi'); return; }
    toast.success(status === 'approved' ? 'Onaylandı' : status === 'rejected' ? 'Reddedildi' : 'Gizlendi');
    load();
  };

  const toggleFeatured = async (m: Memory) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('memories').update({ is_featured: !m.is_featured }).eq('id', m.id);
    if (error) { toast.error('Güncellenemedi'); return; }
    toast.success(!m.is_featured ? 'Öne çıkarıldı' : 'Öne çıkarma kaldırıldı');
    load();
  };

  const handleDelete = async (m: Memory) => {
    if (!confirm('Bu anı silinsin mi?')) return;
    const supabase = getSupabase();
    // Delete media files
    for (const media of m.memory_media || []) {
      if (media.storage_path) {
        await supabase.storage.from('wedding-media').remove([media.storage_path]);
      }
    }
    const { error } = await supabase.from('memories').delete().eq('id', m.id);
    if (error) { toast.error('Silinemedi'); return; }
    toast.success('Silindi');
    load();
  };

  const filters = [
    { key: 'all', label: 'Tümü' },
    { key: 'pending', label: 'Bekleyenler' },
    { key: 'approved', label: 'Onaylı' },
    { key: 'photo', label: 'Fotoğraf' },
    { key: 'video', label: 'Video' },
    { key: 'text', label: 'Mesaj' },
    { key: 'voice', label: 'Ses' },
  ] as const;

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-serif text-3xl font-light text-charcoal">Anılar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tüm yüklenen içerikleri yönet</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : memories.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">Henüz anı yok.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {memories.map((m) => {
            const media = m.memory_media?.[0];
            const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
            return (
              <div key={m.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-square bg-muted" onClick={() => setPreview(m)}>
                  {url && media?.media_type === 'video' ? (
                    <video src={url} muted playsInline preload="metadata" className="h-full w-full cursor-pointer object-cover" />
                  ) : url && media?.media_type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full cursor-pointer object-cover" />
                  ) : m.type === 'voice' ? (
                    <div className="flex h-full cursor-pointer items-center justify-center bg-secondary">
                      <Mic className="h-8 w-8 text-primary" />
                    </div>
                  ) : (
                    <div className="flex h-full cursor-pointer items-center justify-center p-4 text-center">
                      <p className="font-serif text-xs text-muted-foreground italic line-clamp-4">"{m.story}"</p>
                    </div>
                  )}
                  {m.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="h-8 w-8 text-white/90" fill="currentColor" />
                    </div>
                  )}
                  {m.status === 'pending' && (
                    <div className="absolute left-1.5 top-1.5 rounded-full bg-gold/90 px-2 py-0.5 text-[10px] font-medium text-charcoal">Bekliyor</div>
                  )}
                  {m.is_featured && (
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-primary/90 p-1">
                      <Star className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">
                    {m.guests?.display_name || 'Anonim'} · {m.type}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.status !== 'approved' && (
                      <button onClick={() => updateStatus(m.id, 'approved')} className="rounded-lg bg-green-100 p-1.5 text-green-700 hover:bg-green-200" title="Onayla">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {m.status !== 'rejected' && (
                      <button onClick={() => updateStatus(m.id, 'rejected')} className="rounded-lg bg-orange-100 p-1.5 text-orange-700 hover:bg-orange-200" title="Reddet">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => toggleFeatured(m)} className={`rounded-lg p-1.5 ${m.is_featured ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'}`} title="Öne çıkar">
                      <Star className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setPreview(m)} className="rounded-lg bg-secondary p-1.5 text-muted-foreground hover:bg-muted" title="Görüntüle">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(m)} className="rounded-lg bg-red-100 p-1.5 text-red-700 hover:bg-red-200" title="Sil">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <div className="relative max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute right-2 top-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
            {preview.memory_media?.[0]?.storage_path && preview.type !== 'text' && preview.type !== 'voice' && (
              preview.memory_media[0].media_type === 'video' ? (
                <video src={getMediaUrl(preview.memory_media[0].storage_path)} controls playsInline className="max-h-[80svh] max-w-full rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getMediaUrl(preview.memory_media[0].storage_path)} alt="" className="max-h-[80svh] max-w-full rounded-lg object-contain" />
              )
            )}
            {preview.type === 'voice' && preview.memory_media?.[0]?.storage_path && (
              <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-8">
                <Mic className="h-12 w-12 text-primary" />
                <audio src={getMediaUrl(preview.memory_media[0].storage_path)} controls preload="metadata" />
              </div>
            )}
            {preview.type === 'text' && (
              <div className="max-w-lg rounded-lg bg-card p-8 text-center">
                <p className="font-serif text-xl text-charcoal italic">"{preview.story}"</p>
              </div>
            )}
            <div className="mt-4 rounded-lg bg-card p-4">
              {preview.caption && <p className="font-serif text-lg text-charcoal">{preview.caption}</p>}
              {preview.story && preview.type !== 'text' && <p className="mt-1 text-sm text-muted-foreground italic">"{preview.story}"</p>}
              <p className="mt-2 text-xs text-muted-foreground">{preview.guests?.display_name || 'Anonim'} · {new Date(preview.created_at).toLocaleString('tr-TR')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
