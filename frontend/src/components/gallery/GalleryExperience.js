'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import styles from './GalleryExperience.module.css';

function getMenuImages(menuItems) {
  return menuItems
    .filter((item) => item && item.galleryVisible !== false && typeof item.image === 'string' && item.image.trim())
    .map((item, index) => ({
      id: item.id || item.slug || `${item.name}-${index}`,
      url: item.image,
      title: item.name || '',
      alt: item.name || 'Preva Kitchen menu item',
      categoryId: item.category || 'menu',
      category: item.category || 'Menu',
      description: item.description || ''
    }));
}

export default function GalleryExperience({ menuItems = [], dataAvailable = true }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const previousFocus = useRef(null);
  const closeButton = useRef(null);
  const touchStart = useRef(null);
  const images = useMemo(() => getMenuImages(menuItems), [menuItems]);
  const categories = useMemo(() => {
    const visibleCategories = new Map();
    images.forEach((image) => visibleCategories.set(image.categoryId, image.category));
    return [...visibleCategories.entries()].map(([id, label]) => ({ id, label }));
  }, [images]);
  const filteredImages = activeCategory === 'all'
    ? images
    : images.filter((image) => image.categoryId === activeCategory);
  const currentImage = lightboxIndex === null ? null : filteredImages[lightboxIndex];

  const closeLightbox = () => setLightboxIndex(null);
  const showPrevious = () => setLightboxIndex((index) => (index - 1 + filteredImages.length) % filteredImages.length);
  const showNext = () => setLightboxIndex((index) => (index + 1) % filteredImages.length);
  const isLightboxOpen = lightboxIndex !== null;

  useEffect(() => {
    if (!isLightboxOpen) {
      previousFocus.current?.focus();
      previousFocus.current = null;
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setLightboxIndex(null);
      if (event.key === 'ArrowLeft' && filteredImages.length > 1) {
        event.preventDefault();
        setLightboxIndex((index) => (index - 1 + filteredImages.length) % filteredImages.length);
      }
      if (event.key === 'ArrowRight' && filteredImages.length > 1) {
        event.preventDefault();
        setLightboxIndex((index) => (index + 1) % filteredImages.length);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, filteredImages.length]);

  const openLightbox = (index, event) => {
    previousFocus.current = event.currentTarget;
    setLightboxIndex(index);
  };

  const changeCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setLightboxIndex(null);
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>The Preva Experience</p>
          <h1>Preva Menu, <em>In Pictures</em></h1>
          <p className={styles.intro}>
            Browse the dishes currently featured on the Preva Kitchen menu.
          </p>
        </div>
      </section>

      <section className={styles.gallerySection} aria-label="Preva Kitchen menu images">
        <div className={styles.container}>
          <div className={styles.filters} role="group" aria-label="Filter menu items by category">
            <button
              type="button"
              className={activeCategory === 'all' ? styles.activeFilter : styles.filter}
              aria-pressed={activeCategory === 'all'}
              onClick={() => changeCategory('all')}
            >
              All Menu Items
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={activeCategory === category.id ? styles.activeFilter : styles.filter}
                aria-pressed={activeCategory === category.id}
                onClick={() => changeCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          {filteredImages.length ? (
            <div className={styles.masonry}>
              {filteredImages.map((image, index) => (
                <button
                  type="button"
                  className={styles.photo}
                  key={image.id}
                  onClick={(event) => openLightbox(index, event)}
                  aria-label={`View ${image.title || image.category} photo`}
                >
                  <span className={styles.imageFrame}>
                    <img
                      src={image.url}
                      alt={image.alt}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      decoding="async"
                    />
                  </span>
                  {(image.title || image.category) && (
                    <span className={styles.caption}>
                      {image.title && <strong>{image.title}</strong>}
                      <span>{image.category}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>
              {dataAvailable ? 'No menu item images are available yet.' : 'Menu images are temporarily unavailable.'}
            </p>
          )}

          <section className={styles.cta}>
            <p className={styles.eyebrow}>Made to be experienced</p>
            <h2>Ready to Experience Preva?</h2>
            <p>From signature favorites to unforgettable dining moments, experience the flavors of Preva Kitchen.</p>
            <div className={styles.ctaActions}>
              <Link className={styles.primaryAction} href="/menu">View Menu</Link>
              <Link className={styles.secondaryAction} href="/menu">Order Online</Link>
            </div>
          </section>
        </div>
      </section>

      {currentImage && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={currentImage.title || currentImage.category}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className={styles.close}
            aria-label="Close image viewer"
            ref={closeButton}
            onClick={closeLightbox}
          >
            <X size={22} />
          </button>
          {filteredImages.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.navigation} ${styles.previous}`}
                aria-label="Previous image"
                onClick={(event) => { event.stopPropagation(); showPrevious(); }}
              >
                <ArrowLeft size={22} />
              </button>
              <button
                type="button"
                className={`${styles.navigation} ${styles.next}`}
                aria-label="Next image"
                onClick={(event) => { event.stopPropagation(); showNext(); }}
              >
                <ArrowRight size={22} />
              </button>
            </>
          )}
          <figure
            className={styles.lightboxFigure}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
              if (touchStart.current === null || filteredImages.length < 2) return;
              const distance = event.changedTouches[0].clientX - touchStart.current;
              if (Math.abs(distance) > 50) (distance > 0 ? showPrevious : showNext)();
              touchStart.current = null;
            }}
          >
            <img src={currentImage.url} alt={currentImage.alt} />
            {(currentImage.title || currentImage.description) && (
              <figcaption>
                {currentImage.title && <strong>{currentImage.title}</strong>}
                {currentImage.description && <span>{currentImage.description}</span>}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </main>
  );
}
