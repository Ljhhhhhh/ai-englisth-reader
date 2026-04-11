import { cookies } from 'next/headers';

import { db } from '@/lib/db';
import { env } from '@/lib/env';

import { verifySessionToken } from './session';

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.AUTH_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const session = await db.session.findUnique({
    include: {
      user: true,
    },
    where: {
      id: payload.sessionId,
    },
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}
