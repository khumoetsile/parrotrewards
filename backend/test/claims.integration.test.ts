import sharp from 'sharp';
import 'dotenv/config';
import { test,after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { randomUUID,randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
after(()=>db.$disconnect());
test('Parrot Rewards demo discovery, attribution, claims and single-use redemption',{skip:process.env.RUN_DB_TESTS!=='1',timeout:120000},async(t)=>{
 assert.ok(process.env.DATABASE_URL?.endsWith('/pula_mvp_test'));
 const app=createApp(),tag=randomUUID(),password=randomBytes(24).toString('base64url');
 t.after(async()=>{await db.offer.updateMany({where:{slug:{contains:tag},isDemo:true},data:{status:'ARCHIVED'}});});
 const fixtureUser=async(role:'ADMIN'|'MERCHANT',prefix:string)=>db.user.create({data:{email:`${prefix}-${tag}@example.test`,name:'Fictional Claims QA',role,passwordHash:await bcrypt.hash(password,12)}});
 const admin=await fixtureUser('ADMIN','offer-admin'),merchant=await fixtureUser('MERCHANT','offer-merchant'),stranger=await fixtureUser('MERCHANT','offer-other');
 const login=async(email:string)=>{const r=await request(app).post('/api/auth/login').send({email,password});assert.equal(r.status,200);return 'Bearer '+r.body.data.accessToken;};
 const A=await login(admin.email),M=await login(merchant.email),O=await login(stranger.email);
 const customer=async(prefix:string)=>{const r=await request(app).post('/api/auth/register').send({email:`${prefix}-${tag}@example.test`,name:'Fictional Offer Customer',password});assert.equal(r.status,201);return {authorization:'Bearer '+r.body.data.accessToken,userId:r.body.data.user.id};};
 const c=await customer('offer-customer'),other=await customer('offer-customer-other');
 let offerId='',reference='',claimId='',merchantId='';
 const categories=(await request(app).get('/api/categories')).body.data;
 const categoryId=categories.find((c:any)=>c.slug==='hardware').id;
 await t.test('discovery returns current published offers and consistent savings without assuming seed prices',async()=>{
  const r=await request(app).get('/api/offers');assert.equal(r.status,200);assert.ok(Array.isArray(r.body.data));
  for(const offer of r.body.data){assert.equal(offer.status,'PUBLISHED');assert.equal(offer.merchant.approved,true);if(offer.originalPrice){const before=BigInt(Math.round(Number(offer.originalPrice)*100)),after=BigInt(Math.round(Number(offer.discountedPrice)*100));assert.equal(offer.savings,((Number(before-after))/100).toFixed(2));assert.equal(offer.discountPercent,Number((before-after)*100n/before));}else{assert.equal(offer.savings,null);}}
  const first=r.body.data[0];if(first){const filtered=await request(app).get('/api/offers?category='+encodeURIComponent(first.category.slug)+'&search='+encodeURIComponent(first.title));assert.ok(filtered.body.data.some((o:any)=>o.id===first.id));}
 });
 const body={title:'Fictional QA discount',slug:'qa-discount-'+tag,description:'Fictional test offer only; no commercial stock.',categoryId,merchantId:'',discountedPrice:'100.00',originalPrice:'200.00',discountType:'PRICE',terms:'DEMO ONLY. Validate the prototype claim reference with the fictional provider. This is not payment or admission.',status:'PUBLISHED',isDemo:true,imageKey:'hardware',perUserClaimLimit:1,totalClaimLimit:null,claimTtlHours:24};
 await t.test('central admin manages offers; invalid prices and customer administration rejected',async()=>{
  const r=await request(app).post('/api/admin/merchants').set('Authorization',A).send({name:'Fictional Claim Provider '+tag,category:'Hardware',description:'Fictional QA provider.',staffEmail:merchant.email});assert.equal(r.status,201);merchantId=r.body.data.id;body.merchantId=merchantId;
  await request(app).patch('/api/admin/merchants/'+merchantId+'/approval').set('Authorization',A).send({approved:true});
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',c.authorization).send(body)).status,403);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',M).send(body)).status,403);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,discountedPrice:'201'})).status,400);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,discountedPrice:'1.001'})).status,400);
  const created=await request(app).post('/api/admin/offers').set('Authorization',A).send(body);assert.equal(created.status,201);offerId=created.body.data.id;
  assert.equal((await request(app).get('/api/offers/'+body.slug)).status,200);
 });
 const campaignSlug='qa-campaign-'+tag,referralCode='qa-ref-'+tag;
 await t.test('promotional fallback, campaign and referral attribution persist after registration',async()=>{
  const campaign=await db.promotionalCampaign.create({data:{slug:campaignSlug,name:'Fictional QA campaign',offerId,referrals:{create:{code:referralCode,label:'Fictional QA referral'}}}});
  const r=await request(app).get('/api/campaigns/'+campaignSlug+'?ref='+referralCode);assert.equal(r.status,200);assert.equal(r.body.data.offer.id,offerId);
  const landing=await request(app).get('/p/'+campaignSlug+'?ref='+referralCode);assert.equal(landing.status,200);assert.match(landing.text,/parrotrewards:\/\/promo\//);assert.match(landing.text,/not proof of payment/);
  const touch=await request(app).post('/api/attribution').set('Authorization',c.authorization).send({campaignSlug,referralCode});assert.equal(touch.status,201);assert.equal(touch.body.data.campaignId,campaign.id);
  assert.equal((await request(app).get('/api/campaigns/'+campaignSlug+'?ref=invalid')).status,400);
 });
 await t.test('concurrent claim retries save one unpredictable reference without revenue',async()=>{
  const before=await db.commissionLedger.count({where:{transaction:{userId:c.userId}}});const payload={offerId,idempotencyKey:randomUUID(),campaignSlug,referralCode};
  const responses=await Promise.all([1,2,3].map(()=>request(app).post('/api/claims').set('Authorization',c.authorization).send(payload)));
  for(const r of responses)assert.ok([200,201].includes(r.status),JSON.stringify(r.body));assert.equal(new Set(responses.map(r=>r.body.data.id)).size,1);
  const result=responses[0].body.data;claimId=result.id;reference=result.reference;assert.match(reference,/^PR-[A-F0-9]{32}$/);assert.equal(result.status,'CLAIMED');assert.ok(result.expiresAt);assert.equal(await db.commissionLedger.count({where:{transaction:{userId:c.userId}}}),before);
  const saved=await db.offerClaim.findUniqueOrThrow({where:{id:claimId},include:{referralLink:true,campaign:true}});assert.equal(saved.referralLink?.code,referralCode);assert.equal(saved.campaign?.slug,campaignSlug);
  assert.equal((await request(app).post('/api/claims').set('Authorization',c.authorization).send({...payload,idempotencyKey:randomUUID()})).status,409);
  assert.equal((await request(app).post('/api/claims').set('Authorization',c.authorization).send({...payload,referralCode:'wrong'})).status,409);
 });
 await t.test('My Claims is private; merchants only inspect their provider’s references',async()=>{
  const list=await request(app).get('/api/claims').set('Authorization',c.authorization);assert.ok(list.body.data.some((x:any)=>x.id===claimId));
  assert.equal((await request(app).get('/api/claims/'+claimId)).status,401);
  assert.equal((await request(app).get('/api/claims/'+claimId).set('Authorization',other.authorization)).status,404);
  assert.equal((await request(app).post('/api/redemptions/lookup').set('Authorization',O).send({reference})).status,404);
  assert.equal((await request(app).post('/api/redemptions/lookup').set('Authorization',M).send({reference})).status,200);
  assert.equal((await request(app).post('/api/redemptions').set('Authorization',c.authorization).send({reference,note:'Cannot self redeem'})).status,403);
 });
 await t.test('simultaneous redemption is single-use and audited',async()=>{
  const responses=await Promise.all([1,2].map(()=>request(app).post('/api/redemptions').set('Authorization',M).send({reference,note:'Fictional provider validation'})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(await db.redemptionRecord.count({where:{claimId}}),1);
  const saved=await request(app).get('/api/claims/'+claimId).set('Authorization',c.authorization);assert.equal(saved.body.data.status,'REDEEMED');
  assert.ok(await db.auditLog.findFirst({where:{entityId:claimId,action:'CLAIM_REDEEMED'}}));
 });
 await t.test('unpublished, expired and capped offers cannot produce unauthorized claims',async()=>{
  await request(app).put('/api/admin/offers/'+offerId).set('Authorization',A).send({...body,status:'PAUSED'});
  assert.equal((await request(app).get('/api/offers/'+body.slug)).status,404);
  assert.equal((await request(app).post('/api/claims').set('Authorization',other.authorization).send({offerId,idempotencyKey:randomUUID()})).status,409);
  await request(app).put('/api/admin/offers/'+offerId).set('Authorization',A).send({...body,totalClaimLimit:1});
  assert.equal((await request(app).post('/api/claims').set('Authorization',other.authorization).send({offerId,idempotencyKey:randomUUID()})).status,409);
  await request(app).put('/api/admin/offers/'+offerId).set('Authorization',A).send({...body,expiresAt:'2020-01-01T00:00:00Z'});
  assert.equal((await request(app).get('/api/offers/'+body.slug)).status,404);
 });
 await t.test('expired and cancelled references cannot be redeemed',async()=>{
  const make=async(slug:string)=>{const published=(await request(app).get('/api/offers/'+slug)).body.data;const r=await request(app).post('/api/claims').set('Authorization',other.authorization).send({offerId:published.id,idempotencyKey:randomUUID()});assert.equal(r.status,201);return r.body.data;};
  const isolatedSlug='qa-expiry-'+tag;const fixture=await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,slug:isolatedSlug,perUserClaimLimit:2,claimTtlHours:24});assert.equal(fixture.status,201);
  const expired=await make(isolatedSlug);await db.offerClaim.update({where:{id:expired.id},data:{expiresAt:new Date('2020-01-01')}});
  assert.equal((await request(app).get('/api/claims/'+expired.id).set('Authorization',other.authorization)).body.data.status,'EXPIRED');
  assert.equal((await request(app).post('/api/redemptions').set('Authorization',A).send({reference:expired.reference,note:'Expired test'})).status,409);
  const cancelled=await make(isolatedSlug);assert.equal((await request(app).post('/api/claims/'+cancelled.id+'/cancel').set('Authorization',other.authorization)).status,200);
  assert.equal((await request(app).post('/api/redemptions').set('Authorization',A).send({reference:cancelled.reference,note:'Cancelled test'})).status,409);
 });
 await t.test('admin artwork upload, both prices and real pagination work together',async()=>{
  const valid=await sharp({create:{width:1200,height:750,channels:3,background:'#16755d'}}).png().toBuffer();
  const invalid=await sharp({create:{width:600,height:375,channels:3,background:'#16755d'}}).png().toBuffer();
  assert.equal((await request(app).post('/api/admin/offer-images').attach('image',valid,'offer.png')).status,401);
  assert.equal((await request(app).post('/api/admin/offer-images').set('Authorization',c.authorization).attach('image',valid,'offer.png')).status,403);
  assert.equal((await request(app).post('/api/admin/offer-images').set('Authorization',M).attach('image',valid,'offer.png')).status,403);
  assert.equal((await request(app).post('/api/admin/offer-images').set('Authorization',A).attach('image',invalid,'offer.png')).status,400);
  assert.equal((await request(app).post('/api/admin/offer-images').set('Authorization',A).attach('image',Buffer.from('<svg/>'),'fake.png')).status,400);
  const uploaded=await request(app).post('/api/admin/offer-images').set('Authorization',A).attach('image',valid,'offer.png');assert.equal(uploaded.status,201);
  const key=uploaded.body.data.imageKey;
  const photo=await request(app).get(uploaded.body.data.url);assert.equal(photo.status,200);assert.match(photo.headers['content-type'],/image\/webp/);assert.equal((await sharp(photo.body).metadata()).width,1200);
  const draft={...body,slug:'qa-image-'+tag,status:'DRAFT',imageKey:key};
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...draft,discountedPrice:'201'})).status,400);
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...draft,imageKey:'upload-00000000-0000-0000-0000-000000000000.webp'})).status,400);
  const created=await request(app).post('/api/admin/offers').set('Authorization',A).send(draft);assert.equal(created.status,201);assert.equal(created.body.data.imageKey,key);assert.equal(created.body.data.originalPrice,'200');assert.equal(created.body.data.discountedPrice,'100');
  await request(app).post('/api/admin/offers').set('Authorization',A).send({...draft,slug:'qa-image-'+tag+'-second'}).expect(201);
  const first=await request(app).get('/api/admin/offers?pageSize=1&search=qa-image-'+tag).set('Authorization',A);assert.equal(first.status,200);assert.equal(first.body.data.length,1);assert.equal(first.body.meta.total,2);assert.equal(first.body.meta.totalPages,2);
  const second=await request(app).get('/api/admin/offers?pageSize=1&page=2&search=qa-image-'+tag).set('Authorization',A);assert.equal(second.body.data.length,1);assert.notEqual(first.body.data[0].id,second.body.data[0].id);
  const filtered=await request(app).get('/api/admin/offers?pageSize=10&search=qa-image-'+tag+'&status=DRAFT').set('Authorization',A);assert.equal(filtered.body.meta.total,2);assert.ok(filtered.body.data.some((o:any)=>o.id===created.body.data.id));
  const claims=await request(app).get('/api/claims?pageSize=1').set('Authorization',c.authorization);assert.equal(claims.body.data.length,1);assert.ok(claims.body.data.every((v:any)=>v.userId===c.userId));assert.ok(claims.body.meta.total>=1);
  assert.equal((await request(app).get('/api/admin/offers?pageSize=1000').set('Authorization',A)).status,400);
 });

 await t.test('inline category creation is admin-only and searchable lists keep their scopes',async()=>{
  const category={name:'QA Garden '+tag,slug:'qa-garden-'+tag};
  assert.equal((await request(app).post('/api/admin/categories').set('Authorization',c.authorization).send(category)).status,403);
  const created=await request(app).post('/api/admin/categories').set('Authorization',A).send(category);assert.equal(created.status,201);
  assert.equal((await request(app).post('/api/admin/categories').set('Authorization',A).send(category)).status,409);
  const categories=await request(app).get('/api/admin/categories').set('Authorization',A);assert.ok(categories.body.data.some((v:any)=>v.id===created.body.data.id));
  const users=await request(app).get('/api/admin/users?search=offer-admin-'+tag).set('Authorization',A);assert.equal(users.status,200);assert.equal(users.body.meta.total,1);assert.equal(users.body.data[0].id,admin.id);
  const merchants=await request(app).get('/api/admin/merchants?search='+tag+'&pageSize=1').set('Authorization',A);assert.equal(merchants.body.meta.total,1);assert.equal(merchants.body.data[0].id,merchantId);
  const purchases=await request(app).get('/api/transactions?search=nonexistent-'+tag).set('Authorization',c.authorization);assert.equal(purchases.status,200);assert.equal(purchases.body.meta.total,0);assert.equal(purchases.body.data.length,0);
  const claims=await request(app).get('/api/claims?search='+tag+'&status=REDEEMED').set('Authorization',other.authorization);assert.equal(claims.body.data.length,0);
  const audit=await request(app).get('/api/admin/audit?search=OFFER_CREATED&pageSize=1').set('Authorization',A);assert.equal(audit.status,200);assert.ok(audit.body.meta.total>=1);assert.equal(audit.body.data[0].action,'OFFER_CREATED');
  const shopCategories=await request(app).get('/api/shop-categories');assert.equal(shopCategories.status,200);assert.ok(Array.isArray(shopCategories.body.data));
 });

 await t.test('provider creation and category removal move links atomically and can be restored',async()=>{
  const source=(await request(app).post('/api/admin/categories').set('Authorization',A).send({name:'QA source '+tag,slug:'qa-source-'+tag}).expect(201)).body.data;
  const target=(await request(app).post('/api/admin/categories').set('Authorization',A).send({name:'QA target '+tag,slug:'qa-target-'+tag}).expect(201)).body.data;
  const provider=(await request(app).post('/api/admin/merchants').set('Authorization',A).send({name:'QA inline provider '+tag,category:source.name,categoryId:source.id,description:'Isolated provider workflow test',approved:true}).expect(201)).body.data;
  assert.equal(provider.approved,true);
  const draft=(await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,slug:'qa-transfer-'+tag,status:'DRAFT',categoryId:source.id,merchantId:provider.id}).expect(201)).body.data;
  const before=await request(app).get('/api/admin/categories').set('Authorization',A);const row=before.body.data.find((v:any)=>v.id===source.id);assert.equal(row._count.offers,1);assert.equal(row._count.merchants,1);
  assert.equal((await request(app).delete('/api/admin/categories/'+source.id).set('Authorization',c.authorization).send({replacementId:target.id})).status,403);
  assert.equal((await request(app).delete('/api/admin/categories/'+source.id).set('Authorization',A).send({})).status,409);
  assert.equal((await request(app).delete('/api/admin/categories/'+source.id).set('Authorization',A).send({replacementId:source.id})).status,400);
  await request(app).delete('/api/admin/categories/'+source.id).set('Authorization',A).send({replacementId:target.id}).expect(200);
  assert.equal((await db.offer.findUniqueOrThrow({where:{id:draft.id}})).categoryId,target.id);assert.equal((await db.merchant.findUniqueOrThrow({where:{id:provider.id}})).categoryId,target.id);
  const publicCategories=await request(app).get('/api/categories');assert.ok(!publicCategories.body.data.some((v:any)=>v.id===source.id));
  assert.equal((await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,slug:'qa-removed-'+tag,categoryId:source.id})).status,409);
  await request(app).post('/api/admin/categories/'+source.id+'/restore').set('Authorization',A).send({}).expect(200);
  await request(app).patch('/api/admin/categories/'+source.id).set('Authorization',A).send({name:'QA renamed '+tag,slug:source.slug,sortOrder:5}).expect(200);
  assert.equal((await db.merchantCategory.findUniqueOrThrow({where:{id:source.id}})).archivedAt,null);
  assert.equal((await db.offer.findUniqueOrThrow({where:{id:draft.id}})).categoryId,target.id);
  assert.equal(await db.auditLog.count({where:{entityId:source.id,action:'CATEGORY_REMOVED'}}),1);
  await request(app).patch('/api/admin/categories/'+target.id).set('Authorization',A).send({name:'QA new target '+tag,slug:target.slug,sortOrder:10}).expect(200);assert.equal((await db.merchant.findUniqueOrThrow({where:{id:provider.id}})).category,'QA new target '+tag);
 });

 await t.test('provider management is scoped, paged and reversible without losing claims',async()=>{
  const endpoint='/api/admin/providers/'+merchantId;
  await request(app).get('/api/admin/providers').set('Authorization',c.authorization).expect(403);
  const listing=await request(app).get('/api/admin/providers?search='+encodeURIComponent(tag)+'&pageSize=1&sort=name').set('Authorization',A).expect(200);
  assert.equal(listing.body.data.length,1);assert.ok(listing.body.meta.total>=1);
  const payload={name:'Fictional Updated Provider '+tag,categoryId,description:'Provider editing test',approved:false};
  await request(app).patch(endpoint).set('Authorization',M).send(payload).expect(403);
  await request(app).patch(endpoint).set('Authorization',A).send(payload).expect(200);
  assert.equal((await db.merchant.findUniqueOrThrow({where:{id:merchantId}})).approved,false);
  assert.ok(await db.offerClaim.findUnique({where:{id:claimId}}));
  await request(app).patch(endpoint).set('Authorization',A).send({...payload,approved:true}).expect(200);
  assert.ok(await db.auditLog.count({where:{entityId:merchantId,action:'PROVIDER_UPDATED'}})>=2);
 });
 await t.test('quick offer lifecycle and unknown original price preserve truthful pricing',async()=>{
  const draft=(await request(app).post('/api/admin/offers').set('Authorization',A).send({...body,slug:'qa-lifecycle-'+tag,originalPrice:null,status:'DRAFT'}).expect(201)).body.data;
  const endpoint='/api/admin/offers/'+draft.id+'/status';
  await request(app).patch(endpoint).set('Authorization',c.authorization).send({status:'PUBLISHED'}).expect(403);
  await request(app).patch(endpoint).set('Authorization',A).send({status:'INVALID'}).expect(400);
  await request(app).patch(endpoint).set('Authorization',A).send({status:'PUBLISHED'}).expect(200);
  const visible=(await request(app).get('/api/offers/'+draft.slug).expect(200)).body.data;
  assert.equal(visible.originalPrice,null);assert.equal(visible.savings,null);
  for(const status of ['PAUSED','ARCHIVED','DRAFT']) await request(app).patch(endpoint).set('Authorization',A).send({status}).expect(200);
  await request(app).get('/api/offers/'+draft.slug).expect(404);
 });
 await t.test('mark-all-read never changes another customer notifications',async()=>{
  const mine=await db.notification.create({data:{userId:c.userId,title:'UX review',body:'Test update'}});
  const theirs=await db.notification.create({data:{userId:other.userId,title:'Private',body:'Other customer'}});
  await request(app).patch('/api/notifications/read-all').set('Authorization',c.authorization).send({}).expect(200);
  assert.ok((await db.notification.findUniqueOrThrow({where:{id:mine.id}})).readAt);
  assert.equal((await db.notification.findUniqueOrThrow({where:{id:theirs.id}})).readAt,null);
 });

});
