'use client';
import { Camera, Video, Mic, MessageSquare } from 'lucide-react';
import { GUEST_LIMITS, remainingFor, type GuestUsage } from '@/lib/guest-limits';
interface Props { usage: GuestUsage | null; loading: boolean; error: string; onRetry: () => void }
export function GuestAllowance({ usage, loading, error, onRetry }: Props) {
  return <aside aria-label="Paylaşım hakların" className="my-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-secondary/70 to-card p-4">
    <p className="text-xs font-medium text-charcoal">Bu gece için paylaşım hakların</p>
    <div className="mt-3 grid grid-cols-4 gap-2">{[{kind:'image' as const,label:'Fotoğraf',icon:Camera},{kind:'video' as const,label:'Video',icon:Video},{kind:'audio' as const,label:'Ses',icon:Mic}].map(({kind,label,icon:Icon})=><div key={kind} className="rounded-xl bg-card/80 px-1 py-3 text-center"><Icon className="mx-auto mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium tabular-nums">{usage && !error ? remainingFor(usage,kind) : '—'}<span className="text-[10px] text-muted-foreground"> / {GUEST_LIMITS[kind]}</span></p><p className="mt-1 text-[10px] text-muted-foreground">{label} kaldı</p></div>)}<div className="rounded-xl bg-card/80 px-1 py-3 text-center"><MessageSquare className="mx-auto mb-2 h-4 w-4 text-primary" /><p className="text-sm font-medium">Sınırsız</p><p className="mt-1 text-[10px] text-muted-foreground">Metin</p></div></div>
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Toplam 20 fotoğraf, 5 video, 2 ses kaydı; dilediğin kadar yazılı mesaj. Hakların bu tarayıcıdaki paylaşımlarına göre takip edilir.</p>
    <div aria-live="polite">{error ? <button type="button" onClick={onRetry} className="mt-2 text-xs text-primary underline">{error} Yeniden dene</button> : loading && <p className="mt-2 text-xs text-muted-foreground">Hakların kontrol ediliyor…</p>}</div>
  </aside>;
}
