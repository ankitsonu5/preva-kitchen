"use client";
import { useState, useEffect, useMemo, useRef } from 'react';

const HERO_SLIDE_DELAY_MS = 2000;

export default function HeroSection({ media, slides, headline, subhead, supporting, visible, videoUrl }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const videoRef = useRef(null);
  const items = useMemo(() => {
    const configured = Array.isArray(media) ? media.filter((item) => item?.url) : [];
    if (configured.length) return configured.map((item) => ({ ...item, type: item.type === 'video' ? 'video' : 'image' }));
    return [
      ...(videoUrl ? [{ type: 'video', url: videoUrl, poster: slides?.[0] || '' }] : []),
      ...(Array.isArray(slides) ? slides.filter(Boolean).map((url) => ({ type: 'image', url })) : [])
    ];
  }, [media, slides, videoUrl]);

  const advance = () => setActiveSlide((current) => items.length ? (current + 1) % items.length : 0);
  const currentItem = items[activeSlide] || items[0];

  useEffect(() => {
    if (activeSlide >= items.length) setActiveSlide(0);
  }, [activeSlide, items.length]);

  useEffect(() => {
    if (!currentItem || currentItem.type === 'video' || items.length < 2) return;
    const timer = window.setTimeout(advance, HERO_SLIDE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeSlide, currentItem, items.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentItem?.type !== 'video') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    video.play().catch(() => {});
  }, [activeSlide, currentItem]);

  if (visible === false) return null;

  return (
    <section id="hero" className="hero-section luxe-hero">
      <div className="hero-media">
        {currentItem?.type === 'video' ? (
          <video
            ref={videoRef}
            key={currentItem.url}
            className="hero-video is-ready"
            autoPlay
            muted
            loop={items.length === 1}
            playsInline
            preload="metadata"
            poster={currentItem.poster || items.find((item) => item.type === 'image')?.url}
            onEnded={advance}
            onError={advance}
            aria-hidden="true"
            src={currentItem.url}
          />
        ) : (
          <div
            key={currentItem?.url || 'empty-hero'}
            className="hero-slide-image is-active"
            role="img"
            aria-label={currentItem?.alt || 'Preva Kitchen featured dish'}
            style={{ backgroundImage: currentItem?.url ? `url(${currentItem.url})` : 'none', backgroundPosition: currentItem?.position || 'center' }}
          />
        )}
      </div>

      {/* Layered cinematic grade: dark base, gold vignette, glossy top light */}
      <div className="overlay luxe-hero-grade"></div>
      <div className="luxe-hero-vignette" aria-hidden="true"></div>
      <div className="luxe-hero-grain" aria-hidden="true"></div>

      <div className="container text-center hero-content luxe-hero-content">
        <span className="luxe-hero-badge lx-stage lx-stage-1">
          <span className="luxe-badge-dot" aria-hidden="true"></span>
          REDFORD &middot; CHEF-DRIVEN COMFORT FOOD
        </span>

        <h1 className="hero-headline lx-stage lx-stage-2" style={{ whiteSpace: 'pre-line' }}>
          {headline}
        </h1>
        <p className="hero-subhead lx-stage lx-stage-3" style={{ whiteSpace: 'pre-line' }}>
          {subhead}
        </p>
        {supporting && <p className="hero-supporting-text lx-stage lx-stage-4" style={{ whiteSpace: 'pre-line' }}>{supporting}</p>}

        <div className="cta-group lx-stage lx-stage-5">
          <a
            href="#preva-menu"
            className="btn btn-hero-primary"
            style={{ margin: '0 10px' }}
            onClick={(e) => {
              e.preventDefault();
              if (typeof window !== 'undefined' && window.openMenuModal) {
                window.openMenuModal();
              }
            }}
          >
            VIEW THE MENU
          </a>
          <a
            href="#preva-order"
            className="btn btn-hero-secondary"
            style={{ margin: '0 10px' }}
            onClick={(e) => {
              e.preventDefault();
              if (typeof window !== 'undefined' && window.openOrderModal) {
                window.openOrderModal();
              }
            }}
          >
            ORDER ONLINE
          </a>
        </div>
      </div>

      {items.length > 1 && (
        <div className="hero-media-dots" aria-label="Hero slider controls">
          {items.map((item, index) => (
            <button key={`${item.url}-${index}`} type="button" className={index === activeSlide ? 'is-active' : ''} onClick={() => setActiveSlide(index)} aria-label={`Show hero slide ${index + 1}`} aria-current={index === activeSlide ? 'true' : undefined} />
          ))}
        </div>
      )}
    </section>
  );
}
