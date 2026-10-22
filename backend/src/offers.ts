import { lockActiveCategory } from './categories.js';
import { imageKeyPattern, assertOfferImage } from './offer-images.js';
import { Router } from 'express';
import { Prisma, Offer, ClaimStatus } from '@prisma/client';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { db } from './db.js';
import { authenticate,roles } from './auth.js';
import { ApiError,hash,money,formatMoney } from './domain.js';
const uuid=z.string().uuid();
const slug=z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/);
const pagination=(value:unknown)=>({skip:(z.coerce.number().int().min(1).default(1).parse(value)-1)*20,take:20});
export const offerInclude={category:true,merchant:{select:{id:true,name:true,approved:true}},event:true,product:true};
export function published(now=new Date()):Prisma.OfferWhereInput {return {status:'PUBLISHED',active:true,discountedPrice:{not:null},categoryId:{not:null},merchant:{approved:true},AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{expiresAt:null},{expiresAt:{gt:now}}]}]};}
export function offerView(offer:Offer & Record<string,unknown>) {
 const original=offer.originalPrice?.toFixed(2);const price=offer.discountedPrice?.toFixed(2);const saving=original&&price?money(original)-money(price):undefined;
 return {...offer,savings:saving!==undefined?formatMoney(saving):null,discountPercent:saving!==undefined&&original&&money(original)>0n?Number((saving*100n)/money(original)):null,claimAction:offer.discountType==='TICKET'?'Claim Ticket Discount':'Claim Discount',notice:offer.isDemo?'Sample offer — provider participation and availability are not confirmed.':'Redeem with the provider under these terms. A claim is not proof of payment.',redemptionInstructions:'Present the claim reference to the provider for validation. This is not proof of payment or an admission ticket.'};
}
async function campaignContext(tx:Prisma.TransactionClient, campaignSlug?:string,referralCode?:string,offerId?:string) {
 if(!campaignSlug){if(referralCode)throw new ApiError(400,'INVALID_ATTRIBUTION','A referral needs a valid campaign.');return undefined;}
 const now=new Date();const campaign=await tx.promotionalCampaign.findFirst({where:{slug:campaignSlug,active:true,AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{expiresAt:null},{expiresAt:{gt:now}}]}]}});
 if(!campaign||(offerId&&campaign.offerId&&campaign.offerId!==offerId))throw new ApiError(400,'INVALID_CAMPAIGN','Campaign unavailable or unrelated to this offer.');
 const referral=referralCode?await tx.referralLink.findFirst({where:{code:referralCode,campaignId:campaign.id,active:true}}):null;
 if(referralCode&&!referral)throw new ApiError(400,'INVALID_REFERRAL','Referral link unavailable.');
 return {campaign,referral};
}
export async function expireClaims(where:Prisma.OfferClaimWhereInput) {await db.offerClaim.updateMany({where:{...where,status:'CLAIMED',expiresAt:{lte:new Date()}},data:{status:'EXPIRED'}});}
const claimInclude={offer:{include:offerInclude},campaign:{select:{slug:true,name:true}},redemption:{select:{createdAt:true,note:true}}};
function claimScope(user:{id:string;role:string}):Prisma.OfferClaimWhereInput {return user.role==='ADMIN'?{}:user.role==='MERCHANT'?{offer:{merchant:{staff:{some:{userId:user.id}}}}}:{userId:user.id};}
export const offerRouter=Router();
offerRouter.get('/categories',async(_req,res)=>res.json({data:await db.merchantCategory.findMany({where:{archivedAt:null,offers:{some:published()}},orderBy:[{sortOrder:'asc'},{name:'asc'}]})}));
offerRouter.get('/offers',async(req,res)=> {
 const search=z.string().max(100).optional().parse(req.query.search);const category=z.string().max(100).optional().parse(req.query.category);
 const items=await db.offer.findMany({where:{...published(),...(search?{OR:[{title:{contains:search}},{description:{contains:search}}]}:{}),...(category?{category:{slug:category}}:{})},include:offerInclude,...pagination(req.query.page),orderBy:{createdAt:'asc'}});
 res.json({data:items.map(offerView)});
});
offerRouter.get('/offers/:slug',async(req,res)=>{const item=await db.offer.findFirst({where:{slug:slug.parse(req.params.slug),...published()},include:offerInclude});if(!item)throw new ApiError(404,'OFFER_UNAVAILABLE','This offer is not currently available.');res.json({data:offerView(item)});});
offerRouter.get('/campaigns/:slug',async(req,res)=>{const context=await db.$transaction(tx=>campaignContext(tx,slug.parse(req.params.slug),z.string().max(100).optional().parse(req.query.ref)));if(!context)throw new ApiError(404,'NOT_FOUND','Campaign unavailable.');const offer=context.campaign.offerId?await db.offer.findFirst({where:{id:context.campaign.offerId,...published()},include:offerInclude}):null;if(context.campaign.offerId&&!offer)throw new ApiError(404,'OFFER_UNAVAILABLE','Campaign offer unavailable.');res.json({data:{slug:context.campaign.slug,name:context.campaign.name,offer:offer?offerView(offer):null,referralCode:context.referral?.code??null}});});
const attribution=z.object({campaignSlug:slug,referralCode:z.string().max(100).optional()});
offerRouter.post('/attribution',authenticate,roles('CUSTOMER'),async(req,res)=>{const body=attribution.parse(req.body);const touch=await db.$transaction(async tx=>{const context=(await campaignContext(tx,body.campaignSlug,body.referralCode))!;return tx.campaignTouch.upsert({where:{userId_campaignId_referralCode:{userId:req.user!.id,campaignId:context.campaign.id,referralCode:context.referral?.code??''}},create:{userId:req.user!.id,campaignId:context.campaign.id,referralCode:context.referral?.code??''},update:{}});});res.status(201).json({data:touch});});
offerRouter.post('/claims',authenticate,roles('CUSTOMER'),async(req,res)=>{
 const body=z.object({offerId:uuid,idempotencyKey:z.string().min(16).max(191),campaignSlug:slug.optional(),referralCode:z.string().max(100).optional()}).strict().parse(req.body);
 const requestHash=hash(JSON.stringify({offerId:body.offerId,campaignSlug:body.campaignSlug??null,referralCode:body.referralCode??null}));
 const existing=await db.offerClaim.findUnique({where:{userId_idempotencyKey:{userId:req.user!.id,idempotencyKey:body.idempotencyKey}}});
 if(existing){if(existing.requestHash!==requestHash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','This key belongs to another claim.');return res.json({data:existing});}
 const claim=await db.$transaction(async tx=>{
  // Serialize eligibility and limits per offer; no ticket inventory or payment is inferred.
  await tx.$queryRaw`SELECT id FROM Offer WHERE id=${body.offerId} FOR UPDATE`;
  const prior=await tx.offerClaim.findUnique({where:{userId_idempotencyKey:{userId:req.user!.id,idempotencyKey:body.idempotencyKey}}});
  if(prior){if(prior.requestHash!==requestHash)throw new ApiError(409,'IDEMPOTENCY_CONFLICT','This key belongs to another claim.');return prior;}
  const offer=await tx.offer.findFirst({where:{id:body.offerId,...published()}});
  if(!offer?.discountedPrice||!offer.terms)throw new ApiError(409,'OFFER_UNAVAILABLE','Offer is unpublished, expired or missing its terms.');
  if(await tx.offerClaim.count({where:{offerId:offer.id,userId:req.user!.id}})>=offer.perUserClaimLimit)throw new ApiError(409,'CLAIM_LIMIT','You have already reached this offer’s claim limit. Check My Claims.');
  if(offer.totalClaimLimit!==null&&offer.claimedCount>=offer.totalClaimLimit)throw new ApiError(409,'CLAIM_LIMIT','This offer’s claim limit has been reached.');
  const context=await campaignContext(tx,body.campaignSlug,body.referralCode,offer.id);
  const ttl=offer.claimTtlHours?new Date(Date.now()+offer.claimTtlHours*3600000):null;
  const expiresAt=ttl&&offer.expiresAt?new Date(Math.min(ttl.getTime(),offer.expiresAt.getTime())):ttl??offer.expiresAt;
  await tx.offer.update({where:{id:offer.id},data:{claimedCount:{increment:1}}});
  const result=await tx.offerClaim.create({data:{userId:req.user!.id,offerId:offer.id,reference:'PR-'+randomBytes(16).toString('hex').toUpperCase(),titleSnapshot:offer.title,termsSnapshot:offer.terms,discountedPrice:offer.discountedPrice,originalPrice:offer.originalPrice,isDemo:offer.isDemo,idempotencyKey:body.idempotencyKey,requestHash,expiresAt,campaignId:context?.campaign.id,referralLinkId:context?.referral?.id}});
  await tx.auditLog.create({data:{actorId:req.user!.id,action:'OFFER_CLAIMED',entityId:result.id,detail:{offerId:offer.id,isDemo:offer.isDemo}}});
  return result;
 },{maxWait:10000,timeout:15000});
 res.status(201).json({data:claim});
});
offerRouter.get('/claims',authenticate,async(req,res)=>{
 const q=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20),search:z.string().max(100).default(''),status:z.enum(['CLAIMED','REDEEMED','EXPIRED','CANCELLED']).optional()}).parse(req.query);
 const scope=claimScope(req.user!);await expireClaims(scope);
 const where:Prisma.OfferClaimWhereInput={...scope,...(q.status?{status:q.status}:{}),...(q.search?{OR:[{reference:{contains:q.search}},{titleSnapshot:{contains:q.search}}]}:{})};
 const [total,items]=await db.$transaction([db.offerClaim.count({where}),db.offerClaim.findMany({where,include:claimInclude,skip:(q.page-1)*q.pageSize,take:q.pageSize,orderBy:[{createdAt:'desc'},{id:'desc'}]})]);
 res.json({data:items,meta:{total,page:q.page,pageSize:q.pageSize,totalPages:Math.max(1,Math.ceil(total/q.pageSize))}});
});
offerRouter.get('/claims/:id',authenticate,async(req,res)=>{const where={id:uuid.parse(req.params.id),...claimScope(req.user!)};await expireClaims(where);const item=await db.offerClaim.findFirst({where,include:claimInclude});if(!item)throw new ApiError(404,'NOT_FOUND','Claim not found.');res.json({data:item});});
offerRouter.post('/claims/:id/cancel',authenticate,roles('CUSTOMER'),async(req,res)=>{const where={id:uuid.parse(req.params.id),userId:req.user!.id};await expireClaims(where);await db.$transaction(async tx=>{const result=await tx.offerClaim.updateMany({where:{...where,status:'CLAIMED'},data:{status:'CANCELLED'}});if(!result.count)throw new ApiError(409,'CLAIM_STATE','This claim cannot be cancelled.');await tx.auditLog.create({data:{actorId:req.user!.id,action:'CLAIM_CANCELLED',entityId:where.id,detail:{}}});});res.json({data:{cancelled:true}});});
offerRouter.post('/redemptions/lookup',authenticate,roles('ADMIN','MERCHANT'),async(req,res)=>{const {reference}=z.object({reference:z.string().regex(/^PR-[A-F0-9]{32}$/)}).parse(req.body);const where={reference,...claimScope(req.user!)};await expireClaims(where);const claim=await db.offerClaim.findFirst({where,include:claimInclude});if(!claim)throw new ApiError(404,'NOT_FOUND','Claim unavailable for your provider.');res.json({data:claim});});
offerRouter.post('/redemptions',authenticate,roles('ADMIN','MERCHANT'),async(req,res)=>{
 const {reference,note}=z.object({reference:z.string().regex(/^PR-[A-F0-9]{32}$/),note:z.string().trim().min(5).max(500)}).strict().parse(req.body);
 const scope=claimScope(req.user!);await expireClaims({reference,...scope});
 const claim=await db.$transaction(async tx=>{const current=await tx.offerClaim.findFirst({where:{reference,...scope}});if(!current)throw new ApiError(404,'NOT_FOUND','Claim unavailable for your provider.');
  const changed=await tx.offerClaim.updateMany({where:{id:current.id,status:'CLAIMED',OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},data:{status:'REDEEMED'}});if(!changed.count)throw new ApiError(409,'CLAIM_STATE','Claim already used, expired or cancelled.');
  await tx.redemptionRecord.create({data:{claimId:current.id,verifiedById:req.user!.id,note}});
  await tx.auditLog.create({data:{actorId:req.user!.id,action:'CLAIM_REDEEMED',entityId:current.id,detail:{isDemo:current.isDemo,note}}});
  return tx.offerClaim.findUniqueOrThrow({where:{id:current.id},include:claimInclude});
 });res.json({data:claim});
});
const price=z.string().refine(s=>{try{return money(s)>0n;}catch{return false;}},'Use a positive BWP price with at most two decimals.');
export const offerInput=z.object({title:z.string().trim().min(3).max(120),slug,description:z.string().min(10).max(3000),categoryId:uuid,merchantId:uuid,discountedPrice:price,originalPrice:price.nullable().default(null),discountType:z.enum(['TICKET','PRICE','PERCENT']).default('PRICE'),terms:z.string().trim().min(20).max(4000),status:z.enum(['DRAFT','PUBLISHED','PAUSED','ARCHIVED']),isDemo:z.boolean().default(true),imageKey:z.string().refine(v=>['music','hardware','auto','placeholder'].includes(v)||imageKeyPattern.test(v),'Choose valid offer artwork.').default('placeholder'),startsAt:z.coerce.date().nullable().default(null),expiresAt:z.coerce.date().nullable().default(null),perUserClaimLimit:z.number().int().min(1).max(100).default(1),totalClaimLimit:z.number().int().min(1).nullable().default(null),claimTtlHours:z.number().int().min(1).max(8760).nullable().default(null)}).strict().superRefine((v,ctx)=>{if(v.originalPrice&&price.safeParse(v.originalPrice).success&&price.safeParse(v.discountedPrice).success&&money(v.originalPrice)<money(v.discountedPrice))ctx.addIssue({code:'custom',message:'Discounted price must not exceed original price.'});if(v.startsAt&&v.expiresAt&&v.startsAt>=v.expiresAt)ctx.addIssue({code:'custom',message:'Expiry must follow start.'});});
offerRouter.get('/admin/offers',authenticate,roles('ADMIN'),async(req,res)=>{
 const query=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20),search:z.string().max(100).default(''),status:z.enum(['DRAFT','PUBLISHED','PAUSED','ARCHIVED']).optional(),category:uuid.optional(),provider:uuid.optional(),sort:z.enum(['newest','oldest','title','price-low','price-high']).default('newest')}).parse(req.query);
 const where:Prisma.OfferWhereInput={slug:{not:null},...(query.search?{OR:[{title:{contains:query.search}},{slug:{contains:query.search}}]}:{}),...(query.status?{status:query.status}:{}),...(query.category?{categoryId:query.category}:{}),...(query.provider?{merchantId:query.provider}:{})};
 const [total,items]=await db.$transaction([db.offer.count({where}),db.offer.findMany({where,include:offerInclude,skip:(query.page-1)*query.pageSize,take:query.pageSize,orderBy:query.sort==='title'?[{title:'asc'},{id:'asc'}]:query.sort==='price-low'?[{discountedPrice:'asc'},{id:'asc'}]:query.sort==='price-high'?[{discountedPrice:'desc'},{id:'desc'}]:[{createdAt:query.sort==='oldest'?'asc':'desc'},{id:'desc'}]})]);
 res.json({data:items.map(offerView),meta:{total,page:query.page,pageSize:query.pageSize,totalPages:Math.max(1,Math.ceil(total/query.pageSize))}});
});
offerRouter.post('/admin/offers',authenticate,roles('ADMIN'),async(req,res)=>{const data=offerInput.parse(req.body);await assertOfferImage(data.imageKey);const offer=await db.$transaction(async tx=>{await lockActiveCategory(tx,data.categoryId);const result=await tx.offer.create({data,include:offerInclude});await tx.auditLog.create({data:{actorId:req.user!.id,action:'OFFER_CREATED',entityId:result.id,detail:{title:result.title,status:result.status,isDemo:result.isDemo}}});return result;});res.status(201).json({data:offerView(offer)});});
offerRouter.put('/admin/offers/:id',authenticate,roles('ADMIN'),async(req,res)=>{const data=offerInput.parse(req.body);await assertOfferImage(data.imageKey);const offer=await db.$transaction(async tx=>{await lockActiveCategory(tx,data.categoryId);const result=await tx.offer.update({where:{id:uuid.parse(req.params.id)},data,include:offerInclude});await tx.auditLog.create({data:{actorId:req.user!.id,action:'OFFER_UPDATED',entityId:result.id,detail:{status:result.status}}});return result;});res.json({data:offerView(offer)});});
offerRouter.post('/admin/categories',authenticate,roles('ADMIN'),async(req,res)=>{const data=z.object({name:z.string().trim().min(3).max(100),slug,sortOrder:z.number().int().min(0).default(10)}).parse(req.body);if(await db.merchantCategory.findFirst({where:{OR:[{slug:data.slug},{name:data.name}]}}))throw new ApiError(409,'CATEGORY_EXISTS','This category already exists. Search for it and select it.');res.status(201).json({data:await db.merchantCategory.create({data})});});


