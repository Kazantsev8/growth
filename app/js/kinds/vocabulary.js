import { getText, putText } from "../core/dav.js";
import { bodyOf } from "../core/md.js";
import { stamp } from "../core/dates.js";
import { el, esc, setCount } from "../ui/dom.js";
import { showConfirm } from "../ui/modal.js";

// ——— рендереры по kind ———
function parseVocabTable(md){
  const lines = md.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.startsWith("|"));
  if(lines.length<2) return [];
  const cells = l => l.replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim().replace(/\\\|/g,"|"));
  const header = cells(lines[0]).map(h=>h.toLowerCase());
  const ix = n => header.indexOf(n);
  const iW=ix("word"), iT=ix("translation"), iM=ix("mastered"), iE=ix("example"), iN=ix("note"), iA=ix("added");
  const out=[];
  for(let i=1;i<lines.length;i++){
    if(/^[|\s:\-]+$/.test(lines[i])) continue;            // строка-разделитель
    const c = cells(lines[i]);
    const en = (iW>=0?c[iW]:c[0]) || "";
    if(!en) continue;
    const mv = (iM>=0?(c[iM]||""):"").toLowerCase();
    out.push({ en, ru:iT>=0?(c[iT]||""):"", mastered:/^(yes|x|true|1|✓)$/.test(mv),
      example:iE>=0?(c[iE]||""):"", note:iN>=0?(c[iN]||""):"", added:iA>=0?(c[iA]||""):"" });
  }
  return out;
}

function serializeVocab(words){
  const c = s => (s||"").replace(/\r?\n/g," ").replace(/\|/g,"\\|").trim();
  let out = "| Word | Translation | Mastered | Example | Note | Added |\n|---|---|---|---|---|---|\n";
  for(const w of words) out += `| ${c(w.en)} | ${c(w.ru)} | ${w.mastered?"yes":"no"} | ${c(w.example)} | ${c(w.note)} | ${c(w.added)} |\n`;
  return out;
}

