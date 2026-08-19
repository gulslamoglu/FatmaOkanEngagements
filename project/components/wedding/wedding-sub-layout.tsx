'use client';

import { usePathname } from 'next/navigation';
import { WeddingNav } from './wedding-nav';

export function WeddingSubLayout({
  slug,
  names,
  children,
}: {
  slug: string;
  names: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLive = pathname?.endsWith('/live');
  const isMain = pathname === `/w/${slug}`;

  return (
    <div className="min-h-screen pb-20">
      {!isMain && !isLive && <WeddingNav slug={slug} names={names} />}
      {children}
    </div>
  );
}
