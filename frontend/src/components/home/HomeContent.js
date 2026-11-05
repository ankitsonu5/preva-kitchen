"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import GallerySection from '@/components/sections/GallerySection';
import BookingSection from '@/components/home/BookingSection';
import { getCanonicalOrigin } from '@/lib/site-url';
import { money } from '@/lib/money';
import { withoutLegacyDuplicates } from '@/lib/legacy-dish-slugs';
import { categoryPath, menuCategoryOptions } from '@/lib/menu-categories';
import { getMenuDisplayName, getProductMenuPriceCents } from '@/lib/menu-options';
import PageBuilder from '@/components/PageBuilder';
import {
  ArrowRight,
  BadgeCheck,
  ChefHat,
  CookingPot,
  ShoppingBag,
  Sofa,
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';

const CANONICAL_ORIGIN = getCanonicalOrigin();

const restaurantGalleryImages = [
  {
    src: '/asset/prevaclub/wp-content/uploads/2026/08/Preva-Burger-768x768.jpg',
    caption: 'Preva Burger'
  },
  {
    src: '/asset/gallery/STEAK02.webp',
    caption: 'Steak Bites'
  },
  {
    src: '/asset/prevaclub/wp-content/uploads/2026/08/PrevaLobster-768x768.webp',
    caption: 'Lobster Bites'
  },
  {
    src: '/asset/gallery/RASTA05.webp',
    caption: 'Rasta Pasta'
  },
  {
    src: '/asset/gallery/CATFISH01.webp',
    caption: 'Catfish Bites'
  }
];

const HERO_IMAGE_SLIDE_DELAY = 2000;

// The hero background cycles through the intro video, then the three dish
// photos, then back to the video — one rotation, one set of dots, all inside
// the hero itself (not a separate section further down the page).
// The video is a full-quality 1080p re-encode (~13 MB) of
// /asset/Video/1080-PASTA.mp4 (49 MB), which was too heavy to stream.
const heroSlides = [
  {
    type: 'video',
    sources: [
      { src: '/asset/Video/hero-pasta-1080.mp4', type: 'video/mp4' }
    ],
    poster: '/asset/home-reference/preva-restaurant-hero.webp',
    name: 'Preva Kitchen'
  },
  { type: 'image', image: '/asset/home-reference/preva-restaurant-hero.webp', mobileImage: '/asset/home-reference/preva-restaurant-hero-mobile.webp', name: 'Preva Lamb Chops' },
  { type: 'image', image: '/asset/home-reference/preva-rasta-pasta-hero.webp', mobileImage: '/asset/home-reference/preva-rasta-pasta-hero-mobile.webp', name: 'Preva Rasta Pasta' },
  { type: 'image', image: '/asset/home-reference/preva-burger-hero.webp', mobileImage: '/asset/home-reference/preva-burger-hero-mobile.webp', name: 'Preva Burger' }
];


const highlights = [
  { icon: CookingPot, title: 'Delicious Food', text: 'Fresh ingredients and carefully crafted dishes.' },
  { icon: ChefHat, title: 'Expert Chefs', text: 'Talented cooks with years of culinary experience.' },
  { icon: Sofa, title: 'Cozy Ambience', text: 'A welcoming place for family, friends and celebrations.' },
  { icon: BadgeCheck, title: 'Quality Service', text: 'Warm hospitality for every guest at every table.' }
];

function buildCategories(menuProducts, menuCategories = []) {
  return menuCategoryOptions(withoutLegacyDuplicates(menuProducts), menuCategories);
}

const SIGNATURE_DISH_COUNT = 8;

// "Preva Favorites" is taken straight from the menu: featured dishes first,
// then the rest in menu order, 8 in total. Name, price, description and link
// are the menu's own, so the home page can never disagree with /menu.
function buildSignatureDishes(menuProducts) {
  const visible = withoutLegacyDuplicates(menuProducts).filter((product) => product.slug);
  const featured = visible.filter((product) => product.featured);
  const rest = visible.filter((product) => !product.featured);
  return [...featured, ...rest]
    .slice(0, SIGNATURE_DISH_COUNT)
    .map((product) => ({
      id: product.id,
      name: getMenuDisplayName(product.name, product.slug),
      slug: product.slug,
      price: money(getProductMenuPriceCents(product)),
      description: product.description || '',
      image: product.image || '',
      available: product.available !== false
    }));
}

function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionData(sections, type) {
  return sections.find((section) => section?.type === type && section.enabled !== false)?.data || {};
}

function galleryBlockImages(data) {
  if (!Array.isArray(data?.images)) return [];
  return data.images
    .map((image) => ({
      src: image?.src || image?.url || '',
      caption: image?.caption || image?.alt || ''
    }))
    .filter((image) => image.src)
    .slice(0, 5);
}

export default function Home({ menuProducts = [], menuCategories = [], cmsPage = null, galleryImages }) {
  const signatureDishes = buildSignatureDishes(menuProducts);
  const categories = buildCategories(menuProducts, menuCategories);
  const homeSections = Array.isArray(cmsPage?.sections) ? cmsPage.sections : [];
  const heroContent = sectionData(homeSections, 'hero');
  const storyContent = sectionData(homeSections, 'about');
  const configuredGallery = galleryBlockImages(sectionData(homeSections, 'gallery'));
  const homeText = plainText(cmsPage?.content);
  const customBlocks = homeSections.filter((section) => (
    section?.enabled !== false &&
    !['hero', 'about', 'gallery', 'kitchen', 'food_menu_grid', 'nightlife', 'reservations', 'testimonials', 'newsletter', 'contact', 'posts_grid'].includes(section?.type)
  ));
  const visibleGalleryImages = galleryImages?.length >= 5
    ? galleryImages
    : configuredGallery.length >= 5
      ? configuredGallery
      : restaurantGalleryImages;
  const displayedHeroSlides = useMemo(() => heroSlides.map((slide, index) => (
    cmsPage?.featuredImage && index === 0
      ? { ...slide, poster: cmsPage.featuredImage }
      : cmsPage?.featuredImage && index === 1
        ? { ...slide, image: cmsPage.featuredImage, mobileImage: cmsPage.featuredImage }
        : slide
  )), [cmsPage?.featuredImage]);
  // Autoplaying background video is exactly what prefers-reduced-motion
  // asks sites to avoid — fall back to the poster image (a still frame) for
  // anyone who has that on, instead of forcing the motion on them.
  const [reduceMotion, setReduceMotion] = useState(false);
  // Also skip the autoplaying 1080p hero video for visitors on a metered /
  // slow connection (Data Saver, or 2G-class effectiveType) — same poster
  // fallback, just triggered by network conditions instead of motion prefs.
  const [saveData, setSaveData] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const heroVideoRef = useRef(null);
  // The 1080p hero video is the main mobile LCP cost, so phones (like Data
  // Saver / slow-connection visitors) get the poster still instead of the video.
  const skipVideo = saveData || isMobile;
  // The video and the off-screen slide photos only start downloading once the
  // page has finished loading, so they never compete with the poster (LCP).
  const [heroAssetsReady, setHeroAssetsReady] = useState(false);

  useEffect(() => {
    const markReady = () => setHeroAssetsReady(true);
    if (document.readyState === 'complete') {
      markReady();
      return undefined;
    }
    window.addEventListener('load', markReady, { once: true });
    return () => window.removeEventListener('load', markReady);
  }, []);

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

  useEffect(() => {
    const connection = typeof navigator !== 'undefined'
      ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection)
      : null;
    if (!connection) return undefined;
    const onChange = () => {
      setSaveData(Boolean(connection.saveData) || /^(slow-2g|2g)$/.test(connection.effectiveType || ''));
    };
    onChange();
    connection.addEventListener?.('change', onChange);
    return () => connection.removeEventListener?.('change', onChange);
  }, []);

  // Image slides advance on a fixed timer; the video slide advances itself
  // (see the <video onEnded>  below) once it finishes playing, so it isn't
  // cut short or dragged out relative to its own length.
  useEffect(() => {
    if (reduceMotion || displayedHeroSlides[activeHeroSlide].type !== 'image') return undefined;
    const timer = window.setTimeout(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_IMAGE_SLIDE_DELAY);
    return () => window.clearTimeout(timer);
  }, [activeHeroSlide, reduceMotion, displayedHeroSlides]);

  // Play/pause the (always-mounted, so it never has to re-buffer) hero video
  // to match whether its slide is actually the one showing right now. Skipped
  // entirely (falls back to the poster still) for reduced-motion or Data
  // Saver / slow-connection visitors.
  useEffect(() => {
    const videoEl = heroVideoRef.current;
    if (!videoEl) return;
    if (activeHeroSlide === 0 && !reduceMotion && !skipVideo && heroAssetsReady) {
      videoEl.muted = true;
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  }, [activeHeroSlide, reduceMotion, skipVideo, heroAssetsReady]);

  // On a metered connection the video slide would otherwise sit frozen on
  // its poster forever (it normally advances itself via onEnded once
  // playback finishes) — advance it on the same timer used for image slides.
  useEffect(() => {
    if (!skipVideo || reduceMotion || displayedHeroSlides[activeHeroSlide].type !== 'video') return undefined;
    const timer = window.setTimeout(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, HERO_IMAGE_SLIDE_DELAY);
    return () => window.clearTimeout(timer);
  }, [activeHeroSlide, reduceMotion, skipVideo, displayedHeroSlides]);



  return (
    <div className="pk-ref-home">
      <link rel="canonical" href={`${CANONICAL_ORIGIN}/`} />

      <section className="pk-ref-hero" aria-labelledby="pk-ref-hero-title">
        <div className="pk-ref-hero-slides" aria-live="polite">
          {displayedHeroSlides.map((slide, index) =>
            slide.type === 'video' ? (
              <video
                key={slide.name}
                ref={heroVideoRef}
                className={`pk-ref-hero-slide pk-ref-hero-video ${index === activeHeroSlide ? 'is-active' : ''}`}
                aria-hidden={index !== activeHeroSlide}
                muted
                playsInline
                preload="none"
                poster={slide.poster}
                onEnded={() => { if (!reduceMotion) setActiveHeroSlide((current) => (current + 1) % heroSlides.length); }}
              >
                {slide.sources.map((source) => (
                  <source key={source.src} src={source.src} type={source.type} />
                ))}
              </video>
            ) : (
              <div
                className={`pk-ref-hero-slide ${index === activeHeroSlide ? 'is-active' : ''}`}
                key={slide.name}
                role="img"
                aria-label={index === activeHeroSlide ? `${slide.name}, featured dish` : undefined}
                aria-hidden={index !== activeHeroSlide}
                style={heroAssetsReady || index === activeHeroSlide
                  ? { backgroundImage: `url(${isMobile ? slide.mobileImage : slide.image})` }
                  : undefined}
              />
            )
          )}
        </div>
        <div className="pk-ref-hero-shade" aria-hidden="true" />
        <div className="pk-ref-wrap pk-ref-hero-inner">
          <div className="pk-ref-hero-copy">
            <h1 id="pk-ref-hero-title" style={{ whiteSpace: 'pre-line' }}>
              <span className="pk-ref-h1-eyebrow">Preva Kitchen – Restaurant in Redford Township, MI</span>
              {heroContent.headline || 'Good Food\nGood Mood'}
            </h1>
            <p className="pk-ref-hero-lead">{heroContent.supportingText || heroContent.subhead || cmsPage?.excerpt || 'Experience the perfect blend of bold flavor, warm ambience and genuine hospitality. Every dish is made fresh with care.'}</p>
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

      <section className={`pk-ref-story${storyContent.image ? ' pk-ref-story--cms-image' : ''}`} id="pk-ref-story" aria-labelledby="pk-ref-story-title">
        {storyContent.image ? <img className="pk-ref-story-image" src={storyContent.image} alt="" /> : null}
        <div className="pk-ref-story-shade" aria-hidden="true" />
        <div className="pk-ref-wrap pk-ref-story-inner">
          <div className="pk-ref-story-copy">
            <p className="pk-ref-kicker"><span /> {storyContent.eyebrow || 'Our Story'}</p>
            <h2 id="pk-ref-story-title" style={{ whiteSpace: 'pre-line' }}>{storyContent.title || 'A Passion For Flavor\nA Love For People'}</h2>
            <div className="pk-ref-ornament" aria-hidden="true"><i /><Sparkles size={17} /><i /></div>
            <p>{storyContent.description || homeText || 'At Preva Kitchen, great food brings people together. Our journey is rooted in serving craveable dishes made from quality ingredients in a warm, welcoming atmosphere.'}</p>
            <p>From casual dinners to milestone celebrations, every plate and every guest receives our full attention.</p>
            <Link className="pk-ref-button pk-ref-button--wine" href="/about">
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
              <Link className="pk-ref-category" href={categoryPath(category.name)} key={category.name}>
                <span className="pk-ref-category-image">
                  {category.image && (
                    <img src={category.image} alt={`${category.name} at Preva Kitchen`} loading="lazy" />
                  )}
                </span>
                <strong>{category.name}</strong>
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
              <article className="pk-ref-dish-card" key={dish.id || dish.slug}>
                <Link className="pk-ref-dish-media" href={`/menu/${dish.slug}`} aria-label={`View ${dish.name}`}>
                  {dish.image ? (
                    <img src={dish.image} alt={dish.name} loading="lazy" />
                  ) : (
                    <span className="pk-ref-dish-no-image" role="img" aria-label={`${dish.name} photo unavailable`}>Photo unavailable</span>
                  )}
                </Link>
                <div className="pk-ref-dish-body">
                  <div className="pk-ref-dish-title-row">
                    <h3>{dish.name}</h3>
                    <strong>{dish.price}</strong>
                  </div>
                  <p>{dish.description}</p>
                  {dish.available ? (
                    <Link className="pk-ref-dish-order" href={`/menu/${dish.slug}`}>
                      Order Now <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  ) : <span className="pk-ref-dish-order">Sold Out</span>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPORARY: reservation form hidden on the home page for now. Original:
      <BookingSection /> */}

      {customBlocks.length > 0 ? <PageBuilder sections={customBlocks} /> : null}
      <GallerySection images={visibleGalleryImages} visible />
    </div>
  );
}
