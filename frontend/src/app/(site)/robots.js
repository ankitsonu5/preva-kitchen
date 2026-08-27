export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://prevakitchen.com';
  return { rules: { userAgent: '*', allow: '/', disallow: ['/preview', '/checkout', '/order/'] }, sitemap: `${base}/sitemap.xml` };
}
