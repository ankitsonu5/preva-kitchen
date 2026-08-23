import { cmsFetch, contentMetadata } from '@/lib/cms';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);

  if (!post) notFound();

  return contentMetadata(post, {
    alternates: { canonical: `/blog/${encodeURIComponent(slug)}` }
  });
}

export default function BlogPostLayout({ children }) {
  return children;
}
