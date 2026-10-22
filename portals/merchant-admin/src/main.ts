import { ProvidersWorkspace } from './providers';
import { ConfirmService,ConfirmationDialog,LeaveGuard } from './confirmation';
import { SearchSelect } from './search-select';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, CanActivateFn,CanDeactivateFn, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Api, Purchase, Merchant } from './api';
import { canOpen } from './access';
import { OffersWorkspace } from './offers';
@Component({standalone:true,imports:[FormsModule],template:`<main class="login"><div class="brand">Parrot <span>Rewards</span></div><p class="eyebrow">PARTNER WORKSPACE</p><h1>Sign in to your workspace</h1><p>Manage your offers and verify customer discount claims.</p><form (ngSubmit)="login()"><label>Email<input type="email" name="email" [(ngModel)]="email" required autocomplete="username"></label><label>Password<input [type]="showPassword?'text':'password'" name="password" [(ngModel)]="password" required autocomplete="current-password"></label><button type="button" class="secondary small-button" (click)="showPassword=!showPassword">{{showPassword?'Hide password':'Show password'}}</button><p role="alert" class="error">{{error}}</p><button [disabled]="busy">{{busy?'Signing in…':'Sign in'}}</button></form><small>Parrot Rewards Partner Portal</small></main>`})
class Login {api=inject(Api);router=inject(Router);email='';password='';error='';busy=false;showPassword=false;async login(){if(this.busy)return;this.busy=true;try{await this.api.login(this.email,this.password);await this.router.navigateByUrl(this.api.user()?.role==='ADMIN'?'/admin/offers':'/merchant/claims');}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}}
@Component({standalone:true,imports:[CommonModule,FormsModule,SearchSelect],templateUrl:'./dashboard.html'})
class Dashboard {
 api=inject(Api);router=inject(Router);admin=this.api.user()?.role==='ADMIN';view='transactions';report:any={};transactions:Purchase[]=[];merchants:Merchant[]=[];rows:any[]=[];rules:any={};error='';notice='';busy=false;filter='';page=1;count=0;loading=false;search='';private listVersion=0;private searchTimer:ReturnType<typeof setTimeout>|undefined;pageSize=10;total=0;totalPages=1;resolutions:Record<string,string>={};branchDrafts:Record<string,{name:string,address:string}>={};
 branchDraft(id:string){return this.branchDrafts[id]??=( {name:'',address:''});}selected?:Purchase;receiptUrl='';reason='';shopName='';address='';merchantName='';category='';description='';staffEmail='';staffName='';staffPassword='';resolution='';rateBps=1000;maxAge=30;offerTitle='';offerDescription='';profileName=this.api.user()?.name??'';notifications=this.api.user()?.notificationEnabled??true;
 ngOnInit(){this.load();}
 async run(action:()=>Promise<void>){this.busy=true;this.error='';this.notice='';try{await action();}catch(e){this.error=(e as Error).message;}finally{this.busy=false;}}
 get lastRow(){return Math.min(this.page*this.pageSize,this.total);}
 selectView(view:string){if(this.busy)return;clearTimeout(this.searchTimer);this.listVersion++;this.close();this.view=view;this.page=1;this.search='';this.filter='';this.load();}
 rowSizeOptions=[10,20,50].map(value=>({value,label:String(value)}));
 statusOptions=[{value:'',label:'All statuses'},...['SUBMITTED','PROCESSING','NEEDS_REVIEW','VERIFIED','REJECTED','CANCELLED'].map(value=>({value,label:value.toLowerCase().replaceAll('_',' ')}))];
 searchChanged(){clearTimeout(this.searchTimer);this.listVersion++;this.loading=true;this.page=1;this.searchTimer=setTimeout(()=>this.load(),250);}
 filterChanged(){clearTimeout(this.searchTimer);this.page=1;this.load();}
 async load(){const version=++this.listVersion;const view=this.view;this.loading=true;this.error='';
 try{
 const query=new URLSearchParams({page:String(this.page),pageSize:String(this.pageSize),search:this.search.trim()});if(this.filter)query.set('status',this.filter);
 if(view==='shops'&&!this.admin){const merchants:Merchant[]=await this.api.request('/merchant/profile');if(version===this.listVersion)this.merchants=merchants.filter(m=>(m.name+' '+m.description+' '+m.shops.map(s=>s.name+' '+s.address).join(' ')).toLowerCase().includes(this.search.toLowerCase()));return;}
 const endpoint=view==='shops'?'/admin/merchants':view==='transactions'?'/transactions':['merchants','users','disputes','audit'].includes(view)?'/admin/'+view:'';
 if(endpoint){const result=await this.api.list(endpoint+'?'+query);if(version!==this.listVersion)return;this.total=result.meta.total;this.totalPages=result.meta.totalPages;if(this.page>this.totalPages){this.page=this.totalPages;await this.load();return;}if(view==='transactions')this.transactions=result.data;else if(view==='merchants'||view==='shops')this.merchants=result.data;else this.rows=result.data;}
 if(!Object.keys(this.report).length){const report=await this.api.request('/reports');if(version===this.listVersion)this.report=report;}
 if(view==='rules'){const rules=await this.api.request('/admin/rules');if(version===this.listVersion)this.rules=rules;}
 }catch(e){if(version===this.listVersion)this.error=(e as Error).message;}finally{if(version===this.listVersion)this.loading=false;}
 }

