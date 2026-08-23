"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Site-wide scroll reveals with zero animation libraries.
 *
 * One IntersectionObserver watches elements matching REVEAL_SELECTORS,
 * adds `.lxr` (hidden state) up-front and `.lxr-in` when they enter the
 * viewport, then unobserves — so the cost is a single class toggle per
 * element, ever. Siblings inside the same parent get a stagger via a CSS
 * variable. Respects prefers-reduced-motion and does nothing on the server,
 * so SEO-rendered HTML is untouched.
 */
const REVEAL_SELECTORS = [
  '.section-eyebrow', '.section-title', '.header-separator',
  '.glass-card', '.ps-card', '.lx-insta-card', '.cred-item',
  '.about-text-content', '.about-image-wrapper',
  '.nightlife-image-column', '.nightlife-content-column',
  '.split-image-col', '.split-content-col',
  '.lx-feature', '.lx-sig-card', '.lx-stat',
  '.prv-gate__header', '.prv-mselect', '.prv-panel:not(.prv-panel--events)',
  '.cflow-header', '.footer-col',
  '.statement-text', '.gallery-grid-item'
].join(',');

export default function LuxeReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const seen = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('lxr-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    const arm = () => {
      document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Stagger siblings that reveal from the same parent.
        const siblings = Array.from(el.parentElement?.children || []);
        const idx = siblings.indexOf(el);
        el.style.setProperty('--lxr-delay', `${Math.min(idx, 6) * 90}ms`);
        // Already on screen (above the fold / anchor jump)? Show instantly.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          el.classList.add('lxr', 'lxr-in');
          return;
        }
        el.classList.add('lxr');
        observer.observe(el);
      });
    };

    // Initial pass + one delayed pass for client-fetched content.
    arm();
    const t = setTimeout(arm, 1200);
    return () => { clearTimeout(t); observer.disconnect(); };
  }, [pathname]);

  return null;
}
