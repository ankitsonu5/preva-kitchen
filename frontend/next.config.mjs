import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.BACKEND_URL;
if (process.env.NODE_ENV === 'production' && !backendUrl) {
  throw new Error('BACKEND_URL is required for a production build.');
}
const BACKEND = (backendUrl || 'http://localhost:4000').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: here,
  poweredByHeader: false,
  compress: true,

  // Next 15.2+ streams async generateMetadata() into <body> for normal browsers,
  // leaving <head> with only the viewport tag. Search/social/AI crawlers that read
  // only the initial <head> then miss title, description, canonical and OG tags.
  // Matching every user-agent keeps metadata blocking, so it is always in <head>.
  htmlLimitedBots: /.*/,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      },
      {
        source: '/asset/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
    ];
  },

  /**
   * /api/* is proxied to the backend service.
   *
   * The browser only ever talks to this frontend's origin, so the admin's
   * httpOnly session cookie flows without any cross-origin ceremony, and no
   * client code needs to know where the backend lives. Direct cross-origin
   * calls are ALSO allowed by the backend's CORS config for anything that
   * wants to skip the proxy (mobile apps, server-to-server).
   *
   * The one exception is the Stripe webhook: Stripe must be pointed at the
   * BACKEND's public URL directly, not at this proxy, because signature
   * verification needs the raw bytes exactly as Stripe sent them.
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND}/api/:path*` }];
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.prevakitchen.com' }],
        destination: 'https://prevakitchen.com/:path*',
        permanent: true
      },
      { source: '/preva-kitchen', destination: '/about', permanent: true },
      { source: '/preva-kitchen-menu', destination: '/menu', permanent: true },
      // Old prevaclub.com-style dish URLs (/preva-kitchen-menu/<slug>) go to the dish in one hop.
      { source: '/preva-kitchen-menu/honey-hot-wings', destination: '/menu/honey-hot', permanent: true },
      { source: '/preva-kitchen-menu/buffalo-wings', destination: '/menu/buffalo', permanent: true },
      { source: '/preva-kitchen-menu/bbq-wings', destination: '/menu/bbq', permanent: true },
      { source: '/preva-kitchen-menu/garlic-parmesan-wings', destination: '/menu/garlic-parmesan', permanent: true },
      { source: '/preva-kitchen-menu/lemon-pepper-wings', destination: '/menu/lemon-pepper', permanent: true },
      { source: '/preva-kitchen-menu/jerk-wings', destination: '/menu/jerk', permanent: true },
      { source: '/preva-kitchen-menu/preva-lamb', destination: '/menu/lamb-chops', permanent: true },
      { source: '/preva-kitchen-menu/preva-mac', destination: '/menu/mac-and-cheese', permanent: true },
      { source: '/preva-kitchen-menu/preva-greens', destination: '/menu/collard-greens-turkey', permanent: true },
      { source: '/preva-kitchen-menu/preva-yams', destination: '/menu/yams', permanent: true },
      { source: '/preva-kitchen-menu/preva-lobster', destination: '/menu/lobster-bites', permanent: true },
      { source: '/preva-kitchen-menu/preva-steak-bites', destination: '/menu/steak-bites', permanent: true },
      { source: '/preva-kitchen-menu/rice-and-peas', destination: '/menu/rice-peas', permanent: true },
      { source: '/preva-kitchen-menu/preva-burger', destination: '/menu/preva-double-smash-burger', permanent: true },
      { source: '/preva-kitchen-menu/:slug', destination: '/menu/:slug', permanent: true },
      // Dishes not on the menu: send visitors to the closest page.
      { source: '/menu/preva-burger', destination: '/menu/preva-double-smash-burger', permanent: true },
      { source: '/menu/oxtail-quesadilla', destination: '/menu/category/quesadillas', permanent: true },
      { source: '/menu/rice-and-black-beans', destination: '/menu/category/sides', permanent: true },
      // Short, ad-friendly URLs for the priority dishes.
      { source: '/wings', destination: '/menu/category/wings', permanent: true },
      { source: '/burgers', destination: '/menu/category/burger', permanent: true },
      { source: '/burger', destination: '/menu/category/burger', permanent: true },
      { source: '/quesadillas', destination: '/menu/category/quesadillas', permanent: true },
      { source: '/tacos', destination: '/menu/category/tacos', permanent: true },
      { source: '/rasta-pasta', destination: '/menu/rasta-pasta', permanent: true },
      { source: '/lamb-chops', destination: '/menu/lamb-chops', permanent: true },
      { source: '/catfish-bites', destination: '/menu/catfish-bites-with-fries', permanent: true },
      { source: '/menu/catfish-bites', destination: '/menu/catfish-bites-with-fries', permanent: true },
      { source: '/menu/category/burgers', destination: '/menu/category/burger', permanent: true },
      { source: '/menu/burgers', destination: '/menu/category/burger', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      // Legacy /shop/<old-dup-slug> goes straight to the surviving dish in ONE hop
      // (otherwise /shop/x -> /menu/x -> /menu/<new> would be a two-step chain).
      // These must stay above the generic '/shop/:path*' rule.
      { source: '/shop/preva-lamb-chops', destination: '/menu/lamb-chops', permanent: true },
      { source: '/shop/preva-steak-bites', destination: '/menu/steak-bites', permanent: true },
      { source: '/shop/preva-lobster', destination: '/menu/lobster-bites', permanent: true },
      { source: '/shop/preva-mac-and-cheese', destination: '/menu/mac-and-cheese', permanent: true },
      { source: '/shop/preva-yams', destination: '/menu/yams', permanent: true },
      { source: '/shop/collard-greens-with-turkey-meat', destination: '/menu/collard-greens-turkey', permanent: true },
      { source: '/shop/:path*', destination: '/menu/:path*', permanent: true },
      { source: '/order-online', destination: '/menu', permanent: true },
      { source: '/online-order-platform', destination: '/menu', permanent: true },
      { source: '/cart', destination: '/menu', permanent: true },
      { source: '/my-account', destination: '/menu', permanent: true },
      // Duplicate dish-page slugs consolidated onto one canonical slug per dish
      // (Batch 3 SEO audit, Sheet 03). Both sides confirmed live in production
      // Mongo (GET /api/shop/products) and rendering 200 at /menu/<slug> before
      // adding these. /shop/<slug> equivalents already fall through the
      // '/shop/:path*' rule above into these '/menu/...' rules, so no separate
      // '/shop/...' entries are needed here.
      { source: '/menu/preva-lamb-chops', destination: '/menu/lamb-chops', permanent: true },
      { source: '/menu/preva-steak-bites', destination: '/menu/steak-bites', permanent: true },
      { source: '/menu/preva-lobster', destination: '/menu/lobster-bites', permanent: true },
      { source: '/menu/preva-mac-and-cheese', destination: '/menu/mac-and-cheese', permanent: true },
      { source: '/menu/preva-yams', destination: '/menu/yams', permanent: true },
      { source: '/menu/collard-greens-with-turkey-meat', destination: '/menu/collard-greens-turkey', permanent: true }
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  }
};

export default nextConfig;
