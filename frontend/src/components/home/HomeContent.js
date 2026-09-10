"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import GoogleReviewsSection from '@/components/sections/GoogleReviewsSection';
import GallerySection from '@/components/sections/GallerySection';
import { getCanonicalOrigin } from '@/lib/site-url';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChefHat,
  Clock3,
  CookingPot,
  Phone,
  ShoppingBag,
  Sofa,
  Sparkles,
  User,
  UsersRound,
  UtensilsCrossed
} from 'lucide-react';

const CANONICAL_ORIGIN = getCanonicalOrigin();

const restaurantGalleryImages = [
  {
    src: '/asset/gallery/DIAMOND01.jpg',
    caption: 'Meet the Preva Team'
  },
  {
    src: '/asset/gallery/STEAK02.jpg',
    caption: 'Steak Bites'
  },
  {
    src: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80',
    caption: 'Wild Lobster Bites'
  },
  {
    src: '/asset/gallery/RASTA05.jpg',
    caption: 'Rasta Pasta'
  },
  {
    src: '/asset/gallery/CATFISH01.jpg',
    caption: 'Catfish Bites'
  }
];

const HERO_IMAGE_SLIDE_DELAY = 2000;

// The hero background cycles through the intro video, then the three dish
// photos, then back to the video — one rotation, one set of dots, all inside
// the hero itself (not a separate section further down the page).
const heroSlides = [
  { type: 'video', src: '/asset/Video/1080-PASTA.mp4', poster: '/asset/home-reference/preva-restaurant-hero.png', name: 'Preva Kitchen' },
  { type: 'image', image: '/asset/home-reference/preva-restaurant-hero.png?v=restaurant-slider', mobileImage: '/asset/home-reference/preva-restaurant-hero-mobile.jpg', name: 'Preva Lamb Chops' },
  { type: 'image', image: '/asset/home-reference/preva-rasta-pasta-hero.png?v=dish-size-match-v2', mobileImage: '/asset/home-reference/preva-rasta-pasta-hero-mobile.jpg', name: 'Preva Rasta Pasta' },
  { type: 'image', image: '/asset/home-reference/preva-burger-hero.png?v=dish-size-match-v2', mobileImage: '/asset/home-reference/preva-burger-hero-mobile.jpg', name: 'Preva Burger' }
];

const BOOKING_PURPOSES = [
  'Birthday', 'Anniversary', 'Date Night', 'Family Dinner',
  'Business Meal', 'Celebration', 'Just Because', 'Other'
];

const highlights = [
  { icon: CookingPot, title: 'Delicious Food', text: 'Fresh ingredients and carefully crafted dishes.' },
  { icon: ChefHat, title: 'Expert Chefs', text: 'Talented cooks with years of culinary experience.' },
  { icon: Sofa, title: 'Cozy Ambience', text: 'A welcoming place for family, friends and celebrations.' },
  { icon: BadgeCheck, title: 'Quality Service', text: 'Warm hospitality for every guest at every table.' }
];

const categories = [
  { name: 'Entrees', count: '18 Items', image: '/asset/hero/preva-steak-hero.jpg', position: '67% center' },
  { name: 'Burgers', count: '12 Items', image: '/asset/hero/preva-burger-hero.jpg', position: 'center' },
  { name: 'Pasta', count: '10 Items', image: '/asset/hero/preva-pasta-hero.jpg', position: 'center' },
  { name: 'Shareables', count: '9 Items', image: '/asset/hero/preva-feast-hero.jpg', position: 'center' },
  { name: 'Chef Specials', count: '8 Items', image: '/asset/hero/preva-steak-hero.jpg', position: '44% center' },
  { name: 'Fresh Plates', count: '14 Items', image: '/asset/hero/preva-feast-hero.jpg', position: '78% center' }
];

