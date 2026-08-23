import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageBuilder from '@/components/PageBuilder';
import { cmsFetch } from '@/lib/cms';

export default async function DynamicPage({ params }) {
  const { slug } = await params;
  let page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);
  let contentKind = 'page';

  // WordPress publishes blog posts at /post-slug/. Keep those indexed URLs
  // working after the Next migration while /blog/post-slug remains available.
  if (!page) {
    page = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);
    contentKind = 'post';
  }

  if (!page) {
    notFound();
  }

  const hasSections = Array.isArray(page.sections) && page.sections.length > 0;

  return (
    <>
      <main id="primary" className="site-main single-post-luxury dynamic-page-custom">
        {/* Page Banner Header */}
        <section className="blog-hero" style={{ position: 'relative' }}>
          {page.featuredImage ? (
            <img src={page.featuredImage} className="blog-hero-image" alt={page.title || ''} />
          ) : null}
          <div className="overlay" style={{ background: 'rgba(0,0,0,0.6)', position: 'absolute', inset: 0 }}></div>
          
          <div className="container relative-z2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <div className="blog-breadcrumbs">
              <Link href="/">HOME</Link>
              <span className="sep">/</span>
              {contentKind === 'post' && (
                <>
                  <Link href="/blog">BLOG</Link>
                  <span className="sep">/</span>
                </>
              )}
              <span>{(page.title || '').toUpperCase()}</span>
            </div>
            <h1 className="blog-title-large" style={{ color: '#fff', fontSize: '3rem', margin: '20px 0', fontWeight: 'bold' }}>
              {page.title}
            </h1>
          </div>
        </section>

        {/* Dynamic Page Content / PageBuilder Sections */}
        {hasSections ? (
          <PageBuilder sections={page.sections} fallbackContent={page.content} />
        ) : (
          <div className="container blog-content-layout no-sidebar" style={{ paddingBlock: '60px' }}>
            <div className="blog-main-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <article className="post-content-inner">
                <div className="luxury-divider" style={{ width: '60px', height: '2px', background: '#c5a059', margin: '20px auto 40px' }}></div>
                <div className="post-main-content" style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: page.content || '' }} />
              </article>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
