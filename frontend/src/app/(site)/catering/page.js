import CateringContent from '@/components/catering/CateringContent';
import { pageMetadata } from '@/lib/seo';
import { BUSINESS_INFO, generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getCanonicalOrigin } from '@/lib/site-url';

export const metadata = pageMetadata({
  title: 'Catering & Party Trays | Preva Kitchen, Redford MI',
  description: 'Wing trays, pasta pans and full spreads catered across Redford Township, Livonia and Dearborn Heights. Office lunches to family parties. (313) 286-3586.',
  path: '/catering',
  image: '/asset/home-reference/preva-restaurant-hero.png',
  keywords: ['Preva Kitchen catering', 'party trays Redford MI', 'office lunch catering Redford Township', 'catering Livonia Dearborn Heights']
});

const deliveryAreas = ['Redford Township', 'Old Redford', 'Livonia', 'Dearborn Heights', 'Garden City'];

function cateringSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${origin}/catering#service`,
        serviceType: 'Catering',
        name: 'Preva Kitchen Catering & Party Trays',
        description: 'Wing trays, pasta pans and full catering spreads for office lunches, birthdays, graduations, repasts and church events.',
        provider: {
          '@type': 'Restaurant',
          name: BUSINESS_INFO.name,
          telephone: BUSINESS_INFO.telephone,
          address: BUSINESS_INFO.address
        },
        areaServed: deliveryAreas.map((name) => ({ '@type': 'City', name })),
        url: `${origin}/catering`
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Catering', url: '/catering' }
      ], origin)
    ]
  };
}

export default function CateringPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = cateringSchema(origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CateringContent />
    </>
  );
}
