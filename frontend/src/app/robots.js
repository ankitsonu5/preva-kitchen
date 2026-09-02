import { getCanonicalOrigin } from '@/lib/site-url';

export default function robots() {
  const origin = getCanonicalOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/checkout', '/order/', '/preview']
      }
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
