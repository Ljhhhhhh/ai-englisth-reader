import { createHash, randomInt } from 'node:crypto';

import { db } from '@/lib/db';
import { env } from '@/lib/env';

import { sendEmailLoginCode } from './mail-service';
import { getSessionDurationMs } from './session';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createCodeHash(email: string, code: string) {
  return createHash('sha256')
    .update(`${env.AUTH_CODE_SECRET}:${normalizeEmail(email)}:${code}`)
    .digest('hex');
}

function createLoginCode() {
  if (env.AUTH_DEV_LOGIN_CODE) {
    return env.AUTH_DEV_LOGIN_CODE;
  }

  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function shouldExposeLoginCode() {
  return process.env.NODE_ENV !== 'production';
}

export function buildCodeHashForTest(email: string, code: string) {
  return createCodeHash(email, code);
}

export async function createEmailLoginChallenge(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await db.user.upsert({
    create: {
      email: normalizedEmail,
    },
    update: {},
    where: {
      email: normalizedEmail,
    },
  });

  await db.emailVerificationCode.updateMany({
    data: {
      consumedAt: new Date(),
    },
    where: {
      consumedAt: null,
      email: normalizedEmail,
    },
  });

  const code = createLoginCode();
  const expiresAt = new Date(
    Date.now() + env.AUTH_CODE_TTL_MINUTES * 60 * 1000,
  );

  await db.emailVerificationCode.create({
    data: {
      codeHash: createCodeHash(normalizedEmail, code),
      email: normalizedEmail,
      expiresAt,
      userId: user.id,
    },
  });

  await sendEmailLoginCode({
    code,
    email: normalizedEmail,
    expiresAt,
  });

  return {
    code: shouldExposeLoginCode() ? code : undefined,
    expiresAt,
    user,
  };
}

export async function verifyEmailLoginCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const challenge = await db.emailVerificationCode.findFirst({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    where: {
      consumedAt: null,
      email: normalizedEmail,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!challenge) {
    return null;
  }

  if (challenge.codeHash !== createCodeHash(normalizedEmail, code.trim())) {
    return null;
  }

  await db.emailVerificationCode.update({
    data: {
      consumedAt: new Date(),
    },
    where: {
      id: challenge.id,
    },
  });

  const expiresAt = new Date(Date.now() + getSessionDurationMs());
  const session = await db.session.create({
    data: {
      expiresAt,
      userId: challenge.user.id,
    },
  });

  return {
    expiresAt,
    session,
    user: challenge.user,
  };
}
