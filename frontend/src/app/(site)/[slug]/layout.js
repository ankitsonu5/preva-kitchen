import { cmsFetch, contentMetadata } from '@/lib/cms';
import { notFound, permanentRedirect } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);
  
  if (!page) {
    // If this slug belongs to a blog post, permanently 301 redirect to canonical /blog/:slug
    const post = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);
    if (post) {
      permanentRedirect(`/blog/${encodeURIComponent(slug)}`);
    }
    notFound();
  }

  return contentMetadata(page, {
    alternates: {
      canonical: `/${encodeURIComponent(slug)}`
    }
  });
}

export default async function DynamicPageLayout({ params, children }) {
  const { slug } = await params;
  const page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);

  if (!page) {
    const post = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);
    if (post) {
      permanentRedirect(`/blog/${encodeURIComponent(slug)}`);
    }
    notFound();
  }

  return children;
}
