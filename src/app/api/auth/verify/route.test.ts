import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  getSessionCookieOptions: vi.fn(),
  verifyEmailLoginCode: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock('@/features/auth/session', () => ({
  createSessionToken: authMocks.createSessionToken,
  getSessionCookieOptions: authMocks.getSessionCookieOptions,
}));

vi.mock('@/features/auth/email-login-service', () => ({
  verifyEmailLoginCode: authMocks.verifyEmailLoginCode,
}));

vi.mock('@/lib/env', () => ({
  env: {
    AUTH_SESSION_COOKIE_NAME: 'ai-english-read-session',
  },
}));

import { POST } from './route';

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.createSessionToken.mockReturnValue('signed-token');
    authMocks.getSessionCookieOptions.mockReturnValue({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
  });

  it('verifies the login code and sets the session cookie', async () => {
    authMocks.verifyEmailLoginCode.mockResolvedValue({
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      session: {
        id: 'session-1',
      },
      user: {
        email: 'reader@example.com',
        id: 'user-1',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/verify', {
        body: JSON.stringify({
          code: '123456',
          email: ' reader@example.com ',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.verifyEmailLoginCode).toHaveBeenCalledWith(
      'reader@example.com',
      '123456',
    );
    expect(authMocks.createSessionToken).toHaveBeenCalledWith({
      email: 'reader@example.com',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      sessionId: 'session-1',
      userId: 'user-1',
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      'ai-english-read-session',
      'signed-token',
      {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiresAt: '2030-01-01T00:00:00.000Z',
      ok: true,
      user: {
        email: 'reader@example.com',
        id: 'user-1',
      },
    });
  });

  it('returns 400 when the code is rejected', async () => {
    authMocks.verifyEmailLoginCode.mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/auth/verify', {
        body: JSON.stringify({
          code: '123456',
          email: 'reader@example.com',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: '验证码无效或已过期。',
    });
  });
});
