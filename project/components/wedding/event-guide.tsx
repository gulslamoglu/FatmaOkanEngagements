import Link from 'next/link';
import { Clock, Utensils, MapPin, Camera, ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import type { Wedding } from '@/lib/types';
import { getEventGuide } from '@/lib/event-guide';

export function EventGuide({ wedding }: { wedding: Wedding }) {
  const guide = getEventGuide(wedding.event_guide);
  return <section id="nisan-rehberi" aria-labelledby="guide-heading" className="relative scroll-mt-6 px-5 py-16 sm:px-8 sm:py-24">
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-end justify-between gap-5"><div><p className="celebration-eyebrow">Güzel bir akşamın küçük detayları</p><h2 id="guide-heading" className="mt-3 font-serif text-4xl font-light sm:text-5xl">Bu gece <span className="italic text-primary">birlikteyiz.</span></h2></div><Sparkles aria-hidden="true" className="hidden h-9 w-9 text-primary/50 sm:block" strokeWidth={1} /></div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <details open className="guide-fold group rounded-[1.75rem] border border-border bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-4 p-6 sm:p-7"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary"><Clock className="h-5 w-5 text-primary" strokeWidth={1.5} /></span><span className="flex-1"><span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Her anı ayrı güzel</span><span className="mt-1 block font-serif text-2xl">Günün akışı</span></span><Plus className="guide-plus h-5 w-5 text-primary" /></summary>
          <div className="px-7 pb-8 sm:px-8">{guide.schedule.length ? <ol className="space-y-6 border-t border-border pt-6">{guide.schedule.map((item,i)=><li key={i} className="flex gap-5"><time className="pt-1 text-sm font-medium tabular-nums text-primary">{item.time}</time><div className="border-l border-primary/20 pl-5"><h3 className="font-serif text-xl">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div></li>)}</ol> : <p className="text-sm text-muted-foreground">Program netleştiğinde burada paylaşılacak.</p>}</div>
        </details>
        <details className="guide-fold group rounded-[1.75rem] border border-border bg-[#f2eee5] shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-4 p-6 sm:p-7"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70"><Utensils className="h-5 w-5 text-primary" strokeWidth={1.5} /></span><span className="flex-1"><span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Soframıza hoş geldin</span><span className="mt-1 block font-serif text-2xl">Bu akşamın menüsü</span></span><Plus className="guide-plus h-5 w-5 text-primary" /></summary>
          <div className="px-7 pb-8 sm:px-8">{guide.menu.length ? <ul className="space-y-5 border-t border-primary/15 pt-6">{guide.menu.map((item,i)=><li key={i} className="flex gap-4"><span className="pt-1 text-[10px] tracking-widest text-primary/60">0{i+1}</span><div><h3 className="font-serif text-xl">{item.title}</h3><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.description}</p></div></li>)}</ul> : <p className="text-sm text-muted-foreground">Menü kesinleştiğinde burada paylaşılacak.</p>}{guide.note && <p className="mt-6 border-t border-primary/15 pt-4 text-xs leading-relaxed text-muted-foreground">{guide.note}</p>}</div>
        </details>
      </div>
      {wedding.location && <a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(wedding.location)} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-card/70 p-5 transition-colors hover:bg-secondary"><MapPin className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-sm leading-relaxed">{wedding.location}</p><p className="mt-1 text-xs text-muted-foreground">Yol tarifi için dokun</p></div><ArrowUpRight className="h-5 w-5 shrink-0 text-primary" /></a>}
      <div className="mt-10 flex flex-col gap-5 rounded-[1.75rem] border border-dashed border-primary/25 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-xs text-primary"><Camera className="h-4 w-4" /> Gecenin küçük görevi</p><p className="mt-2 font-serif text-2xl">En içten kahkahayı <span className="italic">yakala.</span></p><p className="mt-2 text-sm text-muted-foreground">Bir kahkaha, bir sarılma, bir masa dolusu mutluluk…</p></div><Link href={'/w/'+wedding.slug+'/upload'} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground">Bizimle paylaş <ArrowUpRight className="h-4 w-4" /></Link></div>
    </div>
  </section>;
}
