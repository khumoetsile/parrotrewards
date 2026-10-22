import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentInjector,runInInjectionContext,ElementRef } from '@angular/core';
import { SearchSelect } from '../src/search-select';
import { Api } from '../src/api';
import { OffersWorkspace } from '../src/offers';
import { slugify } from '../src/form-utils';
function create<T>(type:new()=>T,providers:any[]){const injector=createEnvironmentInjector(providers,null as any);return {component:runInInjectionContext(injector,()=>new type()),destroy:()=>injector.destroy()};}
test('searchable selectors filter labels and descriptions and preserve numeric values',()=>{
 const {component:c,destroy}=create(SearchSelect,[{provide:ElementRef,useValue:new ElementRef({querySelector:()=>({focus(){},scrollIntoView(){}})})}]);
 try{c.options=[{value:'a',label:'Hardware'},{value:'b',label:'Market',description:'Approved provider'},{value:20,label:'20'}];c.query='HARD';assert.deepEqual(c.filtered.map(o=>o.value),['a']);c.query='approved';assert.equal(c.filtered[0].value,'b');let selected:any;c.registerOnChange(value=>selected=value);c.choose(c.options[2]);assert.equal(selected,20);c.required=true;assert.deepEqual(c.validate({value:''} as any),{required:true});assert.equal(c.validate({value:20} as any),null);let name='';c.createRequested.subscribe(value=>name=value);c.query='New category';c.create();assert.equal(name,'New category');}finally{destroy();}
});
test('late search responses cannot replace newer results',async()=>{
 let completeOld:(v:any)=>void=()=>{};const old=new Promise(resolve=>completeOld=resolve);
 const api={user:()=>({role:'ADMIN'}),list:(url:string)=>url.includes('search=old')?old:Promise.resolve({data:[{id:'new'}],meta:{total:1,totalPages:1}})};
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:api}]);
 try{c.search='old';const pending=c.load();c.search='new';await c.load();completeOld({data:[{id:'old'}],meta:{total:100,totalPages:10}});await pending;assert.equal(c.offers[0].id,'new');assert.equal(c.total,1);assert.equal(c.loading,false);}finally{c.ngOnDestroy();destroy();}
});
test('inline category creation keeps the offer draft and selects the new category',async()=>{
 const api={user:()=>({role:'ADMIN'}),request:async()=>({id:'new-category',name:'Garden tools',slug:'garden-tools'})};
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:api}]);
 try{c.newOffer();c.form.title='Weekend shovel';c.form.originalPrice='200';c.form.discountedPrice='100';c.form.imageKey='upload-example.webp';c.startCategory('Garden tools');await c.createInlineCategory();assert.equal(c.form.categoryId,'new-category');assert.equal(c.form.title,'Weekend shovel');assert.equal(c.form.imageKey,'upload-example.webp');assert.equal(c.form.originalPrice,'200');assert.equal(c.creatingCategory,false);assert.equal(c.editor,true);assert.equal(c.categoryOptions[0].label,'Garden tools');}finally{destroy();}
});
test('failed category creation preserves entered data and shows its error',async()=>{
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'}),request:async()=>{throw Error('This category already exists.');}}}]);
 try{c.form.title='Unfinished offer';c.startCategory('Hardware');await c.createInlineCategory();assert.equal(c.creatingCategory,true);assert.match(c.categoryError,/already exists/);assert.equal(c.form.title,'Unfinished offer');assert.equal(c.categoryName,'Hardware');}finally{destroy();}
});
test('URL names are generated while custom names are respected',()=>{
 assert.equal(slugify('  Café & Garden Tools  '),'cafe-garden-tools');
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'})}}]);
 try{c.newOffer();c.form.title='Garden special';c.titleChanged();assert.equal(c.form.slug,'garden-special');c.slugEdited=true;c.form.slug='custom';c.form.title='Updated offer';c.titleChanged();assert.equal(c.form.slug,'custom');}finally{destroy();}
});

