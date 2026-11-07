import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/lib/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

export function createMailProvider(): MailProvider {
  if (env.MAIL_DRIVER === 'smtp') {
    if (!env.SMTP_HOST || !env.SMTP_FROM) {
      throw new Error('SMTP_HOST and SMTP_FROM are required when MAIL_DRIVER=smtp');
    }
    const transporter: Transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
      requireTLS: env.SMTP_PORT !== 465,
    });
    return {
      async send(message) {
        await transporter.sendMail({ from: env.SMTP_FROM, ...message });
      },
    };
  }

  if (!env.SES_FROM) {
    throw new Error('SES_FROM is required when MAIL_DRIVER=ses');
  }
  const client = new SESv2Client({});
  return {
    async send(message) {
      await client.send(
        new SendEmailCommand({
          FromEmailAddress: env.SES_FROM,
          Destination: { ToAddresses: [message.to] },
          Content: {
            Simple: {
              Subject: { Data: message.subject },
              Body: {
                Text: { Data: message.text },
                Html: { Data: message.html },
              },
            },
          },
        }),
      );
    },
  };
}
