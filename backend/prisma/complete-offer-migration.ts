import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
const db=new PrismaClient();
try {
  if(!process.env.DATABASE_URL?.endsWith('/pula_mvp_dev'))throw new Error('Dedicated local development database required.');
  const [{n}]=await db.$queryRaw<{n:bigint}[]>`SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='Offer' AND column_name='terms'`;
  if(Number(n)!==0)throw new Error('Repair precondition failed: Offer extension already present.');
  const before={users:await db.user.count(),transactions:await db.transaction.count(),receipts:await db.receipt.count()};
  const sql=await readFile('prisma/migrations/202610130002_offer_claims/migration.sql','utf8');
  if(/DROP\s+(TABLE|COLUMN|DATABASE)\b/i.test(sql))throw new Error('Destructive SQL is prohibited.');
  const statements=sql.split(';').map(s=>s.trim()).filter(Boolean);
  // MySQL had committed the first FK change and nullable Merchant.categoryId addition;
  // complete the corrected remainder without reverting columns or dropping data.
  for(const statement of statements.slice(2))await db.$executeRawUnsafe(statement);
  const after={users:await db.user.count(),transactions:await db.transaction.count(),receipts:await db.receipt.count()};
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Existing record counts changed unexpectedly.');
  console.log('Corrected additive migration completed; user, receipt and transaction counts preserved.',after);
} finally {await db.$disconnect();}
