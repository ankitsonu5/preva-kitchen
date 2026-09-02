import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageBuilder from '@/components/PageBuilder';
import { cmsFetch } from '@/lib/cms';
import { rewriteLegacyBlogLinks } from '@/lib/blog-links';
import { getCanonicalOrigin } from '@/lib/site-url';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const siteOrigin = getCanonicalOrigin();
  let page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);
  let isPost = false;
  if (!page) {
    page = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);
    isPost = true;
  }
  if (!page) return { title: 'Not Found' };

  const title = page.seoTitle || page.title || 'Preva Kitchen';
  const description = page.seoDescription || page.excerpt || String(page.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
  const ogImage = page.ogImage || page.featuredImage || '/asset/home-reference/preva-restaurant-hero.png';
  const canonical = page.canonicalUrl || `${siteOrigin}/${isPost ? 'blog/' : ''}${page.slug}`;

  return {
    title,
    description,
    keywords: page.focusKeyword ? [page.focusKeyword] : undefined,
    alternates: {
      canonical
    },
    openGraph: {
      title: page.ogTitle || title,
      description: page.ogDescription || description,
      url: canonical,
      siteName: 'Preva Kitchen',
      images: [{ url: ogImage.startsWith('http') ? ogImage : `${siteOrigin}${ogImage}` }]
    },
    twitter: {
      card: 'summary_large_image',
      title: page.ogTitle || title,
      description: page.ogDescription || description,
      images: [ogImage.startsWith('http') ? ogImage : `${siteOrigin}${ogImage}`]
    },
    robots: {
      index: !page.noIndex,
      follow: !page.noIndex
    }
  };
}

export default async function DynamicPage({ params }) {
  const { slug } = await params;
  let page = await cmsFetch(`/pages/${encodeURIComponent(slug)}`);
  let contentKind = 'page';

  if (!page) {
    page = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);
    contentKind = 'post';
  }

  if (!page) {
    notFound();
  }

  const hasSections = Array.isArray(page.sections) && page.sections.length > 0;
  const siteOrigin = getCanonicalOrigin();
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': contentKind === 'post' ? 'BlogPosting' : 'WebPage',
    name: page.seoTitle || page.title,
    headline: page.seoTitle || page.title,
    description: page.seoDescription || page.excerpt || '',
    url: `${siteOrigin}/${contentKind === 'post' ? 'blog/' : ''}${page.slug}`,
    image: page.ogImage || page.featuredImage || `${siteOrigin}/asset/home-reference/preva-restaurant-hero.png`,
    publisher: {
      '@type': 'Organization',
      name: 'Preva Kitchen',
      url: siteOrigin,
      logo: { '@type': 'ImageObject', url: `${siteOrigin}/asset/preva-logo.svg` }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData).replace(/</g, '\\u003c') }}
      />
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
                <div className="post-main-content" style={{ color: '#ccc', fontSize: '1.1rem', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: contentKind === 'post' ? rewriteLegacyBlogLinks(page.content) : page.content || '' }} />
              </article>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
