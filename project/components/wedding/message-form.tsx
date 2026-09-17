'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import { ensureSharingReady } from '@/lib/sharing';
import { getOrCreateGuest } from '@/lib/guest-usage';
import type { Wedding } from '@/lib/types';

const SUGGESTIONS = [
  'Size bir ömür mutluluk diliyorum.',
  'Bugünü hiç unutmayın.',
  'Birbirinize hep bugünkü gibi bakın.',
  'En güzel maceranız şimdi başlıyor.',
];

export function MessageForm({ wedding }: { wedding: Wedding }) {
  const router = useRouter();
  const sessionId = useSessionId();
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const sending = useRef(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (sending.current) return;
    if (!message.trim()) {
      toast.error('Lütfen bir mesaj yaz');
      return;
    }
    sending.current = true; setSaving(true);
    try {
      await ensureSharingReady(wedding.id);
      const supabase = getSupabase();

      const gid = await getOrCreateGuest(wedding.id, sessionId, name, anonymous);

      const { error } = await supabase.from('memories').insert({
        wedding_id: wedding.id,
        guest_id: gid,
        type: 'text',
        caption: '',
        story: message.trim(),
        status: wedding.moderation_enabled ? 'pending' : 'approved',
      });

      if (error) throw error;
      setDone(true);
    } catch (error) {
      toast.error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Mesaj gönderilemedi');
    } finally {
      sending.current = false; setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[80svh] flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-md animate-scale-in text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-9 w-9" />
          </div>
          <h1 className="font-serif text-4xl font-light text-charcoal">Mesajın bize ulaştı.</h1>
          <p className="mt-4 font-serif text-lg text-muted-foreground font-light italic text-balance">
            &quot;Yıllar sonra okuduğumuzda yine aynı sıcaklığı hissedeceğiz.&quot;
          </p>
          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => { setDone(false); setMessage(''); setName(''); }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Başka Bir Anı Bırak
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

  return (
    <div className="px-5 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-light text-charcoal">Bize birkaç kelime bırak</h1>
        <p className="mt-2 text-sm text-muted-foreground font-light">
          Bu mesaj sadece çifte iletilir. Misafir galerisinde ve canlı anı duvarında görünmez.
        </p>

        <p className="mt-4 rounded-xl bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">Yazılı mesaj hakkın sınırsız. Dilediğin kadar mesaj bırakabilirsin; her mesaj en fazla 1.000 karakter.</p>
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

          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal">Mesajın</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Belki bugün söylemeye fırsat bulamadığın bir şey vardır…"
              rows={6}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3.5 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/1000</p>
          </div>

          {/* Quick suggestions */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Hızlı mesaj önerileri:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setMessage(s)}
                  className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-light text-charcoal transition-colors hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !message.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? 'Gönderiliyor...' : 'Mesajı Gönder'}
            {!saving && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
