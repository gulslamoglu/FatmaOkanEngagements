'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Play, Pause, RefreshCw, ArrowRight, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import type { Wedding } from '@/lib/types';

const MAX_SECONDS = 120;

function getSupportedAudioMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function VoiceRecorder({ wedding }: { wedding: Wedding }) {
  const router = useRouter();
  const sessionId = useSessionId();
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [permission, setPermission] = useState<'idle' | 'granted' | 'denied'>('idle');

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    return () => { stopStream(); stopTimer(); };
  }, [stopStream, stopTimer]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission('granted');
      const preferredMimeType = getSupportedAudioMimeType();
      const mr = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const actualMimeType = mr.mimeType || chunksRef.current[0]?.type || preferredMimeType || 'audio/webm';
        const b = new Blob(chunksRef.current, { type: actualMimeType });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        stopStream();
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS; }
          return e + 1;
        });
      }, 1000);
    } catch {
      setPermission('denied');
      toast.error('Mikrofon izni reddedildi');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    setRecording(false);
    stopTimer();
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        toast.error('Bu tarayıcı kayıt biçimini oynatamıyor. Lütfen farklı bir tarayıcı deneyin.');
      }
    }
  };

  const reset = () => {
    setBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setElapsed(0);
  };

  const handleSend = async () => {
    if (!blob) return;
    setSaving(true);
    try {
      const supabase = getSupabase();
      const { data: existing } = await supabase
        .from('guests')
        .select('id')
        .eq('wedding_id', wedding.id)
        .eq('session_id', sessionId)
        .maybeSingle();

      let gid = existing?.id || null;
      if (!gid) {
        const { data: g } = await supabase.from('guests').insert({
          wedding_id: wedding.id,
          display_name: anonymous ? '' : name.trim(),
          is_anonymous: anonymous,
          session_id: sessionId,
        }).select('id').single();
        gid = g?.id || null;
      }

      const contentType = blob.type || 'audio/webm';
      const extension = contentType.includes('mp4') ? 'm4a' : 'webm';
      const path = `${wedding.id}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${crypto.randomUUID()}.${extension}`;
      const { error: upErr } = await supabase.storage.from('wedding-media').upload(path, blob, { contentType });
      if (upErr) throw upErr;

      const { data: memory, error: memErr } = await supabase.from('memories').insert({
        wedding_id: wedding.id,
        guest_id: gid,
        type: 'voice',
        caption: anonymous ? '' : name.trim(),
        story: '',
        status: wedding.moderation_enabled ? 'pending' : 'approved',
      }).select('id').single();

      if (memErr || !memory) throw memErr || new Error('Anı kaydı oluşturulamadı');

      // Insert media row
      const { error: mediaErr } = await supabase.from('memory_media').insert({
          memory_id: memory.id,
          media_type: 'audio',
          storage_path: path,
          thumbnail_path: '',
          duration: elapsed,
          file_size: blob.size,
        });
      if (mediaErr) throw mediaErr;

      setDone(true);
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Bilinmeyen hata';
      toast.error(`Sesli mesaj gönderilemedi: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md animate-scale-in text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-9 w-9" />
          </div>
          <h1 className="font-serif text-4xl font-light text-charcoal">Sesin bizimle.</h1>
          <p className="mt-4 font-serif text-lg text-muted-foreground font-light italic">
            "Yıllar sonra bile sesini duyabileceğiz."
          </p>
          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => { setDone(false); reset(); }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              <Mic className="h-4 w-4" /> Başka Bir Ses Kaydet
            </button>
            <button
              onClick={() => router.push(`/w/${wedding.slug}/gallery`)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-medium text-charcoal transition-all hover:bg-secondary"
            >
              Galeriye Git <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="px-5 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-light text-charcoal">Sesini Bırak</h1>
        <p className="mt-2 text-sm text-muted-foreground font-light">
          Bize kısa bir sesli mesaj kaydet. En fazla 2 dakika.
        </p>

        {/* Name */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal">Adın (opsiyonel)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adın"
              disabled={anonymous}
              className="w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-40"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-sm font-medium text-charcoal">Anonim bırakmak istiyorum</span>
          </label>
        </div>

        {/* Recorder */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          {!audioUrl && !recording && (
            <>
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Kayda başlamak için dokun</p>
              {permission === 'denied' && (
                <p className="mt-2 text-xs text-destructive">Mikrofon izni reddedildi. Tarayıcı ayarlarından izin vermen gerekiyor.</p>
              )}
              <button
                onClick={startRecording}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Mic className="h-5 w-5" /> Kayda Başla
              </button>
            </>
          )}

          {recording && (
            <>
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 animate-pulse">
                <Mic className="h-10 w-10 text-destructive" />
              </div>
              <p className="font-serif text-3xl font-light text-charcoal tabular-nums">{timeStr}</p>
              <p className="mt-1 text-xs text-muted-foreground">Kaydediliyor...</p>
              <button
                onClick={stopRecording}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-destructive px-8 py-4 text-sm font-medium text-destructive-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Square className="h-5 w-5" /> Durdur
              </button>
            </>
          )}

          {audioUrl && !recording && (
            <>
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-10 w-10 text-primary" />
              </div>
              <p className="font-serif text-2xl font-light text-charcoal">{timeStr}</p>
              <p className="mt-1 text-xs text-muted-foreground">Kayıt tamamlandı</p>
              <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />

              <div className="mt-6 flex items-center justify-center gap-3">
                <button onClick={togglePlay} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? 'Duraklat' : 'Dinle'}
                </button>
                <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-charcoal transition-all hover:bg-secondary">
                  <RefreshCw className="h-4 w-4" /> Yeniden
                </button>
              </div>
            </>
          )}
        </div>

        {audioUrl && (
          <button
            onClick={handleSend}
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Gönderiliyor...' : 'Sesli Mesajı Gönder'}
            {!saving && <ArrowRight className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
