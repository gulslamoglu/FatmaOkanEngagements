import { notFound } from 'next/navigation';
import { getWeddingBySlug } from '@/lib/wedding-data';
import { WeddingSubLayout } from '@/components/wedding/wedding-sub-layout';

export const dynamic = 'force-dynamic';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const wedding = await getWeddingBySlug(params.slug);
  if (!wedding) notFound();
  const names = `${wedding.bride_name} & ${wedding.groom_name}`;
  return <WeddingSubLayout slug={params.slug} names={names}>{children}</WeddingSubLayout>;
}
