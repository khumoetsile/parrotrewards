export const OFFER_IMAGE_WIDTH=1200, OFFER_IMAGE_HEIGHT=750, OFFER_IMAGE_MAX_BYTES=3*1024*1024;
export function priceCents(value: string | null): number | null {
  if (!value || !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction='']=value.split('.');
  const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  return cents>0?cents:null;
}
export function savingsPreview(original:string|null, discounted:string):string {
  const before=priceCents(original),after=priceCents(discounted);
  if(before===null||after===null||after>before)return '';
  return `BWP ${((before-after)/100).toFixed(2)} (${Math.floor((before-after)*100/before)}%)`;
}
export function imageFileError(file:Pick<File,'type'|'size'>):string {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Choose a JPEG, PNG or WebP image.';
  if(file.size>OFFER_IMAGE_MAX_BYTES)return 'The image must be at most 3 MB.';
  return '';
}
