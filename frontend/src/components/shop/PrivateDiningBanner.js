'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReservationModal from '@/components/ReservationModal';

export default function PrivateDiningBanner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="ps-private-banner">
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase' }}>
            CATERING & GROUP DINING
          </span>
          <h2 className="ps-private-banner__title" style={{ marginTop: 6 }}>
            Private Dining & Exclusive Events Available
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14.5px', marginTop: 4 }}>
            Host family celebrations, corporate lunches and memorable group meals with Preva Kitchen.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ps-btn ps-btn--gold"
            style={{ padding: '0 32px', cursor: 'pointer', border: 'none' }}
          >
            Reserve Private Suite
          </button>
          <Link href="/catering" className="ps-btn ps-btn--ghost" style={{ padding: '0 24px' }}>
            View Catering Menu
          </Link>
        </div>
      </div>

      <ReservationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialOccasion="Private Dining & Suite"
      />
    </>
  );
}
