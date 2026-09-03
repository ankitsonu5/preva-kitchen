'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function LenisProvider({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Remove any legacy lenis-stopped lock on the root HTML/body
    document.documentElement.classList.remove('lenis-stopped');
    document.body.classList.remove('lenis-stopped');
    if (document.documentElement.style.overflow === 'hidden' && !document.querySelector('.preva-selection-modal-backdrop, .lightbox-modal')) {
      document.documentElement.style.overflow = '';
    }

    // Bulletproof, non-hijacking scrollTo shim for any component relying on window.lenis
    window.lenis = {
      scrollTo: (target, options = {}) => {
        try {
          if (typeof target === 'number') {
            window.scrollTo({ top: target, behavior: 'smooth' });
          } else if (typeof target === 'string') {
            const el = document.querySelector(target);
            if (el) {
              const offset = options.offset || 0;
              const y = el.getBoundingClientRect().top + window.scrollY + offset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          } else if (target instanceof HTMLElement) {
            const offset = options.offset || 0;
            const y = target.getBoundingClientRect().top + window.scrollY + offset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        } catch (e) {
          try {
            if (target?.scrollIntoView) {
              target.scrollIntoView({ behavior: 'smooth' });
            }
          } catch (_) {}
        }
      },
      stop: () => {},
      start: () => {
        document.documentElement.classList.remove('lenis-stopped');
        document.body.classList.remove('lenis-stopped');
      },
      destroy: () => {}
    };

    return () => {
      // keep clean
    };
  }, [pathname]);

  return <>{children}</>;
}
