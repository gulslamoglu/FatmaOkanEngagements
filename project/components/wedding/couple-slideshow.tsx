'use client';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import photos from '@/lib/couple-photos.json';
import { ReliableImage } from '@/components/media/reliable-media';
export function CoupleSlideshow({ names }: { names:string }) {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReducedMotion(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    changed(); visibility(); preference.addEventListener('change', changed); document.addEventListener('visibilitychange', visibility);
    return () => { preference.removeEventListener('change', changed); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (photos.length < 2 || paused || reducedMotion || !visible) return;
    const timer = setInterval(() => { setPrevious(current); setCurrent((current + 1) % photos.length); }, 7000);
    return () => clearInterval(timer);
  }, [current, paused, reducedMotion, visible]);
  useEffect(() => {
    if (previous === null) return;
    const timer = setTimeout(() => setPrevious(null), 1000);
    return () => clearTimeout(timer);
  }, [previous, current]);
  useEffect(() => {
    if (photos.length > 1 && visible) { const next = new window.Image(); next.src = photos[(current + 1) % photos.length]; }
  }, [current, visible]);
  const move = (direction:number) => { setPaused(true); setPrevious(current); setCurrent((current + direction + photos.length) % photos.length); };
  if (!photos.length) return null;
  return <section className="bg-[#f8f5ee] px-6 py-12 sm:py-16"><div className="mx-auto flex max-w-3xl flex-col items-center gap-7 sm:flex-row sm:gap-12"><div className="text-center sm:flex-1 sm:text-left"><p className="celebration-eyebrow">Bizim hikâyemiz</p><h2 className="mt-3 font-serif text-3xl font-light sm:text-4xl">Birlikte, <span className="italic text-primary">her an güzel.</span></h2><p className="mt-4 text-sm leading-7 text-muted-foreground">Bu geceye uzanan yolculuğumuzdan birkaç kare.</p><p className="mt-4 font-serif text-xl italic text-primary">{names}</p></div><div className="relative isolate w-full max-w-[300px] shrink-0 rounded-[1.75rem] border border-primary/10 bg-white p-3 shadow-lg">
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-[#ece6d9]" aria-label="Çiftin fotoğrafları">
      {previous !== null && previous !== current && <ReliableImage key={'previous-'+previous} src={photos[previous]} alt="" className="absolute inset-0 h-full w-full" mediaClassName="object-contain" />}
      <ReliableImage key={current} src={photos[current]} alt={names + ' — '+(current+1)} className={'absolute inset-0 h-full w-full '+(!reducedMotion?'animate-fade-in':'')} mediaClassName="object-contain" />
    </div>
    {photos.length>1 && <div className="mt-3 flex items-center justify-center gap-2 text-primary">
      <button type="button" aria-label="Önceki çift fotoğrafı" onClick={()=>move(-1)} className="rounded-full p-3 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
      <span className="px-1 text-[10px] tabular-nums">{current+1} / {photos.length}</span>
      <button type="button" aria-label="Sonraki çift fotoğrafı" onClick={()=>move(1)} className="rounded-full p-3 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
      {!reducedMotion && <button type="button" aria-label={paused?'Fotoğraf geçişlerini başlat':'Fotoğraf geçişlerini duraklat'} onClick={()=>setPaused(value=>!value)} className="rounded-full p-3 hover:bg-secondary">{paused?<Play className="h-3.5 w-3.5" />:<Pause className="h-3.5 w-3.5" />}</button>}
    </div>}
  </div></div></section>;
}
