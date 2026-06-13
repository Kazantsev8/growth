import { getText, putText } from "../core/dav.js";
import { stampMinute } from "../core/dates.js";
import { el, esc, setCount } from "../ui/dom.js";
import { showConfirm } from "../ui/modal.js";

function parseNotes(md){
  const chunks = md.split(/^##\s+/m);          // [0] = преамбула, дальше блоки заметок
  return chunks.slice(1).map(p=>{
    const nl = p.indexOf("\n");
    return nl<0 ? {date:p.trim(), text:""} : {date:p.slice(0,nl).trim(), text:p.slice(nl+1).trim()};
  });
}
function serializeNotes(notes){
  let out = "# English — backlog заметок\n\n> Идеи и мысли по развитию раздела English. Claude анализирует этот файл и предлагает улучшения. Новые заметки сверху.\n\n";
  for(const n of notes) out += `## ${n.date}\n\n${n.text}\n\n`;
  return out;
}

async function renderNotes(filePath, host){
  let md = "";
  try{ md = await getText(filePath); }
  catch(e){ const code=(String(e.message).match(/HTTP (\d+)/)||[])[1]; if(code!=="404"){ host.innerHTML=`<div class="note err">Ошибка: ${esc(e.message)}</div>`; return; } }
  const notes = parseNotes(md);   // новые сверху (как в файле)
  setCount(notes.length + (notes.length===1?" note":" notes"));

  host.innerHTML = `
    <div class="compose">
      <textarea id="nText" placeholder="идея по развитию English… (что улучшить, что добавить, что попробовать)"></textarea>
      <div class="formbtns"><button class="btn" id="nAdd">Добавить заметку</button></div>
    </div>
    <div id="nList"></div>`;
  const list = host.querySelector("#nList");
  const ta = host.querySelector("#nText");

  async function save(){ await putText(filePath, serializeNotes(notes)); }

  function draw(){
    list.innerHTML = "";
    if(!notes.length){ list.innerHTML = `<div class="empty">Пока пусто — запиши первую мысль выше.</div>`; return; }
    for(const n of notes){
      const card = el(`<div class="ncard">
        <div class="ncard-top"><span class="ndate">${esc(n.date)}</span><button class="del" title="Удалить">×</button></div>
        <div class="ntext">${esc(n.text)}</div></div>`);
      card.querySelector(".del").onclick = async ()=>{
        if(!(await showConfirm("Удалить эту заметку?"))) return;
        const i = notes.indexOf(n); if(i<0) return;
        notes.splice(i,1);
        try{ await save(); setCount(notes.length+(notes.length===1?" note":" notes")); draw(); }
        catch(e){ notes.splice(i,0,n); alert("Не удалось сохранить: "+e.message); draw(); }
      };
      list.appendChild(card);
    }
  }

  host.querySelector("#nAdd").onclick = async ()=>{
    const text = ta.value.trim(); if(!text) { ta.focus(); return; }
    const btn = host.querySelector("#nAdd"); btn.disabled=true; btn.textContent="Сохраняю…";
    const note = { date: stampMinute(), text };
    notes.unshift(note);
    try{ await save(); ta.value=""; setCount(notes.length+(notes.length===1?" note":" notes")); draw(); }
    catch(e){ notes.shift(); alert("Не удалось сохранить: "+e.message); }
    finally{ btn.disabled=false; btn.textContent="Добавить заметку"; }
  };
  draw();
}

export { renderNotes };
