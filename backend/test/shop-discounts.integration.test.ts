import 'dotenv/config';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID,randomBytes} from 'node:crypto';
import {createApp} from '../src/app.js';
import {db} from '../src/db.js';
import {accessToken} from '../src/auth.js';
after(()=>db.$disconnect());

test('shop QR discounts are owner-selected, branch-scoped, published and claimable', {skip:process.env.RUN_DB_TESTS!=='1',timeout:90000}, async t=>{
 const url=new URL(process.env.DATABASE_URL!);
 assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/pula_mvp_test');
 const tag=randomUUID(),app=createApp();
 const user=async(role:'ADMIN'|'MERCHANT'|'CUSTOMER')=>db.user.create({data:{email:role.toLowerCase()+'-'+tag+'@example.test',name:'Fictional shop QA',passwordHash:'not-a-login-password',role}});
 const admin=await user('ADMIN'),merchantUser=await user('MERCHANT'),customer=await user('CUSTOMER');
 const A='Bearer '+accessToken(admin.id),M='Bearer '+accessToken(merchantUser.id),C='Bearer '+accessToken(customer.id);
 const category=await db.merchantCategory.create({data:{name:'Shop QA '+tag,slug:'shop-qa-'+tag}});
 const merchant=await db.merchant.create({data:{name:'Fictional QA provider '+tag,category:'Hardware',description:'Isolated test only',approved:true}});
 const other=await db.merchant.create({data:{name:'Unrelated QA provider '+tag,category:'Hardware',description:'Isolated test only',approved:true}});
 const shop=async(merchantId:string,name:string)=>db.shop.create({data:{merchantId,name,address:'Fictional QA address',qr:{create:{token:randomBytes(32).toString('base64url')}}},include:{qr:true}});
 const a=await shop(merchant.id,'Branch A'),b=await shop(merchant.id,'Branch B'),c=await shop(other.id,'Other provider');
 const body={title:'Fictional discounted shovel',slug:'shop-item-'+tag,description:'Fictional shop item for isolated testing.',categoryId:category.id,merchantId:merchant.id,shopId:a.id,originalPrice:'200.00',discountedPrice:'100.00',discountType:'PRICE',terms:'Present this reference only at the specified fictional branch. No payment is confirmed.',status:'PUBLISHED',isDemo:true,imageKey:'hardware'};
 let offerId='';
 const resolve=(token:string,page=1)=>request(app).post('/api/shop-discounts/resolve?page='+page).send({token});
 await t.test('only the owner can select items; branch must belong to selected provider',async()=>{
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',M).send(body)).status,403);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',C).send(body)).status,403);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,shopId:c.id})).status,400);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,originalPrice:null})).status,400);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,discountedPrice:'200.00'})).status,400);
  const saved=await request(app).post('/api/admin/offers').set('Authorization',A).send(body);assert.equal(saved.status,201,JSON.stringify(saved.body));offerId=saved.body.data.id;assert.equal(saved.body.data.shop.name,'Branch A');
 });
 await t.test('new and existing printed QR formats resolve only eligible items',async()=>{
  for(const token of [a.qr!.token,'pula://shop/'+a.qr!.token,'parrotrewards://shop/'+a.qr!.token]){const r=await resolve(token);assert.equal(r.status,200);assert.equal(r.body.data.shop.id,a.id);assert.deepEqual(r.body.data.offers.map((o:any)=>o.id),[offerId]);assert.equal(r.body.data.offers[0].savings,'100.00');assert.equal(r.body.data.shop.qr,undefined);}
  assert.equal((await resolve(b.qr!.token)).body.data.offers.length,0);
  assert.equal((await resolve(c.qr!.token)).body.data.offers.length,0);
  assert.equal((await resolve('https://unrelated.test')).status,400);
  assert.equal((await resolve('unknown-token-1234567890')).status,404);
 });
 await t.test('pausing removes the item; drafts, expired and future items stay hidden',async()=>{
  for(const [suffix,change] of [['draft',{status:'DRAFT'}],['expired',{expiresAt:'2020-01-01T00:00:00Z'}],['future',{startsAt:'2099-01-01T00:00:00Z'}]] as const){const r=await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,slug:suffix+'-'+tag,...change});assert.equal(r.status,201);}
  assert.equal((await resolve(a.qr!.token)).body.data.offers.length,1);
  const receiptLookup=await request(app).post('/api/qr/resolve').send({token:'parrotrewards://shop/'+a.qr!.token});
  assert.equal(receiptLookup.status,200);assert.deepEqual(receiptLookup.body.data.offers.map((o:any)=>o.id),[offerId]);
  const oldLookup=await request(app).post('/api/qr/resolve').send({token:'pula://shop/'+a.qr!.token});
  assert.equal(oldLookup.status,200);
  assert.equal((await request(app).patch('/api/admin/offers/'+offerId+'/status').set('Authorization',A).send({status:'PAUSED'})).status,200);
  assert.equal((await resolve(a.qr!.token)).body.data.offers.length,0);
  await request(app).patch('/api/admin/offers/'+offerId+'/status').set('Authorization',A).send({status:'PUBLISHED'});
 });
 await t.test('claims retain the chosen branch and cannot be moved by editing the offer',async()=>{
  const r=await request(app).post('/api/claims').set('Authorization',C).send({offerId,idempotencyKey:randomUUID()});assert.equal(r.status,201);
  const claim=await request(app).get('/api/claims/'+r.body.data.id).set('Authorization',C);assert.equal(claim.body.data.offer.shop.id,a.id);
  const moved=await request(app).put('/api/admin/offers/'+offerId).set('Authorization',A).send({...body,shopId:b.id});assert.equal(moved.status,409);assert.equal(moved.body.error.code,'CLAIMED_LOCATION');
 });
 await t.test('inactive shops, inactive provider and rotated codes are unavailable',async()=>{
  await db.shop.update({where:{id:a.id},data:{active:false}});assert.equal((await resolve(a.qr!.token)).status,404);
  assert.equal((await request(app).post('/api/claims').set('Authorization',C).send({offerId,idempotencyKey:randomUUID()})).status,409);
  await db.shop.update({where:{id:a.id},data:{active:true}});
  await db.merchant.update({where:{id:merchant.id},data:{approved:false}});assert.equal((await resolve(a.qr!.token)).status,404);
  await db.merchant.update({where:{id:merchant.id},data:{approved:true}});
  assert.equal((await request(app).post('/api/manage/shops/'+a.id+'/qr/rotate').set('Authorization',A).send({})).status,200);
  assert.equal((await resolve(a.qr!.token)).status,404);
 });
 await t.test('explicit all-branch discounts are limited to the provider and paginated',async()=>{
  for(let i=0;i<21;i++){const r=await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,slug:'all-'+i+'-'+tag,shopId:null});assert.equal(r.status,201);}
  const first=await resolve(b.qr!.token),second=await resolve(b.qr!.token,2);assert.equal(first.body.data.offers.length,20);assert.equal(second.body.data.offers.length,1);assert.equal(first.body.data.total,21);
  assert.equal((await resolve(c.qr!.token)).body.data.offers.length,0);
  assert.equal((await request(app).get('/api/admin/providers/'+merchant.id+'/shops').set('Authorization',C)).status,403);
  const branches=await request(app).get('/api/admin/providers/'+merchant.id+'/shops').set('Authorization',A);assert.equal(branches.status,200);assert.equal(branches.body.data.length,2);assert.equal(branches.body.data[0].qr.token,undefined);
 });
});
