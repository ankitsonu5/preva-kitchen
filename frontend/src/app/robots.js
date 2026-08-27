function siteOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_CANONICAL_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://prevakitchen.com';

  return configured.replace(/\/$/, '');
}

export default function robots() {
  const origin = siteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/checkout', '/order/', '/preview']
      }
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin
  };
}
