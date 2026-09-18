'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Camera, ImageIcon, MessageSquare, Mic, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
  names: string;
}

const links = [
  { href: '', label: 'Ana Sayfa', icon: Home },
  { href: '/upload', label: 'Anı Bırak', icon: Camera },
  { href: '/gallery', label: 'Galeri', icon: ImageIcon },
  { href: '/messages', label: 'Mesaj', icon: MessageSquare },
  { href: '/voice', label: 'Ses', icon: Mic },
  { href: '#nisan-rehberi', label: 'Rehber', icon: Sparkles },
];

export function WeddingNav({ slug, names }: Props) {
  const pathname = usePathname();
  const base = `/w/${slug}`;

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={base} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <span className="font-serif text-lg font-light text-charcoal">{names}</span>
          </Link>
        </div>
      </div>

      {/* Bottom nav (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
          {links.map((l) => {
            const full = `${base}${l.href}`;
            const active = l.href === '' ? pathname === base : pathname?.startsWith(full);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={full}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
