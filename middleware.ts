import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Supabase session cookie (sb-*-auth-token)
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.includes('-auth-token')
  );

  if (!hasSession && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-.*).*)',
  ],
};
