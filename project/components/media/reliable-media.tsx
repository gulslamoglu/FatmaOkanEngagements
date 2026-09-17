'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2, RefreshCw, Volume2 } from 'lucide-react';
import { useMediaSource } from '@/lib/hooks/use-media-source';
import { cn } from '@/lib/utils';

type BaseProps = {
  src: string;
  className?: string;
  mediaClassName?: string;
};

function LoadingLayer() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-muted to-accent/40">
      <div className="absolute inset-0 shimmer opacity-60" />
      <Loader2 className="relative h-5 w-5 animate-spin text-primary/55" />
    </div>
  );
}

function ErrorLayer({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/80 p-3 text-center">
      <ImageOff className="h-6 w-6 text-muted-foreground" />
      <p className="text-[11px] text-muted-foreground">Medya yüklenemedi</p>
      <button type="button" onClick={(event) => { event.stopPropagation(); onRetry(); }} className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-charcoal shadow-sm">
        <RefreshCw className="h-3 w-3" /> Yeniden dene
      </button>
    </div>
  );
}

export function ReliableImage({ src, className, mediaClassName, mediaStyle, alt = '', eager = false }: BaseProps & { alt?: string; eager?: boolean; mediaStyle?: CSSProperties }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const mediaSource = useMediaSource(src, attempt);
  const retrySrc = mediaSource.url;
  useEffect(() => setState('loading'), [src, attempt, retrySrc]);
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) setState(image.naturalWidth > 0 ? 'ready' : 'error');
  }, [src, attempt, retrySrc]);


  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {state === 'loading' && <LoadingLayer />}
      {retrySrc && <img
        ref={imageRef}
        key={retrySrc + ":" + attempt}
        src={retrySrc}
        alt={alt}
        style={mediaStyle}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
        className={cn('h-full w-full transition-[opacity,transform] duration-500', state === 'ready' ? 'opacity-100' : 'opacity-0', mediaClassName)}
      />}
      {(state === 'error' || mediaSource.error) && <ErrorLayer onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />}
    </div>
  );
}

export function ReliableVideo({ src, className, mediaClassName, controls = false, autoPlay = false, loop = false }: BaseProps & { controls?: boolean; autoPlay?: boolean; loop?: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaSource = useMediaSource(src, attempt, controls || autoPlay);
  const retrySrc = mediaSource.url;
  useEffect(() => setState('loading'), [src, attempt, retrySrc]);
  useEffect(() => {
    if ((videoRef.current?.readyState || 0) >= 2) setState('ready');
  }, [src, attempt, retrySrc]);


  if (!controls && !autoPlay) return <div className={cn('flex items-center justify-center bg-gradient-to-br from-secondary to-accent/50', className)}><span className="mt-16 text-xs text-charcoal">Videoyu aç</span></div>;

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {state === 'loading' && <LoadingLayer />}
      {retrySrc && <video
        ref={videoRef}
        key={attempt}
        src={retrySrc}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={!controls}
        playsInline
        preload="metadata"
        onLoadedMetadata={() => setState('ready')}
        onLoadedData={() => setState('ready')}
        onError={() => setState('error')}
        className={cn('h-full w-full transition-opacity duration-500', state === 'ready' ? 'opacity-100' : 'opacity-0', mediaClassName)}
      />}
      {(state === 'error' || mediaSource.error) && <ErrorLayer onRetry={() => { setState('loading'); setAttempt((value) => value + 1); }} />}
    </div>
  );
}

export function ReliableAudio({ src, className, autoPlay = false }: { src: string; className?: string; autoPlay?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mediaSource = useMediaSource(src, attempt);
  const retrySrc = mediaSource.url;
  useEffect(() => setFailed(false), [src, retrySrc]);


  if (failed || mediaSource.error) {
    return (
      <button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }} className={cn('inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-charcoal', className)}>
        <RefreshCw className="h-4 w-4" /> Sesi yeniden yükle
      </button>
    );
  }

  if (!retrySrc) return <p role="status" className="text-xs text-muted-foreground">Ses hazırlanıyor…</p>;
  return (
    <div className={cn('flex w-full max-w-sm items-center gap-3 rounded-2xl bg-secondary/70 p-3', className)}>
      <Volume2 className="h-5 w-5 shrink-0 text-primary" />
      <audio key={attempt} src={retrySrc} controls autoPlay={autoPlay} preload="metadata" onError={() => setFailed(true)} className="min-w-0 flex-1" />
    </div>
  );
}
