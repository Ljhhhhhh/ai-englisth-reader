import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
}));

const currentUserMocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  session: {
    updateMany: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock('@/features/auth/current-user', () => currentUserMocks);
vi.mock('@/lib/db', () => ({ db: dbMocks }));
vi.mock('@/lib/env', () => ({
  env: {
    AUTH_COOKIE_SECURE: false,
    AUTH_SESSION_COOKIE_NAME: 'ai-english-read-session',
  },
}));

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expires the current session record and clears the cookie', async () => {
    currentUserMocks.getCurrentSession.mockResolvedValue({
      id: 'session-1',
    });
    dbMocks.session.updateMany.mockResolvedValue({ count: 1 });

    const response = await POST();

    expect(dbMocks.session.updateMany).toHaveBeenCalledWith({
      data: {
        expiresAt: expect.any(Date),
      },
      where: {
        id: 'session-1',
      },
    });
    expect(cookieStore.set).toHaveBeenCalledWith('ai-english-read-session', '', {
      expires: new Date(0),
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('still clears the cookie when no authenticated session exists', async () => {
    currentUserMocks.getCurrentSession.mockResolvedValue(null);

    const response = await POST();

    expect(dbMocks.session.updateMany).not.toHaveBeenCalled();
    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
