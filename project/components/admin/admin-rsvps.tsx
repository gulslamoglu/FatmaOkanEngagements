'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { formatDateLong } from '@/lib/format';

interface Rsvp {
  id: string;
  guest_name: string;
  attendance: 'attending' | 'not_attending' | 'maybe';
  guest_count: number;
  note: string;
  updated_at: string;
}

const statusLabels = { attending: 'Katılacak', not_attending: 'Katılamayacak', maybe: 'Kararsız' };

export function AdminRsvps() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from('rsvps').select('id, guest_name, attendance, guest_count, note, updated_at').order('updated_at', { ascending: false });
    if (error) { toast.error('Katılım yanıtları yüklenemedi: ' + error.message); setLoading(false); return; }
    setRsvps((data || []) as Rsvp[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const attending = rsvps.filter((rsvp) => rsvp.attendance === 'attending');
  const totalGuests = attending.reduce((sum, rsvp) => sum + rsvp.guest_count, 0);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <div><h1 className="font-serif text-3xl font-light text-charcoal">Katılım Yanıtları</h1><p className="text-sm text-muted-foreground">Misafirlerin bildirdiği katılım durumu</p></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Toplam yanıt</p><p className="mt-1 font-serif text-2xl text-charcoal">{rsvps.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Gelecek yanıtı</p><p className="mt-1 font-serif text-2xl text-charcoal">{attending.length}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Beklenen kişi</p><p className="mt-1 flex items-center gap-1 font-serif text-2xl text-charcoal"><Users className="h-5 w-5 text-primary" />{totalGuests}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Kararsız</p><p className="mt-1 font-serif text-2xl text-charcoal">{rsvps.filter((rsvp) => rsvp.attendance === 'maybe').length}</p></div>
      </div>

      {loading ? <div className="mt-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : rsvps.length === 0 ? <p className="mt-12 text-center text-sm text-muted-foreground">Henüz katılım yanıtı yok.</p> : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Misafir</th><th className="px-4 py-3 font-medium">Durum</th><th className="px-4 py-3 font-medium">Kişi</th><th className="px-4 py-3 font-medium">Not</th><th className="px-4 py-3 font-medium">Güncelleme</th></tr></thead><tbody className="divide-y divide-border">{rsvps.map((rsvp) => <tr key={rsvp.id}><td className="whitespace-nowrap px-4 py-3 font-medium text-charcoal">{rsvp.guest_name}</td><td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${rsvp.attendance === 'attending' ? 'bg-green-100 text-green-800' : rsvp.attendance === 'maybe' ? 'bg-gold/20 text-charcoal' : 'bg-secondary text-muted-foreground'}`}>{statusLabels[rsvp.attendance]}</span></td><td className="px-4 py-3">{rsvp.guest_count || '-'}</td><td className="min-w-48 max-w-xs px-4 py-3 text-muted-foreground">{rsvp.note || '-'}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateLong(rsvp.updated_at)}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}