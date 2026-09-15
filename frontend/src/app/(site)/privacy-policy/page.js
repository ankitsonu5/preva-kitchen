import LegalContent from '@/components/legal/LegalContent';
import { pageMetadata } from '@/lib/seo';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';
import { getCanonicalOrigin } from '@/lib/site-url';

export const metadata = pageMetadata({
  title: 'Privacy Policy | Preva Kitchen, Redford Township MI',
  description: 'How Preva Kitchen collects, uses and protects the information you share with us through checkout, contact forms and reservations.',
  path: '/privacy-policy',
  image: '/asset/home-reference/preva-restaurant-hero.png'
});

const sections = [
  {
    heading: 'Information We Collect',
    body: [
      'When you place an online order, contact us, book a reservation, or apply for a job with us, we collect the information you provide directly, such as:',
      [
        'Name, email address and phone number',
        'Delivery or billing address (for online orders)',
        'Order details, reservation details and any notes or messages you send us',
        'Resume and application details, if you apply for a position'
      ],
      'We do not knowingly collect information from children, and our services are intended for adults placing orders or reservations.'
    ]
  },
  {
    heading: 'How We Use Your Information',
    body: [
      'We use the information you provide to fulfill orders, confirm reservations, respond to enquiries, process catering requests, and communicate with you about your order or request. We may also use contact information to follow up about a submission you made, or to send order and reservation confirmations.',
      'We do not sell your personal information to third parties.'
    ]
  },
  {
    heading: 'Online Ordering & Payments',
    body: [
      'When you place an online order or pay for catering through our site, payment processing is handled by a third-party payment processor. We do not store your full card number on our servers — payment details are transmitted securely to our payment processor to complete the transaction.'
    ]
  },
  {
    heading: 'Cookies',
    body: [
      'Our website may use cookies and similar technologies to remember your preferences, keep your cart or order session working correctly, and understand how visitors use our site (for example, through analytics tools). You can disable cookies in your browser settings, though some features of the site — like online ordering — may not work correctly without them.'
    ]
  },
  {
    heading: 'Your Choices',
    body: [
      'You can ask us at any time to tell you what information we hold about you, to correct inaccurate information, or to delete information we no longer need to retain for legitimate business or legal purposes (such as order records). To make a request, contact us using the details below.'
    ]
  },
  {
    heading: 'Contact Us',
    body: [
      'If you have questions about this privacy policy or how your information is handled, reach out to Preva Kitchen at 13090 Inkster Rd, Redford Township, MI 48239, by phone at (313) 286-3586, or by email at info@prevakitchen.com.'
    ]
  }
];

function legalSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${origin}/privacy-policy#webpage`,
        url: `${origin}/privacy-policy`,
        name: 'Privacy Policy | Preva Kitchen, Redford Township MI',
        isPartOf: { '@id': `${origin}/#website` },
        inLanguage: 'en-US'
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Privacy Policy', url: '/privacy-policy' }
      ], origin)
    ]
  };
}

export default function PrivacyPolicyPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = legalSchema(origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LegalContent
        eyebrow="Preva Kitchen · Redford, Michigan"
        title="Privacy Policy"
        subtitle="How we collect, use and protect the information you share with Preva Kitchen."
        updated="September 15, 2026"
        sections={sections}
      />
    </>
  );
}
