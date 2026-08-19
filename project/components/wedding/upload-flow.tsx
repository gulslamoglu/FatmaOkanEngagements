'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Video, MessageSquare, Mic, Upload, X, Check, ArrowRight, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import { useUploader } from '@/lib/hooks/use-uploader';
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
  const [guestId, setGuestId] = useState<string | null>(null);

  const uploader = useUploader(wedding.id);

  const handleContinue = async () => {
    if (anonymous || name.trim()) {
      // Create or reuse guest
      const supabase = getSupabase();
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
        .eq('wedding_id', wedding.id)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        setGuestId(existing.id);
        if (name.trim() || anonymous) {
          await supabase.from('guests').update({
            display_name: anonymous ? '' : name.trim(),
            is_anonymous: anonymous,
          }).eq('id', existing.id);
        }
      } else {
        const { data: newGuest } = await supabase.from('guests').insert({
          wedding_id: wedding.id,
          display_name: anonymous ? '' : name.trim(),
          is_anonymous: anonymous,
          session_id: sessionId,
        }).select('id').single();
        if (newGuest) setGuestId(newGuest.id);
      }
      setStep('type');
    } else {
      toast.error('Lütfen adınızı yazın veya anonim seçeneğini işaretleyin');
    }
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
    setSaving(true);
    try {
      const files = await uploader.uploadAll();
      if (files.length === 0) {
        toast.error('Hiç dosya yüklenmedi');
        setSaving(false);
        return;
      }

      const supabase = getSupabase();
      const isVideo = files.some((f) => f.kind === 'video');
      const type = isVideo ? 'video' : 'photo';

      // Create memory
      const { data: memory, error: memErr } = await supabase.from('memories').insert({
        wedding_id: wedding.id,
        guest_id: guestId,
        type,
        caption: caption.trim(),
        story: story.trim(),
        status: wedding.moderation_enabled ? 'pending' : 'approved',
      }).select('id').single();

      if (memErr || !memory) {
        toast.error('Anı kaydedilemedi');
        setSaving(false);
        return;
      }

      // Create media rows
      const mediaRows = files.map((f) => ({
        memory_id: memory.id,
        media_type: f.kind,
        storage_path: f.path,
        thumbnail_path: f.kind === 'image' ? f.path : '',
        file_size: f.file.size,
      }));
      const { error: mediaErr } = await supabase.from('memory_media').insert(mediaRows);
      if (mediaErr) console.error('media insert error', mediaErr);

      setStep('done');
    } catch (e) {
      toast.error('Bir hata oluştu');
    } finally {
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
              disabled={!name.trim() && !anonymous}
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
            Birden fazla dosya seçebilirsin
          </p>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/30 px-6 py-12 text-center transition-all hover:border-primary hover:bg-secondary/50">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="mt-3 text-sm font-medium text-charcoal">Dosyaları seç</span>
            <span className="mt-1 text-xs text-muted-foreground">
              {selectedType === 'video' ? 'MP4, MOV — maks 100MB' : 'JPG, PNG, HEIC, WEBP — maks 15MB'}
            </span>
            <input
              type="file"
              accept={selectedType === 'video' ? 'video/mp4,video/quicktime,.mp4,.mov' : 'image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic'}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploader.addFiles(e.target.files)}
            />
          </label>

          {/* Items list */}
          {uploader.items.length > 0 && (
            <div className="mt-6 space-y-3">
              {uploader.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
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
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
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
              disabled={uploader.uploading}
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
            İstersen bu kareye bir başlık ve hikâye ekle. Zorunlu değil.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal">Başlık (opsiyonel)</label>
              <input
                type="text"
                value={caption}
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
            "Belki biz o anda bunu göremedik ama artık yıllarca saklayacağız."
          </p>

          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => { uploader.reset(); setStory(''); setCaption(''); setStep('type'); }}
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
