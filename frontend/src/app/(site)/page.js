"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import GoogleReviewsSection from '@/components/sections/GoogleReviewsSection';
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

const CANONICAL_ORIGIN = (process.env.NEXT_PUBLIC_CANONICAL_URL || 'http://localhost:3000').replace(/\/$/, '');
const HERO_SLIDE_DELAY = 2000;

const heroSlides = [
  { image: '/asset/home-reference/preva-restaurant-hero.png?v=restaurant-slider', name: 'Preva Lamb Chops' },
  { image: '/asset/home-reference/preva-rasta-pasta-hero.png?v=restaurant-slider', name: 'Preva Rasta Pasta' },
  { image: '/asset/home-reference/preva-burger-hero.png?v=restaurant-slider', name: 'Preva Burger' }
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
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [booking, setBooking] = useState({ name: '', phone: '', date: '', time: '', guests: '2' });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_SLIDE_DELAY);
    return () => window.clearInterval(timer);
  }, []);

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
    if (!booking.name.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Name required', text: 'Please enter your name.' });
      return;
    }
    if (!booking.phone.trim()) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Phone required', text: 'Please enter your phone number.' });
      return;
    }
    if (!booking.date || !booking.time) {
      Swal.fire({ ...swalBase, icon: 'warning', title: 'Date & Time required', text: 'Please select a date and time.' });
      return;
    }
    const dateFormatted = new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: `Thank you, ${booking.name}! 🎉`,
      html: `
        <div style="text-align:left; line-height:1.7; font-size:0.95rem; color:#e8ddd6; font-family:Inter,Arial,sans-serif;">
          <p style="margin:0 0 12px;">Your reservation request has been received!</p>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0; width:80px;">📅 Date</td><td>${dateFormatted}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">🕐 Time</td><td>${booking.time}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">👥 Guests</td><td>${booking.guests} ${Number(booking.guests) === 1 ? 'Person' : 'People'}</td></tr>
            <tr><td style="color:#d5a44f; font-weight:700; padding:5px 0;">📞 Phone</td><td>${booking.phone}</td></tr>
          </table>
          <p style="margin:14px 0 0; font-size:0.84rem; color:#b0a8a2;">We'll call you to confirm. See you soon!</p>
        </div>
      `,
      confirmButtonText: 'Done ✓',
      width: '460px',
    });
    setBooking({ name: '', phone: '', date: '', time: '', guests: '2' });
  };


  return (
    <div className="pk-ref-home">
      <link rel="canonical" href={`${CANONICAL_ORIGIN}/`} />

      <section className="pk-ref-hero" aria-labelledby="pk-ref-hero-title">
        <div className="pk-ref-hero-slides" aria-live="polite">
          {heroSlides.map((slide, index) => (
            <div
              className={`pk-ref-hero-slide ${index === activeHeroSlide ? 'is-active' : ''}`}
              key={slide.name}
              role="img"
              aria-label={index === activeHeroSlide ? `${slide.name}, featured dish` : undefined}
              aria-hidden={index !== activeHeroSlide}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>
        <div className="pk-ref-hero-shade" aria-hidden="true" />
        <div className="pk-ref-wrap pk-ref-hero-inner">
          <div className="pk-ref-hero-copy">
            <p className="pk-ref-script">Welcome to Preva Kitchen</p>
            <h1 id="pk-ref-hero-title">Good Food<br />Good Mood</h1>
            <p className="pk-ref-hero-lead">Experience the perfect blend of bold flavor, warm ambience and genuine hospitality. Every dish is made fresh with care.</p>
            <div className="pk-ref-hero-actions">
              <Link className="pk-ref-button pk-ref-button--gold" href="/shop">
                Explore Menu <UtensilsCrossed size={17} aria-hidden="true" />
              </Link>
              <Link className="pk-ref-button pk-ref-button--outline" href="/shop">
                Order Now <ShoppingBag size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
        <div className="pk-ref-hero-dots" aria-label="Featured dish slider controls">
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
              <Link className="pk-ref-category" href="/shop" key={category.name}>
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
                <Link className="pk-ref-dish-media" href={`/shop/${dish.slug}`} aria-label={`View ${dish.name}`}>
                  <img src={dish.image} alt={dish.name} loading="lazy" />
                </Link>
                <div className="pk-ref-dish-body">
                  <div className="pk-ref-dish-title-row">
                    <h3>{dish.name}</h3>
                    <strong>{dish.price}</strong>
                  </div>
                  <p>{dish.description}</p>
                  <Link className="pk-ref-dish-order" href={`/shop/${dish.slug}`}>
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
                  />
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

                <button type="submit" className="pk-ref-button pk-ref-button--gold pk-ref-booking-submit" style={{ width: '100%', marginTop: '4px' }}>
                  Find A Table <ArrowRight size={16} />
                </button>
              </form>
            </div>

            {/* Right Column — Luxury Atmosphere Visual */}
            <div className="pk-ref-booking-split-right">
              <div className="pk-ref-booking-media">
                <img
                  src="/asset/reservation-dining.jpg"
                  alt="Preva Luxury Dining Atmosphere"
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
    </div>
  );
}

