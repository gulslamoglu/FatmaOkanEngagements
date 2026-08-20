import { notFound } from 'next/navigation';
import { getWeddingBySlug, getApprovedMemories } from '@/lib/wedding-data';
import { Gallery } from '@/components/wedding/gallery';

export const dynamic = 'force-dynamic';

export default async function GalleryPage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  // Fetch one extra row so the client knows whether another page exists.
  const memories = await getApprovedMemories(wedding.id, 25);
  return <Gallery wedding={wedding} initialMemories={memories} />;
}
