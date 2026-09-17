import AboutContent from '@/components/about/AboutContent';
import { pageMetadata } from '@/lib/seo';
import { BUSINESS_INFO, generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getCanonicalOrigin } from '@/lib/site-url';

export const metadata = pageMetadata({
  title: "About Preva Kitchen | Redford Township's Local Kitchen",
  description: 'Meet the team behind Preva Kitchen on Inkster Rd. Chef-driven comfort food made fresh daily for Redford Township, Old Redford and Livonia neighbours.',
  path: '/about',
  image: '/asset/home-reference/preva-restaurant-hero.png',
  keywords: ['about Preva Kitchen', 'Redford Township restaurant story', 'local kitchen Redford MI'],
  titleIncludesBrand: true
});

function aboutSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${origin}/about#webpage`,
        url: `${origin}/about`,
        name: "About Preva Kitchen | Redford Township's Local Kitchen",
        isPartOf: { '@id': `${origin}/#website` },
        about: {
          '@type': 'Restaurant',
          name: BUSINESS_INFO.name,
          address: BUSINESS_INFO.address,
          telephone: BUSINESS_INFO.telephone
        }
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' }
      ], origin)
    ]
  };
}

export default function AboutPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = aboutSchema(origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AboutContent />
    </>
  );
}
