import LegalContent from '@/components/legal/LegalContent';
import { pageMetadata } from '@/lib/seo';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getCanonicalOrigin } from '@/lib/site-url';

export const metadata = pageMetadata({
  title: 'Accessibility Statement | Preva Kitchen, Redford MI',
  description: 'Our commitment to an accessible website and dining experience at Preva Kitchen, 13090 Inkster Rd, Redford Township MI.',
  path: '/accessibility',
  image: '/asset/home-reference/preva-restaurant-hero.png'
});

const sections = [
  {
    heading: 'Our Commitment',
    body: [
      'Preva Kitchen wants our website and our restaurant to be usable by as many people as possible, including guests with visual, auditory, motor or cognitive disabilities. We are working to improve accessibility across both our online ordering experience and our physical location on an ongoing basis.'
    ]
  },
  {
    heading: 'Standards We Aim to Meet',
    body: [
      'We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA as a target for our website. This is a goal we are actively working toward rather than a certified or independently verified conformance claim — if you encounter something that does not meet this standard, we want to know so we can fix it.'
    ]
  },
  {
    heading: 'Accessibility at 13090 Inkster Rd',
    body: [
      'We aim to make our Redford Township location easy to visit for all guests. If you have specific accessibility needs for your visit — seating, entry, or anything else — call ahead at (313) 286-3586 and our team will do what we can to help.'
    ]
  },
  {
    heading: 'Report a Barrier',
    body: [
      'If you run into an accessibility barrier on our website or at our restaurant, please let us know so we can address it. Contact us by phone at (313) 286-3586 or by email at info@prevakitchen.com, and describe what you encountered and, if possible, the page or area involved.'
    ]
  }
];

function legalSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${origin}/accessibility#webpage`,
        url: `${origin}/accessibility`,
        name: 'Accessibility Statement | Preva Kitchen, Redford MI',
        isPartOf: { '@id': `${origin}/#website` },
        inLanguage: 'en-US'
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Accessibility', url: '/accessibility' }
      ], origin)
    ]
  };
}

export default function AccessibilityPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = legalSchema(origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LegalContent
        eyebrow="Preva Kitchen · Redford, Michigan"
        title="Accessibility Statement"
        subtitle="Our ongoing commitment to an accessible website and dining experience."
        updated="September 15, 2026"
        sections={sections}
      />
    </>
  );
}
