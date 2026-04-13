import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function loadEnvModule(overrides: Record<string, string | undefined>) {
  vi.resetModules();

  process.env = {
    ...originalEnv,
    ...overrides,
  };

  return import('./env');
}

describe('env parsing', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('treats "false" string env values as false booleans', async () => {
    const { env } = await loadEnvModule({
      AUTH_COOKIE_SECURE: 'false',
      MAIL_SMTP_SECURE: 'false',
    });

    expect(env.AUTH_COOKIE_SECURE).toBe(false);
    expect(env.MAIL_SMTP_SECURE).toBe(false);
  });
});
