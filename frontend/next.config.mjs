import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: here,
  poweredByHeader: false,

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
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/order-online', destination: '/shop', permanent: true },
      { source: '/online-order-platform', destination: '/shop', permanent: true },
      { source: '/cart', destination: '/checkout', permanent: true },
      { source: '/my-account', destination: '/shop', permanent: true }
    ];
  },

  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] }
};

export default nextConfig;
