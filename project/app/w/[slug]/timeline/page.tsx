import { notFound } from 'next/navigation';
import { getWeddingBySlug, getApprovedMemories } from '@/lib/wedding-data';
import { Timeline } from '@/components/wedding/timeline';

export const dynamic = 'force-dynamic';

export default async function TimelinePage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  const memories = await getApprovedMemories(wedding.id, 200);
  return <Timeline memories={memories} />;
}
