import { redirect } from 'next/navigation';
export default function GuidePage({ params }: { params: { slug: string } }) {
  redirect('/w/' + encodeURIComponent(params.slug) + '#nisan-rehberi');
}
