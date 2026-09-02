import { cmsFetch, contentMetadata } from '@/lib/cms';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);
  const post = page ? null : await cmsFetch(`/posts/${encodeURIComponent(slug)}`);
  const content = page || post;

  if (!content) notFound();

  return contentMetadata(content, {
    alternates: {
      canonical: page
        ? `/${encodeURIComponent(slug)}`
        : `/blog/${encodeURIComponent(slug)}`
    }
  });
}

export default function DynamicPageLayout({ children }) {
  return children;
}
