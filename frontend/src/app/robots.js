import { getCanonicalOrigin } from '@/lib/site-url';

export default function robots() {
  const origin = getCanonicalOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/checkout', '/order/', '/preview', '/terms', '/privacy']
      }
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
