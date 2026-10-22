import 'dotenv/config';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import { randomUUID,randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { db } from '../src/db.js';
import { TesseractOcr } from '../src/ocr.js';
import { processOne } from '../src/worker.js';
import { hash } from '../src/domain.js';
const enabled=process.env.RUN_DB_TESTS==='1';
after(async()=>db.$disconnect());
test('MySQL API workflow with real OCR, private receipts, RBAC and provisional ledger',{skip:!enabled,timeout:180000},async(t)=> {
  assert.ok(process.env.DATABASE_URL?.endsWith('/pula_mvp_test'),'Only the isolated test database is allowed.');
  const app=createApp(); const tag=randomUUID(); const password=randomBytes(24).toString('base64url');
  const admin=await db.user.create({data:{email:`admin-${tag}@example.test`,name:'Fictional Integration Admin',role:'ADMIN',passwordHash:await bcrypt.hash(password,12)}});
  const merchant=await db.user.create({data:{email:`merchant-${tag}@example.test`,name:'Fictional Integration Merchant',role:'MERCHANT',passwordHash:await bcrypt.hash(password,12)}});
  const stranger=await db.user.create({data:{email:`other-${tag}@example.test`,name:'Fictional Other Merchant',role:'MERCHANT',passwordHash:await bcrypt.hash(password,12)}});
  const login=async(email:string)=>{const r=await request(app).post('/api/auth/login').send({email,password});assert.equal(r.status,200);return r.body.data;};
  const adminSession=await login(admin.email); const merchantSession=await login(merchant.email); const strangerSession=await login(stranger.email);
  const A='Bearer '+adminSession.accessToken, M='Bearer '+merchantSession.accessToken, O='Bearer '+strangerSession.accessToken;
  let C=''; let session:any; let shopId=''; let qrToken=''; let receiptId=''; let purchaseId='';
  await t.test('customer registers, role escalation is rejected and admin routes are forbidden',async()=>{
    const escalation=await request(app).post('/api/auth/register').send({email:`escalate-${tag}@example.test`,name:'Customer',password,role:'ADMIN'});assert.equal(escalation.status,400);
    const r=await request(app).post('/api/auth/register').send({email:`customer-${tag}@example.test`,name:'Fictional Customer',password});assert.equal(r.status,201);session=r.body.data;C='Bearer '+session.accessToken;
    assert.equal((await request(app).get('/api/admin/users').set('Authorization',C)).status,403);
    assert.equal((await request(app).get('/api/transactions')).status,401);
  });
  await t.test('administrator registers and approves merchant; staff create shop with unique QR',async()=>{
    const r=await request(app).post('/api/admin/merchants').set('Authorization',A).send({name:'Integration Pula Market '+tag.slice(0,8),category:'Groceries',description:'Fictional QA merchant',staffEmail:merchant.email});assert.equal(r.status,201);
    const merchantId=r.body.data.id;
    assert.equal((await request(app).patch(`/api/admin/merchants/${merchantId}/approval`).set('Authorization',A).send({approved:true})).status,200);
    const shop=await request(app).post(`/api/merchants/${merchantId}/shops`).set('Authorization',M).send({name:'Integration Branch',address:'Fictional Gaborone Road'});assert.equal(shop.status,201);shopId=shop.body.data.id;qrToken=shop.body.data.qr.token;
    assert.equal((await request(app).get(`/api/manage/shops/${shopId}/qr`).set('Authorization',M)).status,200);
    assert.equal((await request(app).get(`/api/manage/shops/${shopId}/qr`).set('Authorization',O)).status,404);
    const resolved=await request(app).post('/api/qr/resolve').send({token:'pula://shop/'+qrToken});assert.equal(resolved.status,200);assert.equal(resolved.body.data.id,shopId);
    if(!await db.commissionRule.findFirst({where:{merchantId:null,active:true}}))await db.commissionRule.create({data:{rateBps:1000}});
  });
  const today=new Date().toISOString().slice(0,10);
  const svg=`<svg width="1000" height="650" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="650" fill="white"/><g font-family="Arial" font-size="40" fill="black"><text x="60" y="90">Integration Pula Market ${tag.slice(0,8)}</text><text x="60" y="170">Receipt No: QA-${tag.slice(0,8)}</text><text x="60" y="250">${today} 12:30</text><text x="60" y="330">Groceries</text><text x="60" y="410">TOTAL BWP 123.45</text><text x="60" y="490">Thank you for shopping</text></g></svg>`;
  const image=await sharp(Buffer.from(svg)).jpeg({quality:100}).toBuffer();
  await t.test('invalid upload rejected, image private, purchase idempotent and amount validated',async()=>{
    assert.equal((await request(app).post('/api/receipts').set('Authorization',C).attach('receipt',Buffer.from('bad'),{filename:'fake.jpg',contentType:'image/jpeg'})).status,400);
    const r=await request(app).post('/api/receipts').set('Authorization',C).attach('receipt',image,{filename:'qa.jpg',contentType:'image/jpeg'});assert.equal(r.status,201);receiptId=r.body.data.id;
    assert.equal((await request(app).get(`/api/receipts/${receiptId}/image`)).status,401);
    assert.equal((await request(app).get(`/api/receipts/${receiptId}/image`).set('Authorization',O)).status,404);
    const body={shopId,receiptId,amount:'123.45',idempotencyKey:tag};
    assert.equal((await request(app).post('/api/transactions').set('Authorization',C).send({...body,amount:'1.234'})).status,400);
    const transaction=await request(app).post('/api/transactions').set('Authorization',C).send(body);assert.equal(transaction.status,201);purchaseId=transaction.body.data.id;assert.equal(transaction.body.data.status,'SUBMITTED');
    const repeated=await request(app).post('/api/transactions').set('Authorization',C).send(body);assert.equal(repeated.status,200);assert.equal(repeated.body.data.id,purchaseId);
    assert.equal((await request(app).post('/api/transactions').set('Authorization',C).send({...body,amount:'123.46'})).status,409);
    assert.equal((await request(app).get(`/api/transactions/${purchaseId}`).set('Authorization',O)).status,404);
    assert.equal((await request(app).get(`/api/transactions/${purchaseId}`).set('Authorization',M)).status,200);
    assert.equal((await request(app).post(`/api/admin/transactions/${purchaseId}/review`).set('Authorization',C).send({status:'VERIFIED',reason:'Customer cannot self verify'})).status,403);
  });
  const ocr=new TesseractOcr();
  t.after(()=>ocr.close());
  await t.test('real Tesseract processes the receipt asynchronously and flags independent review',async()=>{
    for(let i=0;i<25;i++){const current=await db.transaction.findUniqueOrThrow({where:{id:purchaseId}});if(current.status==='NEEDS_REVIEW')break;await processOne(ocr);}
    const purchase=await db.transaction.findUniqueOrThrow({where:{id:purchaseId},include:{verification:true,flags:true}});
    assert.equal(purchase.status,'NEEDS_REVIEW');assert.equal(purchase.verification?.provider,'tesseract.js-6/eng');assert.equal(purchase.verification?.amount?.toFixed(2),'123.45');assert.ok(purchase.verification?.rawText.includes('Pula'));assert.ok(purchase.flags.some(f=>f.code==='INDEPENDENT_REVIEW_REQUIRED'));
  });
  await t.test('admin verifies once; sales and commissions provisional; review audit persists',async()=>{
    const review=await request(app).post(`/api/admin/transactions/${purchaseId}/review`).set('Authorization',A).send({status:'VERIFIED',reason:'Fictional test receipt reviewed independently.'});assert.equal(review.status,200);assert.equal(review.body.data.commission.amount,'12.35');assert.equal(review.body.data.commission.provisional,true);assert.equal(review.body.data.commission.settlementStatus,'POLICY_PENDING');
    assert.equal((await request(app).post(`/api/admin/transactions/${purchaseId}/review`).set('Authorization',A).send({status:'VERIFIED',reason:'Duplicate review must not create ledger'})).status,409);
    const report=await request(app).get('/api/reports').set('Authorization',M);assert.equal(report.status,200);assert.equal(report.body.data.verifiedSales,'123.45');assert.equal(report.body.data.provisionalCommission,'12.35');
    const otherReport=await request(app).get('/api/reports').set('Authorization',O);assert.equal(otherReport.body.data.verifiedCount,0);
    assert.ok(await db.auditLog.findFirst({where:{entityId:purchaseId,action:'TRANSACTION_VERIFIED'}}));
  });
  await t.test('reused image and receipt number are flagged',async()=>{
    const r=await request(app).post('/api/receipts').set('Authorization',C).attach('receipt',image,{filename:'reuse.jpg',contentType:'image/jpeg'});assert.equal(r.status,201);
    const transaction=await request(app).post('/api/transactions').set('Authorization',C).send({shopId,receiptId:r.body.data.id,amount:'123.45',idempotencyKey:randomUUID()});assert.equal(transaction.status,201);
    await processOne(ocr);
    const duplicate=await db.transaction.findUniqueOrThrow({where:{id:transaction.body.data.id},include:{flags:true}});assert.equal(duplicate.status,'NEEDS_REVIEW');for(const code of ['DUPLICATE_IMAGE','SIMILAR_IMAGE','REUSED_RECEIPT_NUMBER'])assert.ok(duplicate.flags.some(f=>f.code===code),code);
  });
  await ocr.close();
  await t.test('refresh token rotates and logout revokes replacement',async()=>{
    const r=await request(app).post('/api/auth/refresh').send({refreshToken:session.refreshToken});assert.equal(r.status,200);
    assert.equal((await request(app).post('/api/auth/refresh').send({refreshToken:session.refreshToken})).status,401);
    await request(app).post('/api/auth/logout').send({refreshToken:r.body.data.refreshToken});assert.equal((await request(app).post('/api/auth/refresh').send({refreshToken:r.body.data.refreshToken})).status,401);
  });
  await t.test('concurrent retries create one purchase and cancellation never creates commission',async()=>{
    const r=await request(app).post('/api/receipts').set('Authorization',C).attach('receipt',image,{filename:'concurrency.jpg',contentType:'image/jpeg'});assert.equal(r.status,201);
    const body={shopId,receiptId:r.body.data.id,amount:'123.45',idempotencyKey:randomUUID()};
    const responses=await Promise.all([1,2,3].map(()=>request(app).post('/api/transactions').set('Authorization',C).send(body)));
    for(const response of responses)assert.ok([200,201].includes(response.status),JSON.stringify(response.body));
    const uniqueIds=new Set(responses.map(r=>r.body.data.id));assert.equal(uniqueIds.size,1);
    const transactionId=responses[0].body.data.id;
    assert.equal((await request(app).post(`/api/transactions/${transactionId}/cancel`).set('Authorization',C)).status,200);
    assert.equal(await db.commissionLedger.count({where:{transactionId}}),0);
  });
  await t.test('recovery token is one-use, password hashing and disabled-account checks work',async()=>{
    const resetToken=randomBytes(48).toString('base64url');const newPassword=randomBytes(24).toString('base64url');
    await db.passwordReset.create({data:{userId:session.user.id,hash:hash(resetToken),expiresAt:new Date(Date.now()+60000)}});
    assert.equal((await request(app).post('/api/auth/reset-password').send({token:resetToken,password:newPassword})).status,200);
    assert.equal((await request(app).post('/api/auth/reset-password').send({token:resetToken,password:newPassword})).status,400);
    assert.equal((await request(app).post('/api/auth/login').send({email:session.user.email,password})).status,401);
    const loggedIn=await request(app).post('/api/auth/login').send({email:session.user.email,password:newPassword});assert.equal(loggedIn.status,200);
    assert.equal((await request(app).patch('/api/admin/users/'+session.user.id).set('Authorization',A).send({active:false})).status,200);
    assert.equal((await request(app).get('/api/me').set('Authorization','Bearer '+loggedIn.body.data.accessToken)).status,401);
    assert.equal((await request(app).post('/api/auth/refresh').send({refreshToken:loggedIn.body.data.refreshToken})).status,401);
  });
});

