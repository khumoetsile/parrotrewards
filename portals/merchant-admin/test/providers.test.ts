import '@angular/compiler';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createEnvironmentInjector,runInInjectionContext} from '@angular/core';
import {Api} from '../src/api';import {ConfirmService} from '../src/confirmation';import {ProvidersWorkspace} from '../src/providers';
function setup(request:(path:string,method?:string,body?:any)=>Promise<any>){const injector=createEnvironmentInjector([{provide:Api,useValue:{request,list:async()=>({data:[],meta:{total:0,totalPages:1}})}},{provide:ConfirmService,useValue:{ask:async()=>false}}],null as any);return {c:runInInjectionContext(injector,()=>new ProvidersWorkspace()),cleanup:()=>injector.destroy()};}
test('provider creation requires a real category and keeps contextual category creation in its draft',async()=>{
 const calls:any[]=[];const {c,cleanup}=setup(async(path,method,body)=>{calls.push({path,method,body});return {id:'cat',...body};});
 try{c.create();c.form.name='Garden Store';c.form.description='Keep this description';c.categoryName='Garden Tools';c.addingCategory=true;await c.createCategory();assert.equal(c.form.name,'Garden Store');assert.equal(c.form.description,'Keep this description');assert.equal(c.form.categoryId,'cat');assert.equal(c.addingCategory,false);assert.equal(c.form.approved,false);await c.save();assert.equal(calls[1].path,'/admin/merchants');assert.equal(calls[1].body.category,'Garden Tools');assert.equal(calls[1].body.approved,false);assert.equal(c.editor,false);}finally{cleanup();}
});
test('provider errors retain values and a rejected discard keeps editing open',async()=>{
 const {c,cleanup}=setup(async()=>{throw Error('Provider already exists.');});try{c.edit({id:'existing',name:'Original',categoryId:null,description:'Existing',approved:true});c.form.name='Changed';await c.close();assert.equal(c.editor,true);await c.save();assert.equal(c.form.name,'Changed');assert.equal(c.editor,true);assert.match(c.error,/already exists/);}finally{cleanup();}
});
