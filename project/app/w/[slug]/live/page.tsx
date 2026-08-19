import { notFound } from 'next/navigation';
import { getWeddingBySlug, getApprovedMemories } from '@/lib/wedding-data';
import { LiveWall } from '@/components/wedding/live-wall';

export const dynamic = 'force-dynamic';

export default async function LivePage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  if (!wedding.live_wall_enabled) notFound();
  const memories = await getApprovedMemories(wedding.id, 100);
  const names = `${wedding.bride_name} & ${wedding.groom_name}`;
  return <LiveWall weddingId={wedding.id} names={names} initialMemories={memories} />;
}
