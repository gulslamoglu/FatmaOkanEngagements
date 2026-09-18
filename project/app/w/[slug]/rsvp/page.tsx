import { notFound } from 'next/navigation';
import { getWeddingBySlug } from '@/lib/wedding-data';
import { RsvpForm } from '@/components/wedding/rsvp-form';

export const dynamic = 'force-dynamic';

export default async function RsvpPage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  return <RsvpForm wedding={wedding} />;
}