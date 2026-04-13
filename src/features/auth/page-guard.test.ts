import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentSessionMock, redirectMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('./current-user', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

import {
  buildLoginHref,
  redirectAuthenticatedUser,
  requirePageSession,
} from './page-guard';

describe('page guard', () => {
  beforeEach(() => {
    redirectMock.mockReset();
    getCurrentSessionMock.mockReset();
  });

  it('builds a safe login redirect target for private pages', () => {
    expect(buildLoginHref('/reader/welcome?from=home')).toBe(
      '/login?next=%2Freader%2Fwelcome%3Ffrom%3Dhome',
    );
  });

  it('normalizes login-looking next paths back to home', () => {
    expect(buildLoginHref('/login#otp')).toBe('/login?next=%2F');
  });

  it('redirects unauthenticated page requests to login', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    await requirePageSession('/words');

    expect(redirectMock).toHaveBeenCalledWith('/login?next=%2Fwords');
  });

  it('redirects authenticated login visits to the requested page', async () => {
    getCurrentSessionMock.mockResolvedValue({ id: 'session-1' });

    await redirectAuthenticatedUser('/words?from=home');

    expect(redirectMock).toHaveBeenCalledWith('/words?from=home');
  });
});
