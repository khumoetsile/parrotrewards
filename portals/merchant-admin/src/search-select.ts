import { Component, ElementRef, EventEmitter, HostListener, Input, Output, forwardRef, inject, booleanAttribute, afterNextRender, Injector } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
export interface SelectOption {value:string|number;label:string;description?:string}
@Component({selector:'app-search-select',standalone:true,imports:[FormsModule],providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SearchSelect),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>SearchSelect),multi:true}],template:`
<div class="search-select" [class.disabled]="disabled" [class.opens-up]="opensUp">
<button type="button" class="select-trigger" role="combobox" aria-haspopup="listbox" [attr.aria-label]="label" [attr.aria-required]="required" [attr.aria-expanded]="open" [attr.aria-controls]="listId" [disabled]="disabled" (click)="toggle()" (keydown)="triggerKey($event)"><span [class.placeholder]="!selected">{{selected?.label || placeholder}}</span><span aria-hidden="true">⌄</span></button>
@if(open){<div class="select-popover" popover="manual" [style.left.px]="panelLeft" [style.top.px]="panelTop" [style.width.px]="panelWidth"><input class="select-search" type="search" role="combobox" aria-expanded="true" [attr.aria-controls]="listId" [attr.aria-activedescendant]="filtered.length?listId+'-'+active:null" [attr.aria-label]="'Search '+label" placeholder="Type to search…" [(ngModel)]="query" [ngModelOptions]="{standalone:true}" (ngModelChange)="queryChanged()" (keydown)="searchKey($event)" autocomplete="off">
<div class="select-options" role="listbox" [id]="listId" [attr.aria-label]="label">@for(option of filtered;track option.value;let index=$index){<button type="button" role="option" [id]="listId+'-'+index" [attr.aria-selected]="value===option.value" [class.active]="index===active" (mouseenter)="active=index" (click)="choose(option)"><span>{{option.label}}</span>@if(option.description){<small>{{option.description}}</small>}@if(value===option.value){<span class="selection-check" aria-hidden="true">✓</span>}</button>}@empty{<p class="select-empty" role="status">{{loading?'Searching…':'No matching options.'}}</p>}</div>
@if(hasMore){<button type="button" class="select-create" [disabled]="loading" (click)="moreRequested.emit()">{{loading?'Loading…':'Load more options'}}</button>}@if(allowCreate){<button type="button" class="select-create" (click)="create()">+ {{query.trim()?'Create “'+query.trim()+'”':'Create a category'}}</button>}
<small class="select-help">↑ ↓ to browse · Enter to select · Esc to close</small></div>}
</div>`})
export class SearchSelect implements ControlValueAccessor,Validator {
 private host:ElementRef<HTMLElement>=inject(ElementRef);private injector=inject(Injector);private static nextId=0;listId='select-list-'+SearchSelect.nextId++;
 @Input() options:SelectOption[]=[];@Input() label='Options';@Input() placeholder='Select an option';@Input({transform:booleanAttribute}) required=false;@Input({transform:booleanAttribute}) allowCreate=false;
 @Input() remote=false;@Input() loading=false;@Input() hasMore=false;@Output() queryRequested=new EventEmitter<string>();@Output() moreRequested=new EventEmitter<void>();
 @Output() createRequested=new EventEmitter<string>();
 panelLeft=0;panelTop=0;panelWidth=220;value:string|number|null=null;disabled=false;open=false;opensUp=false;query='';active=0;
 onChange: (value:any)=>void=()=>{};onTouched=()=>{};
 get selected(){return this.options.find(option=>option.value===this.value);}
 get filtered(){if(this.remote)return this.loading?[]:this.options;const term=this.query.trim().toLocaleLowerCase();return this.options.filter(option=>!term||(option.label+' '+(option.description||'')).toLocaleLowerCase().includes(term));}
 queryChanged(){this.active=0;if(this.remote)this.queryRequested.emit(this.query);}
 writeValue(value:string|number|null){this.value=value;}
 registerOnChange(fn:(value:any)=>void){this.onChange=fn;}registerOnTouched(fn:()=>void){this.onTouched=fn;}
 setDisabledState(disabled:boolean){this.disabled=disabled;if(disabled)this.open=false;}
 validate(control:AbstractControl):ValidationErrors|null{return this.required&&(control.value===null||control.value===undefined||control.value==='')?{required:true}:null;}
 toggle(){
  if(this.disabled)return;if(this.open){this.close();return;}
  this.open=true;this.query='';if(this.remote)this.queryRequested.emit('');this.active=Math.max(0,this.options.findIndex(option=>option.value===this.value));
  const rect=this.host.nativeElement.getBoundingClientRect();
  this.panelWidth=Math.min(Math.max(rect.width,220),window.innerWidth-24);
  this.panelLeft=Math.max(12,Math.min(rect.left,window.innerWidth-this.panelWidth-12));
  this.panelTop=rect.bottom+5;this.opensUp=rect.bottom+340>window.innerHeight;
  afterNextRender(()=>{
    if(!this.open)return;
    const popup=this.host.nativeElement.querySelector<HTMLElement>('.select-popover');
    popup?.showPopover?.();
    if(popup){const height=popup.getBoundingClientRect().height;popup.style.top=(this.opensUp?Math.max(12,rect.top-height-5):Math.min(rect.bottom+5,window.innerHeight-height-12))+'px';}
    this.host.nativeElement.querySelector<HTMLInputElement>('.select-search')?.focus();
  },{injector:this.injector});
 }
 close(restore=false){this.host.nativeElement.querySelector<HTMLElement>('.select-popover')?.hidePopover?.();this.open=false;this.onTouched();if(restore)this.host.nativeElement.querySelector<HTMLButtonElement>('.select-trigger')?.focus();}
 choose(option:SelectOption){this.value=option.value;this.onChange(option.value);this.close(true);}
 create(){const name=this.query.trim();this.close();this.createRequested.emit(name);}
 triggerKey(event:KeyboardEvent){if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(!this.open)this.toggle();}}
 searchKey(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.close(true);}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const count=this.filtered.length;this.active=count?(this.active+(event.key==='ArrowDown'?1:-1)+count)%count:0;queueMicrotask(()=>this.host.nativeElement.querySelector<HTMLElement>('#'+this.listId+'-'+this.active)?.scrollIntoView({block:'nearest'}));}else if(event.key==='Enter'){event.preventDefault();event.stopPropagation();const option=this.filtered[this.active];if(option)this.choose(option);else if(this.allowCreate)this.create();}else if(event.key==='Tab'){this.close();}}
 @HostListener('window:resize') resized(){if(this.open)this.close();}
 private scrollHandler=(event:Event)=>{if(this.open&&!this.host.nativeElement.contains(event.target as Node))this.close();};
 ngOnInit(){document.addEventListener('scroll',this.scrollHandler,true);}
 ngOnDestroy(){document.removeEventListener('scroll',this.scrollHandler,true);}
 @HostListener('document:pointerdown',['$event']) outside(event:Event){if(this.open&&!this.host.nativeElement.contains(event.target as Node))this.close();}
}
