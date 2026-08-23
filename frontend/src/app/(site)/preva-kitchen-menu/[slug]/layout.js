import { cmsFetch, contentMetadata } from '@/lib/cms';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);
  return contentMetadata(page, {
    alternates: { canonical: `/preva-kitchen-menu/${encodeURIComponent(slug)}` }
  });
}

export default function MenuItemLayout({ children }) {
  return children;
}
