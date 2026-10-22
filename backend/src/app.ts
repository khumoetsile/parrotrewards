import { providerRouter } from './providers.js';
import { categoryRouter,lockActiveCategory } from './categories.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import multer from 'multer';
import sharp from 'sharp';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { config } from './config.js';
import { sendEmail } from './email.js';
import { db } from './db.js';
import { authenticate, roles, tokens, accessToken, refreshValue } from './auth.js';
import { ApiError, hash, money, formatMoney } from './domain.js';
import { transactionInclude, transition, visibleWhere, findVisible } from './transactions.js';
import { offerImageRouter } from './offer-images.js';
import { offerRouter } from './offers.js';
import { promotionLanding } from './promotions.js';
const id=z.string().uuid();
const credentials=z.object({email:z.string().email().max(191).transform(s=>s.toLowerCase()),password:z.string().min(12).max(72).refine(s=>Buffer.byteLength(s,'utf8')<=72,'Password must fit within 72 UTF-8 bytes.')});
const publicUser={id:true,email:true,name:true,role:true,notificationEnabled:true};
const ok=(res:Response,data:unknown,status=200)=>res.status(status).json({data});
const page=(req:Request)=>{const take=z.coerce.number().int().min(1).max(100).default(20).parse(req.query.pageSize);return {skip:(z.coerce.number().int().min(1).default(1).parse(req.query.page)-1)*take,take};};
const searchText=(req:Request)=>z.string().trim().max(100).default('').parse(req.query.search);
const pageResult=(req:Request,res:Response,data:unknown[],total:number)=>{const {skip,take}=page(req);return res.json({data,meta:{total,page:Math.floor(skip/take)+1,pageSize:take,totalPages:Math.max(1,Math.ceil(total/take))}});};
const param=(req:Request,key='id')=>id.parse(req.params[key]);
async function audit(actorId:string,action:string,entityId:string,detail:Prisma.InputJsonValue={}) { await db.auditLog.create({data:{actorId,action,entityId,detail}}); }
async function authorizeMerchant(req:Request,merchantId:string) { if(req.user!.role==='ADMIN') return; if(!await db.merchantStaff.findUnique({where:{userId_merchantId:{userId:req.user!.id,merchantId}}})) throw new ApiError(404,'NOT_FOUND','Merchant not found.'); }
export function createApp() {
  const app=express(); app.disable('x-powered-by');
  if(config.TRUST_PROXY) app.set('trust proxy',config.TRUST_PROXY.split(',').map(value=>value.trim()));
  app.use(helmet(),cors({origin:(origin,done)=>done(null,!origin||config.origins.includes(origin))}),express.json({limit:'64kb'}));
  app.use(pinoHttp({enabled:process.env.RUN_DB_TESTS!=='1',redact:['req.headers.authorization','req.headers.cookie'],serializers:{req:(req)=>({id:req.id,method:req.method,url:req.url?.split('?')[0]}),res:(res)=>({statusCode:res.statusCode})}}));
  const limited=( _req:Request,res:Response)=>res.status(429).json({error:{code:'RATE_LIMITED',message:'Too many requests. Please try again later.'}});
  app.use(rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,handler:limited}));
  app.use(promotionLanding);
  app.use('/api',providerRouter);
  app.use('/api',categoryRouter);
  app.use('/api',offerImageRouter);
  app.use('/api',offerRouter);
  app.get('/health',(_req,res)=>ok(res,{service:'parrot-rewards-api',status:'up',revision:process.env.APP_REVISION || 'local'}));
  app.get('/ready',async(_req,res)=> { try { await db.$queryRaw`SELECT 1`; ok(res,{database:'ready'}); } catch { res.status(503).json({error:{code:'NOT_READY',message:'Database unavailable.'}}); } });
  const authLimit=rateLimit({windowMs:15*60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,handler:limited});
  app.post('/api/auth/register',authLimit,async(req,res)=> {
    const body=credentials.extend({name:z.string().trim().min(2).max(100)}).strict().parse(req.body);
    const user=await db.user.create({data:{email:body.email,name:body.name,passwordHash:await bcrypt.hash(body.password,12)},select:publicUser});
    ok(res,{user,...await tokens(user.id)},201);
  });
  app.post('/api/auth/login',authLimit,async(req,res)=> {
    const body=credentials.parse(req.body); const user=await db.user.findUnique({where:{email:body.email}});
    if(!user?.active||!await bcrypt.compare(body.password,user.passwordHash)) throw new ApiError(401,'INVALID_CREDENTIALS','Email or password is incorrect.');
    const {passwordHash:_,active:__,createdAt:___,updatedAt:____,...safe}=user;
    ok(res,{user:safe,...await tokens(user.id)});
  });
  app.post('/api/auth/refresh',authLimit,async(req,res)=> {
    const {refreshToken}=z.object({refreshToken:z.string().min(32).max(200)}).parse(req.body);
    const replacement=refreshValue();
    const userId=await db.$transaction(async tx=> {
      const record=await tx.refreshToken.findUnique({where:{hash:hash(refreshToken)},include:{user:true}});
      if(!record||record.revokedAt||record.expiresAt<new Date()||!record.user.active) throw new ApiError(401,'INVALID_REFRESH','Please sign in again.');
      const result=await tx.refreshToken.updateMany({where:{id:record.id,revokedAt:null},data:{revokedAt:new Date()}});
      if(!result.count) throw new ApiError(401,'INVALID_REFRESH','Token already used.');
      await tx.refreshToken.create({data:{hash:hash(replacement),userId:record.userId,expiresAt:new Date(Date.now()+7*86400000)}}); return record.userId;
    }); ok(res,{accessToken:accessToken(userId),refreshToken:replacement});
  });
  app.post('/api/auth/logout',async(req,res)=> { const {refreshToken}=z.object({refreshToken:z.string().max(200)}).parse(req.body); await db.refreshToken.updateMany({where:{hash:hash(refreshToken),revokedAt:null},data:{revokedAt:new Date()}}); ok(res,{loggedOut:true}); });
  app.post('/api/auth/forgot-password',authLimit,async(req,res)=> {
    const {email}=credentials.pick({email:true}).parse(req.body); const user=await db.user.findUnique({where:{email}});
    if(user?.active) {
      const token=refreshValue();
      const reset=await db.passwordReset.create({data:{userId:user.id,hash:hash(token),expiresAt:new Date(Date.now()+30*60000)}});
      try {
        await sendEmail(user.email,'Reset your Parrot Rewards password',`You requested a password reset for Parrot Rewards.\n\nEnter this recovery token in the app:\n${token}\n\nIt expires in 30 minutes and can only be used once. If you did not request this, ignore this email.`);
      } catch {
        await db.passwordReset.delete({where:{id:reset.id}});
        req.log.warn('Password recovery email could not be delivered.');
      }
    }
    ok(res,{message:'If an active account exists for this email, password recovery instructions will be sent.'});
  });
  app.post('/api/auth/reset-password',authLimit,async(req,res)=> {
    const body=z.object({token:z.string().min(32).max(200),password:credentials.shape.password}).parse(req.body);
    const passwordHash=await bcrypt.hash(body.password,12);
    await db.$transaction(async tx=> {
      const reset=await tx.passwordReset.findUnique({where:{hash:hash(body.token)}});
      if(!reset||reset.usedAt||reset.expiresAt<new Date()) throw new ApiError(400,'INVALID_RESET','Invalid or expired recovery token.');
      const changed=await tx.passwordReset.updateMany({where:{id:reset.id,usedAt:null},data:{usedAt:new Date()}});
      if(!changed.count) throw new ApiError(400,'INVALID_RESET','Recovery token already used.');
      await tx.user.update({where:{id:reset.userId},data:{passwordHash}}); await tx.refreshToken.updateMany({where:{userId:reset.userId,revokedAt:null},data:{revokedAt:new Date()}});
    }); ok(res,{reset:true});
  });
  app.get('/api/shop-categories',async(_req,res)=>{const categories=await db.merchant.findMany({where:{approved:true,shops:{some:{active:true}}},select:{category:true},distinct:['category'],orderBy:{category:'asc'}});ok(res,categories.map(c=>c.category));});
  app.get('/api/shops',async(req,res)=> {
    const search=z.string().max(100).optional().parse(req.query.search); const category=z.string().max(60).optional().parse(req.query.category);
    ok(res,await db.shop.findMany({where:{active:true,merchant:{approved:true,...(category?{category}:{})},...(search?{OR:[{name:{contains:search}},{merchant:{name:{contains:search}}}]}:{})},include:{merchant:true,offers:{where:{active:true,OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}}},...page(req),orderBy:{name:'asc'}}));
  });
  app.get('/api/shops/:id',async(req,res)=> { const shop=await db.shop.findFirst({where:{id:param(req),active:true,merchant:{approved:true}},include:{merchant:true,offers:{where:{active:true,OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}}}}); if(!shop) throw new ApiError(404,'NOT_FOUND','Shop unavailable.'); ok(res,shop); });
  app.post('/api/qr/resolve',async(req,res)=> { const {token}=z.object({token:z.string().min(16).max(191).transform(s=>s.replace(/^pula:\/\/shop\//,''))}).parse(req.body); const qr=await db.shopQr.findFirst({where:{token,active:true,shop:{active:true,merchant:{approved:true}}},include:{shop:{include:{merchant:true,offers:true}}}}); if(!qr) throw new ApiError(404,'INVALID_QR','This shop QR code is unavailable.'); ok(res,qr.shop); });
  app.use('/api',authenticate);
  app.get('/api/me',async(req,res)=>ok(res,await db.user.findUniqueOrThrow({where:{id:req.user!.id},select:publicUser})));
  app.patch('/api/me',async(req,res)=> { const data=z.object({name:z.string().trim().min(2).max(100).optional(),notificationEnabled:z.boolean().optional()}).strict().parse(req.body); ok(res,await db.user.update({where:{id:req.user!.id},data,select:publicUser})); });
  app.get('/api/notifications',async(req,res)=>ok(res,await db.notification.findMany({where:{userId:req.user!.id},...page(req),orderBy:{createdAt:'desc'}})));
  app.patch('/api/notifications/read-all',async(req,res)=> { const result=await db.notification.updateMany({where:{userId:req.user!.id,readAt:null},data:{readAt:new Date()}}); ok(res,{updated:result.count}); });
  app.patch('/api/notifications/:id/read',async(req,res)=> { await db.notification.updateMany({where:{id:param(req),userId:req.user!.id},data:{readAt:new Date()}}); ok(res,{read:true}); });
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1,fields:0},fileFilter:(_req,file,cb)=>{if(['image/jpeg','image/png','image/webp'].includes(file.mimetype)) cb(null,true); else cb(new ApiError(400,'INVALID_IMAGE','Use a JPEG, PNG or WebP receipt.'));}});
  app.post('/api/receipts',roles('CUSTOMER'),upload.single('receipt'),async(req,res)=> {
    if(!req.file) throw new ApiError(400,'IMAGE_REQUIRED','Select a receipt image.');
    let image:Buffer; let perceptualHash:string;
    try {
      const processor=sharp(req.file.buffer,{limitInputPixels:20000000}); const metadata=await processor.metadata();
      if(!['jpeg','png','webp'].includes(metadata.format??'')||metadata.pages&&metadata.pages>1) throw new Error();
      image=await processor.rotate().resize({width:2000,height:3000,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
      const pixels=await sharp(image).resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer(); let bits=''; for(let y=0;y<8;y++) for(let x=0;x<8;x++) bits+=pixels[y*9+x]>pixels[y*9+x+1]?'1':'0'; perceptualHash=bits;
    } catch { throw new ApiError(400,'INVALID_IMAGE','Receipt image cannot be decoded or is too large.'); }
    const storageKey=randomUUID()+'.jpg'; await mkdir(config.uploadDir,{recursive:true}); await writeFile(path.join(config.uploadDir,storageKey),image,{flag:'wx'});
    const receipt=await db.receipt.create({data:{userId:req.user!.id,storageKey,sha256:hash(req.file.buffer),perceptualHash,mime:'image/jpeg',size:image.length}});
    ok(res,{id:receipt.id},201);
  });
  app.get('/api/receipts/:id/image',async(req,res)=> {
    const receipt=await db.receipt.findUnique({where:{id:param(req)},include:{transaction:true}});
    if(!receipt||!(receipt.userId===req.user!.id||req.user!.role==='ADMIN'||(receipt.transaction&&await db.transaction.findFirst({where:{id:receipt.transaction.id,...visibleWhere(req.user!)}})))) throw new ApiError(404,'NOT_FOUND','Receipt not found.');
    res.set({'Cache-Control':'no-store','Content-Type':'image/jpeg','Content-Disposition':'inline; filename="receipt.jpg"'}); res.sendFile(path.join(config.uploadDir,receipt.storageKey));
  });
  app.post('/api/transactions',roles('CUSTOMER'),async(req,res)=> {
    const body=z.object({shopId:id,receiptId:id,amount:z.string(),idempotencyKey:z.string().min(16).max(191)}).strict().parse(req.body);
    const cents=money(body.amount); if(cents<=0n) throw new ApiError(400,'INVALID_AMOUNT','Purchase amount must be greater than zero.');
    const amount=formatMoney(cents); const requestHash=hash(JSON.stringify({shopId:body.shopId,receiptId:body.receiptId,amount}));
    const existing=await db.transaction.findUnique({where:{userId_idempotencyKey:{userId:req.user!.id,idempotencyKey:body.idempotencyKey}}});
    if(existing) { if(existing.requestHash!==requestHash) throw new ApiError(409,'IDEMPOTENCY_CONFLICT','This submission key was used for a different purchase.'); return ok(res,existing); }
    let result;
    try { result=await db.$transaction(async tx=> {
      const receipt=await tx.receipt.findFirst({where:{id:body.receiptId,userId:req.user!.id,transaction:null}}); if(!receipt) throw new ApiError(409,'RECEIPT_UNAVAILABLE','Receipt is unavailable or already submitted.');
      const shop=await tx.shop.findFirst({where:{id:body.shopId,active:true,merchant:{approved:true}}}); if(!shop) throw new ApiError(400,'SHOP_UNAVAILABLE','Shop unavailable.');
      return tx.transaction.create({data:{userId:req.user!.id,shopId:body.shopId,receiptId:body.receiptId,amount,idempotencyKey:body.idempotencyKey,requestHash,history:{create:{status:'SUBMITTED',reason:'Purchase recorded; verification pending.',actorId:req.user!.id}},job:{create:{}}}});
    }); } catch(error) {
      // Concurrent retries may race on the unique receipt or idempotency constraint.
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'||error instanceof ApiError&&error.code==='RECEIPT_UNAVAILABLE') {
        const winner=await db.transaction.findUnique({where:{userId_idempotencyKey:{userId:req.user!.id,idempotencyKey:body.idempotencyKey}}});
        if(winner&&winner.requestHash===requestHash) return ok(res,winner);
      }
      throw error;
    } ok(res,result,201);
  });
  app.get('/api/transactions',async(req,res)=> {
    const status=z.enum(['SUBMITTED','PROCESSING','VERIFIED','NEEDS_REVIEW','REJECTED','CANCELLED']).optional().parse(req.query.status);
    const term=searchText(req);const where:Prisma.TransactionWhereInput={...visibleWhere(req.user!),...(status?{status}:{}),...(term?{OR:[{shop:{name:{contains:term}}},{shop:{address:{contains:term}}},{id:{contains:term}}]}:{})};const [total,items]=await db.$transaction([db.transaction.count({where}),db.transaction.findMany({where,include:transactionInclude,...page(req),orderBy:[{createdAt:'desc'},{id:'desc'}]})]);pageResult(req,res,items,total);
  });
  app.get('/api/transactions/:id',async(req,res)=>ok(res,await findVisible(param(req),req.user!)));
  app.post('/api/transactions/:id/cancel',roles('CUSTOMER'),async(req,res)=> { await findVisible(param(req),req.user!); await db.$transaction(tx=>transition(tx,param(req),'CANCELLED',req.user!.id,'Cancelled by customer before processing.')); ok(res,{cancelled:true}); });
  app.post('/api/transactions/:id/disputes',async(req,res)=> { const purchase=await findVisible(param(req),req.user!); const {reason}=z.object({reason:z.string().trim().min(10).max(2000)}).parse(req.body); const result=await db.dispute.create({data:{transactionId:purchase.id,userId:req.user!.id,reason}}); await audit(req.user!.id,'DISPUTE_OPENED',purchase.id,{disputeId:result.id}); ok(res,result,201); });
  app.get('/api/merchant/profile',roles('MERCHANT','ADMIN'),async(req,res)=>ok(res,await db.merchant.findMany({where:req.user!.role==='ADMIN'?{}:{staff:{some:{userId:req.user!.id}}},include:{shops:{include:{qr:true,offers:true}}}})));
  app.patch('/api/merchants/:id',roles('MERCHANT','ADMIN'),async(req,res)=> { await authorizeMerchant(req,param(req)); const data=z.object({description:z.string().max(3000),category:z.string().min(2).max(60)}).partial().strict().parse(req.body); const result=await db.merchant.update({where:{id:param(req)},data}); await audit(req.user!.id,'MERCHANT_UPDATED',result.id,data); ok(res,result); });
  app.post('/api/merchants/:id/shops',roles('MERCHANT','ADMIN'),async(req,res)=> { await authorizeMerchant(req,param(req)); const body=z.object({name:z.string().min(2).max(100),address:z.string().min(3).max(300)}).parse(req.body); const shop=await db.shop.create({data:{...body,merchantId:param(req),qr:{create:{token:randomBytes(32).toString('base64url')}}},include:{qr:true}}); await audit(req.user!.id,'SHOP_CREATED',shop.id); ok(res,shop,201); });
  app.patch('/api/manage/shops/:id',roles('MERCHANT','ADMIN'),async(req,res)=> { const shop=await db.shop.findUniqueOrThrow({where:{id:param(req)}}); await authorizeMerchant(req,shop.merchantId); const data=z.object({name:z.string().min(2).max(100).optional(),address:z.string().min(3).max(300).optional(),active:z.boolean().optional()}).strict().parse(req.body); ok(res,await db.shop.update({where:{id:shop.id},data})); await audit(req.user!.id,'SHOP_UPDATED',shop.id,data); });
  app.get('/api/manage/shops/:id/qr',roles('MERCHANT','ADMIN'),async(req,res)=> { const shop=await db.shop.findUniqueOrThrow({where:{id:param(req)},include:{qr:true}}); await authorizeMerchant(req,shop.merchantId); if(!shop.qr?.active) throw new ApiError(404,'QR_UNAVAILABLE','QR code unavailable.'); const svg=await QRCode.toString(`pula://shop/${shop.qr.token}`,{type:'svg',margin:4}); res.type('image/svg+xml').set('Content-Disposition','attachment; filename="shop-qr.svg"').send(svg); });
  app.post('/api/manage/shops/:id/qr/rotate',roles('ADMIN'),async(req,res)=> { const result=await db.shopQr.update({where:{shopId:param(req)},data:{token:randomBytes(32).toString('base64url'),active:true}}); await audit(req.user!.id,'QR_ROTATED',param(req)); ok(res,result); });
  app.post('/api/manage/shops/:id/offers',roles('MERCHANT','ADMIN'),async(req,res)=> { const shop=await db.shop.findUniqueOrThrow({where:{id:param(req)}}); await authorizeMerchant(req,shop.merchantId); const data=z.object({title:z.string().min(3).max(100),description:z.string().min(3).max(2000),expiresAt:z.coerce.date().optional()}).parse(req.body); ok(res,await db.offer.create({data:{...data,shopId:shop.id}}),201); });
  app.get('/api/reports',roles('MERCHANT','ADMIN'),async(req,res)=> {
    const where={...visibleWhere(req.user!),status:'VERIFIED' as const};
    const verified=await db.transaction.aggregate({where,_sum:{amount:true},_count:true}); const ledger=await db.commissionLedger.aggregate({where:{transaction:where},_sum:{amount:true}});
    const statuses=await db.transaction.groupBy({by:['status'],where:visibleWhere(req.user!),_count:true});
    ok(res,{verifiedSales:verified._sum.amount??'0.00',verifiedCount:verified._count,provisionalCommission:ledger._sum.amount??'0.00',settlementStatus:'POLICY_PENDING',statuses});
  });
  app.use('/api/admin',roles('ADMIN'));
  app.get('/api/admin/users',async(req,res)=>{const term=searchText(req);const where:Prisma.UserWhereInput=term?{OR:[{name:{contains:term}},{email:{contains:term}}]}:{};const [total,items]=await db.$transaction([db.user.count({where}),db.user.findMany({select:{...publicUser,active:true},where,...page(req),orderBy:[{createdAt:'desc'},{id:'desc'}]})]);pageResult(req,res,items,total);});
  app.patch('/api/admin/users/:id',async(req,res)=> { const data=z.object({active:z.boolean()}).strict().parse(req.body); if(param(req)===req.user!.id) throw new ApiError(409,'SELF_CHANGE','Cannot deactivate your current administrator account.'); ok(res,await db.user.update({where:{id:param(req)},data,select:{...publicUser,active:true}})); await audit(req.user!.id,'USER_ACTIVE_CHANGED',param(req),data); });
  app.get('/api/admin/merchants',async(req,res)=>{const term=searchText(req);const where:Prisma.MerchantWhereInput=term?{OR:[{name:{contains:term}},{category:{contains:term}},{description:{contains:term}},{shops:{some:{OR:[{name:{contains:term}},{address:{contains:term}}]}}}]}:{};const [total,items]=await db.$transaction([db.merchant.count({where}),db.merchant.findMany({include:{shops:true},where,...page(req),orderBy:[{createdAt:'desc'},{id:'desc'}]})]);pageResult(req,res,items,total);});
  app.post('/api/admin/merchants',async(req,res)=>{
 const body=z.object({name:z.string().trim().min(2).max(100),category:z.string().trim().min(2).max(100),categoryId:id.optional(),description:z.string().trim().max(3000),approved:z.boolean().default(false),staffEmail:z.string().email().optional()}).strict().parse(req.body);
 const {staffEmail,...data}=body;const user=staffEmail?await db.user.findUnique({where:{email:staffEmail.toLowerCase()}}):null;if(staffEmail&&user?.role!=='MERCHANT')throw new ApiError(400,'INVALID_STAFF','Choose an existing merchant user.');
 const result=await db.$transaction(async tx=>{
  if(data.categoryId){await lockActiveCategory(tx,data.categoryId);data.category=(await tx.merchantCategory.findUniqueOrThrow({where:{id:data.categoryId}})).name;}
  if(await tx.merchant.findFirst({where:{name:data.name}}))throw new ApiError(409,'PROVIDER_EXISTS','A provider with this name already exists. Select it from the provider list.');
  const merchant=await tx.merchant.create({data:{...data,...(user?{staff:{create:{userId:user.id}}}:{})}});
  await tx.auditLog.create({data:{actorId:req.user!.id,action:'MERCHANT_CREATED',entityId:merchant.id,detail:{name:merchant.name,approved:merchant.approved}}});return merchant;
 });ok(res,result,201);
 });
  app.post('/api/admin/merchant-users',async(req,res)=> { const body=credentials.extend({name:z.string().min(2).max(100)}).parse(req.body); const result=await db.user.create({data:{email:body.email,name:body.name,passwordHash:await bcrypt.hash(body.password,12),role:'MERCHANT'},select:publicUser}); await audit(req.user!.id,'MERCHANT_USER_CREATED',result.id); ok(res,result,201); });
  app.patch('/api/admin/merchants/:id/approval',async(req,res)=> { const {approved}=z.object({approved:z.boolean()}).strict().parse(req.body); const merchant=await db.merchant.update({where:{id:param(req)},data:{approved}}); await audit(req.user!.id,'MERCHANT_APPROVAL',merchant.id,{approved}); ok(res,merchant); });
  app.post('/api/admin/transactions/:id/review',async(req,res)=> { const {status,reason}=z.object({status:z.enum(['VERIFIED','REJECTED']),reason:z.string().trim().min(10).max(1000)}).strict().parse(req.body); await db.$transaction(tx=>transition(tx,param(req),status,req.user!.id,reason)); ok(res,await findVisible(param(req),req.user!)); });
  app.get('/api/admin/disputes',async(req,res)=>{const term=searchText(req);const where:Prisma.DisputeWhereInput=term?{OR:[{reason:{contains:term}},{resolution:{contains:term}},{transaction:{shop:{name:{contains:term}}}}]}:{};const [total,items]=await db.$transaction([db.dispute.count({where}),db.dispute.findMany({include:{transaction:{include:{shop:true}}},where,...page(req),orderBy:[{createdAt:'desc'},{id:'desc'}]})]);pageResult(req,res,items,total);});
  app.patch('/api/admin/disputes/:id',async(req,res)=> { const data=z.object({resolution:z.string().min(10).max(2000)}).parse(req.body); ok(res,await db.dispute.update({where:{id:param(req)},data:{...data,status:'RESOLVED'}})); await audit(req.user!.id,'DISPUTE_RESOLVED',param(req),data); });
  app.get('/api/admin/audit',async(req,res)=>{const term=searchText(req);const where:Prisma.AuditLogWhereInput=term?{OR:[{action:{contains:term}},{entityId:{contains:term}}]}:{};const [total,items]=await db.$transaction([db.auditLog.count({where}),db.auditLog.findMany({where,...page(req),orderBy:[{createdAt:'desc'},{id:'desc'}]})]);pageResult(req,res,items,total);});
  app.get('/api/admin/rules',async(_req,res)=>ok(res,{commissions:await db.commissionRule.findMany({orderBy:{createdAt:'desc'}}),discounts:await db.discountRule.findMany(),settings:await db.systemSetting.findMany()}));
  app.post('/api/admin/rules/commission',async(req,res)=> { const body=z.object({rateBps:z.number().int().min(0).max(10000),merchantId:id.nullable().default(null)}).strict().parse(req.body); const rule=await db.$transaction(async tx=> { await tx.commissionRule.updateMany({where:{merchantId:body.merchantId,active:true},data:{active:false}}); return tx.commissionRule.create({data:body}); }); await audit(req.user!.id,'COMMISSION_RULE_CREATED',rule.id,body); ok(res,rule,201); });
  app.patch('/api/admin/settings',async(req,res)=> { const {maxReceiptAgeDays}=z.object({maxReceiptAgeDays:z.number().int().min(1).max(365)}).strict().parse(req.body); ok(res,await db.systemSetting.upsert({where:{key:'maxReceiptAgeDays'},create:{key:'maxReceiptAgeDays',value:maxReceiptAgeDays},update:{value:maxReceiptAgeDays}})); await audit(req.user!.id,'SETTINGS_CHANGED','maxReceiptAgeDays',{maxReceiptAgeDays}); });
  app.use((_req,_res,next)=>next(new ApiError(404,'NOT_FOUND','Endpoint not found.')));
  app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=> {
    if(error instanceof z.ZodError) return res.status(400).json({error:{code:'VALIDATION',message:'Check the submitted fields.',details:error.flatten()}});
    if(error instanceof ApiError) return res.status(error.status).json({error:{code:error.code,message:error.message}});
    if(error instanceof multer.MulterError) return res.status(400).json({error:{code:'UPLOAD_REJECTED',message:'Upload one receipt image, at most 8 MB.'}});
    if(error instanceof Prisma.PrismaClientKnownRequestError) { if(error.code==='P2002') return res.status(409).json({error:{code:'CONFLICT',message:'This record already exists. Reload and retry.'}}); if(error.code==='P2025') return res.status(404).json({error:{code:'NOT_FOUND',message:'Record not found.'}}); }
    console.error(error instanceof Error?error.name:'Unexpected error');
    res.status(500).json({error:{code:'INTERNAL_ERROR',message:'The service could not complete this request.'}});
  }); return app;
}


