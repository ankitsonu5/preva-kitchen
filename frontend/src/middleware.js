import { NextResponse } from 'next/server';

/**
 * Gate the admin area at the edge.
 *
 * This only checks that a session cookie is present — it deliberately does not
 * verify the signature, because the Edge runtime cannot use the same crypto as
 * the API and a second implementation is a second thing to get wrong. Every
 * admin API route verifies the token properly before touching data, so a
 * forged cookie gets someone as far as an empty screen and no further.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('preva_session')?.value;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !token) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/admin/login' && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
