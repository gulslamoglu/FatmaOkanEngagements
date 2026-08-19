import type { Wedding } from '@/lib/types';

export function formatDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${formatTime(dateStr)}`;
}

export function coupleNames(w: { bride_name: string; groom_name: string }): string {
  return `${w.bride_name} & ${w.groom_name}`;
}

export type { Wedding };
