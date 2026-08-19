import { notFound } from 'next/navigation';
import { getWeddingBySlug } from '@/lib/wedding-data';
import { UploadFlow } from '@/components/wedding/upload-flow';

export const dynamic = 'force-dynamic';

export default async function UploadPage({ params }: { params: { slug: string } }) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  return <UploadFlow wedding={wedding} />;
}
