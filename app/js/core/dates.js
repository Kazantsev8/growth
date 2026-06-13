// Единые дата/время хелперы. Консолидация трёх дублей: tk* / sp* / nowStamp.

// = tkStamp: `YYYY-MM-DDTHH:MM:SS`
export function stamp(){ const d=new Date(), p=x=>String(x).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

// = nowStamp: `YYYY-MM-DD HH:MM`
export function stampMinute(){ const d=new Date(); const p=x=>String(x).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }

// = tkFmt
export function fmtStamp(ts){ return ts?String(ts).replace("T"," ").slice(0,16):"—"; }

// ——— sport day helpers ———
export const MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
export function pad(n){ return String(n).padStart(2,"0"); }
export function fmtDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
export function parseDate(s){ const [y,m,d]=String(s).split("-").map(Number); return new Date(y,(m||1)-1,d||1); }
export function today(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
export function weekStart(d){ const x=new Date(d); const off=(x.getDay()+6)%7; x.setDate(x.getDate()-off); x.setHours(0,0,0,0); return x; }
export function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
export function ruDate(s){ const d=parseDate(s); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`; }
