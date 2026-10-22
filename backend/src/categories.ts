import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from './db.js';
import { authenticate,roles } from './auth.js';
import { ApiError } from './domain.js';
const uuid=z.string().uuid();
const input=z.object({name:z.string().trim().min(3).max(100),slug:z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/),sortOrder:z.number().int().min(0).default(10)}).strict();
export async function lockActiveCategory(tx:Prisma.TransactionClient,id:string){
 const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM MerchantCategory WHERE id=${id} AND archivedAt IS NULL FOR UPDATE`;
 if(!rows.length)throw new ApiError(409,'CATEGORY_UNAVAILABLE','This category has been removed. Select an active category.');
}
export const categoryRouter=Router();
categoryRouter.get('/admin/categories',authenticate,roles('ADMIN'),async(_req,res)=>res.json({data:await db.merchantCategory.findMany({include:{_count:{select:{offers:true,merchants:true}}},orderBy:[{sortOrder:'asc'},{name:'asc'}]})}));
categoryRouter.patch('/admin/categories/:id',authenticate,roles('ADMIN'),async(req,res)=>{
 const id=uuid.parse(req.params.id),data=input.parse(req.body);
 const result=await db.$transaction(async tx=>{
  await lockActiveCategory(tx,id);
  if(await tx.merchantCategory.findFirst({where:{id:{not:id},OR:[{slug:data.slug},{name:data.name}]}}))throw new ApiError(409,'CATEGORY_EXISTS','Another category already uses that name or link name.');
  const result=await tx.merchantCategory.update({where:{id},data});
  await tx.merchant.updateMany({where:{categoryId:id},data:{category:data.name}});
  await tx.auditLog.create({data:{actorId:req.user!.id,action:'CATEGORY_UPDATED',entityId:id,detail:data}});return result;
 });res.json({data:result});
});
categoryRouter.delete('/admin/categories/:id',authenticate,roles('ADMIN'),async(req,res)=>{
 const id=uuid.parse(req.params.id),{replacementId}=z.object({replacementId:uuid.optional()}).strict().parse(req.body||{});
 if(replacementId===id)throw new ApiError(400,'INVALID_REPLACEMENT','Choose a different category.');
 const result=await db.$transaction(async tx=>{
  // Deterministic locks also serialize concurrent offer/provider writes.
  for(const key of [id,...(replacementId?[replacementId]:[])].sort())await lockActiveCategory(tx,key);
  const [offers,merchants]=await Promise.all([tx.offer.count({where:{categoryId:id}}),tx.merchant.count({where:{categoryId:id}})]);
  if((offers||merchants)&&!replacementId)throw new ApiError(409,'CATEGORY_IN_USE',`This category has ${offers} offers and ${merchants} providers. Choose a replacement category before removing it.`);
  if(replacementId){const replacement=await tx.merchantCategory.findUniqueOrThrow({where:{id:replacementId}});await tx.offer.updateMany({where:{categoryId:id},data:{categoryId:replacementId}});await tx.merchant.updateMany({where:{categoryId:id},data:{categoryId:replacementId,category:replacement.name}});}
  const result=await tx.merchantCategory.update({where:{id},data:{archivedAt:new Date()}});
  await tx.auditLog.create({data:{actorId:req.user!.id,action:'CATEGORY_REMOVED',entityId:id,detail:{replacementId:replacementId??null,offers,merchants}}});return result;
 });res.json({data:result});
});
categoryRouter.post('/admin/categories/:id/restore',authenticate,roles('ADMIN'),async(req,res)=>{
 const id=uuid.parse(req.params.id);const result=await db.$transaction(async tx=>{const result=await tx.merchantCategory.update({where:{id},data:{archivedAt:null}});await tx.auditLog.create({data:{actorId:req.user!.id,action:'CATEGORY_RESTORED',entityId:id,detail:{}}});return result;});res.json({data:result});
});
