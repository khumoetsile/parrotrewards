import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from './db.js';
import { authenticate,roles } from './auth.js';
import { ApiError } from './domain.js';
import { lockActiveCategory } from './categories.js';
export const providerRouter=Router();providerRouter.use('/admin/providers',authenticate,roles('ADMIN'));
providerRouter.get('/admin/providers',async(req,res)=>{
 const q=z.object({page:z.coerce.number().int().min(1).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(20),search:z.string().trim().max(100).default(''),status:z.enum(['active','inactive']).optional(),sort:z.enum(['name','newest','oldest']).default('name')}).parse(req.query);
 const where:Prisma.MerchantWhereInput={...(q.status?{approved:q.status==='active'}:{}),...(q.search?{OR:[{name:{contains:q.search}},{category:{contains:q.search}},{description:{contains:q.search}}]}:{})};
 const orderBy:Prisma.MerchantOrderByWithRelationInput[]=q.sort==='name'?[{name:'asc'},{id:'asc'}]:[{createdAt:q.sort==='oldest'?'asc':'desc'},{id:'desc'}];
 const [total,data]=await db.$transaction([db.merchant.count({where}),db.merchant.findMany({where,include:{_count:{select:{promotionalOffers:true,shops:true,staff:true}}},skip:(q.page-1)*q.pageSize,take:q.pageSize,orderBy})]);
 res.json({data,meta:{total,page:q.page,pageSize:q.pageSize,totalPages:Math.max(1,Math.ceil(total/q.pageSize))}});
});
providerRouter.patch('/admin/providers/:id',async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id),body=z.object({name:z.string().trim().min(2).max(100),categoryId:z.string().uuid().nullable(),description:z.string().trim().max(3000),approved:z.boolean()}).strict().parse(req.body);
 const data=await db.$transaction(async tx=>{
  if(body.categoryId)await lockActiveCategory(tx,body.categoryId);
  const current=await tx.merchant.findUnique({where:{id}});if(!current)throw new ApiError(404,'NOT_FOUND','Provider not found.');
  if(await tx.merchant.findFirst({where:{id:{not:id},name:body.name}}))throw new ApiError(409,'PROVIDER_EXISTS','Another provider already uses this name.');
  const category=body.categoryId?(await tx.merchantCategory.findUniqueOrThrow({where:{id:body.categoryId}})).name:current.category;
  const result=await tx.merchant.update({where:{id},data:{...body,category}});
  await tx.auditLog.create({data:{actorId:req.user!.id,action:'PROVIDER_UPDATED',entityId:id,detail:{name:result.name,approved:result.approved,categoryId:result.categoryId}}});return result;
 });res.json({data});
});
