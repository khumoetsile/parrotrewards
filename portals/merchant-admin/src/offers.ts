import { ConfirmService } from './confirmation';
import { ActivatedRoute } from '@angular/router';
import { SearchSelect } from './search-select';
import { slugify } from './form-utils';
import { DialogFocus } from './dialog-focus';
import { Component,inject,HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Api } from './api';
import { API_BASE_URL } from './api-base';
import { dateToInput,dateFromInput } from './dates';
import { imageFileError,priceCents,savingsPreview } from './offer-rules';
const emptyOffer=()=>({title:'',slug:'',description:'',categoryId:'',merchantId:'',discountedPrice:'',originalPrice:null as string|null,discountType:'PRICE',terms:'Present your claim reference to the provider to redeem this discount, subject to the offer conditions. A claim does not confirm payment or admission.',status:'DRAFT',isDemo:true,imageKey:'placeholder',startsAt:null as string|null,expiresAt:null as string|null,perUserClaimLimit:1,totalClaimLimit:null as number|null,claimTtlHours:null as number|null});
type View='offers'|'claims'|'categories'|'verify';
@Component({standalone:true,imports:[FormsModule,CommonModule,DialogFocus,SearchSelect],templateUrl:'./offers.html'})
export class OffersWorkspace {
 api=inject(Api);private confirm=inject(ConfirmService,{optional:true});private route=inject(ActivatedRoute,{optional:true});baseline='';categoryBaseline='';providerFilter='';sort='newest';providerLoading=false;providerHasMore=false;private providerPage=1;private providerSearch='';private providerVersion=0;private providerTimer:ReturnType<typeof setTimeout>|undefined;admin=this.api.user()?.role==='ADMIN';view:View=this.admin?'offers':'verify';
 categoryRecords:any[]=[];showRemoved=false;editingCategoryId='';categoryOrder=10;categoryToRemove:any;replacementCategory='';lastRemovedId='';creatingProvider=false;providerBusy=false;providerError='';providerName='';providerCategory='';providerDescription='';providerApproved=false;offers:any[]=[];categories:any[]=[];merchants:any[]=[];claims:any[]=[];
 reference='';note='';claim:any;error='';notice='';busy=false;uploading=false;
 page=1;pageSize=10;total=0;totalPages=1;search='';status='';category='';
 loading=false;private listVersion=0;private searchTimer:ReturnType<typeof setTimeout>|undefined;categoryTarget:'offer'|'provider'='offer';creatingCategory=false;categoryBusy=false;categoryError='';slugEdited=false;categorySlugEdited=false;editor=false;editingId='';form=emptyOffer();starts='';expires='';categoryName='';categorySlug='';categoryEditor=false;
 openCategoryDialog(category?:any){this.editingCategoryId=category?.id||'';this.categoryName=category?.name||'';this.categorySlug=category?.slug||'';this.categoryOrder=category?.sortOrder??10;this.categorySlugEdited=!!category;this.error='';this.categoryEditor=true;this.categoryBaseline=JSON.stringify([this.categoryName,this.categorySlug,this.categoryOrder]);}
 async refreshCategories(){this.categoryRecords=await this.api.request('/admin/categories');this.categories=this.categoryRecords.filter(c=>!c.archivedAt);}
 get selectedProvider(){return this.merchants.find(m=>m.id===this.form.merchantId);}
 get replacementOptions(){return this.categoryOptions.filter(c=>c.value!==this.categoryToRemove?.id);}
 requestRemoval(category:any){this.categoryToRemove=category;this.replacementCategory='';this.error='';}
 async removeCategory(){if(!this.categoryToRemove)return;const category=this.categoryToRemove;await this.run(async()=>{await this.api.request('/admin/categories/'+category.id,'DELETE',this.replacementCategory?{replacementId:this.replacementCategory}:{});this.categoryToRemove=undefined;this.lastRemovedId=category.id;if(this.category===category.id)this.category='';await this.refreshCategories();await this.fetchRows();this.notice='Category removed. You can restore it from Show removed.';});}
 async restoreCategory(category:any){await this.run(async()=>{await this.api.request('/admin/categories/'+category.id+'/restore','POST',{});await this.refreshCategories();await this.fetchRows();this.notice='Category restored.';this.lastRemovedId='';});}
 startProvider(name=''){this.creatingCategory=false;this.providerName=name;this.providerCategory=this.form.categoryId;this.providerDescription='';this.providerApproved=false;this.providerError='';this.creatingProvider=true;}
 cancelProvider(){if(!this.providerBusy)this.creatingProvider=false;}
 async createInlineProvider(){
  if(this.providerBusy)return;const category=this.categories.find(c=>c.id===this.providerCategory);
  if(this.providerName.trim().length<2||!category){this.providerError='Enter the provider name and choose a category.';return;}
  this.providerBusy=true;this.providerError='';
  try{const provider:any=await this.api.request('/admin/merchants','POST',{name:this.providerName.trim(),category:category.name,categoryId:category.id,description:this.providerDescription.trim(),approved:this.providerApproved});this.merchants=[...this.merchants,provider];this.form.merchantId=provider.id;this.creatingProvider=false;this.notice='Provider created and selected.';}
  catch(e){this.providerError=(e as Error).message;}finally{this.providerBusy=false;}
 }
 duplicate(offer:any){this.edit(offer);this.editingId='';this.form.title=(offer.title+' (copy)').slice(0,120);this.form.slug=(offer.slug||slugify(offer.title)).slice(0,82)+'-copy-'+Date.now().toString(36);this.form.status='DRAFT';this.starts='';this.expires='';this.notice='Copy opened as a draft. Review it before saving.';}
 get pricingError(){const a=priceCents(this.form.originalPrice),b=priceCents(this.form.discountedPrice);if(this.form.originalPrice&&a===null)return 'Original price must be a positive amount with up to two decimals.';if(this.form.discountedPrice&&b===null)return 'Price after discount must be a positive amount with up to two decimals.';return a!==null&&b!==null&&b>a?'Price after discount cannot exceed the original price.':'';}
 get savings(){return savingsPreview(this.form.originalPrice,this.form.discountedPrice);}
 get firstRow(){return this.total?((this.page-1)*this.pageSize)+1:0;}
 get lastRow(){return Math.min(this.page*this.pageSize,this.total);}
 get visibleCategories(){const term=this.search.toLowerCase();return this.categoryRecords.filter(c=>(this.showRemoved||!c.archivedAt)&&(!term||c.name.toLowerCase().includes(term)||c.slug.includes(term)));}
 get categoryRows(){return this.visibleCategories.slice((this.page-1)*this.pageSize,this.page*this.pageSize);}
 ngOnInit(){this.providerFilter=this.route?.snapshot.queryParamMap.get('provider')||'';this.initialize();}
 async run(action:()=>Promise<void>){this.error='';this.notice='';this.busy=true;try{await action();}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
 async initialize(){await this.run(async()=>{if(this.admin){await this.refreshCategories();await this.loadProviderOptions('',1);await this.fetchRows();}});}
 sortOptions=[{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},{value:'title',label:'Title A–Z'},{value:'price-low',label:'Price low–high'},{value:'price-high',label:'Price high–low'}];
 searchProviders(query:string){clearTimeout(this.providerTimer);this.providerVersion++;this.providerLoading=true;this.providerTimer=setTimeout(()=>this.loadProviderOptions(query,1),250);}
 moreProviders(){if(!this.providerLoading&&this.providerHasMore)this.loadProviderOptions(this.providerSearch,this.providerPage+1);}
 async loadProviderOptions(query:string,page:number){const v=++this.providerVersion;this.providerLoading=true;try{const r=await this.api.list('/admin/providers?'+new URLSearchParams({search:query,page:String(page),pageSize:'20'}));if(v!==this.providerVersion)return;const selected=this.selectedProvider;this.merchants=page===1?r.data:[...this.merchants,...r.data.filter(p=>!this.merchants.some(m=>m.id===p.id))];if(selected&&!this.merchants.some(m=>m.id===selected.id))this.merchants.push(selected);this.providerSearch=query;this.providerPage=page;this.providerHasMore=page<r.meta.totalPages;}catch(e){if(v===this.providerVersion)this.error=(e as Error).message;}finally{if(v===this.providerVersion)this.providerLoading=false;}}
 snapshot(){return JSON.stringify({form:this.form,starts:this.starts,expires:this.expires,providerName:this.creatingProvider?this.providerName:'',providerDescription:this.creatingProvider?this.providerDescription:'',categoryName:this.creatingCategory?this.categoryName:''});}
 get dirty(){return this.editor&&this.snapshot()!==this.baseline;}
 async canLeave(){if(this.busy||this.uploading||this.providerBusy||this.categoryBusy)return false;const categoryDirty=this.categoryEditor&&JSON.stringify([this.categoryName,this.categorySlug,this.categoryOrder])!==this.categoryBaseline;if(!this.dirty&&!categoryDirty)return true;return this.confirm?this.confirm.ask({title:'Discard unsaved changes?',message:'Your changes have not been saved. Keep working to finish this record.',confirmLabel:'Discard changes',danger:true}):true;}
 @HostListener('window:beforeunload',['$event']) unload(event:BeforeUnloadEvent){if(this.dirty){event.preventDefault();event.returnValue='';}}
 async closeCategoryEditor(){if(await this.canLeave())this.categoryEditor=false;}
 async changeStatus(offer:any,status:string){if(status==='ARCHIVED'&&this.confirm&&!await this.confirm.ask({title:'Archive this offer?',message:'It will disappear from new discovery. Existing claims and their conditions remain available.',confirmLabel:'Archive offer',danger:true}))return;await this.run(async()=>{await this.api.request('/admin/offers/'+offer.id+'/status','PATCH',{status});await this.fetchRows();this.notice=status==='DRAFT'?'Offer restored as a draft.':'Offer status updated.';});}
 get categoryOptions(){return this.categories.map(c=>({value:c.id,label:c.name}));}
 get filterCategoryOptions(){return [{value:'',label:'All categories'},...this.categoryOptions];}
 get providerOptions(){return this.merchants.map(m=>({value:m.id,label:m.name,description:m.approved?'Approved provider':'Participation not approved'}));}
 rowSizeOptions=[10,20,50].map(n=>({value:n,label:String(n)}));
 publicationOptions=['DRAFT','PUBLISHED','PAUSED','ARCHIVED'].map(value=>({value,label:value.charAt(0)+value.slice(1).toLowerCase()}));
 discountTypeOptions=[{value:'TICKET',label:'Ticket discount'},{value:'PRICE',label:'Reduced price'},{value:'PERCENT',label:'Percentage reduction'}];
 get statusOptions(){const values=this.view==='offers'?this.publicationOptions:['CLAIMED','REDEEMED','EXPIRED','CANCELLED'].map(value=>({value,label:value.charAt(0)+value.slice(1).toLowerCase()}));return [{value:'',label:'All statuses'},...values];}
 async fetchRows(version=++this.listVersion){
   const view=this.view;
   if(view==='verify')return;
   if(view==='categories'){this.total=this.visibleCategories.length;this.totalPages=Math.max(1,Math.ceil(this.total/this.pageSize));this.page=Math.min(this.page,this.totalPages);return;}
   const query=new URLSearchParams({page:String(this.page),pageSize:String(this.pageSize),search:this.search.trim()});
   if(this.status)query.set('status',this.status);if(this.category&&view==='offers')query.set('category',this.category);if(view==='offers'){query.set('sort',this.sort);if(this.providerFilter)query.set('provider',this.providerFilter);}
   const result=await this.api.list((view==='offers'?'/admin/offers':'/claims')+'?'+query);
   if(version!==this.listVersion||view!==this.view)return;
   if(view==='offers')this.offers=result.data;else this.claims=result.data;
   this.total=result.meta.total;this.totalPages=result.meta.totalPages;
   if(this.page>this.totalPages){this.page=this.totalPages;await this.fetchRows(version);}
 }
 async load(){const version=++this.listVersion;this.loading=true;this.error='';try{await this.fetchRows(version);}catch(e){if(version===this.listVersion)this.error=(e as Error).message;}finally{if(version===this.listVersion)this.loading=false;}}
 searchChanged(){clearTimeout(this.searchTimer);this.listVersion++;this.loading=true;this.page=1;this.searchTimer=setTimeout(()=>this.load(),250);}
 clearSearch(){this.search='';this.filter();}
 ngOnDestroy(){clearTimeout(this.searchTimer);clearTimeout(this.providerTimer);this.providerVersion++;this.listVersion++;}
 async switchView(view:View){if(!await this.canLeave())return;clearTimeout(this.searchTimer);this.listVersion++;this.creatingCategory=false;this.creatingProvider=false;this.view=view;this.page=1;this.search='';this.status='';this.category='';this.editor=false;this.categoryEditor=false;this.load();}
 filter(){clearTimeout(this.searchTimer);this.page=1;this.load();}
 changePage(page:number){if(page<1||page>this.totalPages||this.busy)return;this.page=page;this.load();}
 newOffer(){this.creatingProvider=false;this.creatingCategory=false;this.categoryError='';this.slugEdited=false;this.form=emptyOffer();this.editingId='';this.starts='';this.expires='';this.editor=true;this.error='';this.baseline=this.snapshot();}
 edit(o:any){this.newOffer();this.slugEdited=true;this.editingId=o.id;for(const key of Object.keys(this.form))if(key in o)(this.form as any)[key]=o[key];this.starts=dateToInput(o.startsAt);this.expires=dateToInput(o.expiresAt);if(o.merchant&&!this.merchants.some(m=>m.id===o.merchant.id))this.merchants.push(o.merchant);this.baseline=this.snapshot();}
 async closeEditor(){if(await this.canLeave()){this.creatingCategory=false;this.creatingProvider=false;this.editor=false;}}
 async save(){
   if(this.busy||this.uploading||this.categoryBusy||this.creatingCategory||this.providerBusy||this.creatingProvider)return;
   const before=priceCents(this.form.originalPrice),after=priceCents(this.form.discountedPrice);
   if((this.form.originalPrice&&before===null)||after===null){this.error='Enter a positive original price and price after discount, with up to two decimals.';return;}
   if(before!==null&&after>before){this.error='Price after discount cannot exceed the original price.';return;}
   await this.run(async()=>{const body={...this.form,originalPrice:this.form.originalPrice||null,startsAt:dateFromInput(this.starts),expiresAt:dateFromInput(this.expires)};
    await this.api.request('/admin/offers'+(this.editingId?'/'+this.editingId:''),this.editingId?'PUT':'POST',body);
    this.editor=false;await this.fetchRows();this.notice='Offer saved.';});
 }
 titleChanged(){if(!this.slugEdited&&!this.editingId)this.form.slug=slugify(this.form.title);}
 categoryNameChanged(){if(!this.categorySlugEdited)this.categorySlug=slugify(this.categoryName);}
 startCategory(name='',target:'offer'|'provider'='offer'){this.categoryTarget=target;if(target==='offer')this.creatingProvider=false;this.categoryName=name;this.categorySlug=slugify(name);this.categorySlugEdited=false;this.categoryError='';this.creatingCategory=true;}
 cancelCategory(){if(!this.categoryBusy){this.creatingCategory=false;this.categoryError='';}}
 async createInlineCategory(){
  if(this.categoryBusy)return;
  if(this.categoryName.trim().length<3||! /^[a-z0-9][a-z0-9-]{1,99}$/.test(this.categorySlug)){this.categoryError='Enter a category name (at least 3 characters) and a valid URL name.';return;}
  this.categoryBusy=true;this.categoryError='';
  try{const category:any=await this.api.request('/admin/categories','POST',{name:this.categoryName.trim(),slug:this.categorySlug});this.categories=[...this.categories,category];this.categoryRecords=[...this.categoryRecords,category];if(this.categoryTarget==='provider'){this.providerCategory=category.id;if(!this.form.categoryId)this.form.categoryId=category.id;}else this.form.categoryId=category.id;this.creatingCategory=false;this.notice='Category created and selected.';}
  catch(e){this.categoryError=(e as Error).message;}
  finally{this.categoryBusy=false;}
 }
 imageUrl(key:string){return key?.startsWith('upload-')?API_BASE_URL+'/offer-images/'+key:'';}
 async upload(event:Event){
   const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
   this.error='';this.uploading=true;
   try {
     const error=imageFileError(file);if(error)throw new Error(error);
     const bitmap=await createImageBitmap(file);
     const valid=bitmap.width===1200&&bitmap.height===750;bitmap.close();
     if(!valid)throw new Error('Image dimensions must be exactly 1200 × 750 pixels. Resize your image before uploading.');
     const result=await this.api.uploadOfferImage(file);this.form.imageKey=result.imageKey;
   }catch(e){this.error=(e as Error).message||'The image could not be read.';}
   finally{this.uploading=false;input.value='';}
 }
 displayTerms(value:string){return value.replaceAll('DEMO ONLY. Prototype example, not a confirmed live offer or partnership.','Sample offer. Provider participation and availability are not confirmed.').replaceAll('for prototype validation','for validation').replaceAll('DEMO ONLY.','Sample offer.').replaceAll('Prototype example, not a live commercial offer.','Provider participation and availability are not confirmed.');}
 async lookup(){this.claim=undefined;this.note='';await this.run(async()=>{this.claim=await this.api.request('/redemptions/lookup','POST',{reference:this.reference.trim().toUpperCase()});});}
 inspect(c:any){this.view='verify';this.reference=c.reference;this.lookup();}
 async redeem(){await this.run(async()=>{this.claim=await this.api.request('/redemptions','POST',{reference:this.claim.reference,note:this.note.trim()});this.notice='Redemption recorded. This claim can no longer be used.';});}
 async addCategory(){await this.run(async()=>{await this.api.request('/admin/categories'+(this.editingCategoryId?'/'+this.editingCategoryId:''),this.editingCategoryId?'PATCH':'POST',{name:this.categoryName,slug:this.categorySlug,sortOrder:this.categoryOrder});await this.refreshCategories();this.categoryEditor=false;await this.fetchRows();this.notice='Category saved.';});}
}
