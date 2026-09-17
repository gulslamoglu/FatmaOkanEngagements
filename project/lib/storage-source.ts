export function storageObjectPath(source: string, baseUrl?: string): string | null {
  if (!baseUrl) return null;
  try {
    const url = new URL(source);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;
    const prefix = '/storage/v1/object/public/wedding-media/';
    if (!url.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch { return null; }
}
