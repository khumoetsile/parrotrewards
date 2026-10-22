import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
const terms='DEMO ONLY. Prototype example, not a confirmed live offer or partnership. Present your claim reference to the provider for prototype validation. This claim is not proof of payment or an admission ticket. Festival dates, venues and admission arrangements are not confirmed.';
try {
 if(process.env.NODE_ENV==='production'||!['/pula_mvp_dev','/pula_mvp_test'].some(name=>process.env.DATABASE_URL?.endsWith(name)))throw new Error('Only the dedicated development database is allowed.');
 const categories=[];
 for(const [slug,name] of [['music-festivals','Music Festivals'],['hardware','Hardware'],['auto-spares','Auto Spares']])categories.push(await db.merchantCategory.upsert({where:{slug},update:{},create:{slug,name,sortOrder:categories.length}}));
 const merchant=await db.merchant.upsert({where:{id:'44444444-4444-4444-8444-444444444444'},update:{},create:{id:'44444444-4444-4444-8444-444444444444',name:'Fictional Demo Provider',category:'Prototype offers',description:'Fictional provider for demonstrations only. No official organizer, branding or partnership is represented.',approved:true}});
 const staff=await db.user.findUnique({where:{email:'merchant@example.test'}});if(staff)await db.merchantStaff.upsert({where:{userId_merchantId:{userId:staff.id,merchantId:merchant.id}},update:{},create:{userId:staff.id,merchantId:merchant.id}});
 const examples=[{slug:'bnr-ticket',title:'BNR Ticket',discountedPrice:'140.00',category:0,imageKey:'music',discountType:'TICKET',description:'Prototype festival ticket discount example. Dates, venues and organizers are not confirmed.'},{slug:'gobo-motho-ticket',title:'Gobo Motho Ticket',discountedPrice:'140.00',category:0,imageKey:'music',discountType:'TICKET',description:'Prototype music festival ticket discount example. No live availability or admission entitlement is promised.'},{slug:'spade-shovel',title:'Spade / Shovel',discountedPrice:'100.00',originalPrice:'200.00',category:1,imageKey:'hardware',discountType:'PRICE',description:'Prototype hardware example: save BWP 100 on a spade or shovel. Product brand and commercial availability are not confirmed.'},{slug:'demo-brake-pads',title:'Demo Brake Pad Set',discountedPrice:'180.00',originalPrice:'240.00',category:2,imageKey:'auto',discountType:'PRICE',description:'Clearly fictional auto-spares example. No brand, vehicle compatibility, stock or commercial offer is represented.'}];
 for(const example of examples){
  const event=example.category===0?await db.event.upsert({where:{id:example.slug==='bnr-ticket'?'55555555-5555-4555-8555-555555555555':'66666666-6666-4666-8666-666666666666'},update:{},create:{id:example.slug==='bnr-ticket'?'55555555-5555-4555-8555-555555555555':'66666666-6666-4666-8666-666666666666',name:example.title,isDemo:true}}):null;
  const {category,...data}=example;
  const product=category!==0?await db.product.findFirst({where:{name:example.title,isDemo:true}})??await db.product.create({data:{name:example.title,description:example.description,isDemo:true}}):null;
  const offer=await db.offer.upsert({where:{slug:example.slug},update:{},create:{...data,categoryId:categories[category].id,merchantId:merchant.id,eventId:event?.id,productId:product?.id,status:'PUBLISHED',isDemo:true,terms,perUserClaimLimit:1}});
  const campaign=await db.promotionalCampaign.upsert({where:{slug:example.slug==='bnr-ticket'?'bnr-demo':example.slug==='gobo-motho-ticket'?'gobo-demo':example.slug+'-demo'},update:{},create:{slug:example.slug==='bnr-ticket'?'bnr-demo':example.slug==='gobo-motho-ticket'?'gobo-demo':example.slug+'-demo',name:example.title+' demo campaign',offerId:offer.id}});
  await db.referralLink.upsert({where:{code:example.slug+'-demo-share'},update:{},create:{campaignId:campaign.id,code:example.slug+'-demo-share',label:'Fictional share-link example'}});
 }
 await db.promotionalCampaign.upsert({where:{slug:'discover-demo'},update:{},create:{slug:'discover-demo',name:'Parrot Rewards discovery demo'}});
 console.log('Four labelled DEMO offers seeded; existing offers, claims and policies preserved.');
} finally {await db.$disconnect();}
