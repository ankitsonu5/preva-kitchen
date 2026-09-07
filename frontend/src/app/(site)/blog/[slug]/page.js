import Link from 'next/link';
import { notFound } from 'next/navigation';
import SvgIcon from '@/components/SvgIcon';
import { cmsFetch } from '@/lib/cms';
import { getCanonicalOrigin } from '@/lib/site-url';
import { rewriteLegacyBlogLinks } from '@/lib/blog-links';
import { generateBlogPostSchema } from '@/lib/seo-schema';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const siteOrigin = getCanonicalOrigin();
  const post = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);

  if (!post) {
    return {
      title: 'Blog Post Not Found | Preva Kitchen',
      robots: { index: false, follow: false }
    };
  }

  const cleanTitle = post.seoTitle || `${post.title} | Preva Kitchen`;
  const cleanDesc = post.seoDescription || post.excerpt || String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || 'Preva Kitchen culinary journal.';
  const shareImg = post.ogImage || post.featuredImage || `${siteOrigin}/asset/home-reference/preva-restaurant-hero.png`;
  const canonical = post.canonicalUrl || `${siteOrigin}/blog/${encodeURIComponent(post.slug)}`;
  const tagsList = (post.tags || []).map(t => t.tag?.name || t.name).filter(Boolean);
  const categoryName = post.categories?.[0]?.category?.name || post.categories?.[0]?.name || 'Culinary Journal';

  return {
    title: cleanTitle,
    description: cleanDesc,
    keywords: post.focusKeyword ? [post.focusKeyword, ...tagsList, 'Preva Kitchen', 'Redford MI'] : [...tagsList, 'Preva Kitchen', 'Redford MI'],
    alternates: {
      canonical: canonical
    },
    openGraph: {
      title: post.ogTitle || cleanTitle,
      description: post.ogDescription || cleanDesc,
      url: canonical,
      siteName: 'Preva Kitchen',
      type: 'article',
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt || post.publishedAt || post.createdAt,
      authors: [post.author?.name || 'Preva Kitchen Culinary Team'],
      section: categoryName,
      tags: tagsList,
      images: [
        {
          url: shareImg,
          width: 1200,
          height: 630,
          alt: post.title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: post.ogTitle || cleanTitle,
      description: post.ogDescription || cleanDesc,
      images: [shareImg]
    },
    robots: post.noIndex ? { index: false, follow: false } : { index: true, follow: true }
  };
}

export default async function BlogPost({ params }) {
  const { slug } = await params;
  const post = await cmsFetch(`/posts/${encodeURIComponent(slug)}`);

  const nonKitchenCopy = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|afrobeats|sports bar|happy hour|pre-game|afterpart|party at|dress code/i;
  if (!post || nonKitchenCopy.test(`${post.title || ''} ${post.excerpt || ''} ${(post.categories || []).map((item) => item.category?.name || item.name || '').join(' ')}`)) {
    notFound();
  }

  const postsResponse = await cmsFetch('/posts', { query: { limit: 100 } });
  const allPosts = (Array.isArray(postsResponse) ? postsResponse : []).filter((item) => !nonKitchenCopy.test(`${item.title || ''} ${item.excerpt || ''} ${(item.categories || []).map((entry) => entry.category?.name || entry.name || '').join(' ')}`));
  const recentPosts = allPosts.filter((item) => item.slug !== slug).slice(0, 4);

  const formattedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const categoryName = post.categories?.[0]?.category?.name || post.categories?.[0]?.name || 'Culinary Journal';
  const siteOrigin = getCanonicalOrigin();
  const articleUrl = `${siteOrigin}/blog/${encodeURIComponent(post.slug)}`;

  // Comprehensive Schema.org JSON-LD (BlogPosting, BreadcrumbList, FAQPage, Recipe, Person)
  const fullSchema = generateBlogPostSchema(post, siteOrigin);

  return (
    <main id="primary" className="site-main single-post-luxury">
      {fullSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(fullSchema).replace(/</g, '\\u003c') }}
        />
      )}
      
      {/* Header Section — clean simple typography & breadcrumb centered */}
      <section className="blog-hero">
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: 'auto', paddingBlock: '14px 16px' }}>
          
          {/* Structured Visual Breadcrumb Bar */}
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
            {post.title}
          </h1>

          <div className="post-meta-refined" style={{ display: 'flex', gap: '18px', color: '#bbb', fontSize: '0.84rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', margin: '0 auto' }}>
            <span className="date" style={{ display: 'flex', alignItems: 'center' }}>
              <SvgIcon name="calendar" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />{formattedDate}
            </span>
            <span className="author" style={{ display: 'flex', alignItems: 'center' }}>
              <SvgIcon name="info" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />BY {(post.author?.name || 'PREVA CULINARY TEAM').toUpperCase()}
            </span>
            <span style={{ background: 'rgba(197, 163, 78, 0.15)', border: '1px solid #c5a059', color: '#c5a059', padding: '3px 12px', borderRadius: '15px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              {categoryName}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area with Sticky Sidebar */}
      <div className="container" style={{ paddingBlock: '32px 60px' }}>
        <div className="blog-details-layout">
          
          {/* Left Main Article Column */}
          <article className="blog-main-content">
            {/* FEATURED IMAGE */}
            {post.featuredImage && (
              <div className="single-featured-image-wrap" style={{ marginBottom: '35px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <img src={post.featuredImage} className="single-featured-image" alt={post.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}

            {/* Article Content */}
            <div className="post-content-inner">
              <div 
                className="post-main-content" 
                style={{ color: '#ccc', fontSize: '1.08rem', lineHeight: '1.85' }} 
                dangerouslySetInnerHTML={{ __html: rewriteLegacyBlogLinks(post.content) }} 
              />

              {/* Author Bio Box */}
              <div style={{ marginTop: '50px', background: 'rgba(18, 18, 18, 0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-gold, #c5a059)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '1.5rem', flexShrink: 0 }}>
                  P
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.05rem' }}>Written by {post.author?.name || 'PREVA Culinary Team'}</h4>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    Bringing you chef stories, menu inspirations, kitchen updates and honest food worth sharing from Redford, Michigan.
                  </p>
                </div>
              </div>


            </div>
          </article>

          {/* Right Column - STICKY SIDEBAR */}
          <aside className="blog-sticky-sidebar">
            
            {/* Widget 1: About Preva Venue */}
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

            {/* Widget 2: Recent Stories */}
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

            {/* Widget 3: Explore Topics */}
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

            {/* Sticky kitchen reservation CTA */}
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
  );
}
