import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from './db.js';
import { authenticate, roles } from './auth.js';
import { ApiError } from './domain.js';
import { published, offerInclude, offerView } from './offers.js';

export const shopDiscountRouter = Router();
export const shopQrToken = z.string().trim().max(300).transform(value =>
  value.replace(/^(?:pula|parrotrewards):\/\/shop\//, '')
).pipe(z.string().regex(/^[A-Za-z0-9_-]{16,191}$/, 'Scan a valid Parrot Rewards shop code.'));

export function shopOfferScope(shop: {id:string;merchantId:string}): Prisma.OfferWhereInput {
  return {...published(), merchantId:shop.merchantId, OR:[{shopId:shop.id},{shopId:null}]};
}

async function discounts(shopId:string, query:unknown) {
  const q=z.object({page:z.coerce.number().int().min(1).default(1),search:z.string().trim().max(100).default('')}).parse(query);
  const shop=await db.shop.findFirst({where:{id:shopId,active:true,merchant:{approved:true}},select:{id:true,name:true,address:true,merchantId:true,merchant:{select:{id:true,name:true}}}});
  if(!shop)throw new ApiError(404,'SHOP_UNAVAILABLE','This shop is not currently available.');
  const where:Prisma.OfferWhereInput={AND:[shopOfferScope(shop),...(q.search?[{OR:[{title:{contains:q.search}},{description:{contains:q.search}}]}]:[])]};
  const [total,offers]=await db.$transaction([db.offer.count({where}),db.offer.findMany({where,include:offerInclude,skip:(q.page-1)*20,take:20,orderBy:[{title:'asc'},{id:'asc'}]})]);
  return {shop,offers:offers.map(offerView),page:q.page,total,totalPages:Math.max(1,Math.ceil(total/20))};
}

shopDiscountRouter.post('/shop-discounts/resolve',async(req,res)=>{
  const {token}=z.object({token:shopQrToken}).strict().parse(req.body);
  const qr=await db.shopQr.findFirst({where:{token,active:true},select:{shopId:true}});
  if(!qr)throw new ApiError(404,'INVALID_QR','This shop code is unavailable. Ask the shop for its current code.');
  res.json({data:await discounts(qr.shopId,req.query)});
});
shopDiscountRouter.get('/shop-discounts/:id',async(req,res)=>res.json({data:await discounts(z.string().uuid().parse(req.params.id),req.query)}));

shopDiscountRouter.get('/admin/providers/:id/shops',authenticate,roles('ADMIN'),async(req,res)=>{
  const merchantId=z.string().uuid().parse(req.params.id);
  const shops=await db.shop.findMany({where:{merchantId},select:{id:true,name:true,address:true,active:true,qr:{select:{active:true}}},orderBy:[{name:'asc'},{id:'asc'}]});
  res.json({data:shops});
});

