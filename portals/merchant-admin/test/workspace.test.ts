import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentInjector,runInInjectionContext } from '@angular/core';
import { Api } from '../src/api';
import { OffersWorkspace } from '../src/offers';
function workspace(api:any){const injector=createEnvironmentInjector([{provide:Api,useValue:api}],null as any);return {component:runInInjectionContext(injector,()=>new OffersWorkspace()),destroy:()=>injector.destroy()};}
test('offer workspace requests filtered pages and resets pagination when changing areas',async()=>{
 const urls:string[]=[];const {component:c,destroy}=workspace({user:()=>({role:'ADMIN'}),list:async(url:string)=>{urls.push(url);return {data:[{id:'row'}],meta:{total:21,totalPages:3}};}});
 try{c.page=2;c.search='weekend & sale';c.status='PUBLISHED';await c.load();assert.equal(c.total,21);assert.equal(c.totalPages,3);const query=new URL(urls[0],'http://unit.test').searchParams;assert.equal(query.get('page'),'2');assert.equal(query.get('search'),'weekend & sale');assert.equal(query.get('status'),'PUBLISHED');
 c.switchView('claims');await new Promise(resolve=>setTimeout(resolve,0));assert.equal(c.page,1);assert.equal(c.search,'');assert.equal(c.status,'');assert.ok(urls[1].startsWith('/claims?'));}finally{destroy();}
});
test('offer editor blocks invalid pricing and saves both prices and artwork',async()=>{
 let saved:any;const {component:c,destroy}=workspace({user:()=>({role:'ADMIN'}),request:async(path:string,method:string,body:any)=>{saved={path,method,body};},list:async()=>({data:[],meta:{total:0,totalPages:1}})});
 try{c.newOffer();c.form.originalPrice='100';c.form.discountedPrice='101';await c.save();assert.match(c.error,/cannot exceed/);assert.equal(saved,undefined);
 c.form.originalPrice='200';c.form.discountedPrice='100';c.form.imageKey='upload-550e8400-e29b-41d4-a716-446655440000.webp';await c.save();assert.equal(saved.body.originalPrice,'200');assert.equal(saved.body.discountedPrice,'100');assert.equal(saved.body.imageKey,c.form.imageKey);assert.equal(c.editor,false);}finally{destroy();}
});
