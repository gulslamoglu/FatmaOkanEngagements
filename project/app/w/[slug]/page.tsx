import { notFound } from 'next/navigation';
import { getWeddingBySlug, getApprovedMemories, getStats } from '@/lib/wedding-data';
import { WeddingHero } from '@/components/wedding/wedding-hero';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export default async function WeddingPage({ params }: PageProps) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();

  const [memories, stats] = await Promise.all([
    getApprovedMemories(wedding.id, 12),
    getStats(wedding.id),
  ]);

  return <WeddingHero wedding={wedding} memories={memories} stats={stats} />;
}
