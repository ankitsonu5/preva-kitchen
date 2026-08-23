'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function LenisProvider({ children }) {
  const pathname = usePathname();

  // Clean up any pinned triggers and DOM pin-spacers when navigating to subpages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/') {
      try {
        document.querySelectorAll('.pin-spacer').forEach((el) => {
          const child = el.firstElementChild;
          if (child && el.parentNode) {
            el.parentNode.insertBefore(child, el);
            el.remove();
          } else {
            el.remove();
          }
        });
      } catch (e) {}

      if (typeof gsap !== 'undefined' && ScrollTrigger) {
        ScrollTrigger.getAll().forEach((trigger) => {
          try { trigger.kill(true); } catch (e) {}
        });
      }
    } else {
      const timer = setTimeout(() => {
        if (typeof ScrollTrigger !== 'undefined') {
          try { ScrollTrigger.refresh(); } catch (e) {}
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (typeof gsap !== 'undefined' && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    window.lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      delete window.lenis;
    };
  }, []);

  return <>{children}</>;
}
