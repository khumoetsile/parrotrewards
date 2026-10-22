import { Injectable, signal } from '@angular/core';
import { Role } from './access';
import { API_BASE_URL } from './api-base';
export interface User {id:string;name:string;email:string;role:Role;notificationEnabled:boolean}
export interface Shop {id:string;name:string;address:string;active:boolean;qr?:{token:string};merchant?:Merchant;offers?:{title:string;description:string}[]}
export interface Merchant {id:string;name:string;description:string;category:string;approved:boolean;shops:Shop[]}
export interface Purchase {id:string;amount:string;status:string;createdAt:string;receiptId:string;shop:Shop;flags:{code:string;detail:string}[];verification?:{rawText:string;confidence:number;amount?:string;receiptNumber?:string};commission?:{amount:string};history:{status:string;reason:string;createdAt:string}[]}
@Injectable({providedIn:'root'})
export class Api {
  user=signal<User|undefined>(undefined); private access=''; private refresh='';private refreshing:Promise<void>|undefined;private sessionVersion=0;
  // Keep browser tokens in memory; refreshing the page requires signing in again.
  private refreshAccess():Promise<void> {
    if(!this.refreshing){const version=this.sessionVersion;this.refreshing=this.request<{accessToken:string;refreshToken:string}>('/auth/refresh','POST',{refreshToken:this.refresh},false).then(pair=>{if(version!==this.sessionVersion)throw new Error('Session changed. Sign in again.');this.access=pair.accessToken;this.refresh=pair.refreshToken;}).catch(error=>{if(version===this.sessionVersion)this.clear();throw error;}).finally(()=>{this.refreshing=undefined;});}
    return this.refreshing;
  }
  async request<T>(path:string,method='GET',body?:unknown,retry=true,withMeta=false):Promise<T> {
    const accessAtStart=this.access;
    const response=await fetch(API_BASE_URL+path,{method,headers:{'Content-Type':'application/json',...(this.access?{Authorization:'Bearer '+this.access}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    if(response.status===401&&retry&&this.refresh&&!path.startsWith('/auth/')) {
      if(accessAtStart===this.access)await this.refreshAccess();return this.request<T>(path,method,body,false,withMeta);
    }
    const result=await response.json();if(!response.ok)throw new Error([result.error?.message||'Request failed.',...Object.values(result.error?.details?.fieldErrors||{}).flat(),...(result.error?.details?.formErrors||[])].join(' '));return withMeta?result:result.data;
  }
  async list(path:string):Promise<{data:any[];meta:{total:number;page:number;pageSize:number;totalPages:number}}> {return this.request(path,'GET',undefined,true,true);}
  async uploadOfferImage(file:File):Promise<{imageKey:string;url:string}> {
    const data=new FormData();data.append('image',file);
    const send=()=>fetch(API_BASE_URL+'/admin/offer-images',{method:'POST',headers:{Authorization:'Bearer '+this.access},body:data});
    const accessAtStart=this.access;let response=await send();
    if(response.status===401&&this.refresh){if(accessAtStart===this.access)await this.refreshAccess();response=await send();}
    const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'Image upload failed.');return result.data;
  }
  async login(email:string,password:string) {const result=await this.request<{user:User;accessToken:string;refreshToken:string}>('/auth/login','POST',{email,password});if(result.user.role==='CUSTOMER')throw new Error('Use the customer mobile app for this account.');this.sessionVersion++;this.access=result.accessToken;this.refresh=result.refreshToken;this.user.set(result.user);}
  async logout(){try{await this.request('/auth/logout','POST',{refreshToken:this.refresh});}finally{this.clear();}}
  clear(){this.sessionVersion++;this.access='';this.refresh='';this.user.set(undefined);}
  async image(receiptId:string){const r=await fetch(API_BASE_URL+'/receipts/'+receiptId+'/image',{headers:{Authorization:'Bearer '+this.access}});if(!r.ok)throw new Error('Receipt image unavailable.');return URL.createObjectURL(await r.blob());}
  async qr(shopId:string){const r=await fetch(API_BASE_URL+'/manage/shops/'+shopId+'/qr',{headers:{Authorization:'Bearer '+this.access}});if(!r.ok)throw new Error('QR unavailable.');return URL.createObjectURL(await r.blob());}
}
