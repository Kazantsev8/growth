// ——— утилиты ———
export function esc(s){ return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
export function el(h){ const t=document.createElement("template"); t.innerHTML=h.trim(); return t.content.firstChild; }
export function fmtSize(n){ if(n==null)return""; if(n<1024)return n+" B"; if(n<1048576)return (n/1024).toFixed(1)+" KB"; return (n/1048576).toFixed(1)+" MB"; }
export function setCount(v){ const c=document.getElementById("secCount"); if(c) c.textContent=v||""; }
