import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { resolveRequestAccess } from '@/features/auth/request-gate';
import { env } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const decision = await resolveRequestAccess({
    origin: request.nextUrl.origin,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    token: request.cookies.get(env.AUTH_SESSION_COOKIE_NAME)?.value ?? null,
  });

  if ('allow' in decision) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(decision.redirectTo));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
