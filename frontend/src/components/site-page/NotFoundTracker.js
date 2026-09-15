'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Renders nothing — just reports the URL that 404'd so it shows up in
 * Admin > Activity Logs instead of only ever existing in server logs.
 * usePathname() still resolves to the real requested URL here even though
 * the route itself didn't match anything.
 */
export default function NotFoundTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/track-404', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname || window.location.pathname,
        referrer: document.referrer || ''
      })
    }).catch(() => {
      // Best-effort — a failed tracking call should never affect the visitor.
    });
    // Only ever needs to fire once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
