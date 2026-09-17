'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Kind = 'image' | 'video';
interface Uploaded { path: string; thumbnailPath: string; kind: Kind; file: File; id: string }
interface UploadItem { id: string; file: File; kind: Kind; status: 'pending' | 'uploading' | 'done' | 'error'; previewUrl?: string; result?: Uploaded; error?: string }

async function resize(file: File, edge: number, quality: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Fotoğraf hazırlanamadı. Başka bir tarayıcıda tekrar deneyin.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) throw new Error('Fotoğraf hazırlanamadı.');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.png'), { type: blob.type });
  } finally { bitmap.close(); }
}

export function useUploader(weddingId: string) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const update = useCallback((next: UploadItem[]) => { itemsRef.current = next; setItems(next); }, []);
  const patch = (id: string, values: Partial<UploadItem>) => update(itemsRef.current.map(item => item.id === id ? { ...item, ...values } : item));
  useEffect(() => () => { itemsRef.current.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); }); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (busy.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    if (busy.current) return;
    const next = [...itemsRef.current];
    for (const file of Array.from(files)) {
      const kind: Kind | null = /^(image\/(jpeg|png|webp))$/.test(file.type) ? 'image' : /^(video\/(mp4|webm|quicktime))$/.test(file.type) ? 'video' : null;
      if (!kind || file.size === 0) { toast.error(file.name + ': JPG, PNG, WebP, MP4, WebM veya MOV seçin.'); continue; }
      if (file.size > (kind === 'image' ? 15 : 50) * 1024 * 1024) { toast.error(file.name + ': Dosya sınırı ' + (kind === 'image' ? '15' : '50') + ' MB.'); continue; }
      if (next.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) continue;
      if (next.some(item => item.kind !== kind) || next.filter(item => item.kind === kind).length >= (kind === 'image' ? 5 : 1)) { toast.error('Bir gönderimde 5 fotoğraf veya 1 video seçebilirsin.'); break; }
      next.push({ id: crypto.randomUUID(), file, kind, status: 'pending', previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined });
    }
    update(next);
  }, [update]);

  const removeItem = useCallback((idx: number) => {
    if (busy.current) return;
    const item = itemsRef.current[idx];
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    update(itemsRef.current.filter((_, i) => i !== idx));
  }, [update]);

  const uploadAll = async (): Promise<Uploaded[]> => {
    if (busy.current) throw new Error('Yükleme devam ediyor.');
    if (!navigator.onLine) throw new Error('İnternet bağlantın yok. Bağlandıktan sonra tekrar dene.');
    busy.current = true; setUploading(true);
    const supabase = getSupabase();
    const results: Uploaded[] = [];
    try {
      // Sequential work bounds phone memory and leaves bandwidth for other guests.
      for (const item of itemsRef.current) {
        if (item.result) { results.push(item.result); continue; }
        patch(item.id, { status: 'uploading', error: undefined });
        try {
          let file = item.file;
          let thumbnail: File | undefined;
          if (item.kind === 'image') {
            const original = file;
            const optimized = await resize(original, 2560, 0.88);
            file = optimized.size < original.size ? optimized : original;
            thumbnail = await resize(original, 800, 0.82);
          }
          const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
          const path = weddingId + '/' + item.id + '.' + ext;
          const thumbnailPath = thumbnail ? weddingId + '/' + item.id + '-thumb.' + thumbnail.name.split('.').pop() : '';
          const put = async (target: string, body: File) => {
            const { error } = await supabase.storage.from('wedding-media').upload(target, body, { cacheControl: '31536000', contentType: body.type, upsert: false });
            // A lost response may leave the object stored. Stable paths make retry safe.
            if (error && String('statusCode' in error ? error.statusCode : '') !== '409' && !/already exists|duplicate/i.test(error.message)) throw error;
          };
          await put(path, file);
          if (thumbnail) await put(thumbnailPath, thumbnail);
          const result = { id: item.id, path, thumbnailPath, kind: item.kind, file };
          patch(item.id, { status: 'done', result }); results.push(result);
        } catch {
          patch(item.id, { status: 'error', error: 'Yüklenemedi. Bağlantını kontrol edip tekrar dene.' });
        }
      }
      if (results.length !== itemsRef.current.length) throw new Error(results.length + '/' + itemsRef.current.length + ' dosya yüklendi. Tekrar denediğinde yalnızca eksik dosyalar yüklenecek.');
      return results;
    } finally { busy.current = false; setUploading(false); }
  };
  const reset = useCallback(() => {
    if (busy.current) return;
    itemsRef.current.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); }); update([]);
  }, [update]);
  return { items, addFiles, removeItem, uploadAll, reset, uploading, completedCount: items.filter(item => item.status === 'done').length, total: items.length };
}