async function renderVocabulary(filePath, host){
  let md;
  try{ md = await getText(filePath); }
  catch(e){
    const code=(String(e.message).match(/HTTP (\d+)/)||[])[1];
    if(code==="404"){ md = ""; }   // файла нет — начнём с пустого словаря, создадим при первом добавлении
    else { host.innerHTML = `<div class="note err">Ошибка: ${esc(e.message)}</div>`; return; }
  }
  const words = parseVocabTable(bodyOf(md));   // порядок файла сохраняем
  let saving = false, query = "", sortBy = "alpha", sortDir = "asc";

  host.innerHTML = `
    <div class="vtoolbar">
      <input id="vSearch" class="search" type="search" placeholder="поиск слова или перевода…" autocomplete="off">
      <button class="addbtn" id="vAdd" title="Добавить слово">+</button>
    </div>
    <div class="vsort">
      <span class="lbl">сорт</span>
      <select id="vSort">
        <option value="alpha">по алфавиту</option>
        <option value="added">по дате добавления</option>
      </select>
      <button class="dirbtn" id="vDir" title="Направление">↑</button>
    </div>
    <div id="vForm"></div>
    <div id="vCards"></div>`;
  const box = host.querySelector("#vCards");
  const formHost = host.querySelector("#vForm");

  function refreshCount(){ setCount(words.filter(w=>!w.mastered).length + " to master"); }

  async function save(){
    saving = true;
    try{ await putText(filePath, serializeVocab(words)); }
    catch(e){ alert("Не удалось сохранить: " + e.message); throw e; }
    finally{ saving = false; }
  }

  async function onDelete(w){
    if(saving) return;
    if(!(await showConfirm(`Удалить «${w.en}» из словаря?`))) return;
    const i = words.indexOf(w);
    if(i<0) return;
    words.splice(i,1);
    try{ await save(); refreshCount(); draw(); }
    catch(e){ words.splice(i,0,w); draw(); }   // откат при ошибке записи
  }

  function draw(){
    const q = query.trim().toLowerCase();
    const view = q ? words.filter(w => (w.en+" "+w.ru+" "+w.note+" "+w.example).toLowerCase().includes(q)) : words.slice();
    const dir = sortDir==="asc" ? 1 : -1;
    view.sort((a,b)=>{
      let c;
      if(sortBy==="added") c = String(a.added||"").localeCompare(String(b.added||""));   // пустые даты — в начале (asc) / в конце (desc)
      else                 c = a.en.localeCompare(b.en,'en');
      if(c===0) c = a.en.localeCompare(b.en,'en');                                        // вторичный ключ — слово
      return dir*c;
    });
    box.innerHTML = "";
    if(!view.length){ box.innerHTML = `<div class="empty">${words.length? "Ничего не найдено." : "Словарь пуст — добавь первое слово кнопкой +"}</div>`; return; }
    const wrap = document.createElement("div"); wrap.className = "cards";
    for(const w of view){
      const card = el(`<div class="card">
        <div class="card-top">
          <span class="word">${esc(w.en)}</span>
          <span class="card-right">
            <span class="tag ${w.mastered?"mastered":"learning"}">[${w.mastered?"MASTERED":"LEARNING"}]</span>
            <button class="del" title="Удалить">×</button>
          </span>
        </div>
        ${w.ru?`<div class="tr">${esc(w.ru)}</div>`:""}
        ${w.example?`<div class="ex"><span class="gt">&gt;</span>${esc(w.example)}</div>`:""}
        ${w.note?`<div class="note-line">${esc(w.note)}</div>`:""}
      </div>`);
      card.querySelector(".del").onclick = ()=>onDelete(w);
      wrap.appendChild(card);
    }
    box.appendChild(wrap);
  }

  function openForm(){
    formHost.innerHTML = `
      <div class="addform">
        <div class="grow">
          <div class="field"><label>Слово / фраза</label><input id="a_en" autocomplete="off"></div>
          <div class="field"><label>Перевод</label><input id="a_ru" autocomplete="off"></div>
        </div>
        <div class="field"><label>Пример (необязательно)</label><input id="a_ex" autocomplete="off"></div>
        <div class="field"><label>Заметка (необязательно)</label><input id="a_note" autocomplete="off"></div>
        <label class="chk"><input type="checkbox" id="a_m"> уже выучено</label>
        <div class="formbtns">
          <button class="btn" id="a_save">Добавить</button>
          <button class="btn ghost" id="a_cancel">Отмена</button>
        </div>
      </div>`;
    const enInp = formHost.querySelector("#a_en"); enInp.focus();
    formHost.querySelector("#a_cancel").onclick = ()=>{ formHost.innerHTML=""; };
    formHost.querySelector("#a_save").onclick = async ()=>{
      const en = enInp.value.trim(), ru = formHost.querySelector("#a_ru").value.trim();
      if(!en){ enInp.focus(); return; }
      if(words.some(w=>w.en.toLowerCase()===en.toLowerCase())){ alert("Такое слово уже есть в словаре."); return; }
      const w = { en, ru, mastered: formHost.querySelector("#a_m").checked,
        example: formHost.querySelector("#a_ex").value.trim(), note: formHost.querySelector("#a_note").value.trim(), added: stamp() };
      const btn = formHost.querySelector("#a_save"); btn.disabled = true; btn.textContent = "Сохраняю…";
      words.push(w);
      try{ await save(); formHost.innerHTML=""; query=""; host.querySelector("#vSearch").value=""; refreshCount(); draw(); }
      catch(e){ words.pop(); btn.disabled=false; btn.textContent="Добавить"; }
    };
  }

  host.querySelector("#vSearch").addEventListener("input", e=>{ query = e.target.value; draw(); });
  host.querySelector("#vAdd").onclick = openForm;
  host.querySelector("#vSort").addEventListener("change", e=>{ sortBy = e.target.value; draw(); });
  host.querySelector("#vDir").onclick = (e)=>{ sortDir = sortDir==="asc"?"desc":"asc"; e.currentTarget.textContent = sortDir==="asc"?"↑":"↓"; draw(); };
  refreshCount();
  draw();
}

export { renderVocabulary };
