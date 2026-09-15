import LegalContent from '@/components/legal/LegalContent';
import { pageMetadata } from '@/lib/seo';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getCanonicalOrigin } from '@/lib/site-url';

export const metadata = pageMetadata({
  title: 'Terms of Service | Preva Kitchen, Redford Township MI',
  description: 'Terms covering online orders, pickup and delivery, cancellations, catering deposits, and reservations at Preva Kitchen.',
  path: '/terms',
  image: '/asset/home-reference/preva-restaurant-hero.png'
});

const sections = [
  {
    heading: 'Online Orders',
    body: [
      'By placing an order through our website, you confirm that the order details, contact information and payment information you provide are accurate. We reserve the right to decline or cancel an order — for example, if an item is unexpectedly unavailable or a payment cannot be verified — and will notify you if this happens.'
    ]
  },
  {
    heading: 'Pickup & Delivery',
    body: [
      'Pickup orders should be collected during the time window provided at checkout; orders left uncollected for an extended period may not be held indefinitely. Delivery is offered within a limited radius of our Redford Township location — delivery availability, timing and fees may vary based on distance and demand.'
    ]
  },
  {
    heading: 'Cancellations & Refunds',
    body: [
      'Because most items are prepared fresh to order, cancellations are only guaranteed if requested before your order enters preparation. If you have an issue with your order — missing items, an error, or a quality concern — please contact us as soon as possible at (313) 286-3586 so we can make it right.'
    ]
  },
  {
    heading: 'Catering Deposits',
    body: [
      'Larger catering orders and private event bookings may require a deposit to confirm your date. Deposit amounts and refund terms will be communicated directly when your catering order is confirmed, and any deposit terms discussed with our team at that time govern your specific order.'
    ]
  },
  {
    heading: 'Reservations & No-Shows',
    body: [
      'Reservations submitted online are confirmed by phone or text. We hold reserved tables for a reasonable grace period past the reservation time; if you are running late or need to cancel, please call us at (313) 286-3586 so we can accommodate other guests. Repeated no-shows may affect our ability to hold future reservations.'
    ]
  },
  {
    heading: 'Contact',
    body: [
      'Questions about these terms can be directed to Preva Kitchen, 13090 Inkster Rd, Redford Township, MI 48239, phone (313) 286-3586, email info@prevakitchen.com.'
    ]
  }
];

function legalSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${origin}/terms#webpage`,
        url: `${origin}/terms`,
        name: 'Terms of Service | Preva Kitchen, Redford Township MI',
        isPartOf: { '@id': `${origin}/#website` },
        inLanguage: 'en-US'
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Terms of Service', url: '/terms' }
      ], origin)
    ]
  };
}

export default function TermsPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = legalSchema(origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LegalContent
        eyebrow="Preva Kitchen · Redford, Michigan"
        title="Terms of Service"
        subtitle="The terms that apply to online orders, pickup, delivery, catering and reservations at Preva Kitchen."
        updated="September 15, 2026"
        sections={sections}
      />
    </>
  );
}
