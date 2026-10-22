import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
@Directive({selector:'[dialogFocus]',standalone:true})
export class DialogFocus implements AfterViewInit,OnDestroy {
 private element:HTMLElement=inject(ElementRef).nativeElement;
 private previous=document.activeElement as HTMLElement|null;
 private overflow=document.body.style.overflow;
 ngAfterViewInit(){document.body.style.overflow='hidden';queueMicrotask(()=>{const target=this.element.querySelector<HTMLElement>('input:not([type="file"]),select,textarea,button');target?.focus();});}
 @HostListener('keydown',['$event']) trap(event:KeyboardEvent){
  if(event.key!=='Tab')return;
  const elements=Array.from(this.element.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(e=>e.getClientRects().length>0);
  const first=elements[0],last=elements[elements.length-1];
  if(!first){event.preventDefault();return;}
  if(event.shiftKey&&(document.activeElement===first||!this.element.contains(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 ngOnDestroy(){document.body.style.overflow=this.overflow;if(this.previous?.isConnected)this.previous.focus();}
}

