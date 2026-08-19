'use client';

import { useState, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface UploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  previewUrl?: string;
  path?: string;
}

const MAX_PHOTO_MB = 15;
const MAX_VIDEO_MB = 100;
const ACCEPTED_PHOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/quicktime', 'video/mov'];

function fileToPath(weddingId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safe = `${crypto.randomUUID()}.${ext}`;
  const date = new Date();
  const ym = `${date.getFullYear()}/${date.getMonth() + 1}`;
  return `${weddingId}/${ym}/${safe}`;
}

function validateFile(file: File): { ok: boolean; error?: string; kind?: 'image' | 'video' } {
  const isPhoto = ACCEPTED_PHOTO.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  const isVideo = ACCEPTED_VIDEO.includes(file.type) || /\.(mp4|mov)$/i.test(file.name);
  if (isPhoto) {
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return { ok: false, error: `Fotoğraf ${MAX_PHOTO_MB}MB'den küçük olmalı` };
    return { ok: true, kind: 'image' };
  }
  if (isVideo) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return { ok: false, error: `Video ${MAX_VIDEO_MB}MB'den küçük olmalı` };
    return { ok: true, kind: 'video' };
  }
  return { ok: false, error: 'Desteklenmeyen dosya türü' };
}

export function useUploader(weddingId: string) {
  const supabase = getSupabase();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const newItems: UploadItem[] = [];
    for (const file of arr) {
      const v = validateFile(file);
      if (!v.ok) {
        toast.error(`${file.name}: ${v.error}`);
        continue;
      }
      newItems.push({
        file,
        progress: 0,
        status: 'pending',
        previewUrl: v.kind === 'image' ? URL.createObjectURL(file) : undefined,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => {
      const item = prev[idx];
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<{ path: string; kind: 'image' | 'video'; file: File }[]> => {
    setUploading(true);
    const results: { path: string; kind: 'image' | 'video'; file: File }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'done') {
        if (item.path) {
          const v = validateFile(item.file);
          results.push({ path: item.path, kind: v.kind || 'image', file: item.file });
        }
        continue;
      }

      setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it));

      const path = fileToPath(weddingId, item.file);
      const { error } = await supabase.storage
        .from('wedding-media')
        .upload(path, item.file, {
          cacheControl: '3600',
          contentType: item.file.type || undefined,
          upsert: false,
        });

      if (error) {
        setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: 'error' } : it));
        toast.error(`${item.file.name} yüklenemedi`);
        continue;
      }

      setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: 'done', progress: 100, path } : it));
      const v = validateFile(item.file);
      results.push({ path, kind: v.kind || 'image', file: item.file });
    }

    setUploading(false);
    return results;
  }, [items, supabase, weddingId]);

  const reset = useCallback(() => {
    items.forEach((it) => { if (it.previewUrl) URL.revokeObjectURL(it.previewUrl); });
    setItems([]);
  }, [items]);

  const completedCount = items.filter((i) => i.status === 'done').length;

  return { items, addFiles, removeItem, uploadAll, reset, uploading, completedCount, total: items.length };
}
