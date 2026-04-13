import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    AUTH_COOKIE_SECURE: false,
    AUTH_JWT_SECRET: 'test-session-secret',
    AUTH_SESSION_COOKIE_NAME: 'lexora-session',
    AUTH_SESSION_TTL_DAYS: 30,
  },
}));

import { resolveRequestAccess } from './request-gate';

describe('request access gate', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('redirects unauthenticated readers from private pages to login with next', async () => {
    const result = await resolveRequestAccess({
      origin: 'https://lexora.app',
      pathname: '/reader/welcome',
      search: '?from=home',
      token: null,
    });

    expect(result).toEqual({
      redirectTo: 'https://lexora.app/login?next=%2Freader%2Fwelcome%3Ffrom%3Dhome',
    });
  });

  it('allows unauthenticated access to login and API routes', async () => {
    await expect(
      resolveRequestAccess({
        origin: 'https://lexora.app',
        pathname: '/login',
        search: '',
        token: null,
      }),
    ).resolves.toEqual({ allow: true });

    await expect(
      resolveRequestAccess({
        origin: 'https://lexora.app',
        pathname: '/api/words',
        search: '',
        token: null,
      }),
    ).resolves.toEqual({ allow: true });
  });

  it('allows signed sessions through the coarse page gate', async () => {
    const { createSessionToken } = await import('./session');
    const token = createSessionToken({
      email: 'reader@example.com',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      sessionId: 'session-1',
      userId: 'user-1',
    });

    await expect(
      resolveRequestAccess({
        origin: 'https://lexora.app',
        pathname: '/words',
        search: '',
        token,
      }),
    ).resolves.toEqual({ allow: true });
  });
});
