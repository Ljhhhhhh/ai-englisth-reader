import { env } from '@/lib/env';

type AuthSessionTokenPayload = {
  email: string;
  exp: number;
  iat: number;
  sessionId: string;
  sub: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function encodeBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parsePayload(value: string) {
  try {
    return JSON.parse(decodeBase64Url(value)) as AuthSessionTokenPayload;
  } catch {
    return null;
  }
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.AUTH_JWT_SECRET),
    {
      hash: 'SHA-256',
      name: 'HMAC',
    },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );

  return encodeBase64Url(new Uint8Array(signature));
}

function hasValidSignature(expected: string, actual: string) {
  if (expected.length !== actual.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function verifySessionTokenOnEdge(token: string) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const expected = await signValue(`${encodedHeader}.${encodedPayload}`);

  if (!hasValidSignature(expected, signature)) {
    return null;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
