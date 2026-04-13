import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    AUTH_COOKIE_SECURE: false,
    AUTH_JWT_SECRET: 'test-session-secret',
    AUTH_SESSION_COOKIE_NAME: 'lexora-session',
    AUTH_SESSION_TTL_DAYS: 30,
  },
}));

import { middleware } from '../middleware';

describe('middleware auth gate', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('redirects unauthenticated page requests to login', async () => {
    const response = await middleware(
      new NextRequest('https://lexora.app/words?from=home'),
    );

    expect(response.headers.get('location')).toBe(
      'https://lexora.app/login?next=%2Fwords%3Ffrom%3Dhome',
    );
  });

  it('leaves login and api routes to their server handlers', async () => {
    const loginResponse = await middleware(
      new NextRequest('https://lexora.app/login?next=%2Freader%2Fwelcome'),
    );
    const apiResponse = await middleware(
      new NextRequest('https://lexora.app/api/words'),
    );

    expect(loginResponse.headers.get('location')).toBeNull();
    expect(apiResponse.headers.get('location')).toBeNull();
  });
});
