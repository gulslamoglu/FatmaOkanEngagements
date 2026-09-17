'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Camera, Video, MessageSquare, Mic, Users, HardDrive, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getMediaUrl } from '@/lib/media-url';
import { ReliableImage, ReliableVideo } from '@/components/media/reliable-media';

export function AdminDashboard() {
  const [stats, setStats] = useState({ photos: 0, videos: 0, messages: 0, voices: 0, guests: 0, storage: 0, pending: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const supabase = getSupabase();
    const [p, v, m, vc, g, pend, recentData] = await Promise.all([
      supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('media_type', 'image'),
      supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('media_type', 'video'),
      supabase.from('memories').select('id', { count: 'exact', head: true }).eq('type', 'text'),
      supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('media_type', 'audio'),
      supabase.from('guests').select('id', { count: 'exact', head: true }),
      supabase.from('memories').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('memories').select(`*, guests (*), memory_media (*)`).order('created_at', { ascending: false }).limit(8),
    ]);

    // Storage
    let storageBytes = 0;
    // Approximate via media file_size sum
    for(let offset=0; ; offset+=500) {
      const {data:mediaSizes,error} = await supabase.from('memory_media').select('file_size').order('id').range(offset,offset+499);
      if(error) break;
      storageBytes += (mediaSizes || []).reduce((sum,row)=>sum+(row.file_size || 0),0);
      if(!mediaSizes || mediaSizes.length<500) break;
    }

    setStats({
      photos: p.count || 0,
      videos: v.count || 0,
      messages: m.count || 0,
      voices: vc.count || 0,
      guests: g.count || 0,
      storage: storageBytes,
      pending: pend.count || 0,
    });
    setRecent(recentData.data || []);
    setLoading(false);
  };

  const formatStorage = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const cards = [
    { label: 'Fotoğraflar', value: stats.photos, icon: Camera },
    { label: 'Videolar', value: stats.videos, icon: Video },
    { label: 'Mesajlar', value: stats.messages, icon: MessageSquare },
    { label: 'Sesli', value: stats.voices, icon: Mic },
    { label: 'Katılımcı', value: stats.guests, icon: Users },
    { label: 'Kayıtlı medya (yaklaşık)', value: formatStorage(stats.storage), icon: HardDrive },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-serif text-3xl font-light text-charcoal">Genel Bakış</h1>
      <p className="mt-1 text-sm text-muted-foreground">Düğün anılarınızın özeti</p>

      {stats.pending > 0 && (
        <Link href="/admin/memories" className="mt-4 flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 p-4 transition-colors hover:bg-gold/15">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">{stats.pending}</div>
          <p className="text-sm font-medium text-charcoal">Onay bekleyen anı var</p>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="font-serif text-2xl font-light text-charcoal">{c.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-serif text-xl font-light text-charcoal">Son Yüklenenler</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz anı yüklenmedi.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((m) => {
              const media = m.memory_media?.[0];
              const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
              return (
                <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                  {url && media?.media_type === 'video' ? (
                    <ReliableVideo src={url} className="h-full w-full" mediaClassName="object-cover" />
                  ) : url && media?.media_type === 'image' ? (
                    <ReliableImage src={url} alt={m.caption || 'Anı'} className="h-full w-full" mediaClassName="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-4 text-center">
                      <p className="font-serif text-xs text-muted-foreground italic line-clamp-4">&quot;{m.story || m.caption}&quot;</p>
                    </div>
                  )}
                  {m.status === 'pending' && (
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-gold/90 px-2 py-0.5 text-[10px] font-medium text-charcoal">Bekliyor</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
