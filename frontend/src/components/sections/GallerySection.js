"use client";
import { useState, useEffect, useRef } from 'react';

export default function GallerySection({ images = [], visible }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const stackedGalleryRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight' && lightboxIdx !== null && images.length)
        setLightboxIdx(prev => (prev + 1) % images.length);
      if (e.key === 'ArrowLeft' && lightboxIdx !== null && images.length)
        setLightboxIdx(prev => (prev - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', handleKey);
    if (lightboxIdx !== null) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIdx, images.length]);

  /* The GSAP pinned scroll animation that used to live here is gone on
     purpose. Pinning wraps the section in a pin-spacer div that React does not
     know about; combined with the removeChild patch in Shell.js, every state
     update on the home page re-appended the section instead of replacing it —
     which is exactly why "The Preva Gallery" showed up twice and floated over
     the reservations panel. The fanned-card look is now pure CSS (the
     .stacked-card nth-child rotations), scrolls normally, and cannot
     duplicate. The lightbox is unchanged. */

  if (visible === false) return null;

  return (
    <>
      <section id="gallery" className="gallery-scroll-section" ref={stackedGalleryRef}>
        <div className="container text-center" style={{ marginBottom: '2rem' }}>
          <span className="section-eyebrow">Gallery</span>
          <h2 className="home-section-heading">The Preva Gallery</h2>
          <div className="gallery-separator"></div>
          <p className="gallery-subtitle">Scroll down to explore the vibe.</p>
        </div>
        <div className="stacked-cards-container">
          {images.slice(0, 5).map((img, idx) => (
            <div key={idx} className="stacked-card" onClick={() => setLightboxIdx(idx)}>
              <div className="stacked-card-inner">
                <img src={img.src} alt={img.caption} loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div id="lightbox-modal" className="lightbox-modal" style={{ display: 'flex' }}>
          <button className="lightbox-close" aria-label="Close" onClick={() => setLightboxIdx(null)}>&times;</button>
          <div className="lightbox-content">
            <button
              className="lightbox-prev"
              aria-label="Previous"
              onClick={() => setLightboxIdx(prev => (prev - 1 + images.length) % images.length)}
            >
              &#10094;
            </button>
            <div className="lightbox-img-container">
              <div className="lightbox-counter">{lightboxIdx + 1} / {images.length}</div>
              <img id="lightbox-img" src={images[lightboxIdx].src} alt={images[lightboxIdx].caption} />
              <div className="lightbox-caption">{images[lightboxIdx].caption}</div>
            </div>
            <button
              className="lightbox-next"
              aria-label="Next"
              onClick={() => setLightboxIdx(prev => (prev + 1) % images.length)}
            >
              &#10095;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
