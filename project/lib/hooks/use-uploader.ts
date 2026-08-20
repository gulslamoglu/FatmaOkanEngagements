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
const MAX_VIDEO_MB = 50;
const ACCEPTED_PHOTO = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/webm'];
const MAX_IMAGE_EDGE = 2400;
const IMAGE_QUALITY = 0.82;
const UPLOAD_CONCURRENCY = 3;

async function optimizeImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) { bitmap.close(); return file; }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const optimized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY));
    if (!optimized || optimized.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([optimized], `${baseName}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } catch {
    return file;
  }
}

function fileToPath(weddingId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safe = `${crypto.randomUUID()}.${ext}`;
  const date = new Date();
  const ym = `${date.getFullYear()}/${date.getMonth() + 1}`;
  return `${weddingId}/${ym}/${safe}`;
}

function validateFile(file: File): { ok: boolean; error?: string; kind?: 'image' | 'video' } {
  const isPhoto = ACCEPTED_PHOTO.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  const isVideo = ACCEPTED_VIDEO.includes(file.type) || /\.(mp4|webm)$/i.test(file.name);
  if (isPhoto) {
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return { ok: false, error: `Fotoğraf ${MAX_PHOTO_MB}MB'den küçük olmalı` };
    return { ok: true, kind: 'image' };
  }
  if (isVideo) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return { ok: false, error: `Video ${MAX_VIDEO_MB}MB'den küçük olmalı` };
    return { ok: true, kind: 'video' };
  }
  return { ok: false, error: 'Desteklenmeyen format. Fotoğraf için JPG/PNG/WebP, video için MP4/WebM kullanın' };
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

    const uploadItem = async (i: number) => {
      const item = items[i];
      if (item.status === 'done') {
        if (item.path) {
          const v = validateFile(item.file);
          results.push({ path: item.path, kind: v.kind || 'image', file: item.file });
        }
        return;
      }

      setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it));

      const validation = validateFile(item.file);
      const uploadFile = validation.kind === 'image' ? await optimizeImage(item.file) : item.file;
      const path = fileToPath(weddingId, uploadFile);
      const { error } = await supabase.storage
        .from('wedding-media')
        .upload(path, uploadFile, {
          cacheControl: '31536000',
          contentType: uploadFile.type || undefined,
          upsert: false,
        });

      if (error) {
        setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: 'error' } : it));
        toast.error(`${item.file.name} yüklenemedi`);
        return;
      }

      setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: 'done', progress: 100, path } : it));
      results.push({ path, kind: validation.kind || 'image', file: uploadFile });
    };

    for (let start = 0; start < items.length; start += UPLOAD_CONCURRENCY) {
      const indexes = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, items.length - start) }, (_, offset) => start + offset);
      await Promise.all(indexes.map(uploadItem));
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
