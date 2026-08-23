import { permanentRedirect } from 'next/navigation';

export default async function LegacyProductPage({ params }) {
  const { slug } = await params;
  permanentRedirect(`/shop/${encodeURIComponent(slug)}`);
}
