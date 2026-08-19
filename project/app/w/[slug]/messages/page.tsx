import { notFound } from 'next/navigation';
import { getWeddingBySlug } from '@/lib/wedding-data';
import { MessageForm } from '@/components/wedding/message-form';

export const dynamic = 'force-dynamic';

export default async function MessagesPage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  return <MessageForm wedding={wedding} />;
}
