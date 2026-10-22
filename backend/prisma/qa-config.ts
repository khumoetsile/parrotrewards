import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFile,mkdir } from 'node:fs/promises';
const db=new PrismaClient();
try {
  if(!process.env.DATABASE_URL?.endsWith('/pula_mvp_dev'))throw new Error('Dedicated development database required.');
  const qr=await db.shopQr.findUniqueOrThrow({where:{shopId:'22222222-2222-4222-8222-222222222222'}});
  await mkdir('../docs/local-logs',{recursive:true});
  await writeFile('../docs/local-logs/qa-defines.json',JSON.stringify({API_URL:'http://10.0.2.2:3000/api',QA_QR:'pula://shop/'+qr.token}));
  console.log('Fictional Android test configuration saved locally.');
} finally {await db.$disconnect();}
