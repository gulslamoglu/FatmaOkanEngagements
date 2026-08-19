'use client';

import Link from 'next/link';
import { Camera, MessageSquare, Mic, ArrowRight, ArrowDown, Heart } from 'lucide-react';
import type { Wedding } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { MemoryGridPreview } from '@/components/wedding/memory-grid-preview';

interface Props {
  wedding: Wedding;
  memories: { id: string; type: string; caption: string; story: string; created_at: string; memory_media?: { storage_path: string; thumbnail_path: string }[] }[];
  stats: { photos: number; videos: number; messages: number; voices: number; total: number; guests: number };
}

export function WeddingHero({ wedding, memories, stats }: Props) {
  const names = `${wedding.bride_name} & ${wedding.groom_name}`;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[100svh] min-h-[600px] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wedding.cover_image_url}
          alt={`${names} düğün`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 gradient-overlay" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="animate-fade-up">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-white/70 font-sans">Biz evleniyoruz</p>
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light text-white text-balance leading-tight">
              {names}
            </h1>
            <div className="mx-auto my-6 h-px w-16 bg-white/40" />
            <p className="font-serif text-xl sm:text-2xl text-white/90 font-light tracking-wide">
              {formatDate(wedding.wedding_date)}
            </p>
            {wedding.location && (
              <p className="mt-1 text-sm text-white/70 tracking-wide">{wedding.location}</p>
            )}
          </div>

          {wedding.welcome_message && (
            <p className="mt-8 max-w-md animate-fade-up font-serif text-lg text-white /85 font-light italic delay-200 text-balance">
              "{wedding.welcome_message}"
            </p>
          )}

          <div className="mt-10 flex animate-fade-up flex-col gap-3 delay-300 sm:flex-row">
            <Link
              href={`/w/${wedding.slug}/upload`}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-medium tracking-wide text-charcoal transition-all hover:bg-white/90 hover:shadow-lg active:scale-[0.98]"
            >
              <Camera className="h-4 w-4" />
              Anı Bırak
            </Link>
            <Link
              href={`/w/${wedding.slug}/gallery`}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-8 py-4 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98]"
            >
              Anılara Göz At
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <p className="mt-6 animate-fade-in text-xs text-white/50 delay-500">
            Bu alan yalnızca davetlilerimiz için oluşturuldu.
          </p>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-float">
          <ArrowDown className="h-5 w-5 text-white/50" />
        </div>
      </section>

      {/* Info section */}
      <section className="bg-background px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="animate-fade-up font-serif text-4xl sm:text-5xl font-light text-charcoal text-balance">
            Bizim için bir anı bırak
          </h2>
          <p className="mt-5 animate-fade-up text-base text-muted-foreground font-light leading-relaxed delay-100 text-balance">
            Bugün çektiğin fotoğraf veya video belki de bizim hiç göremediğimiz bir anı içeriyor.
            Burada toplanan her kare, yıllar sonra bizi o güne geri götürecek.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
          <InfoCard
            icon={<Camera className="h-6 w-6" />}
            title="Fotoğraf / Video"
            desc="Bugün yakaladığın anları bizimle paylaş."
            href={`/w/${wedding.slug}/upload`}
            delay={0}
          />
          <InfoCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Bir Not Bırak"
            desc="Yıllar sonra okumamızı istediğin birkaç kelime yaz."
            href={`/w/${wedding.slug}/messages`}
            delay={100}
          />
          <InfoCard
            icon={<Mic className="h-6 w-6" />}
            title="Sesini Bırak"
            desc="İstersen bize kısa bir sesli mesaj kaydet."
            href={`/w/${wedding.slug}/voice`}
            delay={200}
          />
        </div>
      </section>

      {/* Preview grid */}
      {memories.length > 0 && (
        <section className="bg-secondary/40 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Şu ana kadar</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-light text-charcoal">
                {stats.total} anı paylaşıldı
              </h2>
            </div>
            <MemoryGridPreview memories={memories.slice(0, 6)} slug={wedding.slug} />
            <div className="mt-10 text-center">
              <Link
                href={`/w/${wedding.slug}/gallery`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Tüm anıları gör <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-background px-6 py-12 text-center">
        <Heart className="mx-auto h-5 w-5 text-primary/40" />
        <p className="mt-3 font-serif text-lg text-muted-foreground font-light">
          {names}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">{formatDate(wedding.wedding_date)}</p>
      </footer>
    </div>
  );
}

function InfoCard({
  icon, title, desc, href, delay,
}: { icon: React.ReactNode; title: string; desc: string; href: string; delay: number }) {
  return (
    <Link
      href={href}
      className="group flex animate-fade-up flex-col items-center rounded-2xl border border-border bg-card p-8 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-2xl font-light text-charcoal">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground font-light leading-relaxed">{desc}</p>
    </Link>
  );
}
