'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Images, MessageSquare, Settings, LogOut, ExternalLink } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/admin/memories', label: 'Anılar', icon: Images },
  { href: '/admin/messages', label: 'Mesajlar', icon: MessageSquare },
  { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace('/admin');
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Sidebar - desktop */}
      <aside className="hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="p-6">
          <h1 className="font-serif text-xl font-light text-charcoal">Fatma & Okan</h1>
          <p className="text-xs text-muted-foreground">Yönetim Paneli</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-charcoal'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link href="/w/fatma-okan" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary">
            <ExternalLink className="h-4 w-4" /> Siteyi Gör
          </Link>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary">
            <LogOut className="h-4 w-4" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <h1 className="font-serif text-lg font-light text-charcoal">Yönetim</h1>
        <button onClick={handleLogout} className="text-muted-foreground"><LogOut className="h-5 w-5" /></button>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card md:hidden">
        <div className="flex items-center justify-around py-1.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
