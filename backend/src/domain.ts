import { createHash } from 'node:crypto';
import { TransactionStatus } from '@prisma/client';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function money(value: string): bigint {
  if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value)) throw new ApiError(400,'INVALID_AMOUNT','Enter a valid BWP amount with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2,'0'));
}
export function formatMoney(cents: bigint): string { return `${cents / 100n}.${(cents % 100n).toString().padStart(2,'0')}`; }
export function commission(amount: string, rateBps: number): string {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) throw new ApiError(400,'INVALID_RATE','Rate must be between 0 and 10000 basis points.');
  return formatMoney((money(amount) * BigInt(rateBps) + 5000n) / 10000n);
}
const transitions: Record<TransactionStatus, TransactionStatus[]> = {
  SUBMITTED:['PROCESSING','CANCELLED'], PROCESSING:['NEEDS_REVIEW'], NEEDS_REVIEW:['VERIFIED','REJECTED'], VERIFIED:[], REJECTED:[], CANCELLED:[]
};
export function assertTransition(from: TransactionStatus, to: TransactionStatus) {
  if (!transitions[from].includes(to)) throw new ApiError(409,'INVALID_TRANSITION',`Cannot change ${from} to ${to}.`);
}
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function hamming(a: string,b: string) { if (a.length !== b.length) return Infinity; let n=0; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) n++; return n; }
export interface ParsedReceipt { merchantName?: string; receiptNumber?: string; receiptDate?: Date; receiptTime?: string; amount?: string; currency?: string }
export function parseReceipt(text: string): ParsedReceipt {
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const totals = [...text.matchAll(/(?:grand\s*total|total|amount\s*due)\s*[:=]?\s*(?:BWP|P)?\s*(\d+(?:[.,]\d{2}))/gi)];
  const rawDate = text.match(/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/);
  let receiptDate: Date | undefined;
  if (rawDate) { const value = `${rawDate[1]}-${rawDate[2]}-${rawDate[3]}`; const date = new Date(value+'T00:00:00Z'); if(!Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value) receiptDate=date; }
  return { merchantName:lines[0], receiptNumber:text.match(/(?:receipt|invoice)\s*(?:no\.?|number|#)\s*[:.]?\s*([A-Z0-9-]{3,64})/i)?.[1]?.toUpperCase(), receiptDate, receiptTime:text.match(/\b(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/)?.[0], amount:totals.at(-1)?.[1].replace(',','.'), currency:/\bBWP\b/i.test(text)?'BWP':undefined };
}
export function receiptFlags(parsed: ParsedReceipt, text: string, confidence: number, amount: string, merchant: string, now = new Date(), maxAgeDays=30): string[] {
  const flags: string[]=[];
  if(confidence<80 || text.trim().length<30) flags.push('LOW_OCR_CONFIDENCE');
  if(!parsed.amount) flags.push('TOTAL_MISSING');
  else { try { if(money(parsed.amount)!==money(amount)) flags.push('AMOUNT_MISMATCH'); } catch { flags.push('INVALID_TOTAL'); } }
  const normalize=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!normalize(text).includes(normalize(merchant))) flags.push('MERCHANT_MISMATCH');
  if(parsed.currency!=='BWP') flags.push('CURRENCY_UNCONFIRMED');
  if(!parsed.receiptDate) flags.push('DATE_MISSING');
  else if(now.getTime()-parsed.receiptDate.getTime()>maxAgeDays*86400000 || parsed.receiptDate.getTime()>now.getTime()+86400000) flags.push('DATE_OUT_OF_RANGE');
  // OCR alone never proves genuineness. All MVP submissions require independent admin review.
  flags.push('INDEPENDENT_REVIEW_REQUIRED');
  return flags;
}
