'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { eventGuideSchema, getEventGuide, engagementGuide, type EventGuideData } from '@/lib/event-guide';
import type { Wedding } from '@/lib/types';
export function EventGuideEditor({ wedding }: { wedding: Wedding }) {
  const [value, setValue] = useState<EventGuideData>(() => getEventGuide(wedding.event_guide ?? (wedding.slug === 'fatma-okan' ? engagementGuide : undefined)));
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputClass = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm';
  const save = async () => {
    const result = eventGuideSchema.safeParse(value);
    if (!result.success) { toast.error('Başlıkları ve saatleri kontrol et. Saat biçimi: 18:00.'); return; }
    setSaveError(''); setSaving(true);
    try {
      const { error } = await getSupabase().from('weddings').update({ event_guide: result.data }).eq('id', wedding.id).select('id').single();
      if (error) throw error;
      toast.success('Nişan rehberi kaydedildi');
    } catch (error) {
      const detail = error as {code?:string;message?:string};
      const message = detail.code === '42703' || detail.code === 'PGRST204'
        ? 'Rehberin veritabanı alanı eksik. Supabase SQL Editor’da rehber güncellemesini uygulayıp, bu sayfayı yenilemeden tekrar Kaydet’e basın.'
        : detail.code === '42501' || detail.code === 'PGRST116'
        ? 'Rehberi kaydetmek için etkinliğin sahibi olan yönetici hesabıyla giriş yapmalısınız.'
        : 'Rehber kaydedilemedi: ' + (detail.message || 'Bağlantınızı kontrol edip tekrar deneyin.');
      setSaveError(message); toast.error(message);
    }
    finally { setSaving(false); }
  };
  return <section className="rounded-2xl border border-border bg-card p-6"><h2 className="font-serif text-2xl font-light">Nişan Rehberi</h2><p className="mt-2 text-sm text-muted-foreground">Kesinleşen programı ve ikramları ekle. Boş alanlarda misafirlere yakında paylaşılacağı bilgisi gösterilir.</p>
    {saveError && <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{saveError}</p>}
    <fieldset disabled={saving} className="mt-6 space-y-5">
      <h3 className="text-sm font-medium">Günün akışı</h3>
      {value.schedule.map((item, i) => <div key={i} className="space-y-2 rounded-xl bg-secondary/40 p-3">
        <input aria-label={'Etkinlik saati ' + (i + 1)} type="time" className={inputClass} value={item.time} onChange={e => setValue({ ...value, schedule: value.schedule.map((r, j) => j === i ? { ...r, time: e.target.value } : r) })} />
        <input aria-label={'Etkinlik başlığı ' + (i + 1)} placeholder="Örn. Yüzük töreni" maxLength={80} className={inputClass} value={item.title} onChange={e => setValue({ ...value, schedule: value.schedule.map((r, j) => j === i ? { ...r, title: e.target.value } : r) })} />
        <input aria-label={'Etkinlik açıklaması ' + (i + 1)} placeholder="Kısa açıklama" maxLength={240} className={inputClass} value={item.description} onChange={e => setValue({ ...value, schedule: value.schedule.map((r, j) => j === i ? { ...r, description: e.target.value } : r) })} />
        <button type="button" className="text-xs text-destructive" onClick={() => setValue({ ...value, schedule: value.schedule.filter((_, j) => i !== j) })}>Bu etkinliği kaldır</button>
      </div>)}
      <button type="button" disabled={value.schedule.length >= 20} className="text-sm text-primary" onClick={() => setValue({ ...value, schedule: [...value.schedule, { time: '', title: '', description: '' }] })}>+ Etkinlik ekle</button>
      <h3 className="text-sm font-medium">İkram menüsü</h3>
      {value.menu.map((item, i) => <div key={i} className="space-y-2 rounded-xl bg-secondary/40 p-3">
        <input aria-label={'İkram başlığı ' + (i + 1)} placeholder="Örn. Tatlılar" maxLength={80} className={inputClass} value={item.title} onChange={e => setValue({ ...value, menu: value.menu.map((r, j) => j === i ? { ...r, title: e.target.value } : r) })} />
        <textarea aria-label={'İkram açıklaması ' + (i + 1)} placeholder="İkramlar" maxLength={300} className={inputClass} value={item.description} onChange={e => setValue({ ...value, menu: value.menu.map((r, j) => j === i ? { ...r, description: e.target.value } : r) })} />
        <button type="button" className="text-xs text-destructive" onClick={() => setValue({ ...value, menu: value.menu.filter((_, j) => i !== j) })}>Bu ikramı kaldır</button>
      </div>)}
      <button type="button" disabled={value.menu.length >= 20} className="text-sm text-primary" onClick={() => setValue({ ...value, menu: [...value.menu, { title: '', description: '' }] })}>+ İkram ekle</button>
      <textarea aria-label="Misafirlere not" placeholder="Misafirlere ek not (isteğe bağlı)" maxLength={500} className={inputClass} value={value.note} onChange={e => setValue({ ...value, note: e.target.value })} />
      <button type="button" onClick={save} className="rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Rehberi kaydet'}</button>
    </fieldset>
  </section>;
}
