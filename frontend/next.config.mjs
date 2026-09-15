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
      }
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
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/shop/:path*', destination: '/menu/:path*', permanent: true },
      { source: '/order-online', destination: '/menu', permanent: true },
      { source: '/online-order-platform', destination: '/menu', permanent: true },
      { source: '/cart', destination: '/checkout', permanent: true },
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
