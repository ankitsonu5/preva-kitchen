import ReservationsContent from '@/components/reservations/ReservationsContent';
import { pageMetadata } from '@/lib/seo';
import { BUSINESS_INFO, generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getCanonicalOrigin } from '@/lib/site-url';

export const metadata = pageMetadata({
  title: 'Book a Table in Redford Township, MI | Preva Kitchen',
  description: 'Reserve a table at Preva Kitchen, 13090 Inkster Rd, Redford Township MI. Birthdays, date nights, family dinners and group bookings confirmed same day.',
  path: '/reservations',
  image: '/asset/home-reference/preva-restaurant-hero.png',
  keywords: ['Preva Kitchen reservations', 'book a table Redford MI', 'restaurant reservations Redford Township', 'group dining Redford Michigan'],
  titleIncludesBrand: true
});

function reservationsSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Restaurant',
        '@id': `${origin}/#restaurant`,
        name: BUSINESS_INFO.name,
        url: origin,
        image: BUSINESS_INFO.image,
        telephone: BUSINESS_INFO.telephone,
        email: BUSINESS_INFO.email,
        priceRange: BUSINESS_INFO.priceRange,
        servesCuisine: BUSINESS_INFO.servesCuisine,
        address: BUSINESS_INFO.address,
        geo: BUSINESS_INFO.geo,
        openingHoursSpecification: BUSINESS_INFO.openingHoursSpecification,
        acceptsReservations: 'True',
        potentialAction: {
          '@type': 'ReserveAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/reservations`,
            inLanguage: 'en-US',
            actionPlatform: [
              'http://schema.org/DesktopWebPlatform',
              'http://schema.org/MobileWebPlatform'
            ]
          },
          result: {
            '@type': 'FoodEstablishmentReservation',
            name: 'Table Reservation at Preva Kitchen'
          }
        }
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Reservations', url: '/reservations' }
      ], origin),
      {
        '@type': 'FAQPage',
        '@id': `${origin}/reservations#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Do you take walk-ins?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes — walk-ins are always welcome. Reserving ahead just guarantees your table is ready when your party arrives.' }
          },
          {
            '@type': 'Question',
            name: 'How far in advance should I book?',
            acceptedAnswer: { '@type': 'Answer', text: 'A day or two ahead is usually plenty for small parties. Groups of 8 or more should book at least a week in advance.' }
          },
          {
            '@type': 'Question',
            name: 'Is there a deposit for large parties?',
            acceptedAnswer: { '@type': 'Answer', text: 'Groups of 15+ or private dining bookings may require a deposit, confirmed when our team calls to confirm your request.' }
          }
        ]
      }
    ]
  };
}

export default function ReservationsPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = reservationsSchema(origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReservationsContent />
    </>
  );
}
