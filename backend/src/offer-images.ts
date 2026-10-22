import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { authenticate, roles } from './auth.js';
import { ApiError } from './domain.js';

export const IMAGE_WIDTH = 1200, IMAGE_HEIGHT = 750, IMAGE_BYTES = 3 * 1024 * 1024;
export const imageKeyPattern = /^upload-[0-9a-f-]{36}\.webp$/;
export const offerImageDir = path.resolve(process.env.OFFER_IMAGE_DIR || './offer-images');
export async function prepareOfferImage(buffer: Buffer) {
  if (buffer.length > IMAGE_BYTES) throw new ApiError(400,'IMAGE_SIZE','Offer images must be at most 3 MB.');
  try {
    const image = sharp(buffer, {limitInputPixels: IMAGE_WIDTH * IMAGE_HEIGHT, animated: true});
    const meta = await image.metadata();
    if (!['jpeg','png','webp'].includes(meta.format || '') || (meta.pages || 1) !== 1)
      throw new ApiError(400,'IMAGE_FORMAT','Use a single-frame JPEG, PNG or WebP image.');
    if (meta.width !== IMAGE_WIDTH || meta.height !== IMAGE_HEIGHT || (meta.orientation && meta.orientation > 4))
      throw new ApiError(400,'IMAGE_DIMENSIONS','Offer images must be exactly 1200 × 750 pixels (landscape).');
    // Decode and re-encode; do not retain uploaded metadata or original file names.
    return await image.rotate().webp({quality:88}).toBuffer();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400,'INVALID_IMAGE','Use a valid JPEG, PNG or WebP image, exactly 1200 × 750 pixels.');
  }
}
export async function assertOfferImage(key: string) {
  if (!imageKeyPattern.test(key)) return;
  try { await stat(path.join(offerImageDir,key)); }
  catch { throw new ApiError(400,'IMAGE_MISSING','Upload the offer image again before saving.'); }
}
export const offerImageRouter = Router();
const upload = multer({storage:multer.memoryStorage(), limits:{fileSize:IMAGE_BYTES,files:1,fields:0}}).single('image');
offerImageRouter.post('/admin/offer-images',authenticate,roles('ADMIN'),(req,res,next)=>{
  upload(req,res,error=>{
    if (error) return next(new ApiError(400,'UPLOAD_REJECTED','Upload one JPEG, PNG or WebP image, at most 3 MB.'));
    next();
  });
},async(req,res)=>{
  if (!req.file) throw new ApiError(400,'IMAGE_REQUIRED','Choose an offer image.');
  const bytes = await prepareOfferImage(req.file.buffer);
  await mkdir(offerImageDir,{recursive:true});
  const imageKey = `upload-${randomUUID()}.webp`;
  await writeFile(path.join(offerImageDir,imageKey),bytes,{flag:'wx'});
  res.status(201).json({data:{imageKey,url:`/api/offer-images/${imageKey}`,width:IMAGE_WIDTH,height:IMAGE_HEIGHT}});
});
offerImageRouter.get('/offer-images/:key',async(req,res)=>{
  const key=String(req.params.key);
  if (!imageKeyPattern.test(key)) throw new ApiError(404,'NOT_FOUND','Offer image unavailable.');
  try { await stat(path.join(offerImageDir,key)); } catch {throw new ApiError(404,'NOT_FOUND','Offer image unavailable.');}
  res.set({'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable','Cross-Origin-Resource-Policy':'cross-origin'});
  res.sendFile(path.join(offerImageDir,key));
});
