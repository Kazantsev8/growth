import { getText, listDir } from "../core/dav.js";
import { bodyOf } from "../core/md.js";
import { esc, setCount } from "../ui/dom.js";

export async function renderChecklist(m, host){
  const files = (await listDir(m.path)).filter(x=>!x.isDir && x.name.toLowerCase().endsWith(".md"));
  if(!files.length){ host.innerHTML=`<div class="empty">Чеклист пуст.<br>Добавь <b>.md</b>-файл со строками <b>- [ ]</b> / <b>- [x]</b>.</div>`; return; }
  const file = files.find(x=>x.name.toLowerCase()===m.id+".md") || files[0];
  const md = bodyOf(await getText(file.path));
  const lines = [...md.matchAll(/^\s*[-*]\s*\[([ xX])\]\s+(.*)$/gm)].map(mm=>({done:/x/i.test(mm[1]), text:mm[2].trim()}));
  if(!lines.length){ host.innerHTML=`<div class="empty">В файле нет пунктов <b>- [ ]</b> / <b>- [x]</b>.</div>`; return; }
  const done=lines.filter(l=>l.done).length, total=lines.length, pct=Math.round(done/total*100);
  setCount(done+" / "+total);
  const SEG=24, on=Math.round(pct/100*SEG);
  let bar=`<div class="segbar">`; for(let i=0;i<SEG;i++) bar+=`<div class="seg ${i<on?"on":""}"></div>`; bar+=`</div>`;
  let list=`<div class="checklist">`;
  for(const l of lines) list+=`<div class="citem ${l.done?"done":"todo"}"><span class="cbox ${l.done?"done":"todo"}">[${l.done?"x":" "}]</span><span class="ctext">${esc(l.text)}</span></div>`;
  host.innerHTML=`<div class="progress-label">Learning path · <b>${pct}%</b></div>${bar}${list}</div>`;
}
