import Link from 'next/link';
import { cmsFetch } from '@/lib/cms';
import PageBuilder from '@/components/PageBuilder';
import SvgIcon from '@/components/SvgIcon';
import { rewriteLegacyBlogLinks } from '@/lib/blog-links';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateBlogPostSchema } from '@/lib/seo-schema';

import ContactContent from '@/components/contact/ContactContent';
import ShopContent from '@/components/shop/ShopContent';
import GalleryContent from '@/components/gallery/GalleryContent';
import CareersLanding from '@/components/careers/CareersLanding';
import HomeContent from '@/components/home/HomeContent';
import { getPublishedCareerJobs } from '@/lib/career-api';

export const metadata = {
  title: 'Preview | Preva Kitchen',
  robots: { index: false, follow: false }
};

export default async function PreviewPage({ searchParams }) {
  const { token } = await searchParams;
  const content = token ? await cmsFetch(`/preview/${encodeURIComponent(token)}`) : null;

  if (!content) {
    return (
      <main className="cms-preview-state" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', textAlign: 'center', padding: '120px 20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(201, 168, 76, 0.1)', border: '1px solid rgba(201, 168, 76, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#c5a059' }}>
          <SvgIcon name="eye" size={28} />
        </div>
        <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '10px', fontFamily: 'var(--font-heading, serif)' }}>Preview Unavailable</h1>
        <p style={{ color: '#888', maxWidth: '440px', lineHeight: '1.6', marginBottom: '24px' }}>
          This preview link is invalid or has expired. Please return to the admin panel and click Preview again to generate a fresh link.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/admin/content" className="btn btn-primary" style={{ background: 'var(--color-gold, #c5a059)', color: '#12100d', fontWeight: 700, padding: '10px 22px', borderRadius: '8px', textDecoration: 'none' }}>
            Go to Admin
          </Link>
          <Link href="/" className="btn btn-secondary" style={{ border: '1px solid #444', color: '#ccc', padding: '10px 22px', borderRadius: '8px', textDecoration: 'none' }}>
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  const isPage = content.type === 'PAGE';
  const rawSlug = (content.slug || '').toLowerCase().trim().replace(/^\/|\/$/g, '');
  const hasSections = Array.isArray(content.sections) && content.sections.length > 0;
  const siteOrigin = getCanonicalOrigin();
  const formattedDate = new Date(content.publishedAt || content.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const categoryName = content.categories?.[0]?.category?.name || content.categories?.[0]?.name || (isPage ? 'Page' : 'Culinary Journal');

  // Route categorization for 1:1 authentic live template rendering
  const isMenuPage = ['menu', 'preva-kitchen-menu', 'order-online', 'online-order-platform', 'shop', 'preva-kitchen'].includes(rawSlug);
  const isContactPage = ['contact', 'contact-us'].includes(rawSlug);
  const isGalleryPage = ['gallery', 'dining-gallery'].includes(rawSlug);
  const isCareersPage = ['careers', 'career'].includes(rawSlug);
  const isHomePage = ['home', 'index', ''].includes(rawSlug);

  // If blog post, fetch recent posts for sidebar exactly like the live post route
  let recentPosts = [];
  if (!isPage) {
    const postsResponse = await cmsFetch('/posts', { query: { limit: 10 } });
    const nonKitchenCopy = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|afrobeats|sports bar|happy hour|pre-game|afterpart|party at|dress code/i;
    const allPosts = (Array.isArray(postsResponse) ? postsResponse : []).filter((item) => !nonKitchenCopy.test(`${item.title || ''} ${item.excerpt || ''} ${(item.categories || []).map((entry) => entry.category?.name || entry.name || '').join(' ')}`));
    recentPosts = allPosts.filter((item) => String(item.id || item._id) !== String(content.id || content._id) && item.slug !== content.slug).slice(0, 4);
  }

  // If careers page preview, fetch career jobs
  let careerJobs = [];
  if (isCareersPage) {
    try {
      careerJobs = (await getPublishedCareerJobs()).filter((job) => !/night\s*club|night\s*life|\bclub\b|\bvip\b|bottle|barback|security|door host/i.test(`${job.department || ''} ${job.title || ''} ${job.slug || ''}`));
    } catch {
      careerJobs = [];
    }
  }

  const schemaData = !isPage
    ? generateBlogPostSchema(content, siteOrigin)
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: content.seoTitle || content.title,
        headline: content.seoTitle || content.title,
        description: content.seoDescription || content.excerpt || '',
        url: `${siteOrigin}/${content.slug || ''}`,
        image: content.ogImage || content.featuredImage || `${siteOrigin}/asset/home-reference/preva-restaurant-hero.png`,
        publisher: {
          '@type': 'Organization',
          name: 'Preva Kitchen',
          url: siteOrigin,
          logo: { '@type': 'ImageObject', url: `${siteOrigin}/asset/preva-logo.svg` }
        }
      };

  return (
    <>
      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData).replace(/</g, '\\u003c') }}
        />
      )}

      {/* WordPress-Style Floating Live Preview Dock Bar */}
      <aside
        aria-label="Preview Bar"
        className="wp-preview-dock-bar"
        style={{
          position: 'fixed',
          bottom: '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'rgba(18, 16, 13, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(197, 160, 89, 0.45)',
          borderRadius: '50px',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 14px 38px rgba(0,0,0,0.7), 0 0 20px rgba(197, 160, 89, 0.18)',
          color: '#fff',
          fontSize: '0.84rem',
          maxWidth: 'min(92vw, 760px)',
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--color-gold, #c5a059)', letterSpacing: '0.8px', fontSize: '0.78rem', textTransform: 'uppercase', flexShrink: 0 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }}></span>
          Live Preview
        </div>
        <span style={{ color: '#555', flexShrink: 0 }}>|</span>
        <span style={{ color: '#ccc', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
          <span style={{ opacity: 0.65 }}>{isPage ? 'Page' : 'Blog'}:</span> <strong style={{ color: '#fff' }}>{content.title || 'Untitled'}</strong>
        </span>
        <span style={{ background: 'rgba(197, 160, 89, 0.18)', border: '1px solid rgba(197, 160, 89, 0.35)', color: '#e8cb85', padding: '2px 9px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
          {content.status || 'DRAFT'}
        </span>
        <span style={{ color: '#555', flexShrink: 0 }}>|</span>
        <Link
          href={`/admin/content/edit?id=${content.id || content._id}&type=${content.type || 'PAGE'}`}
          style={{
            background: 'var(--color-gold, #c5a059)',
            color: '#12100d',
            padding: '5px 15px',
            borderRadius: '18px',
            fontWeight: 700,
            fontSize: '0.78rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(197, 160, 89, 0.25)',
            flexShrink: 0
          }}
        >
          ✏️ Edit in Admin
        </Link>
      </aside>

      {/* ── CASE 1: PAGES ── */}
      {isPage ? (
        isMenuPage ? (
          <div>
            {hasSections && <PageBuilder sections={content.sections} />}
            <ShopContent />
          </div>
        ) : isContactPage ? (
          <div>
            {hasSections && <PageBuilder sections={content.sections} />}
            <ContactContent />
          </div>
        ) : isGalleryPage ? (
          <div>
            {hasSections && <PageBuilder sections={content.sections} />}
            <GalleryContent />
          </div>
        ) : isCareersPage ? (
          <div>
            {hasSections && <PageBuilder sections={content.sections} />}
            <CareersLanding jobs={careerJobs} />
          </div>
        ) : isHomePage ? (
          <div>
            {hasSections && <PageBuilder sections={content.sections} />}
            <HomeContent />
          </div>
        ) : (
          /* Any other CMS Dynamic Page (Current or Future) */
          <main id="primary" className="site-main single-post-luxury dynamic-page-custom">
            <section className="blog-hero" style={{ position: 'relative' }}>
              {content.featuredImage ? (
                <img src={content.featuredImage} className="blog-hero-image" alt={content.title || ''} />
              ) : null}
              <div className="overlay" style={{ background: 'rgba(0,0,0,0.6)', position: 'absolute', inset: 0 }}></div>
              
              <div className="container relative-z2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                <div className="blog-breadcrumbs">
                  <Link href="/">HOME</Link>
                  <span className="sep">/</span>
                  <span>{(content.title || '').toUpperCase()}</span>
                </div>
                <h1 className="blog-title-large" style={{ color: '#fff', fontSize: '3rem', margin: '20px 0', fontWeight: 'bold' }}>
                  {content.title}
                </h1>
              </div>
            </section>

            {hasSections ? (
              <PageBuilder sections={content.sections} fallbackContent={content.content} />
            ) : (
              <div className="container blog-content-layout no-sidebar" style={{ paddingBlock: '60px' }}>
                <div className="blog-main-content" style={{ maxWidth: '900px', margin: '0 auto' }}>
                  <div 
                    className="post-main-content" 
                    style={{ color: '#ccc', fontSize: '1.08rem', lineHeight: '1.85' }} 
                    dangerouslySetInnerHTML={{ __html: rewriteLegacyBlogLinks(content.content || '<p>No content written yet.</p>') }} 
                  />
                </div>
              </div>
            )}
          </main>
        )
      ) : (
        /* ── CASE 2: BLOG POST TEMPLATE (matching /blog/[slug]) ── */
        <main id="primary" className="site-main single-post-luxury">
          <section className="blog-hero">
            <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: 'auto', paddingBlock: '14px 16px' }}>
              
              <nav aria-label="Breadcrumb" className="blog-breadcrumbs" itemScope itemType="https://schema.org/BreadcrumbList" style={{ color: 'var(--color-gold, #c5a059)', fontSize: '0.8rem', letterSpacing: '1px', fontWeight: 600, paddingTop: '32px', marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <Link href="/" itemProp="item" style={{ color: '#c5a059', textDecoration: 'none' }}>
                    <span itemProp="name">HOME</span>
                  </Link>
                  <meta itemProp="position" content="1" />
                </span>
                <span className="sep" style={{ margin: '0 8px', color: '#666' }}>/</span>
                <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <Link href="/blog" itemProp="item" style={{ color: '#c5a059', textDecoration: 'none' }}>
                    <span itemProp="name">BLOG</span>
                  </Link>
                  <meta itemProp="position" content="2" />
                </span>
                <span className="sep" style={{ margin: '0 8px', color: '#666' }}>/</span>
                <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <span itemProp="name" style={{ color: '#aaa' }}>{categoryName.toUpperCase()}</span>
                  <meta itemProp="position" content="3" />
                </span>
              </nav>

              <h1 className="blog-title-large" style={{ color: '#fff', fontSize: 'clamp(1.45rem, 2.3vw, 2.15rem)', margin: '6px auto 14px', maxWidth: '880px', fontWeight: 'bold', lineHeight: '1.28', textAlign: 'center' }}>
                {content.title || 'Untitled Post'}
              </h1>

              <div className="post-meta-refined" style={{ display: 'flex', gap: '18px', color: '#bbb', fontSize: '0.84rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', margin: '0 auto' }}>
                <span className="date" style={{ display: 'flex', alignItems: 'center' }}>
                  <SvgIcon name="calendar" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />{formattedDate}
                </span>
                <span className="author" style={{ display: 'flex', alignItems: 'center' }}>
                  <SvgIcon name="info" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />BY {(content.author?.name || 'PREVA CULINARY TEAM').toUpperCase()}
                </span>
                <span style={{ background: 'rgba(197, 163, 78, 0.15)', border: '1px solid #c5a059', color: '#c5a059', padding: '3px 12px', borderRadius: '15px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  {categoryName}
                </span>
              </div>
            </div>
          </section>

          <div className="container" style={{ paddingBlock: '32px 60px' }}>
            <div className="blog-details-layout">
              <article className="blog-main-content">
                {content.featuredImage && (
                  <div className="single-featured-image-wrap" style={{ marginBottom: '35px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <img src={content.featuredImage} className="single-featured-image" alt={content.title || ''} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </div>
                )}

                <div className="post-content-inner">
                  <div 
                    className="post-main-content" 
                    style={{ color: '#ccc', fontSize: '1.08rem', lineHeight: '1.85' }} 
                    dangerouslySetInnerHTML={{ __html: rewriteLegacyBlogLinks(content.content || '<p>No content written yet.</p>') }} 
                  />

                  <div style={{ marginTop: '50px', background: 'rgba(18, 18, 18, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-gold, #c5a059)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '1.5rem', flexShrink: 0 }}>
                      P
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.05rem' }}>Written by {content.author?.name || 'PREVA Culinary Team'}</h4>
                      <p style={{ margin: 0, color: '#aaa', fontSize: '0.88rem', lineHeight: '1.5' }}>
                        Bringing you chef stories, menu inspirations, kitchen updates and honest food worth sharing from Redford, Michigan.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <aside className="blog-sticky-sidebar">
                <div className="sidebar-widget-card">
                  <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <img src="/asset/preva-logo-silver.png" alt="Preva Kitchen" style={{ height: '42px', width: 'auto', margin: '0 auto 10px auto', display: 'block' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-gold, #c5a059)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      Cook • Share • Gather
                    </span>
                  </div>
                  <p style={{ color: '#aaa', fontSize: '0.88rem', lineHeight: '1.6', textAlign: 'center', margin: 0 }}>
                    Redford&apos;s home for chef-driven comfort food, signature plates, easy online ordering and group meals.
                  </p>
                </div>

                {recentPosts.length > 0 && (
                  <div className="sidebar-widget-card">
                    <h3 className="sidebar-widget-title">
                      <SvgIcon name="camera" size={16} /> Latest Stories
                    </h3>
                    <div className="recent-posts-list">
                      {recentPosts.map((rp) => {
                        const rpDate = new Date(rp.publishedAt || rp.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        });
                        return (
                          <Link key={rp.id || rp.slug} href={`/blog/${rp.slug}`} className="recent-post-item">
                            {rp.featuredImage ? (
                              <img src={rp.featuredImage} alt="" className="recent-post-thumb" />
                            ) : (
                              <div className="recent-post-thumb" style={{ display: 'grid', placeItems: 'center', color: '#666' }}>
                                <SvgIcon name="camera" size={18} />
                              </div>
                            )}
                            <div className="recent-post-info">
                              <h4>{rp.title}</h4>
                              <span>{rpDate}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sidebar-widget-card">
                  <h3 className="sidebar-widget-title">
                    <SvgIcon name="info" size={16} /> Explore Topics
                  </h3>
                  <div className="sidebar-category-list">
                    <Link href="/blog" className="sidebar-category-chip">Kitchen Stories</Link>
                    <Link href="/blog" className="sidebar-category-chip">Culinary</Link>
                    <Link href="/blog" className="sidebar-category-chip">Chef Specials</Link>
                    <Link href="/blog" className="sidebar-category-chip">Events</Link>
                    <Link href="/blog" className="sidebar-category-chip">Journal</Link>
                  </div>
                </div>

                <div className="sidebar-widget-card sidebar-vip-cta">
                  <div style={{ marginBottom: '8px', color: '#c9a84c' }}><SvgIcon name="utensils" size={30} /></div>
                  <h3>Plan Your Next Meal</h3>
                  <p>Book a table or tell our kitchen team about your next group meal.</p>
                  <Link href="/#prv-reservations" className="sidebar-vip-btn">
                    Reserve a Table
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </main>
      )}
    </>
  );
}
