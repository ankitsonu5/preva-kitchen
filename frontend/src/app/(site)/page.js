"use client";

import { useEffect, useState } from 'react';
import HeroSection from '@/components/sections/HeroSection';
import AboutSection from '@/components/sections/AboutSection';
import CulinarySection from '@/components/sections/CulinarySection';
import KitchenSection from '@/components/sections/KitchenSection';
import OrderOnlineSection from '@/components/sections/OrderOnlineSection';
import ReservationsSection from '@/components/sections/ReservationsSection';
import GallerySection from '@/components/sections/GallerySection';
import GoogleReviewsSection from '@/components/sections/GoogleReviewsSection';
import NewsletterSection from '@/components/sections/NewsletterSection';
import OrderNowMarquee from '@/components/OrderNowMarquee';

const API = '/api';
const CANONICAL_ORIGIN = (process.env.NEXT_PUBLIC_CANONICAL_URL || 'http://localhost:3000').replace(/\/$/, '');
const NON_KITCHEN_COPY = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b/i;
const DEFAULT_HERO_MEDIA = [
  { type: 'image', url: '/asset/hero/preva-feast-hero.jpg', alt: 'Preva Kitchen feast and signature serving tower', position: 'center' },
  { type: 'image', url: '/asset/hero/preva-steak-hero.jpg', alt: 'Grilled steak platter with fresh salad at Preva Kitchen', position: 'right center' },
  { type: 'image', url: '/asset/hero/preva-burger-hero.jpg', alt: 'Preva Kitchen signature sliders with fresh toppings', position: 'center' }
];

const DEFAULT_GALLERY = [
  { src: 'https://prevaclub.com/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg', caption: 'Preva Kitchen Atmosphere' },
  { src: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', caption: 'Signature Steak Bites' },
  { src: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80', caption: 'Wild Lobster Bites' },
  { src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', caption: 'Warm Kitchen Dining Room' },
  { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80', caption: 'Chef-Crafted Plates' }
];

export default function Home() {
  const [sectionVisibility, setSectionVisibility] = useState({});
  const [heroMedia, setHeroMedia] = useState(DEFAULT_HERO_MEDIA);
  const [heroHeadline, setHeroHeadline] = useState('BOLD FLAVOR.\nMADE FRESH.');
  const [heroSubhead, setHeroSubhead] = useState('Chef-driven comfort food in Redford.');
  const [heroSupporting, setHeroSupporting] = useState('');
  const [aboutEyebrow, setAboutEyebrow] = useState('ABOUT PREVA KITCHEN');
  const [aboutTitle, setAboutTitle] = useState('Food Worth Gathering Around');
  const [aboutDescription, setAboutDescription] = useState('Preva Kitchen brings together familiar comfort, bold flavor and thoughtful presentation. Every plate is prepared with care in a welcoming space made for family dinners, date nights and celebrations.\n\nJoin us in Redford, order your favorites to go, or let our kitchen feed your next gathering.');
  const aboutImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80';
  const [kitchenContent, setKitchenContent] = useState({});
  const [orderContent, setOrderContent] = useState({});
  const galleryImages = DEFAULT_GALLERY;
  const [activeTab, setActiveTab] = useState('dining');

  const goToReservations = (tab = 'dining') => {
    setActiveTab(tab);
    document.getElementById('prv-reservations')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch(`${API}/sections`);
        if (response.ok) {
          const sections = await response.json();
          setSectionVisibility(Object.fromEntries(sections.map((section) => [section.key, section.visible !== false])));

          const hero = sections.find((section) => section.key === 'home_hero')?.data;
          if (hero) {
            if (hero.headline && !NON_KITCHEN_COPY.test(hero.headline)) setHeroHeadline(hero.headline);
            if (hero.subhead && !NON_KITCHEN_COPY.test(hero.subhead)) setHeroSubhead(hero.subhead);
            if (hero.supportingText && !NON_KITCHEN_COPY.test(hero.supportingText)) setHeroSupporting(hero.supportingText);
            const configuredMedia = Array.isArray(hero.media)
              ? hero.media.filter((item) => item?.url && ['image', 'video'].includes(item.type))
              : [];
            if (configuredMedia.length) setHeroMedia(configuredMedia);
          }

          const about = sections.find((section) => section.key === 'home_about')?.data;
          if (about) {
            if (about.eyebrow && !NON_KITCHEN_COPY.test(about.eyebrow)) setAboutEyebrow(about.eyebrow);
            if (about.title && !NON_KITCHEN_COPY.test(about.title)) setAboutTitle(about.title);
            if (about.description && !NON_KITCHEN_COPY.test(about.description)) setAboutDescription(about.description);
          }

          setKitchenContent(sections.find((section) => section.key === 'home_kitchen')?.data || {});
          setOrderContent(sections.find((section) => section.key === 'home_order')?.data || {});
        }
      } catch (error) {
        console.error('Failed to load homepage content, using kitchen fallbacks:', error);
      }
    }
    loadContent();
  }, []);

  return (
    <>
      <link rel="canonical" href={`${CANONICAL_ORIGIN}/`} />
      <HeroSection media={heroMedia} headline={heroHeadline} subhead={heroSubhead} supporting={heroSupporting} visible={sectionVisibility.home_hero} />

      <section className="lx-stats-band" aria-label="Preva Kitchen services">
        <div className="container"><div className="lx-stats-grid">
          <div className="lx-stat"><span className="lx-stat-num">11<em>AM</em></span><span className="lx-stat-label">Kitchen Opens</span><span className="lx-stat-sub">Lunch and dinner, made fresh</span></div>
          <div className="lx-stat"><span className="lx-stat-num">FRESH</span><span className="lx-stat-label">Made to Order</span><span className="lx-stat-sub">Chef-driven plates prepared with care</span></div>
          <div className="lx-stat"><span className="lx-stat-num">PICK<em>UP</em></span><span className="lx-stat-label">Easy Ordering</span><span className="lx-stat-sub">Order ahead and collect from the kitchen</span></div>
          <div className="lx-stat"><span className="lx-stat-num">GROUPS</span><span className="lx-stat-label">Catering &amp; Events</span><span className="lx-stat-sub">Flexible menus for meals worth sharing</span></div>
        </div></div>
      </section>

      <AboutSection eyebrow={aboutEyebrow} title={aboutTitle} description={aboutDescription} image={aboutImage} visible={sectionVisibility.home_about} />
      <OrderNowMarquee />

      <KitchenSection kitchenContent={kitchenContent} visible={sectionVisibility.home_kitchen} onReserveDining={() => goToReservations('dining')} onOpenMenu={() => window.openMenuModal?.()} onOpenOrder={() => window.openOrderModal?.()} />
      <CulinarySection visible={sectionVisibility.home_culinary ?? sectionVisibility.dining} onReserveDining={() => goToReservations('dining')} />
      <OrderOnlineSection content={orderContent} visible={sectionVisibility.home_order !== false} />
      {/* Temporarily hidden on the homepage. Keep the reservation/catering form
          component intact so it can be restored later without rebuilding it.
      <ReservationsSection activeTab={activeTab} setActiveTab={setActiveTab} visible={sectionVisibility.reservations} />
      */}
      <GallerySection images={galleryImages} visible={sectionVisibility.gallery} />
      <GoogleReviewsSection visible={sectionVisibility.testimonials} />
      <NewsletterSection />
    </>
  );
}
