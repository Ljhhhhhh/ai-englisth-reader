import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@/lib/env';

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

export type AuthSessionTokenPayload = {
  email: string;
  exp: number;
  iat: number;
  sessionId: string;
  sub: string;
};

const header: JwtHeader = {
  alg: 'HS256',
  typ: 'JWT',
};

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signValue(value: string) {
  return createHmac('sha256', env.AUTH_JWT_SECRET)
    .update(value)
    .digest('base64url');
}

function parsePayload(value: string) {
  try {
    return JSON.parse(decodeBase64Url(value)) as AuthSessionTokenPayload;
  } catch {
    return null;
  }
}

function hasValidSignature(
  encodedHeader: string,
  encodedPayload: string,
  signature: string,
) {
  const expected = signValue(`${encodedHeader}.${encodedPayload}`);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function getSessionDurationMs() {
  return env.AUTH_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function createSessionToken(input: {
  email: string;
  expiresAt: Date;
  sessionId: string;
  userId: string;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: AuthSessionTokenPayload = {
    email: input.email,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    iat: nowSeconds,
    sessionId: input.sessionId,
    sub: input.userId,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  if (!hasValidSignature(encodedHeader, encodedPayload, signature)) {
    return null;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: env.AUTH_COOKIE_SECURE,
  };
}
