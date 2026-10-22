export type Role='CUSTOMER'|'MERCHANT'|'ADMIN';
export function canOpen(role:Role|undefined,area:'merchant'|'admin') { return area==='admin'?role==='ADMIN':role==='MERCHANT'||role==='ADMIN'; }
