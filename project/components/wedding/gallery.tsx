'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Play, Heart, ChevronLeft, ChevronRight, Shuffle, Mic, Quote, Loader2, Camera, ArrowUpRight, Sparkles, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { getSupabase } from '@/lib/supabase/client';
import { useSessionId } from '@/lib/hooks/use-session-id';
import { formatDateLong } from '@/lib/format';
import type { Memory, Wedding } from '@/lib/types';
import { getMediaUrl } from '@/lib/media-url';
import { expandMemories, type GalleryItem } from '@/lib/gallery-items';
import { ReliableAudio, ReliableImage, ReliableVideo } from '@/components/media/reliable-media';

type Filter = 'all' | 'photo' | 'video';
type Sort = 'newest' | 'oldest';
const PAGE_SIZE = 24;
const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Hepsi' }, { key: 'photo', label: 'Fotoğraflar' },
  { key: 'video', label: 'Videolar' },
];
async function fetchPage(weddingId: string, filter: Filter, sort: Sort, offset: number) {
  let query = getSupabase().from('memories').select('*, guests (*), memory_media (*)')
    .eq('wedding_id', weddingId).eq('status', 'approved').in('type', ['photo', 'video']);
  if (filter !== 'all') query = query.eq('type', filter);
  const { data, error } = await query.order('created_at', { ascending: sort === 'oldest' })
    .order('id', { ascending: sort === 'oldest' }).range(offset, offset + PAGE_SIZE);
  if (error) throw error;
  return (data || []) as unknown as Memory[];
}

