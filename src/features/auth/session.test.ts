import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    AUTH_COOKIE_SECURE: false,
    AUTH_JWT_SECRET: 'test-session-secret',
    AUTH_SESSION_TTL_DAYS: 30,
  },
}));

import {
  createSessionToken,
  getSessionCookieOptions,
  getSessionDurationMs,
  verifySessionToken,
} from './session';

describe('auth session token helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('signs and verifies a session token', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const token = createSessionToken({
      email: 'reader@example.com',
      expiresAt,
      sessionId: 'session-1',
      userId: 'user-1',
    });

    expect(verifySessionToken(token)).toMatchObject({
      email: 'reader@example.com',
      sessionId: 'session-1',
      sub: 'user-1',
    });
  });

  it('rejects an invalid signature', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const token = createSessionToken({
      email: 'reader@example.com',
      expiresAt,
      sessionId: 'session-1',
      userId: 'user-1',
    });

    const tampered = `${token}oops`;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-02T00:00:00.000Z'));

    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const token = createSessionToken({
      email: 'reader@example.com',
      expiresAt,
      sessionId: 'session-1',
      userId: 'user-1',
    });

    expect(verifySessionToken(token)).toBeNull();
  });

  it('derives cookie settings from env-backed configuration', () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');

    expect(getSessionDurationMs()).toBe(30 * 24 * 60 * 60 * 1000);
    expect(getSessionCookieOptions(expiresAt)).toEqual({
      expires: expiresAt,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
  });
});
