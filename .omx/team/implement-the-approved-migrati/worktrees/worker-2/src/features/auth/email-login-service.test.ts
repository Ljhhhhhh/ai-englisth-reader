import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  emailVerificationCode: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  session: {
    create: vi.fn(),
  },
  user: {
    upsert: vi.fn(),
  },
}));

const mailMocks = vi.hoisted(() => ({
  sendEmailLoginCode: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: dbMocks,
}));

vi.mock('@/lib/env', () => ({
  env: {
    AUTH_CODE_SECRET: 'test-code-secret',
    AUTH_CODE_TTL_MINUTES: 10,
    AUTH_DEV_LOGIN_CODE: '123456',
    AUTH_JWT_SECRET: 'test-session-secret',
    AUTH_SESSION_TTL_DAYS: 30,
    MAIL_FROM: 'noreply@example.com',
    MAIL_PROVIDER: 'log',
  },
}));

vi.mock('./mail-service', () => mailMocks);

import {
  buildCodeHashForTest,
  createEmailLoginChallenge,
  verifyEmailLoginCode,
} from './email-login-service';

describe('email login service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.user.upsert.mockResolvedValue({
      email: 'reader@example.com',
      id: 'user-1',
    });
    dbMocks.emailVerificationCode.updateMany.mockResolvedValue({ count: 0 });
    mailMocks.sendEmailLoginCode.mockResolvedValue({
      preview: 'sent',
      transport: 'log',
    });
  });

  it('creates a challenge for the normalized email and exposes the dev code outside production', async () => {
    dbMocks.emailVerificationCode.create.mockResolvedValue({ id: 'code-1' });

    const challenge = await createEmailLoginChallenge(' Reader@Example.com ');

    expect(dbMocks.user.upsert).toHaveBeenCalledWith({
      create: {
        email: 'reader@example.com',
      },
      update: {},
      where: {
        email: 'reader@example.com',
      },
    });
    expect(dbMocks.emailVerificationCode.updateMany).toHaveBeenCalled();
    expect(dbMocks.emailVerificationCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codeHash: buildCodeHashForTest('reader@example.com', '123456'),
        email: 'reader@example.com',
        userId: 'user-1',
      }),
    });
    expect(mailMocks.sendEmailLoginCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: '123456',
        email: 'reader@example.com',
      }),
    );
    expect(challenge.code).toBe('123456');
  });

  it('returns null when no valid challenge remains', async () => {
    dbMocks.emailVerificationCode.findFirst.mockResolvedValue(null);

    await expect(
      verifyEmailLoginCode('reader@example.com', '123456'),
    ).resolves.toBeNull();
    expect(dbMocks.session.create).not.toHaveBeenCalled();
  });

  it('creates a session after verifying the latest matching code', async () => {
    dbMocks.emailVerificationCode.findFirst.mockResolvedValue({
      codeHash: buildCodeHashForTest('reader@example.com', '123456'),
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      id: 'code-1',
      user: {
        email: 'reader@example.com',
        id: 'user-1',
      },
    });
    dbMocks.emailVerificationCode.update.mockResolvedValue({ id: 'code-1' });
    dbMocks.session.create.mockResolvedValue({
      expiresAt: new Date('2026-05-11T00:00:00.000Z'),
      id: 'session-1',
      userId: 'user-1',
    });

    const result = await verifyEmailLoginCode('reader@example.com', '123456');

    expect(dbMocks.emailVerificationCode.update).toHaveBeenCalledWith({
      data: {
        consumedAt: expect.any(Date),
      },
      where: {
        id: 'code-1',
      },
    });
    expect(dbMocks.session.create).toHaveBeenCalledWith({
      data: {
        expiresAt: expect.any(Date),
        userId: 'user-1',
      },
    });
    expect(result).toMatchObject({
      session: {
        id: 'session-1',
      },
      user: {
        email: 'reader@example.com',
        id: 'user-1',
      },
    });
  });

  it('rejects a mismatched code without consuming the challenge', async () => {
    dbMocks.emailVerificationCode.findFirst.mockResolvedValue({
      codeHash: buildCodeHashForTest('reader@example.com', '123456'),
      createdAt: new Date('2026-04-11T00:00:00.000Z'),
      id: 'code-1',
      user: {
        email: 'reader@example.com',
        id: 'user-1',
      },
    });

    await expect(
      verifyEmailLoginCode('reader@example.com', '654321'),
    ).resolves.toBeNull();
    expect(dbMocks.emailVerificationCode.update).not.toHaveBeenCalled();
    expect(dbMocks.session.create).not.toHaveBeenCalled();
  });
});
