import './globals.css';
import type { Metadata } from 'next';
import { serif, sans } from '@/lib/fonts';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Anılarımız — Fatma & Okan',
  description: 'Nişan anılarını paylaşın. Çektiğiniz fotoğraf, video ve mesajları burada biriktirin.',
  robots: { index: false, follow: false },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#faf8f5',
  openGraph: { images: [] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
