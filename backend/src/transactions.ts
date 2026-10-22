import { Prisma, TransactionStatus } from '@prisma/client';
import { db } from './db.js';
import { ApiError, assertTransition, commission } from './domain.js';
export const transactionInclude = {shop:{include:{merchant:true}},verification:true,flags:true,history:{orderBy:{createdAt:'asc' as const}},commission:true,disputes:true};
export function visibleWhere(user: {id:string;role:string}): Prisma.TransactionWhereInput {
  return user.role==='ADMIN'?{}:user.role==='MERCHANT'?{shop:{merchant:{staff:{some:{userId:user.id}}}}}:{userId:user.id};
}
export async function transition(tx: Prisma.TransactionClient,id:string,to:TransactionStatus,actorId:string|null,reason:string) {
  const current=await tx.transaction.findUniqueOrThrow({where:{id}}); assertTransition(current.status,to);
  const changed=await tx.transaction.updateMany({where:{id,status:current.status},data:{status:to}});
  if(!changed.count) throw new ApiError(409,'CONCURRENT_UPDATE','The transaction changed; reload and retry.');
  await tx.statusHistory.create({data:{transactionId:id,status:to,actorId,reason}});
  await tx.auditLog.create({data:{actorId,action:`TRANSACTION_${to}`,entityId:id,detail:{reason}}});
  if(to==='VERIFIED') {
    const shop=await tx.shop.findUniqueOrThrow({where:{id:current.shopId}});
    const rule=await tx.commissionRule.findFirst({where:{active:true,merchantId:shop.merchantId},orderBy:{createdAt:'desc'}}) ?? await tx.commissionRule.findFirst({where:{active:true,merchantId:null},orderBy:{createdAt:'desc'}});
    if(!rule) throw new ApiError(409,'RULE_MISSING','Configure a commission rule before verification.');
    await tx.commissionLedger.create({data:{transactionId:id,ruleId:rule.id,rateBps:rule.rateBps,purchaseAmount:current.amount,amount:commission(current.amount.toFixed(2),rule.rateBps)}});
  }
  const user=await tx.user.findUniqueOrThrow({where:{id:current.userId}});
  if(user.notificationEnabled) await tx.notification.create({data:{userId:current.userId,title:`Purchase ${to.toLowerCase().replaceAll('_',' ')}`,body:reason}});
}
export async function findVisible(id: string,user: {id:string;role:string}) { const value=await db.transaction.findFirst({where:{id,...visibleWhere(user)},include:transactionInclude}); if(!value) throw new ApiError(404,'NOT_FOUND','Transaction not found.'); return value; }
