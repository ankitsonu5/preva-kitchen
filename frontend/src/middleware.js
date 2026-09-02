import { NextResponse } from 'next/server';

/**
 * Gate the admin area at the edge.
 *
 * Protects admin routes if no session cookie is present.
 * Does not bounce /admin/login to prevent infinite redirect loops on expired cookies.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('preva_session')?.value;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !token) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
