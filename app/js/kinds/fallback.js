import { listDir } from "../core/dav.js";
import { esc, fmtSize, setCount } from "../ui/dom.js";

export async function renderFallback(m, host){
  const items = await listDir(m.path);
  setCount(items.filter(x=>!x.isDir).length+" files");
  let h=`<div class="kindnote">// рендерер для kind «${esc(m.kind||"—")}» появится на этапе трекеров — пока файлы</div>`;
  if(!items.length) h+=`<div class="empty">Папка пуста.</div>`;
  else{ h+=`<div class="filelist">`;
    for(const it of items) h+=`<div class="frow"><span class="fn">${it.isDir?"▸ ":""}${esc(it.name)}</span><span class="fm">${it.isDir?"dir":fmtSize(it.size)}</span></div>`;
    h+=`</div>`; }
  host.innerHTML=h;
}
