import { notFound } from 'next/navigation';
import { getWeddingBySlug, getApprovedMemories } from '@/lib/wedding-data';
import { Gallery } from '@/components/wedding/gallery';

export const dynamic = 'force-dynamic';

export default async function GalleryPage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  const memories = await getApprovedMemories(wedding.id, 200);
  return <Gallery wedding={wedding} initialMemories={memories} />;
}
