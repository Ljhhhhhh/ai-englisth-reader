import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  createEmailLoginChallenge: vi.fn(),
}));

vi.mock('@/features/auth/email-login-service', () => authMocks);

import { POST } from './route';

describe('POST /api/auth/request-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an email login challenge and returns its preview data', async () => {
    authMocks.createEmailLoginChallenge.mockResolvedValue({
      code: '123456',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/auth/request-code', {
        body: JSON.stringify({ email: ' Reader@example.com ' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.createEmailLoginChallenge).toHaveBeenCalledWith(
      'Reader@example.com',
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      devCode: '123456',
      expiresAt: '2030-01-01T00:00:00.000Z',
      ok: true,
    });
  });

  it('returns 400 when the payload is invalid', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/request-code', {
        body: JSON.stringify({ email: 'not-an-email' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(authMocks.createEmailLoginChallenge).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    });
  });
});
