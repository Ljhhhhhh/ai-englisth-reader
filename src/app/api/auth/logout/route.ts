import { cookies } from 'next/headers';

import { getCurrentSession } from '@/features/auth/current-user';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

export async function POST() {
  const session = await getCurrentSession();

  if (session) {
    await db.session.updateMany({
      data: {
        expiresAt: new Date(),
      },
      where: {
        id: session.id,
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(env.AUTH_SESSION_COOKIE_NAME, '', {
    expires: new Date(0),
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: env.AUTH_COOKIE_SECURE,
  });

  return Response.json({ ok: true });
}
