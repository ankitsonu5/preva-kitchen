"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Utensils,
  Wine,
  Clock,
  ChefHat,
  MapPin,
  CalendarDays,
  Users,
  Check,
  Flame,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import SvgIcon from '@/components/SvgIcon';
import KitchenPromoHero from '@/components/KitchenPromoHero';
import GoogleReviewsSection from '@/components/sections/GoogleReviewsSection';
import NewsletterSection from '@/components/sections/NewsletterSection';
import { showError, showWarning } from '@/lib/swal';

const API = '/api';

const GALLERY_ITEMS = [
  { src: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80', alt: 'Lobster Bites' },
  { src: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', alt: 'Steak Bites' },
  { src: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', alt: 'Catfish Bites' },
  { src: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', alt: 'Classic Burger' },
  { src: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80', alt: 'Preva Wings' },
  { src: 'https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp', alt: 'Rasta Pasta' },
  { src: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80', alt: 'Cheesecake' },
  { src: 'https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg', alt: 'Lamb Tower' }
];

const SIGNATURE_DISHES = [
  {
    name: 'Lavish Lamb Tower',
    price: '$27.50',
    tag: 'CHEF SIGNATURE',
    desc: 'Rosemary-glazed lamb chops, roasted seasonal vegetables, velvety jus.',
    img: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=700&q=80'
  },
  {
    name: 'Seared Steak Bites',
    price: '$21.98',
    tag: 'PRIME CUT',
    desc: 'USDA Prime bites with caramelized onions, sautéed peppers and wild mushrooms.',
    img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80'
  },
  {
    name: 'Rasta Pasta',
    price: '$22.00',
    tag: 'HOUSE FAVORITE',
    desc: 'Creamy Caribbean-style penne tossed with signature house jerk seasoning.',
    img: 'https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp'
  },
  {
    name: 'Wild Lobster Bites',
    price: '$27.98',
    tag: 'SEAFOOD SPECIAL',
    desc: 'Wild-caught lobster seared in garlic-herb butter with clarified lemon finish.',
    img: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=700&q=80'
  }
];

export default function PrevaKitchen() {
  // Hero video (slow motion) with image fallback
  const kitchenVideoRef = useRef(null);
  const [kitchenVideoFailed, setKitchenVideoFailed] = useState(false);

  useEffect(() => {
    const video = kitchenVideoRef.current;
    if (!video) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { video.pause(); return; }
    const applySlowMotion = () => {
      video.defaultPlaybackRate = 0.5;
      video.playbackRate = 0.5;
      video.play().catch(() => {});
    };
    video.addEventListener('loadedmetadata', applySlowMotion);
    if (video.readyState >= 1) applySlowMotion();
    return () => video.removeEventListener('loadedmetadata', applySlowMotion);
  }, [kitchenVideoFailed]);

  // Strip Reservation State
  const [stripRes, setStripRes] = useState({ date: '', time: '', guests: '2' });

  // Modal state
  const [isDinOpen, setIsDinOpen] = useState(false);
  const [dinName, setDinName] = useState('');
  const [dinPhone, setDinPhone] = useState('');
  const [dinEmail, setDinEmail] = useState('');
  const [dinDate, setDinDate] = useState('');
  const [dinGuests, setDinGuests] = useState(2);
  const [dinOccasion, setDinOccasion] = useState('');
  const [dinSubmitting, setDinSubmitting] = useState(false);
  const [dinSuccess, setDinSuccess] = useState(false);

  const triggerOrderModal = (event) => {
    if (event) event.preventDefault();
    if (typeof window !== 'undefined') window.openOrderModal?.();
  };

  const openDiningModal = (e, initialData = null) => {
    if (e) e.preventDefault();
    if (initialData?.date) setDinDate(initialData.date);
    if (initialData?.guests) setDinGuests(Number(initialData.guests));
    setIsDinOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeDiningModal = () => {
    setIsDinOpen(false);
    document.body.style.overflow = '';
    setDinSuccess(false);
    setDinName('');
    setDinPhone('');
    setDinEmail('');
    setDinDate('');
    setDinGuests(2);
    setDinOccasion('');
  };

  const handleDiningSubmit = async (e) => {
    e.preventDefault();

    const cleanPhone = dinPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showWarning('Invalid Phone', 'Please enter a valid phone number (at least 10 digits).');
      return;
    }

    setDinSubmitting(true);

    try {
      const res = await fetch(`${API}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: dinName,
          mobile: dinPhone,
          email: dinEmail,
          reservationDate: dinDate + 'T12:00:00',
          guests: dinGuests,
          occasion: dinOccasion || 'General Dining'
        })
      });

      if (res.ok) {
        setDinSuccess(true);
      } else {
        showError('Submission Failed', 'Server error. Please try again.');
      }
    } catch (err) {
      console.error(err);
      showError('Connection Error', 'Network error. Please try again.');
    } finally {
      setDinSubmitting(false);
    }
  };

  const handleStripSubmit = (e) => {
    e.preventDefault();
    openDiningModal(e, { date: stripRes.date, guests: stripRes.guests });
  };

  const triggerGlobalMenu = () => {
    if (typeof window !== 'undefined' && window.openMenuModal) {
      window.openMenuModal();
    }
  };

  const triggerGlobalVip = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.openVipModal) {
      window.openVipModal();
    }
  };

  return (
    <div className="preva-kitchen-page" style={{ background: '#070507', color: '#f5f1e8' }}>
      {/* ── 1. HERO SECTION (Unchanged as requested) ── */}
      <section id="hero" className="landing-video-hero luxe-kitchen-hero">
        <div className="hero-video-bg">
          {!kitchenVideoFailed ? (
            <video
              ref={kitchenVideoRef}
              className="hero-background-video"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg"
              onError={() => setKitchenVideoFailed(true)}
              aria-hidden="true"
            >
              <source src="https://videos.pexels.com/video-files/8626672/8626672-hd_1280_720_25fps.mp4" type="video/mp4" />
              <source src="https://videos.pexels.com/video-files/8626269/8626269-hd_1280_720_25fps.mp4" type="video/mp4" />
            </video>
          ) : (
            <img
              src="https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg"
              alt="Preva Kitchen Daytime Dining"
              className="hero-background-image"
            />
          )}
          <div className="video-overlay luxe-kitchen-grade"></div>
          <div className="luxe-hero-vignette luxe-warm" aria-hidden="true"></div>
        </div>

        <div className="container landing-hero-content lx-promo-container">
          <div className="lx-promo-topline">
            <span className="lx-promo-brand">PREVA KITCHEN</span>
            <span className="lx-promo-sub">
              Chef-driven cuisine by day &middot; high-energy nightlife after 10 PM
            </span>
          </div>

          <KitchenPromoHero onReserve={openDiningModal} />
        </div>
      </section>

      {/* ── 2. PRIME HIGHLIGHTS BAR (Steakhouse Reference Style) ── */}
      <section
        className="pk-prime-bar"
        style={{
          background: '#0a080a',
          borderTop: '1px solid rgba(213, 164, 79, 0.25)',
          borderBottom: '1px solid rgba(213, 164, 79, 0.25)',
          padding: '36px 0',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '32px',
              alignItems: 'center'
            }}
          >
            {/* Feature 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.1)', border: '1px solid rgba(213, 164, 79, 0.3)', display: 'grid', placeItems: 'center', color: '#c5a059', flexShrink: 0 }}>
                <Flame size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                  PREMIUM CUTS &amp; BITES
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9d9990', lineHeight: 1.5 }}>
                  Chef-selected, flame-seared &amp; hand-seasoned for perfection.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.1)', border: '1px solid rgba(213, 164, 79, 0.3)', display: 'grid', placeItems: 'center', color: '#c5a059', flexShrink: 0 }}>
                <Wine size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                  CRAFT COCKTAILS
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9d9990', lineHeight: 1.5 }}>
                  Curated bar collection crafted to elevate every plate.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.1)', border: '1px solid rgba(213, 164, 79, 0.3)', display: 'grid', placeItems: 'center', color: '#c5a059', flexShrink: 0 }}>
                <ChefHat size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                  EXPERT CHEFS
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9d9990', lineHeight: 1.5 }}>
                  Passionate about rich flavor and culinary excellence.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.1)', border: '1px solid rgba(213, 164, 79, 0.3)', display: 'grid', placeItems: 'center', color: '#c5a059', flexShrink: 0 }}>
                <MapPin size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                  REDFORD LOCATION
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9d9990', lineHeight: 1.5 }}>
                  13090 Inkster Rd with easy, dedicated parking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. STORY SECTION: "A KITCHEN BUILT ON PASSION & FLAVOR" ── */}
      <section
        id="why-preva"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(180deg, #070507 0%, #0c090c 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          position: 'relative'
        }}
      >
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 'clamp(36px, 5vw, 64px)',
              alignItems: 'center'
            }}
          >
            {/* Left Story Copy */}
            <div>
              {/* Kicker */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#c5a059',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  marginBottom: '16px'
                }}
              >
                <span>THE PREVA KITCHEN</span>
                <span style={{ width: '48px', height: '1px', background: '#c5a059' }} />
              </div>

              {/* Heading */}
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif",
                  fontSize: 'clamp(2.3rem, 3.8vw, 3.5rem)',
                  lineHeight: 1.12,
                  color: '#fff',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  margin: '0 0 16px 0',
                  textTransform: 'uppercase'
                }}
              >
                A Kitchen Built <br />
                <span style={{ color: '#c5a059', fontStyle: 'italic', textTransform: 'none' }}>On Passion &amp; Flavor</span>
              </h2>

              {/* Sparkles Ornament */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  color: '#c5a059'
                }}
                aria-hidden="true"
              >
                <i style={{ width: '42px', height: '1px', background: 'currentColor' }} />
                <Sparkles size={16} />
                <i style={{ width: '42px', height: '1px', background: 'currentColor' }} />
              </div>

              {/* Description Paragraphs */}
              <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#d7d0ca', margin: '0 0 14px 0' }}>
                Preva Kitchen is where Detroit comes to eat, meet, and start the night. We source the finest cuts, seafood, and fresh ingredients, seasoned to perfection and presented with elevated hospitality.
              </p>

              <p style={{ fontSize: '0.94rem', lineHeight: 1.75, color: '#aaa39a', margin: '0 0 32px 0' }}>
                By day, a relaxed destination for business lunches and family gatherings; by evening, an intimate culinary prelude that flows seamlessly into the late-night energy of Preva Night Club.
              </p>

              {/* Actions CTA */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <a
                  href="#reservations"
                  onClick={(e) => { e.preventDefault(); openDiningModal(e); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    height: '52px',
                    padding: '0 34px',
                    background: 'linear-gradient(135deg, #a6133b, #761024)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    borderRadius: '999px',
                    textDecoration: 'none',
                    boxShadow: '0 10px 28px rgba(166, 19, 59, 0.35)',
                    transition: 'transform 0.2s ease, filter 0.2s ease, background 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #bd1b49, #8f0e2d)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a6133b, #761024)'; }}
                >
                  Reserve A Table <ArrowRight size={16} />
                </a>

                <Link
                  href="/preva-kitchen-menu"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '52px',
                    padding: '0 28px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(213, 164, 79, 0.4)',
                    color: '#e8e2d8',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: '999px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c5a059'; e.currentTarget.style.background = 'rgba(213, 164, 79, 0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.4)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                >
                  View Full Menu
                </Link>
              </div>
            </div>

            {/* Right Original Visual Card */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '440px',
                  borderRadius: '18px',
                  backgroundImage: `url('https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(213, 164, 79, 0.35)',
                  boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, transparent 45%, rgba(8, 6, 8, 0.9) 100%)'
                  }}
                />

                {/* Floating Dish Badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '22px',
                    left: '22px',
                    right: '22px',
                    background: 'rgba(14, 10, 13, 0.88)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(213, 164, 79, 0.35)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ display: 'block', color: '#c5a059', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                      SIGNATURE CREATION
                    </span>
                    <span style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700, fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif" }}>
                      Lavish Lamb Tower
                    </span>
                  </div>
                  <span style={{ color: '#c5a059', fontWeight: 800, fontSize: '1.1rem' }}>$27.50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SIGNATURES GRID (3 Dishes in 1 Row + Explore Menu CTA) ── */}
      <section
        id="signatures"
        style={{
          padding: '100px 0 110px',
          background: '#080608',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          position: 'relative'
        }}
      >
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '20px',
              marginBottom: '50px'
            }}
          >
            <div>
              <span
                style={{
                  display: 'block',
                  color: '#c5a059',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}
              >
                OUR SIGNATURES
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif",
                  fontSize: 'clamp(2.2rem, 4vw, 3.6rem)',
                  lineHeight: 1.1,
                  color: '#fff',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                  margin: 0
                }}
              >
                Cuts &amp; Bites <span style={{ color: '#c5a059', fontStyle: 'italic', textTransform: 'none' }}>Above The Rest</span>
              </h2>
            </div>

            <Link
              href="/shop"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#c5a059',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                paddingBottom: '4px',
                borderBottom: '1px solid rgba(213, 164, 79, 0.4)',
                transition: 'color 0.2s, border-color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderBottomColor = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#c5a059'; e.currentTarget.style.borderBottomColor = 'rgba(213, 164, 79, 0.4)'; }}
            >
              VIEW FULL MENU <ArrowRight size={15} />
            </Link>
          </div>

          {/* 3-Card Single Row Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '28px'
            }}
          >
            {SIGNATURE_DISHES.slice(0, 3).map((dish, idx) => (
              <article
                key={idx}
                style={{
                  background: 'linear-gradient(180deg, #120e11 0%, #0d090c 100%)',
                  border: '1px solid rgba(213, 164, 79, 0.22)',
                  borderRadius: '14px',
                  padding: '18px',
                  transition: 'transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                  e.currentTarget.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 24px rgba(213, 164, 79, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Photo */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/11',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    marginBottom: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <img
                    src={dish.img}
                    alt={dish.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = '/asset/hero/preva-pasta-hero.jpg';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(10, 7, 9, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#c5a059',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid rgba(213, 164, 79, 0.3)'
                    }}
                  >
                    {dish.tag}
                  </span>
                </div>

                {/* Title & Price Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '12px',
                    gap: '12px'
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif",
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: '#fff',
                      margin: 0,
                      letterSpacing: '-0.01em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {dish.name}
                  </h3>
                  <span
                    style={{
                      color: '#c5a059',
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      fontFamily: 'Inter, Arial, sans-serif'
                    }}
                  >
                    {dish.price}
                  </span>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: '#9e9990',
                    lineHeight: 1.65,
                    margin: '0 0 20px 0',
                    flexGrow: 1
                  }}
                >
                  {dish.desc}
                </p>

                {/* Quick Action */}
                <button
                  type="button"
                  onClick={triggerOrderModal}
                  style={{
                    width: '100%',
                    height: '42px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(213, 164, 79, 0.28)',
                    borderRadius: '6px',
                    color: '#e8e2d8',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'background 0.2s, border-color 0.2s, color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(110deg, #b7933f, #e1c87e)';
                    e.currentTarget.style.color = '#120e06';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#e8e2d8';
                    e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.28)';
                  }}
                >
                  Order Online
                </button>
              </article>
            ))}
          </div>

          {/* Centered Explore Full Menu CTA Button */}
          <div style={{ textAlign: 'center', marginTop: '54px' }}>
            <Link
              href="/preva-kitchen-menu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                height: '56px',
                padding: '0 40px',
                background: 'linear-gradient(135deg, #a6133b, #761024)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: '999px',
                textDecoration: 'none',
                boxShadow: '0 12px 35px rgba(166, 19, 59, 0.35)',
                transition: 'transform 0.2s ease, filter 0.2s ease, background 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #bd1b49, #8f0e2d)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a6133b, #761024)'; }}
            >
              Explore Full Menu <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. DINNER & NIGHTLIFE CARDS ── */}
      <section
        id="dinner-experience"
        style={{
          padding: '100px 0',
          background: 'linear-gradient(180deg, #0d090d 0%, #070507 100%)',
          position: 'relative'
        }}
      >
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(22, 16, 20, 0.85) 0%, rgba(12, 9, 11, 0.95) 100%)',
              border: '1px solid rgba(213, 164, 79, 0.28)',
              borderRadius: '20px',
              padding: 'clamp(28px, 4vw, 56px)',
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.6)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'clamp(32px, 5vw, 64px)',
              alignItems: 'center',
              backdropFilter: 'blur(20px)'
            }}
          >
            {/* Left Content Column */}
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#c5a059',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: '16px'
                }}
              >
                <Sparkles size={14} /> DINNER SERVICE
              </span>

              <h2
                style={{
                  fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif",
                  fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)',
                  lineHeight: 1.15,
                  color: '#fff',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  margin: '0 0 20px 0',
                  textTransform: 'uppercase'
                }}
              >
                Dinner Worth <br />
                <span style={{ color: '#c5a059', fontStyle: 'italic', textTransform: 'none' }}>Dressing Up For</span>
              </h2>

              <p style={{ fontSize: '1.02rem', lineHeight: 1.8, color: '#b0a8a0', margin: '0 0 28px 0' }}>
                When the lights soften, Preva Kitchen transforms into an intimate setting for date nights, birthdays, and celebrations. Share starters, savor chef-crafted mains, and linger over craft cocktails or dessert.
              </p>

              {/* Feature Pills */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                  marginBottom: '32px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(213, 164, 79, 0.15)', borderRadius: '8px', padding: '10px 12px' }}>
                  <Utensils size={15} color="#c5a059" />
                  <span style={{ fontSize: '0.8rem', color: '#e8e2d8', fontWeight: 600 }}>Chef Specials</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(213, 164, 79, 0.15)', borderRadius: '8px', padding: '10px 12px' }}>
                  <Wine size={15} color="#c5a059" />
                  <span style={{ fontSize: '0.8rem', color: '#e8e2d8', fontWeight: 600 }}>Craft Cocktails</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(213, 164, 79, 0.15)', borderRadius: '8px', padding: '10px 12px' }}>
                  <Clock size={15} color="#c5a059" />
                  <span style={{ fontSize: '0.8rem', color: '#e8e2d8', fontWeight: 600 }}>5 PM – 10 PM</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <a
                  href="#reservations"
                  onClick={(e) => { e.preventDefault(); openDiningModal(e); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    height: '52px',
                    padding: '0 34px',
                    background: 'linear-gradient(135deg, #a6133b, #761024)',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: '999px',
                    textDecoration: 'none',
                    boxShadow: '0 10px 28px rgba(166, 19, 59, 0.35)',
                    transition: 'transform 0.2s ease, filter 0.2s ease, background 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #bd1b49, #8f0e2d)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a6133b, #761024)'; }}
                >
                  Reserve Your Table <ArrowRight size={16} />
                </a>

                <Link
                  href="/preva-kitchen-menu"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '52px',
                    padding: '0 26px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                    textDecoration: 'none'
                  }}
                >
                  View Dinner Menu
                </Link>
              </div>
            </div>

            {/* Right Image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                minHeight: '420px',
                borderRadius: '16px',
                backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid rgba(213, 164, 79, 0.3)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(10,7,9,0.8) 100%)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '20px',
                  right: '20px',
                  background: 'rgba(15, 10, 13, 0.88)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(213, 164, 79, 0.35)',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ display: 'block', color: '#c5a059', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Preva Dining Room
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
                    Intimate Evening Atmosphere
                  </span>
                </div>
                <span style={{ color: '#c5a059', fontSize: '1.1rem' }}>✦</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── 7. PREVA MOMENTS BENTO GRID ── */}
      <section className="preva-bento-section" style={{ padding: '100px 0 110px', background: '#060406', position: 'relative' }}>
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <span style={{ color: '#c5a059', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              PREVA MOMENTS
            </span>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif",
                fontSize: 'clamp(2.2rem, 3.8vw, 3.4rem)',
                color: '#fff',
                margin: '12px 0 0',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em'
              }}
            >
              Flavors That Dance Beautifully
            </h2>
            <div style={{ width: '80px', height: '2px', background: '#c5a059', margin: '20px auto 0' }} />
          </div>

          {/* Luxury Compact Bento Grid (1 Hero Left + 4 Balanced Tiles Right) */}
          <div
            className="pk-bento-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              alignItems: 'stretch'
            }}
          >
            {/* Left Hero Bento Card */}
            <div
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(213, 164, 79, 0.3)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                background: '#120e11',
                cursor: 'pointer',
                minHeight: '380px',
                height: '100%'
              }}
              onMouseEnter={(e) => {
                const img = e.currentTarget.querySelector('img');
                if (img) img.style.transform = 'scale(1.06)';
                e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.7)';
              }}
              onMouseLeave={(e) => {
                const img = e.currentTarget.querySelector('img');
                if (img) img.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.3)';
              }}
            >
              <img
                src="https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg"
                alt="Lavish Lamb Tower"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(8,6,8,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                <span style={{ display: 'inline-block', background: 'rgba(213, 164, 79, 0.2)', border: '1px solid #c5a059', color: '#c5a059', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  CHEF SIGNATURE
                </span>
                <h3 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.45rem', color: '#fff', margin: '0 0 4px', textTransform: 'uppercase' }}>
                  Lavish Lamb Tower
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#b5b0a8', lineHeight: 1.4 }}>
                  Rosemary-glazed rack of lamb &amp; roasted vegetables with rich velvety jus.
                </p>
              </div>
            </div>

            {/* Right 2x2 Grid of 4 Compact Tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px'
              }}
            >
              {/* Tile 1: Wild Lobster */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(213, 164, 79, 0.22)',
                  background: '#120e11',
                  height: '182px',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.08)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=600&q=80"
                  alt="Wild Lobster Bites"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,6,8,0.9) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '12px', left: '14px', right: '14px' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(10,7,9,0.85)', border: '1px solid rgba(213,164,79,0.3)', color: '#c5a059', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', marginBottom: '3px' }}>
                    SEAFOOD
                  </span>
                  <h4 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.05rem', color: '#fff', margin: 0 }}>
                    Wild Lobster Bites
                  </h4>
                </div>
              </div>

              {/* Tile 2: Rasta Pasta */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(213, 164, 79, 0.22)',
                  background: '#120e11',
                  height: '182px',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.08)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                }}
              >
                <img
                  src="https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp"
                  alt="Creamy Rasta Pasta"
                  onError={(e) => { e.currentTarget.src = '/asset/hero/preva-pasta-hero.jpg'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,6,8,0.9) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '12px', left: '14px', right: '14px' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(10,7,9,0.85)', border: '1px solid rgba(213,164,79,0.3)', color: '#c5a059', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', marginBottom: '3px' }}>
                    PASTA
                  </span>
                  <h4 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.05rem', color: '#fff', margin: 0 }}>
                    Creamy Rasta Pasta
                  </h4>
                </div>
              </div>

              {/* Tile 3: Seared Steak */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(213, 164, 79, 0.22)',
                  background: '#120e11',
                  height: '182px',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.08)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
                  alt="Seared Steak Bites"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,6,8,0.9) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '12px', left: '14px', right: '14px' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(10,7,9,0.85)', border: '1px solid rgba(213,164,79,0.3)', color: '#c5a059', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', marginBottom: '3px' }}>
                    PRIME CUT
                  </span>
                  <h4 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.05rem', color: '#fff', margin: 0 }}>
                    Seared Steak Bites
                  </h4>
                </div>
              </div>

              {/* Tile 4: Berry Cheesecake */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(213, 164, 79, 0.22)',
                  background: '#120e11',
                  height: '182px',
                  cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
                }}
                onMouseEnter={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.08)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                }}
                onMouseLeave={(e) => {
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80"
                  alt="Artisan Berry Cheesecake"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(8,6,8,0.9) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '12px', left: '14px', right: '14px' }}>
                  <span style={{ display: 'inline-block', background: 'rgba(10,7,9,0.85)', border: '1px solid rgba(213,164,79,0.3)', color: '#c5a059', fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase', marginBottom: '3px' }}>
                    DESSERT
                  </span>
                  <h4 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.05rem', color: '#fff', margin: 0 }}>
                    Berry Cheesecake
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* View Full Gallery Link */}
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link
              href="/gallery"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                color: '#c5a059',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                paddingBottom: '4px',
                borderBottom: '1px solid rgba(213, 164, 79, 0.4)',
                transition: 'color 0.2s, border-color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderBottomColor = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#c5a059'; e.currentTarget.style.borderBottomColor = 'rgba(213, 164, 79, 0.4)'; }}
            >
              View Complete Food &amp; Ambiance Gallery <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. GOOGLE REVIEWS SECTION ── */}
      <div id="testimonials">
        <GoogleReviewsSection visible />
      </div>

      {/* ── 9. NEWSLETTER SECTION ── */}
      <NewsletterSection />

      {/* ── 10. LOCAL DINING RESERVATION MODAL ── */}
      {isDinOpen && (
        <div className="dining-res-overlay" id="diningResOverlay" style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div
            className="dining-res-modal"
            style={{
              background: '#120e11',
              border: '1px solid rgba(213, 164, 79, 0.4)',
              borderRadius: '16px',
              padding: 'clamp(24px, 4vw, 40px)',
              maxWidth: '480px',
              width: '100%',
              position: 'relative',
              boxShadow: '0 30px 90px rgba(0,0,0,0.8)'
            }}
          >
            <button
              onClick={closeDiningModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                fontSize: '1.6rem',
                cursor: 'pointer'
              }}
            >
              &times;
            </button>

            {!dinSuccess ? (
              <>
                <span style={{ color: '#c5a059', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  DINING RESERVATION
                </span>
                <h2 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.8rem', color: '#fff', margin: '6px 0 12px', textTransform: 'uppercase' }}>
                  Reserve Your Table
                </h2>
                <div style={{ width: '50px', height: '2px', background: '#c5a059', marginBottom: '16px' }} />
                <p style={{ fontSize: '0.88rem', color: '#aaa', margin: '0 0 20px' }}>
                  Secure your dining experience at Preva Kitchen.
                </p>

                <form onSubmit={handleDiningSubmit} style={{ display: 'grid', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={dinName}
                    onChange={(e) => setDinName(e.target.value)}
                    required
                    style={{ width: '100%', height: '44px', background: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(213, 164, 79, 0.28)', borderRadius: '6px', color: '#fff', padding: '0 14px', fontSize: '0.88rem', outline: 'none' }}
                  />

                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={dinPhone}
                    onChange={(e) => setDinPhone(e.target.value)}
                    required
                    style={{ width: '100%', height: '44px', background: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(213, 164, 79, 0.28)', borderRadius: '6px', color: '#fff', padding: '0 14px', fontSize: '0.88rem', outline: 'none' }}
                  />

                  <input
                    type="email"
                    placeholder="Email Address"
                    value={dinEmail}
                    onChange={(e) => setDinEmail(e.target.value)}
                    style={{ width: '100%', height: '44px', background: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(213, 164, 79, 0.28)', borderRadius: '6px', color: '#fff', padding: '0 14px', fontSize: '0.88rem', outline: 'none' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                      type="date"
                      value={dinDate}
                      onChange={(e) => setDinDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      style={{ width: '100%', height: '44px', background: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(213, 164, 79, 0.28)', borderRadius: '6px', color: '#fff', padding: '0 12px', fontSize: '0.84rem', colorScheme: 'dark', outline: 'none' }}
                    />
                    <select
                      value={dinGuests}
                      onChange={(e) => setDinGuests(Number(e.target.value))}
                      style={{ width: '100%', height: '44px', background: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(213, 164, 79, 0.28)', borderRadius: '6px', color: '#fff', padding: '0 12px', fontSize: '0.84rem', colorScheme: 'dark', outline: 'none' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(g => (
                        <option key={g} value={g}>{g} {g === 1 ? 'Person' : 'People'}</option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={dinOccasion}
                    onChange={(e) => setDinOccasion(e.target.value)}
                    style={{ width: '100%', height: '44px', background: 'rgba(5, 5, 5, 0.8)', border: '1px solid rgba(213, 164, 79, 0.28)', borderRadius: '6px', color: '#fff', padding: '0 12px', fontSize: '0.84rem', colorScheme: 'dark', outline: 'none' }}
                  >
                    <option value="">Select Occasion (Optional)</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Business Dinner">Business Dinner</option>
                    <option value="Date Night">Date Night</option>
                    <option value="Celebration">Celebration</option>
                  </select>

                  <button
                    type="submit"
                    disabled={dinSubmitting}
                    style={{
                      width: '100%',
                      height: '48px',
                      background: 'linear-gradient(110deg, #b7933f, #e1c87e)',
                      color: '#120e06',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    {dinSubmitting ? 'Submitting...' : 'Confirm Reservation'}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(213, 164, 79, 0.15)', border: '1px solid #c5a059', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#c5a059' }}>
                  <Check size={32} />
                </div>
                <h3 style={{ fontFamily: "var(--font-serif, 'Playfair Display'), Georgia, serif", fontSize: '1.6rem', color: '#fff', margin: '0 0 8px' }}>
                  Reservation Requested!
                </h3>
                <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Thank you! Our kitchen team will confirm your table shortly.
                </p>
                <button
                  onClick={closeDiningModal}
                  style={{
                    padding: '10px 28px',
                    background: 'linear-gradient(110deg, #b7933f, #e1c87e)',
                    color: '#120e06',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Done ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
