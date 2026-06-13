import { el } from "./dom.js";

export function pickFiles(cb){
  const inp = el(`<input type="file" multiple style="position:fixed;left:-9999px">`);
  document.body.appendChild(inp);
  inp.onchange = ()=>{ const fs = Array.from(inp.files); inp.remove(); cb(fs); };
  inp.click();
}