export function Gallery({ wedding, initialMemories }: { wedding: Wedding; initialMemories: Memory[] }) {
  const [memories, setMemories] = useState(initialMemories.slice(0, PAGE_SIZE));
  const [hasMore, setHasMore] = useState(initialMemories.length > PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [reload, setReload] = useState(0);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const sessionId = useSessionId();
  const [reacted, setReacted] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reactionLocks = useRef(new Set<string>());
  const pageLock = useRef(false);
  const pageOffset = useRef(Math.min(initialMemories.length, PAGE_SIZE));
  const generation = useRef(0);
  const currentQuery = useRef(wedding.id + ':all:newest:0');
  const cards = useMemo(() => expandMemories(memories.filter(memory => memory.type === 'photo' || memory.type === 'video')).filter(card => card.type === 'photo' || card.type === 'video'), [memories]);
  const openedIndex = cards.findIndex(card => card.cardId === openedId);
  const opened = cards[openedIndex];
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const key = wedding.id + ':' + filter + ':' + sort + ':' + reload;
    if (currentQuery.current === key) return;
    currentQuery.current = key;
    const request = ++generation.current;
    pageLock.current = false;
    setLoadingMore(false); setLoading(true); setLoadError(false); setOpenedId(null); setMemories([]);
    void fetchPage(wedding.id, filter, sort, 0).then(page => {
      if (request !== generation.current) return;
      pageOffset.current = Math.min(page.length, PAGE_SIZE);
      setMemories(page.slice(0, PAGE_SIZE)); setHasMore(page.length > PAGE_SIZE);
    }).catch(() => { if (request === generation.current) { setLoadError(true); setHasMore(false); } })
      .finally(() => { if (request === generation.current) setLoading(false); });
  }, [wedding.id, filter, sort, reload]);

  useEffect(() => {
    let active = true;
    if (!memories.length || !sessionId) return;
    const ids = memories.map(memory => memory.id);
    void getSupabase().from('reactions').select('memory_id, session_id').in('memory_id', ids).then(({ data, error }) => {
      if (!active || error || !data) return;
      const nextCounts: Record<string, number> = {};
      const nextReacted = new Set<string>();
      data.forEach(reaction => { nextCounts[reaction.memory_id] = (nextCounts[reaction.memory_id] || 0) + 1; if (reaction.session_id === sessionId) nextReacted.add(reaction.memory_id); });
      setCounts(nextCounts); setReacted(nextReacted);
    });
    return () => { active = false; };
  }, [memories, sessionId]);

  const toggleReaction = async (id: string) => {
    if (!sessionId || reactionLocks.current.has(id)) return;
    reactionLocks.current.add(id);
    const wasReacted = reacted.has(id);
    const client = getSupabase();
    try {
      const { error } = wasReacted
        ? await client.from('reactions').delete().eq('memory_id', id).eq('session_id', sessionId)
        : await client.from('reactions').insert({ memory_id: id, session_id: sessionId, reaction_type: 'love' });
      if (error) throw error;
      setReacted(current => { const next = new Set(current); if (wasReacted) next.delete(id); else next.add(id); return next; });
      setCounts(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + (wasReacted ? -1 : 1)) }));
    } catch { toast.error('Beğenin kaydedilemedi. Tekrar deneyebilirsin.'); }
    finally { reactionLocks.current.delete(id); }
  };
  const loadMore = async () => {
    if (loading || pageLock.current || !hasMore) return;
    pageLock.current = true; setLoadingMore(true);
    const request = generation.current;
    try {
      const page = await fetchPage(wedding.id, filter, sort, pageOffset.current);
      if (request !== generation.current) return;
      pageOffset.current += Math.min(page.length, PAGE_SIZE);
      setMemories(current => { const ids = new Set(current.map(m => m.id)); return [...current, ...page.slice(0, PAGE_SIZE).filter(m => !ids.has(m.id))]; });
      setHasMore(page.length > PAGE_SIZE);
    } catch { if (request === generation.current) toast.error('Anılar yüklenemedi. Tekrar deneyebilirsin.'); }
    finally { if (request === generation.current) { pageLock.current = false; setLoadingMore(false); } }
  };
  const openCard = (id: string) => { opener.current = document.activeElement as HTMLElement; setOpenedId(id); };
  const move = useCallback((direction: number) => {
    setOpenedId(current => { const index = cards.findIndex(card => card.cardId === current); return cards.length ? cards[(index + direction + cards.length) % cards.length].cardId : null; });
  }, [cards]);

  return <main className="min-h-[80svh] bg-[#faf8f3] px-4 py-9 sm:px-8 sm:py-14">
    <div className="mx-auto max-w-6xl">
      <header className="relative overflow-hidden rounded-[2rem] border border-[#dce2d5] bg-[#e9eee5] px-6 py-8 sm:px-10 sm:py-12">
        <Sparkles aria-hidden="true" className="absolute right-6 top-6 h-8 w-8 text-[#64745b]/25 sm:right-10 sm:h-12 sm:w-12" strokeWidth={1} />
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#526349]">{wedding.bride_name} &amp; {wedding.groom_name} · Hatıra albümü</p>
        <h1 className="mt-4 font-serif text-4xl font-light leading-tight sm:text-6xl">Bir gece.<br className="sm:hidden" /> <span className="italic text-[#64745b]">Bir sürü güzel an.</span></h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">Kahkahalar, sarılmalar, güzel kareler… Bu gecenin en güzel tarafı, sizin gözünüzden gördüklerimiz.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3"><Link href={'/w/'+wedding.slug+'/upload'} className="inline-flex items-center gap-2 rounded-full bg-[#526349] px-5 py-3 text-xs font-medium text-white transition-colors hover:bg-[#414f39]"><Camera className="h-4 w-4" /> Sen de bir anı ekle <ArrowUpRight className="h-4 w-4" /></Link><button type="button" disabled={!cards.length || loading} onClick={() => openCard(cards[Math.floor(Math.random()*cards.length)].cardId)} className="inline-flex items-center gap-2 rounded-full border border-[#64745b]/20 bg-white/50 px-5 py-3 text-xs text-[#526349] disabled:opacity-40"><Shuffle className="h-4 w-4" /> Bana bir anı seç</button></div>
      </header>
      <div className="my-7 flex flex-wrap items-center justify-between gap-4">
        <div aria-label="Anı türü" className="no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">{filters.map(item=><button type="button" key={item.key} aria-pressed={filter===item.key} onClick={()=>setFilter(item.key)} className={'whitespace-nowrap rounded-full border px-4 py-2.5 text-xs transition-colors '+(filter===item.key?'border-[#526349] bg-[#526349] text-white':'border-border bg-card text-muted-foreground hover:border-primary/40')}>{item.label}</button>)}</div>
        <div className="flex items-center gap-3"><p className="text-xs text-muted-foreground" aria-live="polite">{loading ? 'Anılar yükleniyor…' : cards.length + ' anı gösteriliyor'}</p><select aria-label="Anıları sırala" value={sort} onChange={event=>setSort(event.target.value as Sort)} className="rounded-full border border-border bg-card px-3 py-2 text-xs text-charcoal"><option value="newest">En yeniler</option><option value="oldest">İlk anılar</option></select></div>
      </div>
      {loading ? <div className="flex min-h-48 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="sr-only">Anılar yükleniyor</span></div> : loadError ? <div className="rounded-3xl border border-border bg-card p-10 text-center"><p className="text-sm text-muted-foreground">Anılara şu anda ulaşamadık.</p><button onClick={()=>setReload(value=>value+1)} className="mt-4 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">Yeniden dene</button></div> : <>
        {!cards.length && <div className="rounded-3xl border border-dashed border-primary/20 px-6 py-14 text-center"><Heart className="mx-auto h-8 w-8 text-primary/40" strokeWidth={1.2} /><h2 className="mt-5 font-serif text-3xl">{filter==='all' ? 'İlk güzel anı senden gelsin.' : 'Burada henüz bir anı yok.'}</h2><p className="mt-3 text-sm text-muted-foreground">{hasMore ? 'Diğer anıları görmek için daha fazlasını yükleyebilirsin.' : 'Paylaşılan ve onaylanan anılar burada yerini alacak.'}</p></div>}
        <div className="masonry columns-2 gap-4 md:columns-3 lg:columns-4">{cards.map((card,index)=><MemoryCard key={card.cardId} memory={card} index={index} onOpen={()=>openCard(card.cardId)} reacted={reacted.has(card.id)} count={counts[card.id]||0} onReact={()=>{void toggleReaction(card.id);}} />)}</div>
        {hasMore && <div className="mt-8 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-7 py-3.5 text-sm text-primary disabled:opacity-50">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}{loadingMore?'Anılar geliyor…':'Biraz daha anı'}</button></div>}
      </>}
      <p className="mt-12 text-center font-serif text-lg italic text-muted-foreground">Bu hikâyede hepimizin bir karesi var.</p>
    </div>
    <Dialog.Root open={!!opened} onOpenChange={open=>{if(!open)setOpenedId(null);}}>{opened && <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-[#161c14]/95 backdrop-blur-sm" /><Dialog.Content onCloseAutoFocus={event=>{event.preventDefault();opener.current?.focus();}} className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-4 text-white outline-none sm:p-8">
      <Dialog.Title className="sr-only">{opened.caption || 'Nişan hatırası'}</Dialog.Title><Dialog.Description className="sr-only">{openedIndex+1} / {cards.length}. Önceki ve sonraki anıya geçmek için ok düğmelerini kullanabilirsin.</Dialog.Description>
      <Dialog.Close aria-label="Anıyı kapat" className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-3 hover:bg-white/25"><X className="h-5 w-5" /></Dialog.Close>
      <LightboxMedia key={opened.cardId} memory={opened} onMove={move} />
      <div className="mt-3 flex items-center gap-5"><button aria-label="Önceki anı" onClick={()=>move(-1)} className="rounded-full bg-white/10 p-3"><ChevronLeft className="h-5 w-5" /></button><span className="text-xs tabular-nums text-white/70">{openedIndex+1} / {cards.length}</span><button aria-label="Sonraki anı" onClick={()=>move(1)} className="rounded-full bg-white/10 p-3"><ChevronRight className="h-5 w-5" /></button></div>
      <div className="mt-4 max-w-xl text-center">{opened.caption && <p className="font-serif text-xl">{opened.caption}</p>}{opened.story && opened.type!=='text' && <p className="mt-2 max-h-16 overflow-y-auto text-sm text-white/75">{opened.story}</p>}<p className="mt-2 text-xs text-white/60">{guestName(opened)} · {formatDateLong(opened.created_at)}</p><button aria-pressed={reacted.has(opened.id)} onClick={()=>{void toggleReaction(opened.id);}} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-xs"><Heart className={'h-4 w-4 '+(reacted.has(opened.id)?'fill-white':'')} /> Bu anı sevdim {counts[opened.id] ? '· '+counts[opened.id] : ''}</button></div>
    </Dialog.Content></Dialog.Portal>}</Dialog.Root>
  </main>;
}
function guestName(memory: Memory) { return memory.guests?.is_anonymous ? 'Anonim' : memory.guests?.display_name || 'Bir misafir'; }
function MemoryCard({ memory, index, onOpen, reacted, count, onReact }: { memory: GalleryItem; index: number; onOpen:()=>void; reacted:boolean; count:number; onReact:()=>void }) {
  const media = memory.memory_media?.[0];
  const url = getMediaUrl(media?.thumbnail_path || media?.storage_path);
  const isText = memory.type==='text'; const isVoice = memory.type==='voice'; const isVideo=memory.type==='video';
  return <article className="group overflow-hidden rounded-2xl border border-border/70 bg-card p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
    <button type="button" onClick={onOpen} aria-label={(memory.caption || (isText?'Mesaj':isVoice?'Ses kaydı':isVideo?'Video':'Fotoğraf'))+' — '+guestName(memory)} className={'relative block w-full overflow-hidden rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary '+(isText?'bg-[#f1ecdf] p-4 sm:p-5':isVoice?'bg-[#e9eee5] p-5 text-center':index%3===0?'aspect-[3/4] bg-secondary':'aspect-[4/5] bg-secondary')}>
      {isText ? <><Quote className="h-6 w-6 text-primary/30" strokeWidth={1.5} /><p className="mt-4 font-serif text-xl italic leading-relaxed text-charcoal line-clamp-6">{memory.story}</p><span className="mt-5 block text-[9px] uppercase tracking-widest text-primary/60">Kalpten gelenler</span></> : isVoice ? <><Mic className="mx-auto mt-3 h-8 w-8 text-[#64745b]" strokeWidth={1.5} /><div aria-hidden="true" className="my-5 flex h-8 items-center justify-center gap-1">{[10,20,14,30,22,32,12,24,16].map((height,i)=><span key={i} className="w-1 rounded-full bg-[#64745b]/40" style={{height}} />)}</div><p className="font-serif text-xl">Bir ses, bir hatıra</p><p className="mb-3 mt-2 text-[10px] text-[#526349]">Dinlemek için dokun</p></> : isVideo ? <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#d9dfd0] to-[#ede2cd]"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/40"><Play className="ml-1 h-6 w-6 text-[#526349]" fill="currentColor" /></span><p className="mt-5 font-serif text-xl text-[#526349]">Hareketli bir hatıra</p><p className="mt-2 text-[10px] text-[#526349]/80">Oynatmak için dokun</p></div> : url ? <ReliableImage src={url} alt={memory.caption || 'Nişan fotoğrafı'} className="h-full w-full" mediaClassName="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : null}
    </button>
    <div className="flex items-center justify-between gap-2 px-1 py-3 sm:px-2"><div className="min-w-0"><p className="truncate text-[11px] font-medium text-charcoal">{guestName(memory)}</p>{memory.caption && <p className="mt-1 truncate text-[10px] text-muted-foreground">{memory.caption}</p>}</div><button type="button" aria-label="Bu anıyı beğen" aria-pressed={reacted} onClick={onReact} className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center gap-1 rounded-full text-primary transition-colors hover:bg-secondary"><Heart className={'h-4 w-4 '+(reacted?'fill-primary':'')} />{count>0 && <span className="text-[10px]">{count}</span>}</button></div>
  </article>;
}
function LightboxMedia({ memory, onMove }: { memory: GalleryItem; onMove:(direction:number)=>void }) {
  const media=memory.memory_media?.[0]; const url=getMediaUrl(media?.storage_path);
  useEffect(()=>{
    const handle=(event:KeyboardEvent)=>{if(event.target instanceof HTMLMediaElement)return;if(event.key==='ArrowRight'){event.preventDefault();onMove(1);}if(event.key==='ArrowLeft'){event.preventDefault();onMove(-1);}};
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[onMove]);
  if(memory.type==='text') return <div className="mt-10 max-h-[50svh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-white/10 p-8 text-center"><Quote className="mx-auto h-8 w-8 text-white/30" /><p className="mt-5 whitespace-pre-line font-serif text-2xl italic leading-relaxed">{memory.story}</p></div>;
  if(memory.type==='voice') return <div className="flex w-full flex-col items-center gap-7 py-12"><Mic className="h-16 w-16 text-white/70" />{url && <ReliableAudio src={url} />}</div>;
  if(memory.type==='video') return url ? <ReliableVideo src={url} controls className="mt-9 h-[53svh] w-full max-w-4xl rounded-2xl bg-black" mediaClassName="object-contain" /> : null;
  return url ? <ReliableImage src={url} eager alt={memory.caption || 'Nişan fotoğrafı'} className="mt-9 h-[53svh] w-full max-w-4xl rounded-2xl bg-transparent" mediaClassName="object-contain" /> : null;
}
