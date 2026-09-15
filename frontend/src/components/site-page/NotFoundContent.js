'use client';

import Link from 'next/link';
import { Compass, Home, UtensilsCrossed, CalendarCheck, Phone } from 'lucide-react';
import { PageShell, PageHero, Section, SectionHeading, PrimaryButton, SecondaryButton, COLORS, fontFamily } from '@/components/site-page/PageKit';
import NotFoundTracker from '@/components/site-page/NotFoundTracker';

const LOST_LINKS = [
  { href: '/menu', label: 'See the Menu', icon: UtensilsCrossed, desc: 'Wings, burgers, tacos, lamb chops and more — order for pickup or delivery.' },
  { href: '/reservations', label: 'Book a Table', icon: CalendarCheck, desc: 'Reserve a table in Redford Township for tonight or the weekend.' },
  { href: '/contact', label: 'Contact Us', icon: Phone, desc: 'Call (313) 286-3586 or get directions to 13090 Inkster Rd.' }
];

export default function NotFoundContent() {
  return (
    <PageShell>
      <NotFoundTracker />
      <PageHero
        eyebrow="404 — Page Not Found"
        eyebrowIcon={Compass}
        title="We Could Not"
        titleAccent="Find That Page"
        subtitle="The page you're looking for may have moved, been renamed, or never existed. Here's where the rest of Preva Kitchen actually is."
      >
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <PrimaryButton href="/" icon={Home}>Back to Home</PrimaryButton>
          <SecondaryButton href="/menu">View Menu</SecondaryButton>
        </div>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="Where to go instead"
          title="Pick Up Where"
          titleAccent="You Left Off"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {LOST_LINKS.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '28px',
                borderRadius: '16px',
                background: COLORS.cardAlt,
                border: `1px solid ${COLORS.goldBorder}`,
                textDecoration: 'none',
                color: COLORS.text
              }}
            >
              <Icon size={26} color={COLORS.gold} />
              <span style={{ fontFamily, fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase', color: '#fff' }}>{label}</span>
              <span style={{ fontSize: '0.9rem', lineHeight: 1.6, color: COLORS.textDim }}>{desc}</span>
            </Link>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
