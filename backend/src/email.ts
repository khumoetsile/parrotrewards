import 'dotenv/config';
import nodemailer from 'nodemailer';

export function emailTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) throw new Error('Email delivery is not configured.');
  return nodemailer.createTransport({
    host: SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
  });
}

// All application email uses the configured Parrot Rewards mailbox.
export async function sendEmail(to: string, subject: string, text: string) {
  return emailTransport().sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
