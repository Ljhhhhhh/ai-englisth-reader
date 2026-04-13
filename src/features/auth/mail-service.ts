import nodemailer from 'nodemailer';

import { env } from '@/lib/env';

type SendEmailLoginCodeInput = {
  code: string;
  email: string;
  expiresAt: Date;
};

export async function sendEmailLoginCode(input: SendEmailLoginCodeInput) {
  const preview = `[auth] login code for ${input.email}: ${input.code} (expires ${input.expiresAt.toISOString()}, sender ${env.MAIL_FROM})`;

  if (env.MAIL_PROVIDER === 'log') {
    console.info(preview);

    return {
      preview,
      transport: env.MAIL_PROVIDER,
    };
  }

  if (!env.MAIL_SMTP_USER || !env.MAIL_SMTP_PASS) {
    throw new Error('MAIL_SMTP_USER 和 MAIL_SMTP_PASS 必须在 Gmail 模式下配置。');
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: env.MAIL_SMTP_PASS,
      user: env.MAIL_SMTP_USER,
    },
    host: env.MAIL_SMTP_HOST,
    port: env.MAIL_SMTP_PORT,
    secure: env.MAIL_SMTP_SECURE,
  });

  const info = await transporter.sendMail({
    from: env.MAIL_FROM,
    subject: 'Lexora 登录验证码',
    text: `你的验证码是 ${input.code}，${env.AUTH_CODE_TTL_MINUTES} 分钟内有效。`,
    to: input.email,
  });

  return {
    ...info,
    preview,
    transport: env.MAIL_PROVIDER,
  };
}
