import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { sendEmail } from '../src/email.js';

test('email uses configured sender and authenticated TLS without delivering in tests', async () => {
  const keys = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM'];
  const previous = keys.map(k => process.env[k]);
  Object.assign(process.env, {SMTP_HOST:'mail.example.test',SMTP_PORT:'465',SMTP_USER:'sender@example.test',SMTP_PASSWORD:'test-only',SMTP_FROM:'Parrot Rewards <sender@example.test>'});
  let options: any; let message: any;
  const stub = mock.method(nodemailer, 'createTransport', (settings: any) => {
    options = settings;
    return {sendMail: async (mail: any) => {message = mail; return {messageId:'test'};}} as any;
  });
  try {
    await sendEmail('customer@example.test','Recovery','Instructions');
    assert.equal(options.host,'mail.example.test');
    assert.equal(options.port,465);
    assert.equal(options.secure,true);
    assert.equal(options.tls.rejectUnauthorized,true);
    assert.equal(options.auth.user,'sender@example.test');
    assert.equal(message.from,'Parrot Rewards <sender@example.test>');
    assert.equal(message.to,'customer@example.test');
    delete process.env.SMTP_PASSWORD;
    await assert.rejects(sendEmail('customer@example.test','Recovery','Instructions'),/not configured/);
  } finally {
    stub.mock.restore();
    keys.forEach((key,i) => {if(previous[i] === undefined) delete process.env[key]; else process.env[key]=previous[i];});
  }
});
