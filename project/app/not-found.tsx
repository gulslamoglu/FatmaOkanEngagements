import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="animate-fade-up">
        <h1 className="font-serif text-5xl font-light text-charcoal">404</h1>
        <p className="mt-4 font-serif text-xl text-muted-foreground font-light italic">
          &quot;Bu sayfa bulunamadı.&quot;
        </p>
        <Link
          href="/w/fatma-okan"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
