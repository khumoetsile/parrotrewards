import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { db } from './db.js';
import { config } from './config.js';
import { hamming, parseReceipt, receiptFlags } from './domain.js';
import { TesseractOcr, OcrProvider } from './ocr.js';
import { transition } from './transactions.js';
export async function processOne(ocr:OcrProvider):Promise<boolean> {
  const job=await db.receiptJob.findFirst({where:{state:'QUEUED',availableAt:{lte:new Date()}},orderBy:{createdAt:'asc'}});
  if(!job) return false;
  const claim=await db.receiptJob.updateMany({where:{id:job.id,state:'QUEUED'},data:{state:'RUNNING',lockedAt:new Date(),attempts:{increment:1}}});
  if(!claim.count) return true;
  try {
    let purchase=await db.transaction.findUniqueOrThrow({where:{id:job.transactionId},include:{receipt:true,shop:{include:{merchant:true}}}});
    if(purchase.status==='CANCELLED') { await db.receiptJob.update({where:{id:job.id},data:{state:'DONE'}}); return true; }
    if(purchase.status==='SUBMITTED') await db.$transaction(tx=>transition(tx,purchase.id,'PROCESSING',null,'Receipt processing started.'));
    const result=await ocr.recognize(path.join(config.uploadDir,purchase.receipt.storageKey));
    const parsed=parseReceipt(result.text);
    const policy=await db.systemSetting.findUnique({where:{key:'maxReceiptAgeDays'}});
    const flags=receiptFlags(parsed,result.text,result.confidence,purchase.amount.toFixed(2),purchase.shop.merchant.name,new Date(),typeof policy?.value==='number'?policy.value:30);
    const peers=await db.receipt.findMany({where:{id:{not:purchase.receiptId},transaction:{isNot:null}},select:{sha256:true,perceptualHash:true},take:1000,orderBy:{createdAt:'desc'}});
    if(await db.receipt.findFirst({where:{sha256:purchase.receipt.sha256,id:{not:purchase.receiptId},transaction:{isNot:null}}})) flags.push('DUPLICATE_IMAGE');
    if(peers.some(p=>hamming(p.perceptualHash,purchase.receipt.perceptualHash)<=5)) flags.push('SIMILAR_IMAGE');
    if(parsed.receiptNumber && await db.verification.findFirst({where:{receiptNumber:parsed.receiptNumber,transactionId:{not:purchase.id},transaction:{shop:{merchantId:purchase.shop.merchantId}}}})) flags.push('REUSED_RECEIPT_NUMBER');
    if(await db.transaction.count({where:{userId:purchase.userId,createdAt:{gte:new Date(purchase.createdAt.getTime()-3600000),lte:purchase.createdAt}}})>5) flags.push('REPEATED_SUBMISSIONS');
    await db.$transaction(async tx=> {
      const extracted={...parsed,provider:result.provider,rawText:result.text,confidence:result.confidence};
      await tx.verification.upsert({where:{transactionId:purchase.id},create:{transactionId:purchase.id,...extracted},update:extracted});
      await tx.fraudFlag.createMany({data:[...new Set(flags)].map(code=>({transactionId:purchase.id,code,detail:code.toLowerCase().replaceAll('_',' ')}))});
      await transition(tx,purchase.id,'NEEDS_REVIEW',null,'Receipt extracted. Independent administrator review is required.');
      await tx.receiptJob.update({where:{id:job.id},data:{state:'DONE',lastError:null}});
    });
  } catch(error) {
    const message=error instanceof Error?error.message:'OCR processing failed';
    if(job.attempts+1>=3) await db.$transaction(async tx=> {
      const purchase=await tx.transaction.findUniqueOrThrow({where:{id:job.transactionId}});
      if(purchase.status==='PROCESSING') { await tx.fraudFlag.create({data:{transactionId:purchase.id,code:'OCR_FAILED',detail:'OCR unavailable or receipt unreadable.'}}); await transition(tx,purchase.id,'NEEDS_REVIEW',null,'OCR failed after retries. Review the original image.'); }
      await tx.receiptJob.update({where:{id:job.id},data:{state:'FAILED',lastError:message}});
    });
    else await db.receiptJob.update({where:{id:job.id},data:{state:'QUEUED',lockedAt:null,lastError:message,availableAt:new Date(Date.now()+5000*(job.attempts+1))}});
  }
  return true;
}
async function main() {
  const ocr=new TesseractOcr(); let running=true;
  process.on('SIGINT',()=>running=false); process.on('SIGTERM',()=>running=false);
  const once=process.argv.includes('--once');
  const deadline=Date.now()+45000;
  while(running && (!once || Date.now()<deadline)) {
    try {
      // Reclaim crashed worker leases; single OCR worker supported in this MVP.
      await db.receiptJob.updateMany({where:{state:'RUNNING',lockedAt:{lt:new Date(Date.now()-10*60000)}},data:{state:'QUEUED',lockedAt:null}});
      if(!await processOne(ocr)) { if(once) break; await new Promise(resolve=>setTimeout(resolve,1500)); }
    } catch(e) { console.error('Worker unavailable:',e instanceof Error?e.message:e); if(once) { process.exitCode=1; break; } await new Promise(resolve=>setTimeout(resolve,5000)); }
  }
  await ocr.close(); await db.$disconnect();
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(error=>{console.error(error);process.exitCode=1;});