offerRouter.patch('/admin/offers/:id/status',authenticate,roles('ADMIN'),async(req,res)=>{
 const id=uuid.parse(req.params.id),{status}=z.object({status:z.enum(['DRAFT','PUBLISHED','PAUSED','ARCHIVED'])}).strict().parse(req.body);
 const result=await db.$transaction(async tx=>{
  const offer=await tx.offer.findUnique({where:{id},include:offerInclude});if(!offer)throw new ApiError(404,'NOT_FOUND','Offer not found.');
  if(status==='PUBLISHED'){
   if(!offer.categoryId||!offer.merchant?.approved||!offer.discountedPrice||!offer.terms||offer.terms.length<20||!offer.active)throw new ApiError(409,'NOT_READY','Choose an approved provider, category, valid price and conditions before publishing.');
   if(offer.expiresAt&&offer.expiresAt<=new Date())throw new ApiError(409,'EXPIRED_OFFER','Update the expiry date before publishing.');
   await lockActiveCategory(tx,offer.categoryId);await assertOfferImage(offer.imageKey);
  }
  const result=await tx.offer.update({where:{id},data:{status},include:offerInclude});await tx.auditLog.create({data:{actorId:req.user!.id,action:'OFFER_STATUS_CHANGED',entityId:id,detail:{from:offer.status,to:status}}});return result;
 });res.json({data:offerView(result)});
});
