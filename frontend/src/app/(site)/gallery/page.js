import Link from 'next/link';
import { cmsFetch } from '@/lib/cms';

export const metadata = {
  title: 'Gallery',
  description: 'Explore the latest moments from Preva.',
  alternates: { canonical: '/gallery' }
};

export default async function GalleryIndex() {
  const galleries = await cmsFetch('/galleries') || [];
  return (
    <main className="site-main single-post-luxury">
      <section className="blog-hero"><div className="overlay" /><div className="container relative-z2"><p className="blog-breadcrumbs">PREVA / GALLERY</p><h1 className="blog-title-large">Gallery</h1></div></section>
      <section className="container cms-listing-grid">
        {galleries.map((gallery) => (
          <Link className="cms-listing-card" href={`/gallery/${gallery.slug}`} key={gallery.id}>
            {gallery.coverImage && <img src={gallery.coverImage} alt={gallery.title} />}
            <div><span>{gallery.images?.length || 0} PHOTOS</span><h2>{gallery.title}</h2><p>{gallery.description}</p></div>
          </Link>
        ))}
        {!galleries.length && <div className="cms-public-empty"><h2>No galleries published yet</h2><p>Published galleries will appear here automatically.</p></div>}
      </section>
    </main>
  );
}
