import { redirect } from 'next/navigation';

import { getCurrentSession } from './current-user';
import { getSafeRedirectPath } from './redirect-target';

export function buildLoginHref(nextPath: string) {
  return `/login?next=${encodeURIComponent(getSafeRedirectPath(nextPath))}`;
}

export async function requirePageSession(nextPath: string) {
  const session = await getCurrentSession();

  if (!session) {
    redirect(buildLoginHref(nextPath));
  }

  return session;
}

export async function redirectAuthenticatedUser(nextPath: string) {
  const session = await getCurrentSession();

  if (session) {
    redirect(getSafeRedirectPath(nextPath));
  }
}
