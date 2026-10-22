import '@angular/compiler';
import { test,mock } from 'node:test';
import assert from 'node:assert/strict';
import { Api } from '../src/api';
test('overlapping live searches share one refresh instead of logging the user out',async()=>{
 let refreshes=0;const response=(data:any,status=200)=>new Response(JSON.stringify(status===200?{data}:{error:{message:'Expired'}}),{status,headers:{'Content-Type':'application/json'}});
 const stub=mock.method(globalThis,'fetch',async(input:any,options:any)=>{
  const url=String(input);
  if(url.endsWith('/auth/login'))return response({user:{role:'ADMIN',name:'QA'},accessToken:'old',refreshToken:'refresh-one'});
  if(url.endsWith('/auth/refresh')){refreshes++;await new Promise(resolve=>setTimeout(resolve,5));return response({accessToken:'new',refreshToken:'refresh-two'});}
  return options.headers.Authorization==='Bearer new'?response([{id:url}]):response(null,401);
 });
 try{const api=new Api();await api.login('admin@example.test','test-password-only');const results=await Promise.all([api.request<any[]>('/claims?search=a'),api.request<any[]>('/claims?search=ab')]);assert.equal(refreshes,1);assert.equal(results[0].length,1);assert.equal(api.user()?.role,'ADMIN');}finally{stub.mock.restore();}
});
