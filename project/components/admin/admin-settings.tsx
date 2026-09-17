'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Save, QrCode, Download, Loader2, Link as LinkIcon, Copy, Upload } from 'lucide-react';
import type { Wedding } from '@/lib/types';
import { EventGuideEditor } from '@/components/admin/event-guide-editor';
import { CoverPositionEditor } from '@/components/admin/cover-position-editor';
import { engagementLocation } from '@/lib/event-guide';
import { coverPosition } from '@/lib/cover-position';

export function AdminSettings() {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const saveLock = useRef(false);
  const coverLock = useRef(false);
  const previousCoverPosition = useRef(wedding?.cover_position);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  useEffect(() => {
    if (!coverFile) { setCoverPreview(''); return; }
    const url = URL.createObjectURL(coverFile); setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from('weddings').select('*').eq('slug', 'fatma-okan').maybeSingle();
    if (data) {
      if (data.slug==='fatma-okan' && (!data.location || data.location.trim().toLocaleLowerCase('tr')==='istanbul')) data.location=engagementLocation;
      setWedding(data as Wedding);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!wedding || saveLock.current || coverLock.current || coverFile) return;
    saveLock.current = true; setSaving(true);
    try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı');
    const { error } = await supabase.from('weddings').update({
      user_id: user.id,
      bride_name: wedding.bride_name,
      groom_name: wedding.groom_name,
      wedding_date: wedding.wedding_date,
      location: wedding.location,
      welcome_message: wedding.welcome_message,
      cover_image_url: wedding.cover_image_url,
      cover_position: coverPosition(wedding.cover_position),
      accent_color: wedding.accent_color,
      gallery_enabled: wedding.gallery_enabled,
      moderation_enabled: wedding.moderation_enabled,
      live_wall_enabled: wedding.live_wall_enabled,
    }).eq('id', wedding.id).select('id').single();
    if (error) throw error;
    toast.success('Ayarlar kaydedildi');
    } catch(error) { toast.error('Kaydedilemedi: ' + getErrorMessage(error)); }
    finally { saveLock.current = false; setSaving(false); }
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file || !wedding || coverLock.current || saveLock.current) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seçin');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kapak fotoğrafı en fazla 10 MB olabilir');
      return;
    }

    coverLock.current = true; setUploadingCover(true);
    const supabase = getSupabase();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${wedding.id}/covers/${crypto.randomUUID()}.${extension}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { error: uploadError } = await supabase.storage
        .from('wedding-media')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('wedding-media').getPublicUrl(path);
      const coverImageUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from('weddings')
        .update({ cover_image_url: coverImageUrl, cover_position: coverPosition(wedding.cover_position), user_id: user.id })
        .eq('id', wedding.id)
        .select('id')
        .single();
      if (updateError) throw updateError;

      setWedding(current => current ? { ...current, cover_image_url: coverImageUrl } : current);
      setCoverFile(null);
      toast.success('Kapak fotoğrafı yüklendi');
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`Kapak fotoğrafı yüklenemedi: ${message}`);
    } finally {
      coverLock.current = false; setUploadingCover(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const supabase = getSupabase();
      const memories: import('@/lib/types').Memory[] = [];
      for(let offset=0; ; offset+=500) {
        const {data,error} = await supabase.from('memories').select('*, guests (*), memory_media (*)').order('created_at', {ascending:false}).order('id').range(offset,offset+499);
        if(error) throw error;
        memories.push(...(data || []) as unknown as import('@/lib/types').Memory[]);
        if(!data || data.length<500) break;
      }

      if (!memories || memories.length === 0) {
        toast.error('İndirilecek anı yok');
        setDownloading(false);
        return;
      }

      // Download all media files
      const photos: { name: string; blob: Blob }[] = [];
      const videos: { name: string; blob: Blob }[] = [];
      const voices: { name: string; blob: Blob }[] = [];
      const messages: { name: string; content: string }[] = [];

      let photoIdx = 1, videoIdx = 1, voiceIdx = 1;

      for (const m of memories) {
        const guestName = m.guests?.display_name || 'Anonim';
        const date = new Date(m.created_at).toISOString().split('T')[0];

        if (m.type === 'text') {
          messages.push({
            name: `message_${messages.length + 1}_${guestName}.txt`,
            content: `Misafir: ${guestName}\nTarih: ${new Date(m.created_at).toLocaleString('tr-TR')}\n\n${m.story}\n`,
          });
          continue;
        }

        for (const media of (m as any).memory_media || []) {
          if (!media.storage_path) continue;
          const { data: blob } = await supabase.storage.from('wedding-media').download(media.storage_path);
          if (!blob) throw new Error('Bir dosya indirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
          const ext = media.storage_path.split('.').pop() || 'bin';
          if (media.media_type === 'image') {
            photos.push({ name: `photo_${photoIdx++}_${date}.${ext}`, blob });
          } else if (media.media_type === 'video') {
            videos.push({ name: `video_${videoIdx++}_${date}.${ext}`, blob });
          } else if (media.media_type === 'audio') {
            voices.push({ name: `voice_${voiceIdx++}_${date}.${ext}`, blob });
          }
        }
      }

      // Create messages JSON
      const messagesJson = JSON.stringify(messages.map((m, i) => ({
        id: i + 1,
        name: m.name.replace('.txt', ''),
        content: m.content,
      })), null, 2);

      // Build a simple manifest and download everything individually
      // (Browser-based ZIP would need a library; we download files individually)
      const allFiles = [
        ...photos.map(p => ({ ...p, folder: 'Photos' })),
        ...videos.map(v => ({ ...v, folder: 'Videos' })),
        ...voices.map(v => ({ ...v, folder: 'Voice-Messages' })),
      ];

      for (const f of allFiles) {
        const url = URL.createObjectURL(f.blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `Wedding-Memories/${f.folder}/${f.name}`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 200));
      }

      // Download messages JSON
      const jsonBlob = new Blob([messagesJson], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const ja = window.document.createElement('a');
      ja.href = jsonUrl;
      ja.download = 'Wedding-Memories/Messages/messages.json';
      ja.click();
      URL.revokeObjectURL(jsonUrl);

      toast.success(`${allFiles.length} dosya ve ${messages.length} mesaj indiriliyor`);
    } catch {
      toast.error('İndirme sırasında hata oluştu');
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = () => {
    if (!wedding) return;
    const url = `${window.location.origin}/w/${wedding.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link kopyalandı');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!wedding) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Düğün bulunamadı.</div>;
  }

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/w/${wedding.slug}`;

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-serif text-3xl font-light text-charcoal">Ayarlar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Düğün sayfanızı ve özellikleri yönetin</p>

      <div className="mt-8 space-y-8">
        {/* Wedding Info */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-light text-charcoal mb-4">Düğün Bilgileri</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Gelin Adı" value={wedding.bride_name} onChange={(v) => setWedding({ ...wedding, bride_name: v })} />
            <Field label="Damat Adı" value={wedding.groom_name} onChange={(v) => setWedding({ ...wedding, groom_name: v })} />
            <Field label="Tarih" type="date" value={wedding.wedding_date || ''} onChange={(v) => setWedding({ ...wedding, wedding_date: v })} />
            <Field label="Lokasyon" value={wedding.location} onChange={(v) => setWedding({ ...wedding, location: v })} />
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-charcoal">Karşılama Mesajı</label>
              <textarea
                value={wedding.welcome_message}
                onChange={(e) => setWedding({ ...wedding, welcome_message: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-charcoal">Kapak Fotoğrafı</label>
              {(coverPreview || wedding.cover_image_url) && <CoverPositionEditor src={coverPreview || wedding.cover_image_url} value={wedding.cover_position} disabled={uploadingCover || saving} onChange={position=>setWedding({...wedding,cover_position:position})} />}
              {coverFile && <div className="mb-4 flex flex-wrap items-center gap-3"><button type="button" disabled={uploadingCover || saving} onClick={()=>void handleCoverUpload(coverFile)} className="rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground disabled:opacity-50">{uploadingCover?'Yükleniyor…':'Bu kapak ve konumu kaydet'}</button><button type="button" disabled={uploadingCover} onClick={()=>{setCoverFile(null);setWedding({...wedding,cover_position:previousCoverPosition.current});}} className="text-sm text-muted-foreground">Seçimi iptal et</button><p className="w-full text-xs text-muted-foreground">Yeni fotoğraf henüz yüklenmedi. Konumunu ayarlayıp kaydet.</p></div>}
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-secondary ${uploadingCover ? 'pointer-events-none opacity-50' : ''}`}>
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingCover ? 'Yükleniyor...' : 'Kapak fotoğrafı yükle'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  disabled={uploadingCover}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || !file.size) toast.error('JPG, PNG, WebP veya AVIF seçin.');
                      else if (file.size > 10 * 1024 * 1024) toast.error('Kapak fotoğrafı en fazla 10 MB olabilir.');
                      else { if(!coverFile) previousCoverPosition.current=wedding.cover_position; setCoverPreview(''); setCoverFile(file); setWedding({...wedding,cover_position:{x:50,y:50}}); }
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP veya AVIF · En fazla 10 MB</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">Vurgu Rengi</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={wedding.accent_color}
                  onChange={(e) => setWedding({ ...wedding, accent_color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-input"
                />
                <input
                  type="text"
                  value={wedding.accent_color}
                  onChange={(e) => setWedding({ ...wedding, accent_color: e.target.value })}
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || uploadingCover || !!coverFile}
            className="mt-5 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </section>

        <EventGuideEditor key={wedding.id} wedding={wedding} />

        {/* Feature Toggles */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-light text-charcoal mb-4">Özellikler</h2>
          <div className="space-y-4">
            <Toggle
              label="Galeri"
              desc="Misafirler anıları görebilsin"
              checked={wedding.gallery_enabled}
              onChange={(v) => setWedding({ ...wedding, gallery_enabled: v })}
            />
            <Toggle
              label="Moderasyon"
              desc="Yüklenen içerikler onaydan sonra yayınlansın"
              checked={wedding.moderation_enabled}
              onChange={(v) => setWedding({ ...wedding, moderation_enabled: v })}
            />
            <Toggle
              label="Canlı Anı Duvarı"
              desc="/live sayfası aktif olsun"
              checked={wedding.live_wall_enabled}
              onChange={(v) => setWedding({ ...wedding, live_wall_enabled: v })}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || uploadingCover || !!coverFile}
            className="mt-5 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </section>

        {/* QR Code & Public Link */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-light text-charcoal mb-1">QR Kod & Davet Linki</h2>
          <p className="text-sm text-muted-foreground mb-4">Bu linki/QR kodu davetiyeye ekleyin</p>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-charcoal outline-none"
            />
            <button onClick={copyLink} className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-charcoal">
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="rounded-2xl border border-border bg-white p-6">
              <QrCodeDisplay url={publicUrl} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => downloadQR(publicUrl, 'png')}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-secondary"
              >
                <Download className="h-4 w-4" /> PNG İndir
              </button>
              <button
                onClick={() => downloadQR(publicUrl, 'svg')}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-secondary"
              >
                <Download className="h-4 w-4" /> SVG İndir
              </button>
            </div>
          </div>
        </section>

        {/* Download All */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-light text-charcoal mb-1">Tüm Anıları İndir</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tüm fotoğraf, video, ses ve mesajları bilgisayarınıza indirin
          </p>
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? 'Hazırlanıyor...' : 'Tümünü İndir'}
          </button>
        </section>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'error', 'details', 'hint']) {
      if (typeof value[key] === 'string' && value[key]) return value[key] as string;
    }
  }
  return 'Sunucu ayrıntı vermedi';
}

function Field({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-charcoal">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

function Toggle({
  label, desc, checked, onChange,
}: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-charcoal">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}

function QrCodeDisplay({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}&color=333333&bgcolor=ffffff&margin=0`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={qrUrl} alt="QR Code" width={240} height={240} className="rounded-lg" />
  );
}

async function downloadQR(url: string, format: 'png' | 'svg') {
  if (format === 'png') {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}&color=333333&bgcolor=ffffff&margin=0`;
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wedding-qr.png';
    a.click();
    URL.revokeObjectURL(a.href);
  } else {
    // SVG: generate a simple QR via the API in SVG format
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}&color=333333&bgcolor=ffffff&margin=0&format=svg`;
    const res = await fetch(qrUrl);
    const text = await res.text();
    const blob = new Blob([text], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wedding-qr.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
