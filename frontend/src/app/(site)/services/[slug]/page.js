import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch, contentMetadata } from '@/lib/cms';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return contentMetadata(
    await cmsFetch(`/services/${encodeURIComponent(slug)}`),
    { alternates: { canonical: `/services/${encodeURIComponent(slug)}` } }
  );
}

export default async function ServiceDetail({ params }) {
  const { slug } = await params;
  const service = await cmsFetch(`/services/${encodeURIComponent(slug)}`);
  if (!service || /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b/i.test(`${service.title || ''} ${service.excerpt || ''}`)) notFound();
  const content = service.content || service.description || '';
  return <main className="site-main single-post-luxury"><section className="blog-hero">{service.image && <img src={service.image} className="blog-hero-image" alt={service.title} />}<div className="overlay" /><div className="container relative-z2"><div className="blog-breadcrumbs"><Link href="/">HOME</Link><span>/</span><Link href="/services">EXPERIENCES</Link></div><h1 className="blog-title-large">{service.title}</h1><p>{service.excerpt}</p></div></section><article className="container cms-rich-content" dangerouslySetInnerHTML={{ __html: content }} /></main>;
}
