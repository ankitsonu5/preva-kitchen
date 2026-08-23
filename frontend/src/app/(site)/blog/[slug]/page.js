import Link from 'next/link';
import { notFound } from 'next/navigation';
import SvgIcon from '@/components/SvgIcon';
import { cmsFetch } from '@/lib/cms';

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
  const currentIndex = allPosts.findIndex((item) => item.slug === slug);
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const prevPost = currentIndex >= 0 && currentIndex < allPosts.length - 1
    ? allPosts[currentIndex + 1]
    : null;

  const formattedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const categoryName = post.categories?.[0]?.category?.name || post.categories?.[0]?.name || 'Journal';
  const siteOrigin = (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const articleUrl = `${siteOrigin}/blog/${encodeURIComponent(post.slug)}`;
  const articleDescription = post.seoDescription || post.excerpt || String(post.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seoTitle || post.title,
    description: articleDescription,
    image: post.ogImage || post.featuredImage || undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt || post.createdAt,
    author: { '@type': 'Person', name: post.author?.name || 'Preva Team' },
    publisher: { '@type': 'Organization', name: 'Preva Kitchen', logo: { '@type': 'ImageObject', url: `${siteOrigin}/asset/preva-logo.svg` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    articleSection: categoryName,
    keywords: (post.tags || []).map((item) => item.tag?.name).filter(Boolean).join(', ') || post.focusKeyword || undefined
  };

  return (
    <main id="primary" className="site-main single-post-luxury">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, '\\u003c') }}
      />
      
      {/* Powerful Header Section */}
      <section className="blog-hero" style={{ position: 'relative' }}>
        {post.featuredImage && (
          <img src={post.featuredImage} className="blog-hero-image" alt={post.title} />
        )}
        <div className="overlay" style={{ background: 'rgba(0,0,0,0.65)', position: 'absolute', inset: 0 }}></div>
        
        <div className="container relative-z2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', paddingBlock: '60px' }}>
          <div className="blog-breadcrumbs" style={{ color: 'var(--color-gold, #c5a059)', fontSize: '0.85rem', letterSpacing: '1px', fontWeight: 600 }}>
            <Link href="/">HOME</Link>
            <span className="sep" style={{ margin: '0 8px', color: '#666' }}>/</span>
            <Link href="/blog">BLOG</Link>
            <span className="sep" style={{ margin: '0 8px', color: '#666' }}>/</span>
            <span style={{ color: '#aaa' }}>{categoryName.toUpperCase()}</span>
          </div>

          <h1 className="blog-title-large" style={{ color: '#fff', fontSize: 'clamp(2rem, 4vw, 3.2rem)', margin: '16px 0', fontWeight: 'bold', lineHeight: '1.2' }}>
            {post.title}
          </h1>

          <div className="post-meta-refined" style={{ display: 'flex', gap: '24px', color: '#bbb', fontSize: '0.88rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="date" style={{ display: 'flex', alignItems: 'center' }}>
              <SvgIcon name="calendar" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />{formattedDate}
            </span>
            <span className="author" style={{ display: 'flex', alignItems: 'center' }}>
              <SvgIcon name="info" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />BY {(post.author?.name || post.author?.email || 'PREVA TEAM').toUpperCase()}
            </span>
            <span style={{ background: 'rgba(197, 163, 78, 0.15)', border: '1px solid #c5a059', color: '#c5a059', padding: '4px 12px', borderRadius: '15px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              {categoryName}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area with Sticky Sidebar */}
      <div className="container" style={{ paddingBlock: '60px' }}>
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
                dangerouslySetInnerHTML={{ __html: post.content }} 
              />

              {/* Author Info Card Box */}
              <div style={{ marginTop: '50px', background: 'rgba(18, 18, 18, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-gold, #c5a059)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '1.4rem', flexShrink: 0 }}>
                  P
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.05rem' }}>Written by PREVA Team</h4>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    Bringing you chef stories, menu inspiration, kitchen updates and food worth sharing from Redford.
                  </p>
                </div>
              </div>

              {/* Prev / Next Article Navigation */}
              <nav className="post-navigation-system" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '40px', paddingTop: '28px', gap: '20px' }}>
                <div className="nav-system-column" style={{ flex: 1 }}>
                  {prevPost && (
                    <Link href={`/blog/${prevPost.slug}`} className="nav-system-item prev-post" style={{ display: 'block', textDecoration: 'none' }}>
                      <span className="nav-system-label" style={{ display: 'block', fontSize: '0.78rem', color: '#c5a059', letterSpacing: '1px', fontWeight: 600 }}>← PREVIOUS STORY</span>
                      <div className="nav-system-title" style={{ fontSize: '0.95rem', color: '#fff', marginTop: '4px', fontWeight: 'bold' }}>{prevPost.title}</div>
                    </Link>
                  )}
                </div>

                <div className="nav-system-column" style={{ flex: 1, textAlign: 'right' }}>
                  {nextPost && (
                    <Link href={`/blog/${nextPost.slug}`} className="nav-system-item next-post" style={{ display: 'block', textDecoration: 'none' }}>
                      <span className="nav-system-label" style={{ display: 'block', fontSize: '0.78rem', color: '#c5a059', letterSpacing: '1px', fontWeight: 600 }}>NEXT STORY →</span>
                      <div className="nav-system-title" style={{ fontSize: '0.95rem', color: '#fff', marginTop: '4px', fontWeight: 'bold' }}>{nextPost.title}</div>
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          </article>

          {/* Right Column - STICKY SIDEBAR */}
          <aside className="blog-sticky-sidebar">
            
            {/* Widget 1: About Preva Venue */}
            <div className="sidebar-widget-card">
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <img src="/asset/preva-logo.svg" alt="Preva Logo" style={{ height: '42px', width: 'auto', margin: '0 auto 10px auto', display: 'block' }} />
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

            {/* Widget 3: Experience Categories */}
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
