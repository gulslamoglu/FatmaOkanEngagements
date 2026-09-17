'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getGuestUsage } from '@/lib/guest-usage';
import type { GuestUsage } from '@/lib/guest-limits';
export function useGuestUsage(weddingId: string, sessionId: string) {
  const [usage, setUsage] = useState<GuestUsage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const cached = useRef<GuestUsage | null>(null);
  const pending = useRef<{ key: string; promise: Promise<GuestUsage | null> } | null>(null);
  const refresh = useCallback((): Promise<GuestUsage | null> => {
    if (!sessionId) return Promise.resolve(null);
    const key = weddingId + ':' + sessionId;
    if (pending.current?.key === key) return pending.current.promise;
    const request = ++generation.current;
    // Returning from the native file picker must not invalidate already loaded rights.
    if (!cached.current) setLoading(true);
    const promise = getGuestUsage(weddingId, sessionId).then(next => {
      if (request === generation.current) { cached.current = next; setUsage(next); setError(''); }
      return next;
    }).catch(() => {
      if (request === generation.current) setError('Kalan hakların yüklenemedi.');
      return null;
    }).finally(() => {
      if (request === generation.current) { pending.current = null; setLoading(false); }
    });
    pending.current = { key, promise };
    return promise;
  }, [weddingId, sessionId]);
  useEffect(() => {
    const requests = generation;
    cached.current = null; pending.current = null; setUsage(null); setLoading(true); void refresh();
    const focused = () => { void refresh(); };
    window.addEventListener('focus', focused);
    return () => { requests.current++; pending.current = null; window.removeEventListener('focus', focused); };
  }, [refresh]);
  return { usage, error, loading, refresh };
}
