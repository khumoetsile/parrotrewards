export function dateToInput(value:string|null):string {
 if(!value)return '';
 const date=new Date(value);
 return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,-1);
}
export function dateFromInput(value:string):string|null {return value?new Date(value).toISOString():null;}
