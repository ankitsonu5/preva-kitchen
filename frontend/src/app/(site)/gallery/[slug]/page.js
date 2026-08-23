import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cmsFetch, contentMetadata } from '@/lib/cms';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return contentMetadata(
    await cmsFetch(`/galleries/${encodeURIComponent(slug)}`),
    { alternates: { canonical: `/gallery/${encodeURIComponent(slug)}` } }
  );
}

export default async function GalleryDetail({ params }) {
  const { slug } = await params;
  const gallery = await cmsFetch(`/galleries/${encodeURIComponent(slug)}`);
  if (!gallery) notFound();
  const images = [...(gallery.images || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  return (
    <main className="site-main single-post-luxury">
      <section className="blog-hero" style={gallery.coverImage ? { backgroundImage: `url(${gallery.coverImage})` } : undefined}><div className="overlay" /><div className="container relative-z2"><div className="blog-breadcrumbs"><Link href="/">HOME</Link><span>/</span><Link href="/gallery">GALLERY</Link></div><h1 className="blog-title-large">{gallery.title}</h1><p>{gallery.description}</p></div></section>
      <section className="container cms-gallery-grid">
        {images.map((item, index) => <figure key={item.id || item.url || index}><img src={item.url || item.src} alt={item.altText || item.caption || gallery.title} loading="lazy" /><figcaption>{item.caption}</figcaption></figure>)}
      </section>
    </main>
  );
}
