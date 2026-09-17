export const GUEST_LIMITS = { image: 20, video: 5, audio: 2 } as const;
export type QuotaKind = keyof typeof GUEST_LIMITS;
export interface GuestUsage { image: number; video: number; audio: number; ids: string[] }
export const emptyUsage = (): GuestUsage => ({ image: 0, video: 0, audio: 0, ids: [] });
export function remainingFor(usage: GuestUsage, kind: QuotaKind) {
  return Math.max(0, GUEST_LIMITS[kind] - usage[kind]);
}
export function checkAllowance(usage: GuestUsage, items: { id: string; kind: QuotaKind }[]) {
  const seen = new Set(usage.ids);
  const requested = { image: 0, video: 0, audio: 0 };
  for (const item of items) { if (!seen.has(item.id)) { requested[item.kind]++; seen.add(item.id); } }
  const labels = { image: 'fotoğraf', video: 'video', audio: 'ses kaydı' };
  for (const kind of Object.keys(GUEST_LIMITS) as QuotaKind[]) {
    if (requested[kind] > remainingFor(usage, kind)) throw new Error('Kalan ' + labels[kind] + ' hakkın: ' + remainingFor(usage, kind) + '. Seçimini buna göre düzenleyebilirsin.');
  }
}
