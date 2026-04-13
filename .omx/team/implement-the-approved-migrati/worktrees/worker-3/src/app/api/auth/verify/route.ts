import { cookies } from 'next/headers';
import { z } from 'zod';

import { createSessionToken, getSessionCookieOptions } from '@/features/auth/session';
import { verifyEmailLoginCode } from '@/features/auth/email-login-service';
import { env } from '@/lib/env';

const verifyCodeSchema = z.object({
  code: z.string().trim().length(6),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const body = verifyCodeSchema.parse(await request.json());
    const result = await verifyEmailLoginCode(body.email, body.code);

    if (!result) {
      return Response.json(
        { error: '验证码无效或已过期。' },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const token = createSessionToken({
      email: result.user.email,
      expiresAt: result.expiresAt,
      sessionId: result.session.id,
      userId: result.user.id,
    });

    cookieStore.set(
      env.AUTH_SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(result.expiresAt),
    );

    return Response.json({
      expiresAt: result.expiresAt.toISOString(),
      ok: true,
      user: {
        email: result.user.email,
        id: result.user.id,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '验证码登录失败。',
      },
      { status: 400 },
    );
  }
}
