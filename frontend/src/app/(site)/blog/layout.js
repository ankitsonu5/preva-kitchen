import { pageMetadata } from '@/lib/seo';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateBreadcrumbSchema } from '@/lib/seo-schema';

export const metadata = pageMetadata({
  title: 'Culinary Journal & Kitchen Stories',
  description: 'Read Preva Kitchen chef stories, recipe inspiration, menu guides, and comfort food updates from Redford Township, Michigan.',
  path: '/blog',
  keywords: [
    'Preva Kitchen blog',
    'Redford restaurant blog',
    'Detroit comfort food blog',
    'Michigan chef stories',
    'Preva recipe guides'
  ]
});

export default function BlogLayout({ children }) {
  const origin = getCanonicalOrigin();
  const blogListSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${origin}/blog/#blog`,
        name: 'Preva Kitchen Culinary Journal',
        description: 'Read Preva Kitchen chef stories, recipe inspiration, menu guides, and comfort food updates from Redford Township, Michigan.',
        url: `${origin}/blog`,
        publisher: {
          '@type': 'Organization',
          name: 'Preva Kitchen',
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/asset/preva-logo.svg`
          }
        },
        inLanguage: 'en-US'
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' }
      ], origin)
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListSchema) }}
      />
      {children}
    </>
  );
}
