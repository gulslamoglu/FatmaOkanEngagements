'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import { getOrCreateGuest } from '@/lib/guest-usage';
import type { Wedding } from '@/lib/types';

type Attendance = 'attending' | 'not_attending' | 'maybe';

const attendanceOptions: { value: Attendance; label: string; description: string }[] = [
  { value: 'attending', label: 'Katılacağım', description: 'Bu güzel günü birlikte kutlayalım.' },
  { value: 'not_attending', label: 'Katılamayacağım', description: 'Yine de iyi dileklerim sizinle.' },
  { value: 'maybe', label: 'Henüz emin değilim', description: 'Kesinleşince tekrar haber vereceğim.' },
];

export function RsvpForm({ wedding, embedded = false }: { wedding: Wedding; embedded?: boolean }) {
  const sessionId = useSessionId();
  const [name, setName] = useState('');
  const [attendance, setAttendance] = useState<Attendance>('attending');
  const [guestCount, setGuestCount] = useState(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const sending = useRef(false);

  const handleSubmit = async () => {
    if (sending.current) return;
    if (!sessionId || !name.trim()) { toast.error('Lütfen adını ve soyadını yaz'); return; }
    sending.current = true;
    setSaving(true);
    try {
      await getOrCreateGuest(wedding.id, sessionId, name, false);
      const { error } = await getSupabase().rpc('submit_rsvp', {
        event_id: wedding.id,
        guest_session: sessionId,
        guest_name_input: name,
        attendance_input: attendance,
        guest_count_input: attendance === 'attending' ? guestCount : 0,
        note_input: note,
      });
      if (error) throw error;
      setDone(true);
    } catch (error) {
      toast.error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Yanıt gönderilemedi');
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${embedded ? 'min-h-[28rem]' : 'min-h-[75svh]'}`}>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-9 w-9" />
        </div>
        <h1 className="font-serif text-4xl font-light text-charcoal">Yanıtın bize ulaştı.</h1>
        <p className="mt-4 max-w-md font-serif text-lg font-light italic text-muted-foreground">
          Katılım durumunu daha sonra aynı cihazdan güncelleyebilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? 'px-0 py-0' : 'px-5 py-8'}>
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-light text-charcoal">Katılım durumunu bildir</h1>
        <p className="mt-2 text-sm font-light text-muted-foreground">Seni ve birlikte geleceğin misafirleri bekliyoruz.</p>

        <div className="mt-7 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal" htmlFor="rsvp-name">Adın ve soyadın</label>
            <input id="rsvp-name" type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Adın Soyadın" className="w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-charcoal">Katılım durumun</legend>
            <div className="space-y-2">
              {attendanceOptions.map((option) => (
                <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${attendance === option.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/50'}`}>
                  <input type="radio" name="attendance" value={option.value} checked={attendance === option.value} onChange={() => setAttendance(option.value)} className="mt-1 h-4 w-4 accent-primary" />
                  <span><span className="block text-sm font-medium text-charcoal">{option.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          {attendance === 'attending' && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-charcoal" htmlFor="rsvp-count"><Users className="h-4 w-4 text-primary" /> Toplam kişi sayısı</label>
              <select id="rsvp-count" value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} className="w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} kişi</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-charcoal" htmlFor="rsvp-note">Not (opsiyonel)</label>
            <textarea id="rsvp-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Bize iletmek istediğin bir not var mı?" className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>

          <button onClick={handleSubmit} disabled={saving || !name.trim() || !sessionId} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40">
            {saving ? 'Gönderiliyor...' : 'Yanıtımı Gönder'} {!saving && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}