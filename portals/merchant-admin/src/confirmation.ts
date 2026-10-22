import { Injectable,Component,inject,signal } from '@angular/core';
import { DialogFocus } from './dialog-focus';
export interface Confirmation {title:string;message:string;confirmLabel:string;danger?:boolean}
@Injectable({providedIn:'root'})
export class ConfirmService {
 state=signal<Confirmation|null>(null);private resolve?:(value:boolean)=>void;
 ask(config:Confirmation):Promise<boolean>{if(this.state())return Promise.resolve(false);this.state.set(config);return new Promise(resolve=>this.resolve=resolve);}
 finish(value:boolean){const resolve=this.resolve;this.resolve=undefined;this.state.set(null);resolve?.(value);}
}
@Component({selector:'app-confirmation',standalone:true,imports:[DialogFocus],template:`@if(confirm.state();as state){<div class="editor-backdrop"><section class="offer-editor removal-dialog" dialogFocus role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" (keydown.escape)="confirm.finish(false)"><h2 id="confirmation-title">{{state.title}}</h2><p id="confirmation-description">{{state.message}}</p><div class="editor-actions"><button class="secondary" (click)="confirm.finish(false)">Keep working</button><button [class.danger]="state.danger" (click)="confirm.finish(true)">{{state.confirmLabel}}</button></div></section></div>}`})
export class ConfirmationDialog {confirm=inject(ConfirmService);}
export interface LeaveGuard {canLeave():boolean|Promise<boolean>}
