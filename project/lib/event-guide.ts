import { z } from 'zod';
export const eventGuideSchema = z.object({
  schedule: z.array(z.object({ time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), title: z.string().trim().min(1).max(80), description: z.string().trim().max(240) })).max(20),
  menu: z.array(z.object({ title: z.string().trim().min(1).max(80), description: z.string().trim().max(300) })).max(20),
  note: z.string().trim().max(500),
});
export type EventGuideData = z.infer<typeof eventGuideSchema>;
export function getEventGuide(value: unknown): EventGuideData {
  const result = eventGuideSchema.safeParse(value);
  return result.success ? result.data : { schedule: [], menu: [], note: '' };
}

export const engagementLocation = '333 Wedding Garden · Gümüşpala Mahallesi, İskeçe Caddesi No: 7/3, Avcılar / İstanbul';
export const engagementGuide: EventGuideData = {
  schedule: [{ time: '19:00', title: 'Nişanımıza hoş geldiniz', description: 'Bu özel akşamı birlikte karşılıyoruz.' }],
  menu: [
    { title: 'Antre Tabağı', description: 'Nar ekşili kısır, patates salatası, şakşuka, dereotlu yoğurtlu boncuk makarna, Pembe Sultan, Girit mezesi, buğdaylı haydari' },
    { title: 'Ara Sıcak', description: 'Kızarmış çıtır Çin böreği' },
    { title: 'Ana Yemek', description: 'Dana lokum (patates yatağında), tereyağlı pirinç pilavı, patates püresi, domates ve biber' },
    { title: 'Tatlı', description: 'Düğün pastası' },
    { title: 'İçecekler', description: 'Sınırsız meşrubat ve su' },
  ],
  note: '333 DAVET · KIYI FLORYA — Ziyafet Menü',
};
