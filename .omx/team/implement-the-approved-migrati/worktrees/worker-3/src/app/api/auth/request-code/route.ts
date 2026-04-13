import { z } from 'zod';

import { createEmailLoginChallenge } from '@/features/auth/email-login-service';

const requestCodeSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const body = requestCodeSchema.parse(await request.json());
    const challenge = await createEmailLoginChallenge(body.email);

    return Response.json({
      devCode: challenge.code,
      expiresAt: challenge.expiresAt.toISOString(),
      ok: true,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '无法发送登录验证码。',
      },
      { status: 400 },
    );
  }
}
