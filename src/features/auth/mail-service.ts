import { env } from '@/lib/env';

type SendEmailLoginCodeInput = {
  code: string;
  email: string;
  expiresAt: Date;
};

export async function sendEmailLoginCode(input: SendEmailLoginCodeInput) {
  const preview = `[auth] login code for ${input.email}: ${input.code} (expires ${input.expiresAt.toISOString()}, sender ${env.MAIL_FROM})`;

  console.info(preview);

  return {
    preview,
    transport: env.MAIL_PROVIDER,
  };
}
