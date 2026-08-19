import { notFound } from 'next/navigation';
import { getWeddingBySlug } from '@/lib/wedding-data';
import { VoiceRecorder } from '@/components/wedding/voice-recorder';

export const dynamic = 'force-dynamic';

export default async function VoicePage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  return <VoiceRecorder wedding={wedding} />;
}