const signatureDishes = [
  {
    name: 'Preva Mac & Cheese',
    slug: 'preva-mac-and-cheese',
    price: '$7.50',
    description: 'Baked macaroni in a rich five-cheese sauce, finished with a golden crust.',
    image: '/asset/home-reference/signature-dishes/PrevaMac-600x600.webp'
  },
  {
    name: 'Preva Lamb Chops',
    slug: 'preva-lamb-chops',
    price: '$33.50',
    description: 'Grilled lamb chops seasoned with Preva house spices and served with your choice of sides.',
    image: '/asset/home-reference/signature-dishes/prevaLamb-600x600.webp'
  },
  {
    name: 'Preva Steak Bites',
    slug: 'preva-steak-bites',
    price: '$19.50',
    description: 'Tender steak bites grilled to perfection and finished with savory garlic herb butter.',
    image: '/asset/home-reference/signature-dishes/PrevaSteakBites-600x600.webp'
  },
  {
    name: 'Preva Catfish Bites',
    slug: 'preva-catfish',
    price: '$15.50',
    description: 'Seasoned catfish bites fried golden and served hot, crisp and full of Southern flavor.',
    image: '/asset/home-reference/signature-dishes/PrevaCatfish-600x600.webp'
  },
  {
    name: 'Shrimp Tacos',
    slug: 'shrimp-tacos',
    price: '$16.00',
    description: 'Seasoned shrimp tucked into warm tortillas with fresh slaw and signature house sauce.',
    image: '/asset/home-reference/signature-dishes/ShrimpTacos-600x600.webp'
  },
  {
    name: 'Preva Quesadillas',
    slug: 'preva-quesadillas',
    price: '$17.49',
    description: 'Golden grilled tortilla layered with melted cheese, house seasoning and your choice of filling.',
    image: '/asset/home-reference/signature-dishes/PrevaQuesadilla-600x600.webp'
  },
  {
    name: 'Double Smash Burger',
    slug: 'preva-double-smash-burger',
    price: '$11.49',
    description: 'Two smashed beef patties, double American cheese and thousand island with seasoned fries.',
    image: '/asset/home-reference/signature-dishes/PrevaDoubleSmashBurger-600x600.webp'
  },
  {
    name: 'Sweet Chilli Wings',
    slug: 'preva-wings-chilli',
    price: '$16.50',
    description: 'Crispy jumbo wings coated in a bright sweet chilli glaze with a gentle kick.',
    image: '/asset/home-reference/signature-dishes/PrevaWingsChilli-1024x1024.webp'
  }
];

