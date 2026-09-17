'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Video, MessageSquare, Mic, Upload, X, Check, ArrowRight, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import { useUploader } from '@/lib/hooks/use-uploader';
import { ensureSharingReady, PUBLIC_SUBMISSION_VERSION } from '@/lib/sharing';
import { GuestAllowance } from '@/components/wedding/guest-allowance';
import { useGuestUsage } from '@/lib/hooks/use-guest-usage';
import { getGuestUsage, getOrCreateGuest } from '@/lib/guest-usage';
import { checkAllowance } from '@/lib/guest-limits';
import type { Wedding } from '@/lib/types';

type Step = 'name' | 'type' | 'upload' | 'story' | 'done';
type SelectedType = 'photo' | 'video' | 'text' | 'voice';

interface Props {
  wedding: Wedding;
}

export function UploadFlow({ wedding }: Props) {
  const router = useRouter();
  const sessionId = useSessionId();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [selectedType, setSelectedType] = useState<SelectedType | null>(null);
  const [story, setStory] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const selectionLock = useRef(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  const quota = useGuestUsage(wedding.id, sessionId);
  const guestLock = useRef(false);
  const saveLock = useRef(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const uploader = useUploader(wedding.id);

  const handleContinue = async () => {
    if (guestLock.current || !sessionId) return;
    if (!anonymous && !name.trim()) { toast.error('Lütfen adını yaz veya anonim seçeneğini işaretle.'); return; }
    guestLock.current = true; setGuestLoading(true);
    try {
      setGuestId(await getOrCreateGuest(wedding.id, sessionId, name, anonymous));
      setStep('type');
    } catch { toast.error('Misafir kaydı oluşturulamadı. Lütfen tekrar dene.'); }
    finally { guestLock.current = false; setGuestLoading(false); }
  };

  const handleTypeSelect = (t: SelectedType) => {
    setSelectedType(t);
    if (t === 'text') {
      router.push(`/w/${wedding.slug}/messages`);
      return;
    }
    if (t === 'voice') {
      router.push(`/w/${wedding.slug}/voice`);
      return;
    }
    setStep('upload');
  };

  const handleUploadComplete = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
      if (!guestId) throw new Error('Misafir kaydı bulunamadı. Sayfayı yenileyip tekrar dene.');
      await ensureSharingReady(wedding.id);
      const usage = await getGuestUsage(wedding.id, sessionId);
      checkAllowance(usage, uploader.items.map(item => ({ id: item.id, kind: item.kind })));
      const files = await uploader.uploadAll();
      if (files.length === 0) {
        toast.error('Hiç dosya yüklenmedi');
        setSaving(false);
        return;
      }

      const supabase = getSupabase();
      const { error: submitError } = await supabase.rpc('submit_media_memories', {
        event_id: wedding.id, guest_session: sessionId, consent_version: PUBLIC_SUBMISSION_VERSION,
        submissions: files.map(file => ({ id:file.id, kind:file.kind, path:file.path, thumbnailPath:file.thumbnailPath,
          fileSize:file.file.size, caption:caption.trim(), story:story.trim() })),
      });
      if (submitError) throw submitError;

      await quota.refresh();
      setStep('done');
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Bilinmeyen hata';
      toast.error(`Anı yüklenemedi: ${message}`);
      void quota.refresh();
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  // Name step
  if (step === 'name') {
    return (
      <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-light text-charcoal">Bu anı kim bırakıyor?</h1>
            <p className="mt-3 text-sm text-muted-foreground font-light">
              Adını yaz ya da anonim kal. İkisi de güzel.
            </p>
          </div>

          <GuestAllowance {...quota} onRetry={() => { void quota.refresh(); }} />
          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">Adın / İsimleriniz</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn. Zeynep & Can"
                  disabled={anonymous}
                  className="w-full rounded-xl border border-input bg-card px-10 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-40"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-medium text-charcoal">Anonim bırakmak istiyorum</span>
            </label>

            <button
              onClick={handleContinue}
              disabled={guestLoading || !sessionId || (!name.trim() && !anonymous)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              Devam Et
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Type select step
  if (step === 'type') {
    const types: { key: SelectedType; icon: React.ReactNode; label: string; desc: string }[] = [
      { key: 'photo', icon: <Camera className="h-7 w-7" />, label: 'Fotoğraf', desc: 'Telefonundan fotoğraf seç' },
      { key: 'video', icon: <Video className="h-7 w-7" />, label: 'Video', desc: 'Çektiğin videoları paylaş' },
      { key: 'text', icon: <MessageSquare className="h-7 w-7" />, label: 'Yazılı Mesaj', desc: 'Birkaç güzel kelime' },
      { key: 'voice', icon: <Mic className="h-7 w-7" />, label: 'Sesli Mesaj', desc: 'Sesini kaydet' },
    ];
    return (
      <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <h1 className="text-center font-serif text-3xl font-light text-charcoal">Ne bırakmak istersin?</h1>
          <p className="mt-3 text-center text-sm text-muted-foreground font-light">
            Bir ya da birkaçını seçebilirsin
          </p>
          <GuestAllowance {...quota} onRetry={() => { void quota.refresh(); }} />
          <div className="mt-8 grid grid-cols-2 gap-4">
            {types.map((t, i) => (
              <button
                key={t.key}
                onClick={() => handleTypeSelect(t.key)}
                className="group flex animate-fade-up flex-col items-center rounded-2xl border border-border bg-card p-6 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {t.icon}
                </div>
                <span className="mt-4 font-serif text-xl font-light text-charcoal">{t.label}</span>
                <span className="mt-1 text-xs text-muted-foreground font-light">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Upload step
  if (step === 'upload') {
    return (
      <div className="px-5 py-8">
        <div className="mx-auto max-w-lg">
          <h1 className="font-serif text-3xl font-light text-charcoal">
            {selectedType === 'video' ? 'Videolarını ekle' : 'Fotoğraflarını ekle'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-light">
            Bir gönderimde 5 fotoğraf veya 1 video paylaşabilirsin.
          </p>

          <GuestAllowance {...quota} onRetry={() => { void quota.refresh(); }} />
          <p className="mt-4 text-xs leading-6 text-muted-foreground">Galeri seçicisi açılır; yalnızca seçtiğin dosyalara erişebiliriz. Gönder düğmesine basana kadar dosyaların yüklenmez.</p>
          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/30 px-6 py-12 text-center transition-all hover:border-primary hover:bg-secondary/50">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="mt-3 text-sm font-medium text-charcoal">Galeriden dosya seç</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {selectedType === 'video' ? 'MP4, WebM veya MOV — maks 50 MB' : 'JPG, PNG veya WebP — maks 15 MB'}
            </span>
            <input
              type="file"
              accept={selectedType === 'video' ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov' : 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'}
              multiple={selectedType !== 'video'}
              className="hidden"
              disabled={selecting}
              onChange={async (event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = '';
                if (!files.length || selectionLock.current) return;
                selectionLock.current = true; setSelecting(true);
                try {
                  // Snapshot files before awaiting the focus-triggered request; never discard them just because it is loading.
                  const usage = await quota.refresh();
                  if (!usage) { toast.error('Hakların kontrol edilemedi. Bağlantını kontrol edip dosyaları yeniden seç.'); return; }
                  const kind = selectedType === 'video' ? 'video' : 'image';
                  const limit = kind === 'video' ? 5 : 20;
                  const pendingCount = uploader.items.filter(item => item.kind === kind && !usage.ids.includes(item.id)).length;
                  const available = Math.max(0, limit - usage[kind] - pendingCount);
                  if (files.length > available) toast.error('En fazla ' + available + ' dosya daha seçebilirsin.');
                  uploader.addFiles(files.slice(0, available)); 
                } finally { selectionLock.current = false; setSelecting(false); }
              }}
            />
          </label>

          {selecting && <p role="status" className="mt-3 text-sm text-muted-foreground">Seçtiğin dosyalar hazırlanıyor…</p>}
          {/* Items list */}
          {uploader.items.length > 0 && (
            <div className="mt-6 space-y-3">
              {uploader.items.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-charcoal">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    {item.status === 'uploading' && (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: '65%' }} />
                      </div>
                    )}
                    {item.status === 'done' && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" /> Yüklendi</p>
                    )}
                  </div>
                  {item.status !== 'uploading' && (
                    <button onClick={() => uploader.removeItem(i)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {uploader.uploading && (
                <p className="text-center text-xs text-muted-foreground">
                  {uploader.completedCount} / {uploader.total} anı yüklendi
                </p>
              )}
            </div>
          )}

          {uploader.items.length > 0 && (
            <button
              onClick={() => setStep('story')}
              disabled={uploader.uploading || selecting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            >
              Devam Et
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Story step
  if (step === 'story') {
    return (
      <div className="px-5 py-8">
        <div className="mx-auto max-w-lg">
          <h1 className="font-serif text-3xl font-light text-charcoal">Bu anın hikâyesi</h1>
          <p className="mt-2 text-sm text-muted-foreground font-light">
            İstersen bu kareye bir başlık ve hikâye ekle. Bunlar fotoğrafınla birlikte galeride görünür. Çifte özel bir şey yazmak için Yazılı Mesaj alanını kullan.
          </p>

          <GuestAllowance {...quota} onRetry={() => { void quota.refresh(); }} />
          <div className="mt-6 space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">Fotoğraflar paylaşım için küçültülür; orijinaller telefonunda kalır. Videolar sıkıştırılmaz. Yükleme bitene kadar bu sayfayı açık tut.</p>
            <div aria-live="polite" className="space-y-2">{uploader.items.map(item => <p key={item.id} className="break-words text-xs text-muted-foreground">{item.file.name}: {item.status === 'done' ? 'Yüklendi' : item.status === 'error' ? item.error : item.status === 'uploading' ? 'Yükleniyor…' : 'Hazır'}</p>)}</div>
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">Başlık (opsiyonel)</label>
              <input
                type="text"
                value={caption}
                maxLength={240}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Örn. Pasta kesimi"
                className="w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">Hikâye (opsiyonel)</label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Bu kare çekilirken ne oluyordu?"
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{story.length}/500</p>
            </div>


            <button type="button" disabled={saving} onClick={() => setStep('upload')} className="w-full rounded-full border border-border bg-card px-6 py-3 text-sm text-charcoal disabled:opacity-40">Seçtiğim dosyaları düzenle</button>

            <button
              onClick={handleUploadComplete}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Yükleniyor...' : 'Anıyı Gönder'}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done step
  if (step === 'done') {
    return (
      <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md animate-scale-in text-center">
          <div className="relative mx-auto mb-8 h-20 w-20">
            <div className="absolute inset-0 animate-sparkle rounded-full bg-primary/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-9 w-9" />
            </div>
          </div>
          <h1 className="font-serif text-4xl font-light text-charcoal">Anın bizimle.</h1>
          <p className="mt-4 font-serif text-lg text-muted-foreground font-light italic text-balance">
            &quot;Belki biz o anda bunu göremedik ama artık yıllarca saklayacağız.&quot;
          </p>

          <GuestAllowance {...quota} onRetry={() => { void quota.refresh(); }} />
          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => { uploader.reset();  setStory(''); setCaption(''); setStep('type'); }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              Başka Bir Anı Ekle
            </button>
            <button
              onClick={() => router.push(`/w/${wedding.slug}/gallery`)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-medium text-charcoal transition-all hover:bg-secondary active:scale-[0.98]"
            >
              Galeriye Git
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
