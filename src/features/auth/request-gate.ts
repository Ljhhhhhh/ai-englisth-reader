import { getSafeRedirectPath } from './redirect-target';
import { verifySessionTokenOnEdge } from './session-edge';

const PUBLIC_PATHS = new Set(['/favicon.ico', '/login']);
const PUBLIC_PREFIXES = ['/_next/', '/api/'];

function isStaticAsset(pathname: string) {
  return /\.[a-z0-9]+$/i.test(pathname);
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname) || isStaticAsset(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function resolveRequestAccess(input: {
  origin: string;
  pathname: string;
  search: string;
  token: string | null;
}) {
  const { origin, pathname, search, token } = input;

  if (isPublicPath(pathname)) {
    return { allow: true } as const;
  }

  const payload = token ? await verifySessionTokenOnEdge(token) : null;
  const isAuthenticated = Boolean(payload);

  if (isAuthenticated) {
    return { allow: true } as const;
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set(
    'next',
    getSafeRedirectPath(`${pathname}${search}`),
  );

  return {
    redirectTo: loginUrl.toString(),
  } as const;
}
