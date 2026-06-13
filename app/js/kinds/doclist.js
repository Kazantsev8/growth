import { listDir } from "../core/dav.js";
import { el, esc, setCount } from "../ui/dom.js";
import { renderDoc } from "./doc.js";

// ——— Notes: браузер конспектов (doclist) ———
export async function renderDocList(folder, host, a){
  setCount("");
  let items;
  try{ items = (await listDir(folder)).filter(x=>!x.isDir && x.name.toLowerCase().endsWith(".md")); }
  catch(e){ const code=(String(e.message).match(/HTTP (\d+)/)||[])[1];
    host.innerHTML = code==="404" ? `<div class="empty">Папка не найдена в vault.</div>` : `<div class="note err">Ошибка: ${esc(e.message)}</div>`; return; }
  const ex = new Set(((a&&a.exclude)||[]).map(x=>x.toLowerCase()));
  items = items.filter(x=>!ex.has(x.name.toLowerCase()));
  function showList(){
    setCount(items.length + (items.length===1?" note":" notes"));
    if(!items.length){ host.innerHTML=`<div class="empty">Конспектов нет.<br>Добавь .md-файлы в папку направления.</div>`; return; }
    host.innerHTML = `<div class="filelist"></div>`;
    const list = host.querySelector(".filelist");
    for(const it of items){
      const row = el(`<button class="frow frow-btn"><span class="fn">${esc(it.name.replace(/\.md$/i,""))}</span><span class="fm">md ›</span></button>`);
      row.onclick = ()=>openDoc(it);
      list.appendChild(row);
    }
  }
  async function openDoc(it){
    host.innerHTML = `<div class="loading"><div class="spin"></div> reading…</div>`;
    await renderDoc(folder + "/" + it.name, host);
    const back = el(`<button class="hbtn backbtn">← к списку</button>`);
    back.onclick = showList;
    host.insertBefore(back, host.firstChild);
  }
  showList();
}
