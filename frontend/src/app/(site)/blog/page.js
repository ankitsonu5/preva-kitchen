"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SvgIcon from '@/components/SvgIcon';
import KitchenLoader from '@/components/KitchenLoader';

const API = '/api';
const POSTS_PER_PAGE = 9;
const NON_KITCHEN_COPY = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|afrobeats|sports bar|happy hour|pre-game|afterpart|party at|dress code/i;

/* Fallback featured images for posts without one — cycles through existing Preva food photos */
const BLOG_FALLBACK_IMAGES = [
  '/asset/hero/preva-steak-hero.jpg',
  '/asset/hero/preva-burger-hero.jpg',
  '/asset/hero/preva-pasta-hero.jpg',
  '/asset/hero/preva-feast-hero.jpg',
  '/asset/hero/menu-hero-cinematic.jpg',
  '/asset/hero/rasta-pasta.webp',
];

function getBlogFallbackImage(title, index) {
  /* Simple hash from title so each post always gets the same image */
  let hash = 0;
  const str = title || '';
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  return BLOG_FALLBACK_IMAGES[Math.abs(hash + index) % BLOG_FALLBACK_IMAGES.length];
}

import { FALLBACK_POSTS } from '@/data/fallbackPosts';

export default function Blog() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState(FALLBACK_POSTS);
  const [loading, setLoading] = useState(true);

  /* Read initial page from URL ?page=N */
  const pageFromUrl = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [currentPage, setCurrentPage] = useState(pageFromUrl);

  /* Sync currentPage when URL search params change (browser back/forward) */
  useEffect(() => {
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    setCurrentPage(urlPage);
  }, [searchParams]);

  useEffect(() => {
    async function loadPosts() {
      try {
        const res = await fetch(`${API}/posts?limit=100`);
        if (res.ok) {
          const data = await res.json();
          const clean = (Array.isArray(data) ? data : []).filter((post) => !NON_KITCHEN_COPY.test(`${post.title || ''} ${post.excerpt || ''} ${(post.categories || []).map((item) => item.category?.name || item.name || '').join(' ')}`));
          if (clean.length > 0) {
            setPosts(clean);
          }
        }
      } catch (err) {
        console.error('Blog fetch failed, using fallback posts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * POSTS_PER_PAGE;
  const visiblePosts = posts.slice(pageStart, pageStart + POSTS_PER_PAGE);

  const changePage = useCallback((page) => {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    if (nextPage === currentPage) return;
    setCurrentPage(nextPage);

    /* Update URL with ?page=N so browser back/forward works */
    const url = nextPage === 1 ? '/blog' : `/blog?page=${nextPage}`;
    router.push(url, { scroll: false });

    requestAnimationFrame(() => {
      document.querySelector('.blog-content-layout')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }, [totalPages, currentPage, router]);

  return (
    <main id="primary" className="site-main" suppressHydrationWarning>
      {/* Hero Section */}
      <section className="blog-hero">
        <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80" className="blog-hero-image" alt="Preva Kitchen blog" />
        <div className="overlay" style={{ background: 'rgba(0,0,0,0.6)', position: 'absolute', inset: 0 }}></div>
        <div className="container relative-z2 text-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <span className="section-eyebrow" style={{ color: 'var(--accent-gold, #c5a059)', fontSize: '0.8rem', letterSpacing: '3px', fontWeight: 700, marginBottom: '12px' }}>
            STORIES & INSIGHTS
          </span>
          <h1 className="blog-title-large" style={{ color: '#fff', fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 700, fontFamily: 'var(--font-roboto), Arial, sans-serif', margin: 0 }}>
            Blog
          </h1>
        </div>
      </section>

      {/* Blog Grid Content */}
      <div className="container blog-content-layout no-sidebar" style={{ paddingBlock: '60px' }}>
        <div className="blog-main-content">
          {loading ? (
            <KitchenLoader text="Loading stories..." />
          ) : posts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888' }}>No stories published yet.</p>
          ) : (
            <>
              <div className="blog-grid">
              {visiblePosts.map((p) => {
                const formattedDate = new Date(p.publishedAt || p.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });
                const categoryName = p.categories?.[0]?.category?.name || p.categories?.[0]?.name || 'Journal';
                return (
                  <article key={p.id || p.slug} className="post-card-premium" onClick={() => router.push(`/blog/${p.slug}`)} style={{ cursor: 'pointer' }}>
                    <div className="post-card-inner">
                      <div className="post-card-image-wrap">
                        {p.featuredImage ? (
                          <Link href={`/blog/${p.slug}`} onClick={(e) => e.stopPropagation()}>
                            <img src={p.featuredImage} alt={p.title} className="post-card-img" />
                          </Link>
                        ) : (
                          <Link href={`/blog/${p.slug}`} className="post-card-placeholder" onClick={(e) => e.stopPropagation()}>
                            <SvgIcon name="camera" size={24} />
                          </Link>
                        )}
                      </div>
                      <div className="post-card-info">
                        <div className="post-card-meta-row">
                          <span className="post-card-date">{formattedDate}</span>
                          <span className="post-card-category-inline">{categoryName}</span>
                        </div>
                        <h3 className="post-card-title">
                          <Link href={`/blog/${p.slug}`} onClick={(e) => e.stopPropagation()}>
                            {p.title}
                          </Link>
                        </h3>
                        <div className="post-card-excerpt">
                          {p.excerpt}
                        </div>
                        <div className="post-card-footer">
                          <Link href={`/blog/${p.slug}`} className="post-card-link" onClick={(e) => e.stopPropagation()}>
                            Explore More <span className="arrow"></span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>

              {totalPages > 1 && (
                <nav className="blog-pagination" aria-label="Blog pagination">
                  <button
                    type="button"
                    className="blog-pagination-control"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                  >
                    <span aria-hidden="true">←</span> Previous
                  </button>

                  <div className="blog-pagination-pages">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        type="button"
                        key={page}
                        className={`blog-pagination-page ${page === safePage ? 'is-active' : ''}`}
                        onClick={() => changePage(page)}
                        aria-label={`Go to page ${page}`}
                        aria-current={page === safePage ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="blog-pagination-control"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={safePage === totalPages}
                    aria-label="Next page"
                  >
                    Next <span aria-hidden="true">→</span>
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

