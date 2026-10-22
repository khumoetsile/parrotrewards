import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareOfferImage, IMAGE_BYTES } from '../src/offer-images.js';
import { offerInput } from '../src/offers.js';
const pixels=(width:number,height:number)=>sharp({create:{width,height,channels:3,background:'#16755d'}}).png().toBuffer();
test('offer artwork enforces exact dimensions and re-encodes without metadata',async()=>{
  const out=await prepareOfferImage(await pixels(1200,750));
  const metadata=await sharp(out).metadata();
  assert.equal(metadata.width,1200);assert.equal(metadata.height,750);assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);
  for(const [w,h] of [[1199,750],[1200,749],[750,1200],[600,375]])await assert.rejects(prepareOfferImage(await pixels(w,h)));
});
test('artwork rejects excess size, invalid bytes and SVG regardless of file name',async()=>{
  await assert.rejects(prepareOfferImage(Buffer.alloc(IMAGE_BYTES+1)),/at most 3 MB/);
  await assert.rejects(prepareOfferImage(Buffer.from('not a photo')));
  await assert.rejects(prepareOfferImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750"><rect width="1200" height="750"/></svg>')),/single-frame/);
});
const offer={title:'Price test',slug:'price-test',description:'A pricing validation test',categoryId:'550e8400-e29b-41d4-a716-446655440000',merchantId:'550e8400-e29b-41d4-a716-446655440001',originalPrice:'200.00',discountedPrice:'100.00',terms:'Present your claim to receive the discount.',status:'DRAFT'};
test('known original prices validate savings without inventing unknown originals',()=>{
 assert.equal(offerInput.safeParse(offer).success,true);assert.equal(offerInput.safeParse({...offer,originalPrice:null}).success,true);
 for(const changes of [{discountedPrice:'201.00'},{discountedPrice:'0'},{discountedPrice:'100.001'},{imageKey:'../../private-receipts/secret'}])assert.equal(offerInput.safeParse({...offer,...changes}).success,false);
});