export default function Home() {
  const [booking, setBooking] = useState({ name: '', phone: '', purpose: '', date: '', time: '', guests: '2' });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  // "Other" in the purpose dropdown reveals this free-text field instead of
  // replacing the dropdown outright — keeps a category for the common cases
  // without losing the ability to type something specific.
  const [purposeOther, setPurposeOther] = useState('');
  // Autoplaying background video is exactly what prefers-reduced-motion
  // asks sites to avoid — fall back to the poster image (a still frame) for
  // anyone who has that on, instead of forcing the motion on them.
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const heroVideoRef = useRef(null);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduceMotion(e.matches);
    setReduceMotion(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 720px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Image slides advance on a fixed timer; the video slide advances itself
  // (see the <video onEnded>  below) once it finishes playing, so it isn't
  // cut short or dragged out relative to its own length.
  useEffect(() => {
    if (reduceMotion || heroSlides[activeHeroSlide].type !== 'image') return undefined;
    const timer = window.setTimeout(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_IMAGE_SLIDE_DELAY);
    return () => window.clearTimeout(timer);
  }, [activeHeroSlide, reduceMotion]);

  // Play/pause the (always-mounted, so it never has to re-buffer) hero video
  // to match whether its slide is actually the one showing right now.
  useEffect(() => {
    const videoEl = heroVideoRef.current;
    if (!videoEl) return;
    if (activeHeroSlide === 0 && !reduceMotion) {
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  }, [activeHeroSlide, reduceMotion]);

  const updateBooking = (field) => (event) => {
    setBooking((current) => ({ ...current, [field]: event.target.value }));
  };

  const swalBase = {
    background: '#1a0d10',
    color: '#f6f2ec',
    confirmButtonColor: '#d5a44f',
    iconColor: '#d5a44f',
    customClass: {
      popup:  'swal-preva-popup',
      title:  'swal-preva-title',
      htmlContainer: 'swal-preva-body',
      confirmButton: 'swal-preva-btn',
    },
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    const effectivePurpose = (booking.purpose === 'Other' ? purposeOther : booking.purpose).trim();
    if (!booking.name.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Name required', text: 'Please enter your name.' });
      return;
    }
    if (!booking.phone.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Phone required', text: 'Please enter your phone number.' });
      return;
    }
    if (!effectivePurpose) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Booking purpose required', text: 'Please tell us the purpose of your reservation.' });
      return;
    }
    if (!booking.date || !booking.time) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Date & Time required', text: 'Please select a date and time.' });
      return;
    }

    setBookingSubmitting(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: booking.name.trim(),
          phone: booking.phone.trim(),
          occasion: effectivePurpose,
          date: booking.date,
          time: booking.time,
          guests: Number(booking.guests)
        })
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error || 'Unable to send your reservation request.');
      }
    } catch (error) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'Could not send request',
        text: error?.message || 'Please try again or call us directly.'
      });
      return;
    } finally {
      setBookingSubmitting(false);
    }

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
    const dateFormatted = new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: `Thank you, ${booking.name}! 🎉`,
      html: `
        <div style="text-align:left; line-height:1.7; font-size:0.95rem; color:#e8ddd6; font-family: var(--font-roboto), Arial, sans-serif;">
          <p style="margin:0 0 12px;">Your reservation request has been received!</p>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0; width:80px;">📅 Date</td><td>${dateFormatted}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">🕐 Time</td><td>${escapeHtml(booking.time)}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">👥 Guests</td><td>${escapeHtml(booking.guests)} ${Number(booking.guests) === 1 ? 'Person' : 'People'}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">✨ Purpose</td><td>${escapeHtml(effectivePurpose)}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">📞 Phone</td><td>${escapeHtml(booking.phone)}</td></tr>
          </table>
          <p style="margin:14px 0 0; font-size:0.84rem; color:#b0a8a2;">We'll call you to confirm. See you soon!</p>
        </div>
      `,
      confirmButtonText: 'Done ✓',
      width: '460px',
    });
    setBooking({ name: '', phone: '', purpose: '', date: '', time: '', guests: '2' });
    setPurposeOther('');
  };


  return (
    <div className="pk-ref-home">
      <link rel="canonical" href={`${CANONICAL_ORIGIN}/`} />

      <section className="pk-ref-hero" aria-labelledby="pk-ref-hero-title">
        <div className="pk-ref-hero-slides" aria-live="polite">
          {heroSlides.map((slide, index) =>
            slide.type === 'video' ? (
              <video
                key={slide.name}
                ref={heroVideoRef}
                className={`pk-ref-hero-slide pk-ref-hero-video ${index === activeHeroSlide ? 'is-active' : ''}`}
                aria-hidden={index !== activeHeroSlide}
                muted
                playsInline
                preload="auto"
                poster={slide.poster}
                onEnded={() => { if (!reduceMotion) setActiveHeroSlide((current) => (current + 1) % heroSlides.length); }}
              >
                <source src={slide.src} type="video/mp4" />
              </video>
            ) : (
              <div
                className={`pk-ref-hero-slide ${index === activeHeroSlide ? 'is-active' : ''}`}
                key={slide.name}
                role="img"
                aria-label={index === activeHeroSlide ? `${slide.name}, featured dish` : undefined}
                aria-hidden={index !== activeHeroSlide}
                style={{ backgroundImage: `url(${isMobile ? slide.mobileImage : slide.image})` }}
              />
            )
          )}
        </div>
        <div className="pk-ref-hero-shade" aria-hidden="true" />
        <div className="pk-ref-wrap pk-ref-hero-inner">
          <div className="pk-ref-hero-copy">
            <p className="pk-ref-script">Welcome to Preva Kitchen</p>
            <h1 id="pk-ref-hero-title">Good Food<br />Good Mood</h1>
            <p className="pk-ref-hero-lead">Experience the perfect blend of bold flavor, warm ambience and genuine hospitality. Every dish is made fresh with care.</p>
            <div className="pk-ref-hero-actions">
              <Link className="pk-ref-button pk-ref-button--gold" href="/menu">
                Explore Menu <UtensilsCrossed size={17} aria-hidden="true" />
              </Link>
              <Link className="pk-ref-button pk-ref-button--outline" href="/menu">
                Order Now <ShoppingBag size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="pk-ref-hero-dots" aria-label="Featured hero slider controls">
          {heroSlides.map((slide, index) => (
            <button
              type="button"
              className={index === activeHeroSlide ? 'is-active' : ''}
              key={slide.name}
              aria-label={`Show ${slide.name}`}
              aria-current={index === activeHeroSlide ? 'true' : undefined}
              onClick={() => setActiveHeroSlide(index)}
            />
          ))}
        </div>
      </section>

      <section className="pk-ref-highlights" aria-label="Why dine at Preva Kitchen">
        <div className="pk-ref-wrap pk-ref-highlight-grid">
          {highlights.map(({ icon: Icon, title, text }) => (
            <article className="pk-ref-highlight" key={title}>
              <Icon aria-hidden="true" />
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pk-ref-story" id="pk-ref-story" aria-labelledby="pk-ref-story-title">
        <div className="pk-ref-story-shade" aria-hidden="true" />
        <div className="pk-ref-wrap pk-ref-story-inner">
          <div className="pk-ref-story-copy">
            <p className="pk-ref-kicker"><span /> Our Story</p>
            <h2 id="pk-ref-story-title">A Passion For Flavor<br />A Love For People</h2>
            <div className="pk-ref-ornament" aria-hidden="true"><i /><Sparkles size={17} /><i /></div>
            <p>At Preva Kitchen, great food brings people together. Our journey is rooted in serving craveable dishes made from quality ingredients in a warm, welcoming atmosphere.</p>
            <p>From casual dinners to milestone celebrations, every plate and every guest receives our full attention.</p>
            <Link className="pk-ref-button pk-ref-button--wine" href="/preva-kitchen">
              Explore Preva Kitchen <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pk-ref-categories" id="preva-menu" aria-labelledby="pk-ref-menu-title">
        <div className="pk-ref-wrap">
          <header className="pk-ref-section-heading">
            <p>Explore Our Menu</p>
            <h2 id="pk-ref-menu-title">Our Delicious Categories</h2>
            <div className="pk-ref-ornament" aria-hidden="true"><i /><Sparkles size={17} /><i /></div>
          </header>

          <div className="pk-ref-category-grid">
            {categories.map((category) => (
              <Link className="pk-ref-category" href="/menu" key={category.name}>
                <span className="pk-ref-category-image">
                  <img src={category.image} alt="" loading="lazy" style={{ objectPosition: category.position }} />
                </span>
                <strong>{category.name}</strong>
                <small>{category.count}</small>
                <i aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pk-ref-signatures" aria-labelledby="pk-ref-signatures-title">
        <div className="pk-ref-wrap">
          <header className="pk-ref-signatures-heading">
            <p>Fresh From Our Kitchen</p>
            <h2 id="pk-ref-signatures-title">Preva Favorites</h2>
            <div className="pk-ref-ornament" aria-hidden="true"><i /><Sparkles size={16} /><i /></div>
          </header>

          <div className="pk-ref-dish-grid">
            {signatureDishes.map((dish) => (
              <article className="pk-ref-dish-card" key={dish.slug}>
                <Link className="pk-ref-dish-media" href={`/menu/${dish.slug}`} aria-label={`View ${dish.name}`}>
                  <img src={dish.image} alt={dish.name} loading="lazy" />
                </Link>
                <div className="pk-ref-dish-body">
                  <div className="pk-ref-dish-title-row">
                    <h3>{dish.name}</h3>
                    <strong>{dish.price}</strong>
                  </div>
                  <p>{dish.description}</p>
                  <Link className="pk-ref-dish-order" href={`/menu/${dish.slug}`}>
                    Order Now <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <GoogleReviewsSection />

      <section className="pk-ref-booking" id="prv-reservations" aria-labelledby="pk-ref-booking-title">
        <div className="pk-ref-wrap">
          <div className="pk-ref-booking-card pk-ref-booking-card--split">
            {/* Left Column — Form */}
            <div className="pk-ref-booking-split-left">
              <div className="pk-ref-booking-intro">
                <div className="pk-ref-booking-copy">
                  <p className="pk-ref-script">Book Your Table</p>
                  <h2 id="pk-ref-booking-title">Make A Reservation</h2>
                  <p>Plan ahead and enjoy a relaxed dining experience. Fill in your details below and we&apos;ll confirm your table.</p>
                </div>
              </div>

              <form className="pk-ref-booking-form-split" onSubmit={submitBooking}>
                <div className="pk-ref-booking-contact-row">
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><User size={12} /> Your Name</span>
                    <input
                      className="pk-ref-booking-input"
                      type="text"
                      placeholder="e.g. John Smith"
                      value={booking.name}
                      onChange={updateBooking('name')}
                      aria-label="Your name"
                      autoComplete="name"
                      required
                    />
                  </div>

                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><Phone size={12} /> Phone Number</span>
                    <input
                      className="pk-ref-booking-input"
                      type="tel"
                      placeholder="e.g. (313) 000-0000"
                      value={booking.phone}
                      onChange={updateBooking('phone')}
                      aria-label="Phone number"
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>

                <div className="pk-ref-booking-group">
                  <span className="pk-ref-booking-label"><Sparkles size={12} /> Booking Purpose</span>
                  <select
                    className="pk-ref-booking-input"
                    value={booking.purpose}
                    onChange={updateBooking('purpose')}
                    aria-label="Booking purpose"
                    required
                  >
                    <option value="">Select a purpose</option>
                    {BOOKING_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {booking.purpose === 'Other' && (
                    <input
                      className="pk-ref-booking-input"
                      type="text"
                      style={{ marginTop: '8px' }}
                      placeholder="Tell us the occasion"
                      value={purposeOther}
                      onChange={(event) => setPurposeOther(event.target.value)}
                      aria-label="Describe booking purpose"
                      maxLength={80}
                      required
                    />
                  )}
                </div>

                <div className="pk-ref-booking-row-split">
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><CalendarDays size={12} /> Date</span>
                    <input
                      className="pk-ref-booking-input"
                      type="date"
                      value={booking.date}
                      onChange={updateBooking('date')}
                      aria-label="Reservation date"
                    />
                  </div>
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><Clock3 size={12} /> Time</span>
                    <select className="pk-ref-booking-input" value={booking.time} onChange={updateBooking('time')} aria-label="Reservation time">
                      <option value="">Select Time</option>
                      {['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'].map((time) => <option key={time}>{time}</option>)}
                    </select>
                  </div>
                  <div className="pk-ref-booking-group">
                    <span className="pk-ref-booking-label"><UsersRound size={12} /> Guests</span>
                    <select className="pk-ref-booking-input" value={booking.guests} onChange={updateBooking('guests')} aria-label="Number of guests">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>{g} {g === 1 ? 'Person' : 'People'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="pk-ref-button pk-ref-button--gold pk-ref-booking-submit" style={{ width: '100%', marginTop: '4px' }} disabled={bookingSubmitting}>
                  {bookingSubmitting ? 'Sending Request...' : 'Find A Table'} <ArrowRight size={16} />
                </button>
              </form>
            </div>

            {/* Right Column — Luxury Atmosphere Visual */}
            <div className="pk-ref-booking-split-right">
              <div className="pk-ref-booking-media">
                <img
                  src="/asset/reservation-dining.jpg?v=diverse-neighborhood-dining-v2"
                  alt="Black and White guests enjoying dinner together at Preva Kitchen"
                  className="pk-ref-booking-img"
                />
                <div className="pk-ref-booking-media-overlay" />
                <div className="pk-ref-booking-media-badge">
                  <span className="pk-ref-booking-badge-tag">REDFORD, MI · PREVA KITCHEN</span>
                  <span className="pk-ref-booking-badge-title">Dinner &amp; Warm Hospitality</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GallerySection images={restaurantGalleryImages} visible />
    </div>
  );
}

