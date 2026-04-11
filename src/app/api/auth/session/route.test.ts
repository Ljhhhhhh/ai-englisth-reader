import { beforeEach, describe, expect, it, vi } from 'vitest';

const currentUserMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/features/auth/current-user', () => currentUserMocks);

import { GET } from './route';

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the authenticated user payload when a session exists', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: {
        email: 'reader@example.com',
        id: 'user-1',
      },
    });
  });

  it('returns an unauthenticated payload when no session exists', async () => {
    currentUserMocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      user: null,
    });
  });
});