 async open(t:Purchase){await this.run(async()=>{this.close();this.selected=t;this.receiptUrl=await this.api.image(t.receiptId);});}
 close(){if(this.receiptUrl)URL.revokeObjectURL(this.receiptUrl);this.receiptUrl='';this.selected=undefined;this.reason='';}
 async mutate(path:string,method:string,body:unknown){await this.run(async()=>{await this.api.request(path,method,body);this.notice='Saved.';this.report={};});if(!this.error)await this.load();}
 async review(status:string){if(!this.selected)return;await this.mutate('/admin/transactions/'+this.selected.id+'/review','POST',{status,reason:this.reason});if(!this.error)this.close();}
 async dispute(){if(!this.selected)return;await this.mutate('/transactions/'+this.selected.id+'/disputes','POST',{reason:this.reason});if(!this.error)this.close();}
 async downloadQr(id:string){await this.run(async()=>{const url=await this.api.qr(id);const a=document.createElement('a');a.href=url;a.download='shop-qr.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);this.notice='QR downloaded. Open the SVG to print.';});}
 async rotateQr(id:string){await this.mutate('/manage/shops/'+id+'/qr/rotate','POST',{});}
 async saveMerchant(m:Merchant){await this.mutate('/merchants/'+m.id,'PATCH',{category:m.category,description:m.description});}
 async saveShop(s:any){await this.mutate('/manage/shops/'+s.id,'PATCH',{name:s.name,address:s.address,active:s.active});}
 async addOffer(id:string){await this.mutate('/manage/shops/'+id+'/offers','POST',{title:this.offerTitle,description:this.offerDescription});}
 async addShop(id:string){await this.mutate('/merchants/'+id+'/shops','POST',{name:this.branchDraft(id).name,address:this.branchDraft(id).address});if(!this.error)delete this.branchDrafts[id];}
 async addMerchant(){await this.mutate('/admin/merchants','POST',{name:this.merchantName,category:this.category,description:this.description,...(this.staffEmail?{staffEmail:this.staffEmail}:{})});}
 async addStaff(){await this.mutate('/admin/merchant-users','POST',{name:this.staffName,email:this.staffEmail,password:this.staffPassword});this.staffPassword='';}
 async approve(m:Merchant){await this.mutate('/admin/merchants/'+m.id+'/approval','PATCH',{approved:!m.approved});}
 async toggleUser(u:any){await this.mutate('/admin/users/'+u.id,'PATCH',{active:!u.active});}
 async resolve(id:string){await this.mutate('/admin/disputes/'+id,'PATCH',{resolution:this.resolution});if(!this.error)delete this.resolutions[id];}
 async saveRate(){await this.mutate('/admin/rules/commission','POST',{rateBps:this.rateBps});}
 async saveAge(){await this.mutate('/admin/settings','PATCH',{maxReceiptAgeDays:this.maxAge});}
 async saveProfile(){await this.run(async()=>{const u=await this.api.request<any>('/me','PATCH',{name:this.profileName,notificationEnabled:this.notifications});this.api.user.set(u);this.notice='Preferences saved.';});}
 ngOnDestroy(){clearTimeout(this.searchTimer);this.listVersion++;this.close();}
}
const guard=(area:'merchant'|'admin'):CanActivateFn=>()=>{const api=inject(Api);return canOpen(api.user()?.role,area)||inject(Router).createUrlTree(['/login']);};
@Component({selector:'app-root',standalone:true,imports:[RouterOutlet,RouterLink,RouterLinkActive,ConfirmationDialog],template:`@if(api.user()){<header><a class="brand" [routerLink]="api.user()?.role==='ADMIN'?'/admin/offers':'/merchant/claims'">Parrot <span>Rewards</span></a><nav aria-label="Main menu"><a routerLinkActive="active" ariaCurrentWhenActive="page" [routerLink]="api.user()?.role==='ADMIN'?'/admin/offers':'/merchant/claims'">{{api.user()?.role==='ADMIN'?'Manage offers':'Verify claims'}}</a> <a routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" ariaCurrentWhenActive="page" [routerLink]="api.user()?.role==='ADMIN'?'/admin':'/merchant'">Purchase records</a>@if(api.user()?.role==='ADMIN'){<a routerLink="/admin/providers" routerLinkActive="active">Providers</a>}</nav><span>{{api.user()?.name}}</span><button class="secondary" (click)="logout()">Sign out</button></header>}<router-outlet/><app-confirmation/>`})
class App {api=inject(Api);router=inject(Router);async logout(){if(await this.router.navigateByUrl('/login'))await this.api.logout();}}
const leave:CanDeactivateFn<LeaveGuard>=(component)=>component.canLeave();
bootstrapApplication(App,{providers:[provideRouter([{path:'admin/providers',component:ProvidersWorkspace,canActivate:[guard('admin')],canDeactivate:[leave]},{path:'admin/offers',component:OffersWorkspace,canActivate:[guard('admin')],canDeactivate:[leave]},{path:'merchant/claims',component:OffersWorkspace,canActivate:[guard('merchant')]},{path:'login',component:Login},{path:'merchant',component:Dashboard,canActivate:[guard('merchant')]},{path:'admin',component:Dashboard,canActivate:[guard('admin')]},{path:'**',redirectTo:'login'}])]}).catch(console.error);