test('inline provider creation keeps the draft and explicitly records approval choice',async()=>{
 let payload:any;const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'}),request:async(_path:string,_method:string,body:any)=>{payload=body;return {id:'new-provider',...body};}}}]);
 try{c.categories=[{id:'cat',name:'Garden'}];c.form.title='Weekend offer';c.form.originalPrice='200';c.form.categoryId='cat';c.startProvider('Garden Store');c.providerApproved=true;await c.createInlineProvider();assert.equal(c.form.title,'Weekend offer');assert.equal(c.form.originalPrice,'200');assert.equal(c.form.merchantId,'new-provider');assert.equal(payload.categoryId,'cat');assert.equal(payload.approved,true);assert.equal(c.creatingProvider,false);}finally{destroy();}
});
test('failed provider creation keeps input and offer values',async()=>{
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'}),request:async()=>{throw Error('Provider exists.');}}}]);
 try{c.categories=[{id:'cat',name:'Garden'}];c.form.title='Keep this';c.form.categoryId='cat';c.startProvider('Existing provider');await c.createInlineProvider();assert.equal(c.creatingProvider,true);assert.match(c.providerError,/exists/);assert.equal(c.form.title,'Keep this');}finally{destroy();}
});
test('duplicate creates an unsaved draft without changing the source offer',()=>{
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'})}}]);
 try{const source={id:'source',title:'Garden offer',slug:'garden-offer',status:'PUBLISHED',originalPrice:'200',discountedPrice:'100',imageKey:'hardware'};c.duplicate(source);assert.equal(c.editingId,'');assert.equal(c.form.status,'DRAFT');assert.match(c.form.slug,/garden-offer-copy-/);assert.equal(c.form.originalPrice,'200');assert.equal(source.status,'PUBLISHED');assert.equal(c.editor,true);}finally{destroy();}
});
test('category removal sends a replacement and refreshes available choices',async()=>{
 let deletion:any;const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'}),request:async(path:string,method:string,body:any)=>{if(method==='DELETE')deletion={path,body};return [{id:'removed',name:'Old',slug:'old',archivedAt:'now'},{id:'new',name:'New',slug:'new',archivedAt:null}];}}}]);
 try{c.view='categories';c.requestRemoval({id:'removed',name:'Old',_count:{offers:2,merchants:1}});c.replacementCategory='new';await c.removeCategory();assert.equal(deletion.path,'/admin/categories/removed');assert.equal(deletion.body.replacementId,'new');assert.deepEqual(c.categoryOptions.map(v=>v.value),['new']);assert.equal(c.categoryToRemove,undefined);}finally{destroy();}
});

test('creating a missing provider category keeps the provider form open',async()=>{
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'}),request:async()=>({id:'new-business-category',name:'Garden',slug:'garden'})}}]);
 try{c.startProvider('Keep my provider');c.providerDescription='Already entered';c.startCategory('Garden','provider');await c.createInlineCategory();assert.equal(c.creatingProvider,true);assert.equal(c.providerName,'Keep my provider');assert.equal(c.providerDescription,'Already entered');assert.equal(c.providerCategory,'new-business-category');}finally{destroy();}
});


test('discard confirmation protects changed forms but never interrupts untouched forms',async()=>{
 const {ConfirmService}=await import('../src/confirmation');let prompts=0;let allow=false;
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:{user:()=>({role:'ADMIN'})}},{provide:ConfirmService,useValue:{ask:async()=>{prompts++;return allow;}}}]);
 try{c.newOffer();assert.equal(await c.canLeave(),true);assert.equal(prompts,0);c.form.title='Keep my draft';await c.closeEditor();assert.equal(c.editor,true);assert.equal(c.form.title,'Keep my draft');allow=true;await c.closeEditor();assert.equal(c.editor,false);assert.equal(prompts,2);}finally{destroy();}
});
test('remote provider options request one page and retain the chosen provider',async()=>{
 const calls:string[]=[];const api={user:()=>({role:'ADMIN'}),list:async(path:string)=>{calls.push(path);return {data:[{id:'new',name:'New provider'}],meta:{totalPages:3}};}};
 const {component:c,destroy}=create(OffersWorkspace,[{provide:Api,useValue:api}]);
 try{c.form.merchantId='selected';c.merchants=[{id:'selected',name:'Chosen provider'}];await c.loadProviderOptions('Garden',1);assert.equal(calls.length,1);assert.match(calls[0],/pageSize=20/);assert.match(calls[0],/search=Garden/);assert.ok(c.merchants.some(p=>p.id==='selected'));assert.equal(c.providerHasMore,true);}finally{c.ngOnDestroy();destroy();}
});
