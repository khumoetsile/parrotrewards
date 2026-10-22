import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const db=new PrismaClient();
async function main() {
  if(process.env.NODE_ENV==='production'||!['/pula_mvp_dev','/pula_mvp_test'].some(name=>process.env.DATABASE_URL?.endsWith(name))) throw new Error('Seed allowed only for the dedicated pula_mvp_dev database.');
  const password=process.env.DEMO_PASSWORD;
  if(!password||password.length<12) throw new Error('Supply a local DEMO_PASSWORD of at least 12 characters.');
  const passwordHash=await bcrypt.hash(password,12);
  for(const [email,name,role] of [['admin@example.test','Fictional Admin','ADMIN'],['merchant@example.test','Fictional Merchant','MERCHANT'],['customer@example.test','Fictional Customer','CUSTOMER']] as const) await db.user.upsert({where:{email},update:{},create:{email,name,role,passwordHash}});
  const staff=await db.user.findUniqueOrThrow({where:{email:'merchant@example.test'}});
  const merchant=await db.merchant.upsert({where:{id:'11111111-1111-4111-8111-111111111111'},update:{},create:{id:'11111111-1111-4111-8111-111111111111',name:'Demo Pula Market',category:'Groceries',description:'Fictional local development shop. No live discounts.',approved:true,staff:{create:{userId:staff.id}}}});
  await db.shop.upsert({where:{id:'22222222-2222-4222-8222-222222222222'},update:{},create:{id:'22222222-2222-4222-8222-222222222222',merchantId:merchant.id,name:'Demo Pula Market — Central',address:'Fictional Main Road, Gaborone',qr:{create:{token:randomBytes(32).toString('base64url')}},offers:{create:{title:'Discover local shopping',description:'Offer policy awaiting confirmation. No automatic discount is applied.'}}}});
  if(!await db.commissionRule.findFirst({where:{merchantId:null,active:true}})) await db.commissionRule.create({data:{rateBps:1000}});
  await db.discountRule.upsert({where:{id:'33333333-3333-4333-8333-333333333333'},update:{},create:{id:'33333333-3333-4333-8333-333333333333',name:'Commercial policy pending',configuration:{mode:'UNCONFIRMED'},enabled:false}});
  console.log('Fictional demo data seeded. Existing account passwords preserved.');
}
main().finally(()=>db.$disconnect());
