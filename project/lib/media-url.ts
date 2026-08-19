const BUCKET = 'wedding-media';

export function getMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:|blob:|data:)/i.test(path)) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!supabaseUrl) return '';

  const encodedPath = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}
