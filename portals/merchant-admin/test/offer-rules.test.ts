import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCents,savingsPreview,imageFileError } from '../src/offer-rules';
test('price preview uses cents and refuses misleading discounts',()=>{
 assert.equal(priceCents('123.45'),12345);assert.equal(savingsPreview('200','100'),'BWP 100.00 (50%)');assert.equal(savingsPreview('0.30','0.10'),'BWP 0.20 (66%)');
 for(const [a,b] of [['100','101'],['','20'],['200','0'],['200','10.001']])assert.equal(savingsPreview(a,b),'');
});
test('image picker rejects wrong format and excess size',()=>{
 assert.equal(imageFileError({type:'image/jpeg',size:3*1024*1024}),'');assert.ok(imageFileError({type:'image/svg+xml',size:100}));assert.ok(imageFileError({type:'image/png',size:3*1024*1024+1}));
});
