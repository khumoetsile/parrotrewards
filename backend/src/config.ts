import 'dotenv/config';
import { z } from 'zod';
import path from 'node:path';
const env = z.object({
  DATABASE_URL: z.string().startsWith('mysql://'),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:4200'),
  TRUST_PROXY: z.string().default(''),
  UPLOAD_DIR: z.string().default('./private-receipts'),
  OCR_CACHE_DIR: z.string().default('./ocr-cache'),
  NODE_ENV: z.enum(['development','test','production']).default('development')
}).parse(process.env);
const origins = env.CORS_ORIGINS.split(',').map(value=>value.trim()).filter(Boolean);
if (env.NODE_ENV === 'production') {
  if (!origins.length || origins.some(value => { try { return new URL(value).protocol !== 'https:'; } catch { return true; } })) {
    throw new Error('Production CORS_ORIGINS must contain explicit HTTPS origins.');
  }
  if (/replace-with|local.only|generate_a_unique/i.test(env.JWT_SECRET)) throw new Error('Set a unique production JWT_SECRET.');
  for (const name of ['UPLOAD_DIR','OCR_CACHE_DIR','OFFER_IMAGE_DIR'] as const) {
    if (!process.env[name] || !path.isAbsolute(process.env[name]!)) throw new Error(`${name} must be an absolute production path.`);
  }
}
export const config = { ...env, uploadDir: path.resolve(env.UPLOAD_DIR), ocrCacheDir: path.resolve(env.OCR_CACHE_DIR), origins };
