'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpRight, Camera, ClipboardCheck, Heart, MessageSquare, Mic, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { Wedding } from '@/lib/types';
import { coverStyle } from '@/lib/cover-position';
import { formatDate } from '@/lib/format';
import { MemoryGridPreview } from '@/components/wedding/memory-grid-preview';
import { ReliableImage } from '@/components/media/reliable-media';
import { CoupleSlideshow } from '@/components/wedding/couple-slideshow';
import { EventGuide } from '@/components/wedding/event-guide';
import { RsvpForm } from '@/components/wedding/rsvp-form';
import { getEventGuide } from '@/lib/event-guide';
interface Props {
  wedding: Wedding;
  memories: { id: string; type: string; caption: string; story: string; created_at: string; memory_media?: { storage_path: string; thumbnail_path: string }[] }[];
  stats: { photos: number; videos: number; messages: number; voices: number; total: number; guests: number };
}
export function WeddingHero({ wedding, memories, stats }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const names = wedding.bride_name + ' & ' + wedding.groom_name;
  const start = getEventGuide(wedding.event_guide).schedule[0]?.time;
  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicOn) {
      audio.pause();
      setMusicOn(false);
      return;
    }
    try {
      audio.muted = false;
      await audio.play();
      setMusicOn(true);
    } catch {
      setMusicOn(false);
    }
  };
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = true;
    void audio.play().catch(() => undefined);

    const enableSound = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-music-toggle]')) return;
      audio.muted = false;
      void audio.play().then(() => setMusicOn(true)).catch(() => undefined);
      window.removeEventListener('pointerdown', enableSound);
    };
    window.addEventListener('pointerdown', enableSound);
    return () => window.removeEventListener('pointerdown', enableSound);
  }, []);
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <div className="celebration-home min-h-screen">
    <section className="relative isolate flex min-h-[92svh] flex-col overflow-hidden bg-[#393c32] text-white">
      {wedding.cover_image_url && <ReliableImage src={wedding.cover_image_url} alt="Nişan kapağı" mediaStyle={coverStyle(wedding.cover_position)} eager className="absolute inset-0 -z-20 h-full w-full" mediaClassName="object-cover" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/25 to-[#22281f]/85" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-t-[9rem] rounded-b-3xl border border-white/20 sm:inset-7 sm:rounded-t-[14rem]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-9 pt-10 sm:px-14 sm:pt-12"><span className="font-serif text-2xl italic">{wedding.bride_name.charAt(0)} <span className="text-white/60">&</span> {wedding.groom_name.charAt(0)}</span><a href="#nisan-rehberi" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs backdrop-blur-sm transition-colors hover:bg-white/20">Bu gece <ArrowDown className="ml-2 inline h-3 w-3" /></a></header>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-8 py-14 text-center sm:py-20">
        <div className="mb-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/85"><span className="h-px w-8 bg-white/40" /> Nişanımıza hoş geldin <span className="h-px w-8 bg-white/40" /></div>
        <h1 className="animate-fade-up font-serif text-6xl font-light leading-[0.95] sm:text-8xl"><span className="block">{wedding.bride_name}</span><span className="my-2 block font-serif text-4xl italic text-[#e4cfad] sm:text-5xl">&</span><span className="block">{wedding.groom_name}</span></h1>
        <p className="mt-7 font-serif text-xl font-light italic text-white/90 sm:text-2xl">Bir ömürlük hikâyenin en güzel başlangıcı.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs tracking-wider text-white/80">{wedding.wedding_date && <span>{formatDate(wedding.wedding_date)}</span>}{wedding.wedding_date && start && <span aria-hidden="true">·</span>}{start && <span>Saat {start}</span>}</div>
        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"><a href="#rsvp" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e4cfad] px-7 py-4 text-sm font-medium text-[#403a30] shadow-lg transition-transform hover:-translate-y-1"><ClipboardCheck className="h-4 w-4" /> Katılım bildir <ArrowUpRight className="h-4 w-4" /></a><Link href={'/w/'+wedding.slug+'/upload'} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20"><Camera className="h-4 w-4" /> Bir anı bırak</Link><Link href={'/w/'+wedding.slug+'/gallery'} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20">Anılara göz at <Heart className="h-4 w-4" /></Link></div>
      </div>
      <a href="#nisan-rehberi" className="relative mx-auto mb-9 flex items-center gap-3 px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-white/80">Gecenin detaylarını keşfet <ArrowDown className="h-4 w-4 motion-safe:animate-bounce" /></a>
      <audio ref={audioRef} loop preload="metadata" src="/music/the_mountain-piano-556110.mp3" />
    </section>
    <div aria-hidden="true" className="flex items-center justify-center gap-5 overflow-hidden border-b border-primary/10 bg-[#ece6d9] px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-primary sm:gap-10"><span>Biraz heyecan</span><Sparkles className="h-3 w-3 shrink-0" /><span>Bolca mutluluk</span><Sparkles className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">Hep birlikte</span></div>
    <CoupleSlideshow names={names} />
    <EventGuide wedding={wedding} />
    <section id="rsvp" className="scroll-mt-6 bg-[#f4f0e7] px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <RsvpForm wedding={wedding} embedded />
      </div>
    </section>
    <section className="relative overflow-hidden bg-[#e9eee5] px-5 py-16 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[#65765d]/10" />
      <div className="mx-auto max-w-5xl"><div className="max-w-xl"><p className="celebration-eyebrow">Sen de hikâyemizin bir parçasısın</p><h2 className="mt-3 font-serif text-4xl font-light leading-tight sm:text-5xl">Bu gece geçer.<br /><span className="italic text-[#64745b]">Anısı bizimle kalır.</span></h2><p className="mt-5 text-sm leading-7 text-muted-foreground">{wedding.welcome_message || 'Biz her anı göremeyebiliriz. Senin çektiğin bir kare, söylediğin birkaç kelime, bu gecenin en güzel hatırası olabilir.'}</p></div>
      <p className="mt-5 rounded-2xl border border-[#64745b]/15 bg-white/50 px-5 py-4 text-xs leading-relaxed text-[#526349]">Her misafir için toplam 20 fotoğraf, 5 video ve 2 ses kaydı. Güzel sözlere sınır yok: dilediğin kadar yazılı mesaj bırakabilirsin.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-3">{[{icon:Camera,title:'Bir kare mutluluk',desc:'Fotoğrafını veya videonu paylaş.',path:'upload',label:'Anı bırak'},{icon:MessageSquare,title:'Kalbinden iki satır',desc:'Sadece bize özel birkaç güzel kelime.',path:'messages',label:'Bir not yaz'},{icon:Mic,title:'Sesin de kalsın',desc:'Yalnızca bizim dinleyebileceğimiz bir hatıra.',path:'voice',label:'Sesli mesaj bırak'}].map((item,i)=><Link key={item.path} href={'/w/'+wedding.slug+'/'+item.path} className="group relative flex flex-col rounded-[1.75rem] border border-white/70 bg-white/75 p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"><div className="flex items-center justify-between"><item.icon className="h-6 w-6 text-[#64745b]" strokeWidth={1.5} /><span className="font-serif text-3xl italic text-[#64745b]/30">0{i+1}</span></div><h3 className="mt-7 font-serif text-2xl">{item.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p><span className="mt-7 flex items-center justify-between border-t border-[#64745b]/15 pt-4 text-xs font-medium text-[#526349]">{item.label}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span></Link>)}</div></div>
    </section>
    {memories.some(memory => memory.memory_media?.some(media => media.storage_path || media.thumbnail_path)) && <section className="px-5 py-16 sm:py-24"><div className="mx-auto max-w-5xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="celebration-eyebrow">Bizim küçük hatıra albümümüz</p><h2 className="mt-3 font-serif text-4xl font-light">İyi ki <span className="italic text-primary">birlikteyiz.</span></h2><p className="mt-3 text-sm text-muted-foreground">{stats.total} anı, bir sürü güzel his.</p></div><Link href={'/w/'+wedding.slug+'/gallery'} className="inline-flex items-center gap-2 text-sm text-primary">Albümü aç <ArrowUpRight className="h-4 w-4" /></Link></div><MemoryGridPreview memories={memories.slice(0,6)} slug={wedding.slug} /></div></section>}
    <footer className="border-t border-border px-6 py-14 text-center"><Heart className="mx-auto h-5 w-5 text-primary/60" strokeWidth={1.3} /><p className="mt-4 font-serif text-3xl font-light">{names}</p><p className="mt-3 text-xs tracking-wide text-muted-foreground">Bu hikâyede senin de yerin var. İyi ki geldin.</p></footer>
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-2 sm:bottom-7 sm:right-7">
      <button type="button" data-music-toggle onClick={toggleMusic} aria-label={musicOn ? 'Müziği kapat' : 'Müziği aç'} title={musicOn ? 'Müziği kapat' : 'Müziği aç'} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[#526349] text-white shadow-lg transition-transform hover:-translate-y-0.5">{musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
      {showBackToTop && <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Sayfanın en üstüne çık" title="En üste çık" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-charcoal shadow-lg transition-transform hover:-translate-y-0.5"><ArrowUp className="h-4 w-4" /></button>}
    </div>
  </div>;
}
