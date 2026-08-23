import Link from 'next/link';
import { cmsFetch } from '@/lib/cms';
import PageBuilder from '@/components/PageBuilder';
import SvgIcon from '@/components/SvgIcon';

export const metadata = { title: 'Content preview | Preva', robots: { index: false, follow: false } };

export default async function PreviewPage({ searchParams }) {
  const { token } = await searchParams;
  const content = token ? await cmsFetch(`/preview/${encodeURIComponent(token)}`) : null;

  if (!content) {
    return (
      <main className="cms-preview-state" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', textAlign: 'center', padding: '120px 20px' }}>
        <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '10px' }}>Preview unavailable</h1>
        <p style={{ color: '#888' }}>This preview link is invalid or has expired.</p>
        <Link href="/" className="btn btn-secondary" style={{ marginTop: '20px' }}>Return Home</Link>
      </main>
    );
  }

  const hasSections = Array.isArray(content.sections) && content.sections.length > 0;
  const formattedDate = new Date(content.publishedAt || content.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const categoryName = content.categories?.[0]?.category?.name || content.categories?.[0]?.name || (content.type === 'PAGE' ? 'Page' : 'Journal');

  return (
    <main className="site-main single-post-luxury" style={{ position: 'relative', paddingTop: '100px' }}>
      {/* Sticky Preview Banner */}
      <div 
        className="cms-preview-banner" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0,
          right: 0,
          zIndex: 9999, 
          padding: '10px 20px', 
          background: 'linear-gradient(135deg, #c5a059 0%, #9e7b39 100%)', 
          color: '#000', 
          textAlign: 'center', 
          fontWeight: 800,
          fontSize: '0.82rem',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
        }}
      >
        <SvgIcon name="eye" size={16} /> DRAFT PREVIEW MODE &middot; Live CMS Design Preview ({content.status || 'DRAFT'})
      </div>

      {/* Hero Header Section */}
      <section className="blog-hero" style={{ position: 'relative', minHeight: '260px', display: 'flex', alignItems: 'center' }}>
        {content.featuredImage && (
          <img src={content.featuredImage} className="blog-hero-image" alt={content.title} />
        )}
        <div className="overlay" style={{ background: 'rgba(0,0,0,0.72)', position: 'absolute', inset: 0 }}></div>
        
        <div className="container relative-z2" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', paddingBlock: '40px 50px' }}>
          <div className="blog-breadcrumbs" style={{ color: 'var(--color-gold, #c5a059)', fontSize: '0.85rem', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px' }}>
            <span>PREVIEW</span>
            <span className="sep" style={{ margin: '0 8px', color: '#666' }}>/</span>
            <span>{content.type || 'POST'}</span>
            <span className="sep" style={{ margin: '0 8px', color: '#666' }}>/</span>
            <span style={{ color: '#aaa' }}>{categoryName.toUpperCase()}</span>
          </div>

          <h1 className="blog-title-large" style={{ color: '#fff', fontSize: 'clamp(2rem, 4vw, 3.2rem)', margin: '12px 0 16px', fontWeight: 'bold', lineHeight: '1.2' }}>
            {content.title || 'Untitled'}
          </h1>

          <div className="post-meta-refined" style={{ display: 'flex', gap: '20px', color: '#bbb', fontSize: '0.88rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="date" style={{ display: 'flex', alignItems: 'center' }}>
              <SvgIcon name="calendar" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />{formattedDate}
            </span>
            <span className="author" style={{ display: 'flex', alignItems: 'center' }}>
              <SvgIcon name="info" size={16} style={{ marginRight: '6px', color: '#c5a059' }} />BY {(content.author?.name || content.author?.email || 'PREVA TEAM').toUpperCase()}
            </span>
            <span style={{ background: 'rgba(197, 163, 78, 0.18)', border: '1px solid #c5a059', color: '#c5a059', padding: '4px 12px', borderRadius: '15px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              {categoryName}
            </span>
            <span style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff', padding: '4px 10px', borderRadius: '15px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {content.status || 'DRAFT'}
            </span>
          </div>
        </div>
      </section>

      {/* Render Dynamic Section Blocks or Rich Blog Layout */}
      {hasSections ? (
        <div style={{ paddingBottom: '80px' }}>
          <PageBuilder sections={content.sections} fallbackContent={content.content} />
        </div>
      ) : (
        <div className="container" style={{ paddingBlock: '50px 80px' }}>
          <div className="blog-details-layout">
            
            {/* Left Main Article Column */}
            <article className="blog-main-content">
              {/* FEATURED IMAGE */}
              {content.featuredImage && (
                <div className="single-featured-image-wrap" style={{ marginBottom: '35px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <img src={content.featuredImage} className="single-featured-image" alt={content.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              )}

              {/* Article Content */}
              <div className="post-content-inner">
                <div 
                  className="post-main-content" 
                  style={{ color: '#ccc', fontSize: '1.08rem', lineHeight: '1.85' }} 
                  dangerouslySetInnerHTML={{ __html: content.content || '<p>No content written yet.</p>' }} 
                />

                {/* Author Info Card Box */}
                <div style={{ marginTop: '50px', background: 'rgba(18, 18, 18, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-gold, #c5a059)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '1.3rem', flexShrink: 0 }}>
                    P
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '1.05rem' }}>Written by PREVA Team</h4>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.88rem', lineHeight: '1.5' }}>
                      Bringing you exclusive insights, culinary stories, nightlife updates, and VIP experiences from Detroit's premier venue.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            {/* Right Column - STICKY SIDEBAR */}
            <aside className="blog-sticky-sidebar">
              <div className="sidebar-widget-card">
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <img src="/asset/preva-logo.svg" alt="Preva Logo" style={{ height: '42px', width: 'auto', margin: '0 auto 10px auto', display: 'block' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-gold, #c5a059)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    Eat &bull; Drink &bull; Vibe
                  </span>
                </div>
                <p style={{ color: '#aaa', fontSize: '0.88rem', lineHeight: '1.6', textAlign: 'center', margin: 0 }}>
                  Detroit’s premiere dining-to-nightlife destination. Experience chef-driven cuisine, signature cocktails, and high-energy weekend DJ sets.
                </p>
              </div>
            </aside>

          </div>
        </div>
      )}
    </main>
  );
}
