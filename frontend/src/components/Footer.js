"use client";

import { useRef, useEffect, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import SvgIcon from './SvgIcon';

/* ── Module-level constants — stable, never trigger re-renders ── */
const ORBIT_RADIUS = 390;

const FALLBACK_INSTAGRAM_POSTS = [
  { shortcode: 'DbYY080Ez5X', caption: 'Fresh Flavors & Late-Night Bites at Preva Kitchen', image: '/asset/prevaclub/wp-content/uploads/2026/08/Preva-Burger-768x768.jpg' },
  { shortcode: 'DbTZCiolhU8', caption: 'Preva Signature Crispy Jumbo Wings', image: '/asset/prevaclub/wp-content/uploads/2026/08/Preva-Wings-768x768.jpg' },
  { shortcode: 'Da9zZp5S-4j', caption: 'Creamy Caribbean Rasta Pasta', image: '/asset/prevaclub/wp-content/uploads/2026/08/Rasta-Pasta.webp' },
  { shortcode: 'Da7H3G3So-I', caption: 'Preva Double Smash Burger & Fries', image: '/asset/prevaclub/wp-content/uploads/2026/08/Preva-Double-Smash-Burger-768x768.jpg' },
  { shortcode: 'DbdkwJMDv4F', caption: 'Grilled Quesadillas & House Dipping Sauces', image: '/asset/prevaclub/wp-content/uploads/2026/08/Preva-Quesadilla-768x768.jpg' },
  { shortcode: 'DayD3BIJafZ', caption: 'Crisp Seasoned Shrimp Tacos', image: '/asset/prevaclub/wp-content/uploads/2026/08/Shrimp-Tacos-768x768.jpg' },
  { shortcode: 'DZqdAH7BZEQ', caption: 'Golden Fried Catfish & Lobster Bites', image: '/asset/prevaclub/wp-content/uploads/2026/08/Preva-Catfish-768x768.jpg' },
  { shortcode: 'DYDvxvzDp1GtaRKJsKoezu3AcOhFzo-kD3vkSc0', caption: 'Gourmet Seasoned Lamb Chops & Sides', image: '/asset/prevaclub/wp-content/uploads/2026/08/preva-Lamb-768x768.jpg' }
].map((post) => ({
  ...post,
  url: `https://www.instagram.com/p/${post.shortcode}/`
}));

export default function Footer() {
  const pathname = usePathname();

  /* DOM refs */
  const orbitRef = useRef(null);
  const stageRef = useRef(null);

  /* Animation state — all in refs so rAF loop never needs re-subscribe */
  const currentAngleRef = useRef(0);
  const targetAngleRef  = useRef(0);
  const hoverPausedRef  = useRef(false);
  const hoveredIndexRef = useRef(-1);
  const cardsRef        = useRef([]);
  const draggingRef     = useRef(false);
  const dragStartXRef   = useRef(0);
  const dragStartARef   = useRef(0);
  const velocityRef     = useRef(0);
  const lastXRef        = useRef(0);
  const lastTimeRef     = useRef(0);
  const rafRef          = useRef(null);

  const [settings, setSettings] = useState({
    phone: '(313) 286-3586',
    contactEmail: 'info@prevaclub.com',
    reservationsEmail: 'reservations@prevaclub.com',
    eventsEmail: 'events@prevaclub.com',
    supportEmail: 'support@prevaclub.com',
    address: '13090 Inkster Rd, Redford Township, MI 48239, United States',
    socialLinks: {
      instagram: 'https://www.instagram.com/prevakitchen/',
      facebook: ''
    }
  });

  const [menuItems, setMenuItems] = useState([
    { title: 'Reserve a Table', url: '/#prv-reservations' },
    { title: 'View Menu', url: '/menu' },
    { title: 'Order Online', url: '/menu' },
    { title: 'Contact Us', url: '/contact' }
  ]);
  const [instagramPosts, setInstagramPosts] = useState(FALLBACK_INSTAGRAM_POSTS);

  useEffect(() => {
    async function loadData() {
      const API = '/api';
      try {
        const res = await fetch(`${API}/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => ({
            ...prev,
            ...data,
            socialLinks: { ...prev.socialLinks, ...(data.socialLinks || {}) }
          }));
        }
        const menuRes = await fetch(`${API}/menus/footer`);
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          if (menuData && menuData.items && menuData.items.length > 0) {
            const kitchenItems = menuData.items.filter((item) => !/night\s*life|night\s*club|\bclub\b|\bvip\b|bottle|guest list|tickets?/i.test(`${item.title || ''} ${item.url || ''}`));
            if (kitchenItems.length) setMenuItems(kitchenItems);
          }
        }
        const instagramRes = await fetch(`${API}/instagram-feed`);
        if (instagramRes.ok) {
          const instagramData = await instagramRes.json();
          if (Array.isArray(instagramData.posts) && instagramData.posts.length > 0)
            setInstagramPosts(instagramData.posts);
        }
      } catch (_) { /* fallback to defaults */ }
    }
    loadData();
  }, []);

  const selectTabAndScroll = (tabId) => {
    if (window.location.pathname !== '/') { window.location.href = `/#${tabId}`; return; }
    const el = document.getElementById(tabId) || document.getElementById('prv-reservations');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    if (tabId === 'catering') document.querySelector('.prv-mselect__events')?.click();
  };

  const isLandingPage = pathname === '/preva-kitchen';
  const isCareersPage = Boolean(pathname?.startsWith('/careers'));
  const isShopOrOrderPage = Boolean(
    pathname?.startsWith('/menu') ||
    pathname?.startsWith('/order') ||
    pathname?.startsWith('/checkout')
  );
  const showInstagram = isLandingPage;

  /* ── Orbit carousel engine ─────────────────────────────────
     ORBIT_RADIUS is a module constant (outside component) so
     useCallback deps stay stable and don't trigger re-runs.
  ── */
  const dragDistanceRef = useRef(0);

  /* Render one frame — reads only refs, no state */
  const renderFrame = useCallback(() => {
    const cards = cardsRef.current;
    const angle = currentAngleRef.current;
    cards.forEach((item, idx) => {
      if (!item.wrap || !item.card) return;
      const total   = ((angle + item.theta) % 360 + 360) % 360;
      const rad     = total * Math.PI / 180;
      const depth   = Math.cos(rad);
      const t       = (depth + 1) / 2;
      const scale   = 0.70 + t * 0.34;
      const opacity = 0.22 + t * 0.78;
      const bright  = 0.42 + t * 0.62;
      item.card.style.opacity = opacity.toFixed(3);
      item.card.style.filter  = `brightness(${bright.toFixed(3)})`;
      if (idx !== hoveredIndexRef.current) {
        item.wrap.style.transform =
          `rotateY(${item.theta}deg) translateZ(${ORBIT_RADIUS}px) scale(${scale.toFixed(3)})`;
      }
    });
    if (orbitRef.current) orbitRef.current.style.transform = `rotateY(${angle}deg)`;
  }, []);

  /* Single rAF loop — only runs when visible, prevents thread locking */
  const isVisibleRef = useRef(true);

  const startLoop = useCallback(() => {
    if (rafRef.current) return;
    const tick = () => {
      if (!isVisibleRef.current) {
        rafRef.current = null;
        return;
      }
      if (isNaN(targetAngleRef.current)) targetAngleRef.current = 0;
      if (isNaN(currentAngleRef.current)) currentAngleRef.current = 0;
      if (isNaN(velocityRef.current)) velocityRef.current = 0;

      // Auto-spin whenever NOT hovered and NOT dragging
      if (!hoverPausedRef.current && !draggingRef.current) {
        targetAngleRef.current -= 0.32;
      }
      // Apply momentum/inertia from user drag
      if (!draggingRef.current && Math.abs(velocityRef.current) > 0.01) {
        targetAngleRef.current += velocityRef.current;
        velocityRef.current *= 0.92;
      }
      currentAngleRef.current += (targetAngleRef.current - currentAngleRef.current) * 0.1;
      renderFrame();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [renderFrame]);

  /* Keep the animation engine pointed at the cards React rendered. */
  useEffect(() => {
    const orbit = orbitRef.current;
    const stage = stageRef.current;
    if (!orbit) return;
    const n = instagramPosts.length;
    if (n === 0) return;

    cardsRef.current = Array.from(orbit.children).map((wrap, i) => ({
      wrap,
      card: wrap.querySelector('.orbit-card'),
      theta: (360 / n) * i
    }));

    renderFrame();

    let observer = null;
    if (typeof IntersectionObserver !== 'undefined' && stage) {
      observer = new IntersectionObserver((entries) => {
        const isIntersecting = entries[0]?.isIntersecting ?? true;
        isVisibleRef.current = isIntersecting;
        if (isIntersecting) {
          startLoop();
        } else if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }, { rootMargin: '150px' });
      observer.observe(stage);
    } else {
      startLoop();
    }

    return () => {
      if (observer) observer.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      cardsRef.current = [];
    };
  }, [instagramPosts, renderFrame, startLoop]);

  const handleCardEnter = (index, event) => {
    hoveredIndexRef.current = index;
    hoverPausedRef.current = true;
    if (event?.currentTarget) {
      event.currentTarget.style.boxShadow = '0 0 0 1.5px #c9a34e, 0 20px 44px rgba(0,0,0,0.72)';
      event.currentTarget.style.transform = 'scale(1.09)';
    }
  };

  const handleCardLeave = (event) => {
    hoveredIndexRef.current = -1;
    hoverPausedRef.current = false;
    if (event?.currentTarget) {
      event.currentTarget.style.boxShadow = '';
      event.currentTarget.style.transform = 'scale(1)';
    }
  };

  // Ensure window scroll or blur resets any stuck hover state
  useEffect(() => {
    const resetHover = () => {
      hoverPausedRef.current = false;
      hoveredIndexRef.current = -1;
    };
    window.addEventListener('scroll', resetHover, { passive: true });
    window.addEventListener('blur', resetHover);
    window.addEventListener('resize', resetHover);
    return () => {
      window.removeEventListener('scroll', resetHover);
      window.removeEventListener('blur', resetHover);
      window.removeEventListener('resize', resetHover);
    };
  }, []);

  const openInstagramPost = (post) => {
    if (dragDistanceRef.current > 8) return; // ignore if user was dragging
    window.open(post.url, '_blank', 'noopener,noreferrer');
  };

  // Drag-to-spin on the entire stage
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onMouseEnterStage = () => {
      hoverPausedRef.current = true;
    };

    const onMouseLeaveStage = () => {
      hoverPausedRef.current = false;
      hoveredIndexRef.current = -1;
    };

    const onMouseDown = (e) => {
      draggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartARef.current = targetAngleRef.current;
      dragDistanceRef.current = 0;
      velocityRef.current   = 0;
      lastXRef.current      = e.clientX;
      lastTimeRef.current   = Date.now();
      stage.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragStartXRef.current;
      dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.abs(dx));
      const now = Date.now();
      const dt  = Math.max(now - lastTimeRef.current, 1);
      velocityRef.current = (e.clientX - lastXRef.current) / dt * 16 * 0.35;
      lastXRef.current    = e.clientX;
      lastTimeRef.current = now;
      targetAngleRef.current = dragStartARef.current + dx * 0.38;
    };

    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      stage.style.cursor = 'grab';
    };

    const onTouchStart = (e) => {
      const touchX = e.touches[0].clientX;
      dragStartXRef.current = touchX;
      dragStartARef.current = targetAngleRef.current;
      dragDistanceRef.current = 0;
      velocityRef.current   = 0;
      lastXRef.current      = touchX;
      lastTimeRef.current   = Date.now();
      draggingRef.current   = true;
      hoverPausedRef.current = true;
    };

    const onTouchMove = (e) => {
      const touchX = e.touches[0].clientX;
      const dx = touchX - dragStartXRef.current;
      dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.abs(dx));
      const now = Date.now();
      const dt  = Math.max(now - lastTimeRef.current, 1);
      velocityRef.current = (touchX - lastXRef.current) / dt * 16 * 0.35;
      lastXRef.current    = touchX;
      lastTimeRef.current = now;
      targetAngleRef.current = dragStartARef.current + dx * 0.38;
    };

    const onTouchEnd = () => {
      draggingRef.current = false;
      hoverPausedRef.current = false;
    };

    const onInteractionCancel = () => {
      draggingRef.current = false;
      hoverPausedRef.current = false;
      velocityRef.current = 0;
      stage.style.cursor = 'grab';
    };

    stage.addEventListener('mouseenter', onMouseEnterStage);
    stage.addEventListener('mouseleave', onMouseLeaveStage);
    stage.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: true });
    stage.addEventListener('touchend', onTouchEnd);
    stage.addEventListener('touchcancel', onInteractionCancel);
    window.addEventListener('blur', onInteractionCancel);
    return () => {
      stage.removeEventListener('mouseenter', onMouseEnterStage);
      stage.removeEventListener('mouseleave', onMouseLeaveStage);
      stage.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onInteractionCancel);
      window.removeEventListener('blur', onInteractionCancel);
    };
  }, [instagramPosts]);

  /* Arrow clicks: nudge targetAngle smoothly */
  const handleRotateLeft = () => {
    targetAngleRef.current -= 50;
  };
  const handleRotateRight = () => {
    targetAngleRef.current += 50;
  };

  return (
    <>
      {/* Instagram 3D Orbit Carousel — hidden on careers & ordering flow */}
      {showInstagram && (
      <section id="instagram-feed" className="orbit-section">
        {/* Ambient glow */}
        <div className="orbit-section-glow" aria-hidden="true" />

        {/* Header */}
        <div className="orbit-section-header">
          <span className="orbit-eyebrow">Follow us on Instagram</span>
          <h2 className="orbit-title">
            <a href={settings.socialLinks?.instagram || 'https://www.instagram.com/prevakitchen/'} target="_blank" rel="noopener noreferrer" className="orbit-title-link">
              @PREVAKITCHEN
            </a>
          </h2>
          <p className="orbit-subtitle">A glimpse inside the Preva kitchen experience</p>
          <div className="orbit-divider" aria-hidden="true">
            <span className="orbit-divider-line orbit-divider-line-l" />
            <svg className="orbit-divider-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            <span className="orbit-divider-line orbit-divider-line-r" />
          </div>
        </div>

        {/* 3D Orbit Stage */}
        <div
          ref={stageRef}
          id="orbit-stage"
          className="orbit-stage"
          aria-label="Instagram posts carousel — drag to rotate"
        >
          <div ref={orbitRef} id="orbit" className="orbit-ring">
            {instagramPosts.map((post, index) => {
              const theta = instagramPosts.length ? (360 / instagramPosts.length) * index : 0;
              return (
                <div
                  className="orbit-wrap"
                  key={post.shortcode || post.url || index}
                  style={{ transform: `rotateY(${theta}deg) translateZ(${ORBIT_RADIUS}px)` }}
                >
                  <div
                    className="orbit-card"
                    data-index={index}
                    role="link"
                    tabIndex={0}
                    aria-label={post.caption || 'View on Instagram'}
                    onMouseEnter={(event) => handleCardEnter(index, event)}
                    onMouseLeave={handleCardLeave}
                    onClick={() => openInstagramPost(post)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openInstagramPost(post);
                      }
                    }}
                  >
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.caption || 'Preva Kitchen on Instagram'}
                        loading="lazy"
                        className="orbit-card-img"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="orbit-card-tile">
                        <div className="orbit-card-ig-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                        </div>
                      </div>
                    )}
                    <div className="orbit-card-overlay">
                      <span className="orbit-card-handle">@prevakitchen</span>
                      <span className="orbit-card-caption">{post.caption || 'View on Instagram'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <a
          href={settings.socialLinks?.instagram || 'https://www.instagram.com/prevakitchen/'}
          target="_blank"
          rel="noopener noreferrer"
          className="orbit-cta"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          View Profile
        </a>
      </section>
      )}

      {/* Main Footer */}
      <footer id="colophon" className="site-footer premium-footer-section">
        <div className="footer-top-glow"></div>
        <div className="footer-bg-overlay"></div>
        <div className="container relative-z2">
          <div className="premium-footer-grid">
            {/* Brand Column */}
            <div className="footer-col brand-col">
              <img src="/asset/preva-logo-silver.png" alt={settings.siteTitle || 'PREVA'} className="footer-logo-img" />
              <h4 className="footer-heading footer-brand-heading">CONTACT US</h4>
              <ul className="footer-info-list footer-brand-contact">
                <li>
                  <span className="icon-gold"><SvgIcon name="location" size={16} /></span>
                  <span>{settings.address}</span>
                </li>
                <li>
                  <span className="icon-gold"><SvgIcon name="phone" size={16} /></span>
                  <span><a href={`tel:${settings.phone}`}>{settings.phone}</a></span>
                </li>
                <li>
                  <span className="icon-gold"><SvgIcon name="mail" size={16} /></span>
                  <span><a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></span>
                </li>
              </ul>
            </div>

            {/* Quick Links Column */}
            <div className="footer-col links-col">
              <h4 className="footer-heading">NAVIGATION</h4>
              <div className="footer-heading-divider"></div>
              <ul className="footer-links">
                {menuItems.filter((item) => item.visible !== false).map((item, idx) => (
                  <li key={idx}>
                    <a href={item.url} target={item.openInNewTab ? '_blank' : undefined} rel={item.openInNewTab ? 'noopener noreferrer' : undefined}>{item.title}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hours Column */}
            <div className="footer-col hours-col">
              <h4 className="footer-heading">HOURS</h4>
              <div className="footer-heading-divider"></div>
              <ul className="footer-info-list">
                <li>
                  <span className="icon-gold"><SvgIcon name="clock" size={16} /></span>
                  <div>
                    <strong>Monday-Friday:</strong><br />
                    11:00 am - 3:30 pm
                  </div>
                </li>
                <li>
                  <span className="icon-gold"><SvgIcon name="parking" size={16} /></span>
                  <div>
                    <strong>Parking:</strong><br />
                    Easy parking available
                  </div>
                </li>
              </ul>

              <div className="footer-follow">
                <h4 className="footer-heading">FOLLOW US</h4>
                <div className="footer-heading-divider"></div>
                <div className="footer-social-grid">
                  <a
                    href={settings.socialLinks?.instagram || 'https://www.instagram.com/prevakitchen/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                  >
                    <span className="icon-gold"><SvgIcon name="instagram" size={16} /></span>
                    <span><strong>Instagram:</strong><small>@prevakitchen</small></span>
                  </a>
                  <a
                    href={settings.socialLinks?.facebook || 'https://www.facebook.com/prevakitchen'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-link"
                  >
                    <span className="icon-gold"><SvgIcon name="facebook" size={16} /></span>
                    <span><strong>Facebook:</strong><small>@prevakitchen</small></span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact & Map Column */}
            <div className="footer-col contact-col">
              <h4 className="footer-heading">LOCATION</h4>
              <div className="footer-heading-divider"></div>
              <div
                className="footer-map-wrapper"
                style={{
                  width: '100%',
                  height: '200px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid rgba(213, 164, 79, 0.35)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  position: 'relative',
                  marginTop: '16px'
                }}
              >
                <iframe
                  title="Preva Kitchen Location Map"
                  src="https://www.google.com/maps?q=Preva+Kitchen,+13090+Inkster+Rd,+Redford+Township,+MI+48239,+United+States&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    display: 'block'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="site-info-premium">
            <div className="footer-bottom-divider"></div>
            <div className="footer-copyright-content">
              <p>&copy; {new Date().getFullYear()} Preva Kitchen. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile kitchen actions */}
      {!isLandingPage && !isShopOrOrderPage && (
        <div className="mobile-sticky-cta">
          <a href="#prv-reservations"
             onClick={(e) => { e.preventDefault(); selectTabAndScroll('prv-reservations'); }}
             className="sticky-btn">RESERVE TABLE</a>
          <a href="/menu" className="sticky-btn">ORDER ONLINE</a>
          <a href="#prv-reservations"
             onClick={(e) => { e.preventDefault(); selectTabAndScroll('catering'); }}
             className="sticky-btn">CATERING</a>
        </div>
      )}
    </>
  );
}
