import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type EnvOverrides = Partial<{
  AUTH_CODE_TTL_MINUTES: number;
  MAIL_FROM: string;
  MAIL_PROVIDER: string;
  MAIL_SMTP_HOST: string;
  MAIL_SMTP_PASS: string;
  MAIL_SMTP_PORT: number;
  MAIL_SMTP_SECURE: boolean;
  MAIL_SMTP_USER: string;
}>;

const { createTransportMock, envMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  envMock: {
    AUTH_CODE_TTL_MINUTES: 10,
    MAIL_FROM: 'Lexora <sender@gmail.com>',
    MAIL_PROVIDER: 'log',
    MAIL_SMTP_HOST: 'smtp.gmail.com',
    MAIL_SMTP_PASS: 'app-password',
    MAIL_SMTP_PORT: 465,
    MAIL_SMTP_SECURE: true,
    MAIL_SMTP_USER: 'sender@gmail.com',
  },
}));

const defaultEnv = { ...envMock };

vi.mock('@/lib/env', () => ({
  env: envMock,
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

async function loadMailService(envOverrides: EnvOverrides = {}) {
  vi.resetModules();

  const sendMail = vi.fn().mockResolvedValue({
    messageId: 'message-1',
  });
  createTransportMock.mockReturnValue({
    sendMail,
  });
  Object.assign(envMock, defaultEnv, envOverrides);

  const mailServiceModule = await import('./mail-service');

  return {
    createTransport: createTransportMock,
    sendEmailLoginCode: mailServiceModule.sendEmailLoginCode,
    sendMail,
  };
}

describe('mail service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    Object.assign(envMock, defaultEnv);
    createTransportMock.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('sends the login code through Gmail SMTP when the provider is gmail', async () => {
    const { createTransport, sendEmailLoginCode, sendMail } =
      await loadMailService({
        MAIL_PROVIDER: 'gmail',
      });

    const result = await sendEmailLoginCode({
      code: '123456',
      email: 'reader@example.com',
      expiresAt: new Date('2030-01-01T00:10:00.000Z'),
    });

    expect(createTransport).toHaveBeenCalledWith({
      auth: {
        pass: 'app-password',
        user: 'sender@gmail.com',
      },
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Lexora <sender@gmail.com>',
      subject: 'Lexora 登录验证码',
      text: '你的验证码是 123456，10 分钟内有效。',
      to: 'reader@example.com',
    });
    expect(result).toMatchObject({
      messageId: 'message-1',
      transport: 'gmail',
    });
  });

  it('logs a preview instead of sending when the provider is log', async () => {
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { createTransport, sendEmailLoginCode, sendMail } =
      await loadMailService({
        MAIL_PROVIDER: 'log',
      });

    const result = await sendEmailLoginCode({
      code: '654321',
      email: 'reader@example.com',
      expiresAt: new Date('2030-01-01T00:10:00.000Z'),
    });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith(
      '[auth] login code for reader@example.com: 654321 (expires 2030-01-01T00:10:00.000Z, sender Lexora <sender@gmail.com>)',
    );
    expect(result).toEqual({
      preview:
        '[auth] login code for reader@example.com: 654321 (expires 2030-01-01T00:10:00.000Z, sender Lexora <sender@gmail.com>)',
      transport: 'log',
    });
  });
});
