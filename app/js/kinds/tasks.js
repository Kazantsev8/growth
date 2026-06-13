import { dav, getText, putText, listDir, ensureDir, putBytes, davDelete } from "../core/dav.js";
import { bodyOf, parseFrontmatter } from "../core/md.js";
import { stamp, fmtStamp } from "../core/dates.js";
import { el, esc, setCount } from "../ui/dom.js";
import { showConfirm } from "../ui/modal.js";
import { pickFiles } from "../ui/files.js";

// ——— Tasks ———
const TK_TYPES = ["simple","checklist","steps"];
const TK_TYPE_LABEL = { simple:"простая", checklist:"чеклист", steps:"шаги" };
const TK_STATUS_LABEL = { todo:"to do", in_progress:"in progress", done:"done" };
const TK_PAGE = 10;
const TK_IMG_EXT = ["png","jpg","jpeg","gif","webp","svg","bmp","heic","heif"];

function tkGuessType(fn){ const e=(String(fn).split(".").pop()||"").toLowerCase(); return TK_IMG_EXT.indexOf(e)>=0?"image/"+e:""; }
function tkIsImg(a){ return !!a && (((a.type||"").indexOf("image/")===0) || tkGuessType(a.name).indexOf("image/")===0); }
function tkStatusOf(t){ const h=t.history; return (h&&h.length)?h[h.length-1].status:(t.status||"todo"); }
function tkChangedAt(t){ const h=t.history; return (h&&h.length)?h[h.length-1].at:t.opened_at; }
function tkIsClosed(t){ return !!t.closed_at; }
function tkProgress(t){ const it=t.items||[]; if(!it.length) return null; const d=it.filter(i=>i.done).length; return {done:d,total:it.length,pct:Math.round(d/it.length*100)}; }
function tkAttPath(t,name){ return "../Documents/"+t.name+"/"+String(name).replace(/ /g,"%20"); }
function tkAttLine(a,t){ return (tkIsImg(a)?"- !":"- ")+"["+a.name+"]("+tkAttPath(t,a.name)+")"; }
function tkSetStatus(t,s){ if(tkStatusOf(t)===s) return; const at=stamp(); if(!Array.isArray(t.history)) t.history=[]; t.history.push({status:s,at}); t.status=s; t.closed_at = (s==="done")?at:""; }
// описание для любого типа: у simple — тело, у списочных — intro (текст до списка)
function tkGetDesc(t){ return t.type==="simple" ? (t.description||"") : (t.intro||""); }
function tkSetDesc(t,v){ if(t.type==="simple") t.description=v; else t.intro=v; }

function tkParseAtts(text){ const out=[], re=/^\s*-\s*!?\[[^\]]*\]\(([^)]+)\)\s*$/gm; let m;
  while((m=re.exec(text))){ const fn=decodeURIComponent(m[1].split("/").pop().replace(/%20/g," ")); out.push({name:fn,type:tkGuessType(fn)}); } return out; }

function tkParse(fileName, md){
  const fm = parseFrontmatter(md) || {};
  const body = bodyOf(md);
  const idm = fileName.match(/(\d+)/);
  const t = { fileName, name:fileName.replace(/\.md$/i,""), id:idm?+idm[1]:0, fm,
    title: fm.title || fileName.replace(/\.md$/i,""),
    type: TK_TYPES.indexOf(fm.type)>=0 ? fm.type : "checklist",
    status: fm.status || "todo", opened_at: fm.opened_at || "", closed_at: fm.closed_at || "",
    history: Array.isArray(fm.history) ? fm.history : [],
    description:"", attachments:[], items:[], intro:"", outro:"" };
  if(t.type==="simple"){
    const idx = body.search(/^##\s+Файлы\s*$/m);
    let desc = body, files = "";
    if(idx>=0){ desc = body.slice(0,idx); files = body.slice(idx).replace(/^##\s+Файлы\s*$/m,""); }
    t.description = desc.replace(/^\s+|\s+$/g,"");
    t.attachments = tkParseAtts(files);
  } else {
    const lines = body.split(/\r?\n/); let i=0; const intro=[];
    while(i<lines.length && !/^\s*-\s*\[[ xX]\]/.test(lines[i])){ intro.push(lines[i]); i++; }
    t.intro = intro.join("\n").replace(/^\s+|\s+$/g,"");
    let cur=null;
    for(; i<lines.length; i++){
      const ln=lines[i];
      const mi=ln.match(/^\s*-\s*\[([ xX])\]\s?(.*)$/);
      if(mi){ cur={text:mi[2],done:/x/i.test(mi[1]),note:"",attachments:[]}; t.items.push(cur); continue; }
      if(cur){
        const mn=ln.match(/^\s+>\s?(.*)$/);
        if(mn){ cur.note = cur.note ? cur.note+"\n"+mn[1] : mn[1]; continue; }
        const ma=ln.match(/^\s+-\s*!?\[[^\]]*\]\(([^)]+)\)\s*$/);
        if(ma){ const fn=decodeURIComponent(ma[1].split("/").pop().replace(/%20/g," ")); cur.attachments.push({name:fn,type:tkGuessType(fn)}); continue; }
        if(ln.trim()==="") continue;
        t.outro = (t.outro ? t.outro+"\n" : "") + ln;
      }
    }
  }
  return t;
}

function tkSerialize(t){
  const fm = Object.assign({}, t.fm);          // сохраняем неизвестные ключи (толерантность)
  fm.title=t.title; fm.type=t.type; fm.status=tkStatusOf(t); fm.opened_at=t.opened_at; fm.closed_at=t.closed_at||""; fm.history=t.history;
  let y; try{ y = jsyaml.dump(fm,{lineWidth:-1}).replace(/\n+$/,""); }catch(e){ y="title: "+t.title+"\ntype: "+t.type; }
  let body="";
  if(t.type==="simple"){
    if(t.description && t.description.trim()) body += "\n"+t.description.trim()+"\n";
    if((t.attachments||[]).length) body += "\n## Файлы\n"+t.attachments.map(a=>tkAttLine(a,t)).join("\n")+"\n";
  } else {
    if(t.intro) body += "\n"+t.intro+"\n";
    const itemsMd = (t.items||[]).map(it=>{
      let s = "- ["+(it.done?"x":" ")+"] "+(it.text||"");
      if(t.type==="steps"){
        if(it.note) s += "\n"+it.note.split("\n").map(l=>"  > "+l).join("\n");
        if((it.attachments||[]).length) s += "\n"+it.attachments.map(a=>"  "+tkAttLine(a,t)).join("\n");
      }
      return s;
    }).join("\n");
    body += "\n"+itemsMd+"\n";
    if(t.outro) body += "\n"+t.outro+"\n";
  }
  return "---\n"+y+"\n---\n"+body;
}

async function tkLoadDir(dir){
  let items;
  try{ items=(await listDir(dir)).filter(x=>!x.isDir && /\.md$/i.test(x.name)); }
  catch(e){ if(/HTTP 404/.test(String(e.message))) return []; throw e; }
  const out=[];
  for(const it of items){ try{ const md=await getText(dir+"/"+it.name); const t=tkParse(it.name, md); t._dir=dir; out.push(t); }catch(e){} }
  return out;
}

async function renderTasks(base, host){
  const A = base+"/active", AR = base+"/archived", DOCS = base+"/Documents";
  setCount("");
  host.innerHTML = `<div class="loading"><div class="spin"></div> loading tasks…</div>`;
  let active, archived;
  try{ active = await tkLoadDir(A); archived = await tkLoadDir(AR); }
  catch(e){ const code=(String(e.message).match(/HTTP (\d+)/)||[])[1];
    host.innerHTML = `<div class="note err">${code?"Ошибка загрузки задач (HTTP "+code+")":"Ошибка: "+esc(e.message)}</div>`; return; }

  let view="list", tab="active", sortBy="created", sortDir="desc", statusFilter="all", page=1, detailName=null;
  const saveTimers = {};

  const fileOf = t => (t._dir||A)+"/"+t.fileName;
  const findTask = n => active.concat(archived).find(t=>t.name===n);
  const nextId = ()=>{ let mx=0; active.concat(archived).forEach(t=>{ if(t.id>mx) mx=t.id; }); return mx+1; };
  async function tkSave(t){ await putText(fileOf(t), tkSerialize(t)); }
  function schedule(t, statusEl){ clearTimeout(saveTimers[t.name]); if(statusEl) statusEl.textContent="сохранение…";
    saveTimers[t.name]=setTimeout(async()=>{ try{ await tkSave(t); if(statusEl) statusEl.textContent="сохранено"; }catch(e){ if(statusEl) statusEl.textContent="ошибка сохранения"; } }, 700); }
  async function flush(t){ clearTimeout(saveTimers[t.name]); await tkSave(t); }
  async function tkBlobUrl(t, name){ const r=await dav("GET", DOCS+"/"+t.name+"/"+name); if(!r.ok) throw new Error("HTTP "+r.status); return URL.createObjectURL(await r.blob()); }
  async function openAtt(t, a){ try{ const u=await tkBlobUrl(t,a.name); window.open(u,"_blank"); }catch(e){ alert("Не удалось открыть файл: "+e.message); } }

  function render(){ if(view==="detail"){ const t=findTask(detailName); if(t){ drawDetail(t); return; } } view="list"; drawList(); }

  // ——— список ———
  function drawList(){
    host.innerHTML = "";
    const st = el(`<div class="subtabs"></div>`);
    const sa = el(`<button class="subtab ${tab==="active"?"active":""}">Текущие · ${active.length}</button>`);
    const sr = el(`<button class="subtab ${tab==="archive"?"active":""}">Архив · ${archived.length}</button>`);
    sa.onclick=()=>{ tab="active"; page=1; drawList(); };
    sr.onclick=()=>{ tab="archive"; page=1; drawList(); };
    st.append(sa,sr); host.appendChild(st);

    if(tab==="active"){
      const btn = el(`<button class="btn tk-create">＋ Создать задачу</button>`);
      btn.onclick = openCreate; host.appendChild(btn);

      const f = el(`<div class="tk-filters"></div>`);
      const sortSel = el(`<select><option value="created">сорт: дата создания</option><option value="status_changed">сорт: смена статуса</option><option value="id">сорт: id</option></select>`);
      sortSel.value=sortBy; sortSel.onchange=()=>{ sortBy=sortSel.value; drawList(); };
      const dirBtn = el(`<button class="btn ghost tk-mini">${sortDir==="desc"?"↓":"↑"}</button>`);
      dirBtn.onclick=()=>{ sortDir = sortDir==="desc"?"asc":"desc"; drawList(); };
      const statSel = el(`<select><option value="all">статус: все</option><option value="todo">статус: to do</option><option value="in_progress">статус: in progress</option></select>`);
      statSel.value=statusFilter; statSel.onchange=()=>{ statusFilter=statSel.value; drawList(); };
      f.append(sortSel,dirBtn,statSel); host.appendChild(f);

      let list = active.slice();
      if(statusFilter!=="all") list=list.filter(t=>tkStatusOf(t)===statusFilter);
      const key = t => sortBy==="id" ? t.id : sortBy==="status_changed" ? tkChangedAt(t) : t.opened_at;
      list.sort((a,b)=>{ const ka=key(a), kb=key(b); const c = ka>kb?1:ka<kb?-1:0; return sortDir==="asc"?c:-c; });
      setCount(active.length+" active");
      if(!list.length){ host.appendChild(el(`<div class="empty">${active.length?"Ничего не подходит под фильтр.":"Нет активных задач."}</div>`)); return; }
      list.forEach(t=>host.appendChild(card(t)));
    } else {
      const list = archived.slice().sort((a,b)=>String(b.closed_at).localeCompare(String(a.closed_at)));
      setCount(archived.length+" archived");
      if(!list.length){ host.appendChild(el(`<div class="empty">Архив пуст.</div>`)); return; }
      const shown = list.slice(0, page*TK_PAGE);
      shown.forEach(t=>host.appendChild(card(t)));
      if(list.length>shown.length){ const m=el(`<button class="btn ghost tk-more">Показать ещё (${list.length-shown.length})</button>`); m.onclick=()=>{ page++; drawList(); }; host.appendChild(m); }
    }
  }

  function card(t){
    const c = el(`<div class="tk-card"></div>`);
    const stat = tkStatusOf(t);
    let top = `<span class="tk-id">${esc(t.name)}</span><span class="tk-badge">${esc(TK_TYPE_LABEL[t.type]||t.type)}</span>`;
    if(!tkIsClosed(t)) top += `<span class="tk-badge st-${stat}">${esc(TK_STATUS_LABEL[stat]||stat)}</span>`;
    c.appendChild(el(`<div class="tk-card-top">${top}</div>`));
    c.appendChild(el(`<div class="tk-card-title">${esc(t.title)}</div>`));
    const pr = tkProgress(t);
    if(pr){ const SEG=20, on=Math.round(pr.pct/100*SEG); let b=`<div class="tk-prog">${pr.done} / ${pr.total} · ${pr.pct}%</div><div class="tk-bar">`;
      for(let i=0;i<SEG;i++) b+=`<span class="${i<on?"on":""}"></span>`; b+=`</div>`; c.appendChild(el(b)); }
    const meta = tkIsClosed(t) ? `создана: ${fmtStamp(t.opened_at)} · закрыта: ${fmtStamp(t.closed_at)}` : `создана: ${fmtStamp(t.opened_at)} · статус с: ${fmtStamp(tkChangedAt(t))}`;
    c.appendChild(el(`<div class="tk-meta">${esc(meta)}</div>`));
    c.onclick=()=>{ detailName=t.name; view="detail"; render(); };
    return c;
  }

  // ——— деталь ———
  function drawDetail(t){
    host.innerHTML = "";
    const back = el(`<button class="tk-back">← к списку</button>`); back.onclick=()=>{ view="list"; render(); }; host.appendChild(back);
    const stat = tkStatusOf(t);
    let hd = `<span class="tk-id">${esc(t.name)}</span><span class="tk-badge">${esc(TK_TYPE_LABEL[t.type]||t.type)}</span>`;
    if(!tkIsClosed(t)) hd += `<span class="tk-badge st-${stat}">${esc(TK_STATUS_LABEL[stat]||stat)}</span>`;
    hd += `<span class="tk-save" id="tkSave"></span>`;
    host.appendChild(el(`<div class="tk-dhead">${hd}</div>`));
    const saveEl = host.querySelector("#tkSave");

    const title = el(`<input class="tk-title" value="${esc(t.title)}">`);
    title.addEventListener("input", ()=>{ t.title=title.value; schedule(t,saveEl); });
    title.addEventListener("blur", ()=>{ flush(t).then(()=>{ if(saveEl) saveEl.textContent="сохранено"; }).catch(()=>{}); });
    host.appendChild(title);

    const meta = tkIsClosed(t) ? `создана ${fmtStamp(t.opened_at)}  ·  закрыта ${fmtStamp(t.closed_at)}` : `создана ${fmtStamp(t.opened_at)}  ·  статус с ${fmtStamp(tkChangedAt(t))}`;
    host.appendChild(el(`<div class="tk-dmeta">${esc(meta)}</div>`));

    if(!tkIsClosed(t)){
      host.appendChild(el(`<div class="tk-sec">Статус</div>`));
      const seg = el(`<div class="tk-seg"></div>`);
      ["todo","in_progress"].forEach(s=>{ const b=el(`<button class="${tkStatusOf(t)===s?"on":""}">${TK_STATUS_LABEL[s]}</button>`);
        b.onclick=async()=>{ tkSetStatus(t,s); try{ await flush(t); }catch(e){ alert("Не удалось сохранить статус: "+e.message); } render(); }; seg.appendChild(b); });
      host.appendChild(seg);
    }

    // Описание — для любого типа
    host.appendChild(el(`<div class="tk-sec">Описание</div>`));
    const d = el(`<textarea class="tk-desc"></textarea>`); d.value = tkGetDesc(t);
    d.addEventListener("input", ()=>{ tkSetDesc(t,d.value); schedule(t,saveEl); });
    d.addEventListener("blur", ()=>{ flush(t).catch(()=>{}); });
    host.appendChild(d);

    if(t.type==="simple"){
      host.appendChild(el(`<div class="tk-sec">Файлы</div>`));
      if(!t.attachments) t.attachments=[];
      host.appendChild(attachEditor(t, t.attachments, saveEl));
    } else {
      drawItems(t, saveEl);
    }

    const act = el(`<div class="tk-actions"></div>`);
    if(!tkIsClosed(t)){
      const close = el(`<button class="btn">Закрыть задачу</button>`);
      close.onclick = async()=>{ const pr=tkProgress(t); if(pr && pr.done<pr.total){ if(!(await showConfirm("Есть незавершённые пункты. Всё равно закрыть?","Закрыть"))) return; } await moveClose(t); };
      act.appendChild(close);
    } else {
      const re = el(`<button class="btn ghost">Вернуть в активные</button>`);
      re.onclick = ()=> moveReopen(t); act.appendChild(re);
    }
    const del = el(`<button class="btn ghost tk-danger">Удалить</button>`);
    del.onclick = async()=>{ if(!(await showConfirm("Удалить задачу безвозвратно? Прикреплённые файлы останутся в Documents.","Удалить"))) return; await removeTask(t); };
    act.appendChild(del);
    host.appendChild(act);

    const hist = (t.history||[]).map(h=>fmtStamp(h.at)+"  →  "+(TK_STATUS_LABEL[h.status]||h.status)).join("\n");
    host.appendChild(el(`<details class="tk-src"><summary>история статусов (${(t.history||[]).length})</summary><pre>${esc(hist)}</pre></details>`));
    host.appendChild(el(`<details class="tk-src"><summary>показать .md (${tkIsClosed(t)?"archived":"active"}/${esc(t.fileName)})</summary><pre>${esc(tkSerialize(t))}</pre></details>`));
  }

  function drawItems(t, saveEl){
    host.appendChild(el(`<div class="tk-sec">${t.type==="steps"?"Шаги":"Пункты"}</div>`));
    const box = el(`<div></div>`);
    (t.items||[]).forEach((it,idx)=> box.appendChild(itemRow(t,it,idx,saveEl)));
    host.appendChild(box);
    const add = el(`<div class="tk-addrow"><input placeholder="${t.type==="steps"?"Новый шаг…":"Новый пункт…"}"><button class="btn tk-mini">＋</button></div>`);
    const ai = add.querySelector("input");
    const go = async()=>{ const v=ai.value.trim(); if(!v) return; t.items.push({text:v,done:false,note:"",attachments:[]}); ai.value=""; try{ await flush(t); }catch(e){} render(); };
    add.querySelector("button").onclick=go; ai.addEventListener("keydown", e=>{ if(e.key==="Enter") go(); });
    host.appendChild(add);
  }

  function itemRow(t, it, idx, saveEl){
    const isSteps = t.type==="steps";
    const row = el(`<div class="tk-item ${it.done?"done":""}"></div>`);
    const r = el(`<div class="tk-irow"></div>`);
    const cb = el(`<button class="tk-cbox ${it.done?"on":""}">${it.done?"✓":""}</button>`);
    cb.onclick = async()=>{ it.done=!it.done; try{ await flush(t); }catch(e){} render(); };
    r.appendChild(cb);
    if(isSteps){
      const ord = el(`<div class="tk-ord"></div>`);
      const up = el(`<button class="tk-ib" title="вверх">↑</button>`), dn = el(`<button class="tk-ib" title="вниз">↓</button>`);
      up.disabled = idx===0; dn.disabled = idx===t.items.length-1;
      up.onclick = async()=>{ const a=t.items; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; try{ await flush(t); }catch(e){} render(); };
      dn.onclick = async()=>{ const a=t.items; [a[idx+1],a[idx]]=[a[idx],a[idx+1]]; try{ await flush(t); }catch(e){} render(); };
      ord.append(up,dn); r.appendChild(ord);
    }
    const tx = el(`<input class="tk-itext" value="${esc(it.text)}">`);
    tx.addEventListener("input", ()=>{ it.text=tx.value; schedule(t,saveEl); });
    tx.addEventListener("blur", async()=>{ if(!tx.value.trim()){ const i=t.items.indexOf(it); if(i>-1) t.items.splice(i,1); } try{ await flush(t); }catch(e){} render(); });
    r.appendChild(tx);
    const x = el(`<button class="tk-ib tk-x" title="удалить">✕</button>`);
    x.onclick = async()=>{ const i=t.items.indexOf(it); if(i>-1) t.items.splice(i,1); try{ await flush(t); }catch(e){} render(); };
    r.appendChild(x);
    row.appendChild(r);
    if(isSteps){
      const note = el(`<textarea class="tk-inote" placeholder="заметка к шагу…"></textarea>`); note.value=it.note||"";
      note.addEventListener("input", ()=>{ it.note=note.value; schedule(t,saveEl); });
      note.addEventListener("blur", ()=>{ flush(t).catch(()=>{}); });
      row.appendChild(note);
      row.appendChild(el(`<div class="tk-sfiles">файлы шага</div>`));
      if(!it.attachments) it.attachments=[];
      row.appendChild(attachEditor(t, it.attachments, saveEl));
    }
    return row;
  }

  // редактор вложений: загружает байты в Documents/Task-N/ сразу при добавлении
  function attachEditor(t, arr, saveEl){
    const box = el(`<div class="tk-att"></div>`);
    const add = el(`<button class="btn ghost tk-mini" type="button">＋ файл</button>`);
    const list = el(`<div class="tk-atts"></div>`);
    function chip(a, i){
      const c = el(`<div class="tk-chip"></div>`);
      if(tkIsImg(a)){ const img=el(`<img alt="">`); c.appendChild(img);
        tkBlobUrl(t,a.name).then(u=>{ img.src=u; }).catch(()=>{ img.remove(); }); }
      const fn = el(`<span class="fn">${esc(a.name)}</span>`); fn.onclick=()=>openAtt(t,a); c.appendChild(fn);
      const x = el(`<button class="tk-ib" type="button">✕</button>`);
      x.onclick = async()=>{ arr.splice(i,1); try{ await flush(t); if(saveEl) saveEl.textContent="сохранено"; }catch(e){} draw(); };
      c.appendChild(x); return c;
    }
    function draw(){ list.innerHTML=""; arr.forEach((a,i)=>list.appendChild(chip(a,i))); }
    add.onclick = ()=> pickFiles(async files=>{
      if(saveEl) saveEl.textContent="загрузка…";
      try{ await ensureDir(DOCS+"/"+t.name);
        for(const f of files){ await putBytes(DOCS+"/"+t.name+"/"+f.name, f, f.type||"application/octet-stream"); arr.push({name:f.name, type:f.type||tkGuessType(f.name)}); }
        await flush(t); if(saveEl) saveEl.textContent="сохранено";
      }catch(e){ if(saveEl) saveEl.textContent="ошибка загрузки"; alert("Не удалось загрузить файл: "+e.message); }
      draw();
    });
    box.append(add,list); draw(); return box;
  }

  // ——— переходы между папками ———
  async function moveClose(t){
    tkSetStatus(t,"done");
    try{ await ensureDir(AR); await putText(AR+"/"+t.fileName, tkSerialize(t)); await davDelete(A+"/"+t.fileName); }
    catch(e){ alert("Не удалось перенести в архив: "+e.message); return; }
    t._dir=AR; active=active.filter(x=>x!==t); archived.unshift(t);
    tab="archive"; view="list"; render();
  }
  async function moveReopen(t){
    tkSetStatus(t,"todo");
    try{ await ensureDir(A); await putText(A+"/"+t.fileName, tkSerialize(t)); await davDelete(AR+"/"+t.fileName); }
    catch(e){ alert("Не удалось вернуть в активные: "+e.message); return; }
    t._dir=A; archived=archived.filter(x=>x!==t); active.unshift(t);
    tab="active"; view="list"; render();
  }
  async function removeTask(t){
    try{ await davDelete(fileOf(t)); }catch(e){ alert("Не удалось удалить: "+e.message); return; }
    active=active.filter(x=>x!==t); archived=archived.filter(x=>x!==t);
    view="list"; render();
  }

  // ——— создание ———
  async function createTask(draft){
    const id=nextId(), at=stamp(), name="Task-"+id;
    const t = { fileName:name+".md", name, id, fm:{}, title:draft.title.trim(), type:draft.type,
      opened_at:at, status:"todo", closed_at:"", history:[{status:"todo",at}],
      description: draft.type==="simple" ? (draft.description||"") : "", attachments:[],
      items: draft.type==="simple" ? [] : (draft.items||[]).filter(i=>i.text && i.text.trim()),
      intro: draft.type==="simple" ? "" : (draft.description||"").trim(), outro:"", _dir:A };
    await ensureDir(A);
    if(draft.type==="simple" && (draft.attachments||[]).length){
      await ensureDir(DOCS+"/"+name);
      for(const a of draft.attachments){ if(a.file){ await putBytes(DOCS+"/"+name+"/"+a.name, a.file, a.type||"application/octet-stream"); } t.attachments.push({name:a.name, type:a.type||tkGuessType(a.name)}); }
    }
    await tkSave(t); active.unshift(t); return t;
  }

  function openCreate(){
    const draft = { title:"", type:"checklist", description:"", attachments:[], items:[] };
    const ov = el(`<div class="modal-ov"></div>`);
    const modal = el(`<div class="modal tk-modal"></div>`);
    ov.appendChild(modal); ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
    function drawM(){
      modal.innerHTML = "";
      modal.appendChild(el(`<div class="tk-sec" style="margin-top:0">Новая задача</div>`));
      const title = el(`<input class="tk-title" placeholder="Заголовок задачи…">`); title.value=draft.title;
      modal.appendChild(title);
      const seg = el(`<div class="tk-seg"></div>`);
      TK_TYPES.forEach(v=>{ const b=el(`<button class="${draft.type===v?"on":""}">${TK_TYPE_LABEL[v]}</button>`); b.onclick=()=>{ draft.type=v; drawM(); }; seg.appendChild(b); });
      modal.appendChild(seg);
      modal.appendChild(el(`<div class="tk-sec">Описание</div>`));
      const dd = el(`<textarea class="tk-desc" placeholder="Описание задачи…"></textarea>`); dd.value=draft.description; dd.addEventListener("input",()=>draft.description=dd.value);
      modal.appendChild(dd);
      if(draft.type==="simple"){
        modal.appendChild(el(`<div class="tk-sec">Файлы</div>`));
        modal.appendChild(modalAttach(draft.attachments));
      } else {
        modal.appendChild(el(`<div class="tk-sec">${draft.type==="steps"?"Шаги":"Пункты"} — можно добавить сейчас или позже</div>`));
        modal.appendChild(builder(draft));
      }
      const act = el(`<div class="tk-actions" style="border:0;margin-top:14px"></div>`);
      const create = el(`<button class="btn">Создать</button>`); create.disabled=!draft.title.trim();
      create.onclick = async()=>{ if(!draft.title.trim()) return; create.disabled=true; create.textContent="Создаю…";
        try{ const t=await createTask(draft); ov.remove(); detailName=t.name; view="detail"; render(); }
        catch(e){ create.disabled=false; create.textContent="Создать"; alert("Не удалось создать: "+e.message); } };
      const cancel = el(`<button class="btn ghost">Отмена</button>`); cancel.onclick=()=>ov.remove();
      act.append(create,cancel); modal.appendChild(act);
      title.addEventListener("input", ()=>{ draft.title=title.value; create.disabled=!draft.title.trim(); });
    }
    drawM(); document.body.appendChild(ov);
    setTimeout(()=>{ const ti=modal.querySelector(".tk-title"); if(ti) ti.focus(); }, 0);
  }

  function modalAttach(arr){
    const box = el(`<div class="tk-att"></div>`);
    const add = el(`<button class="btn ghost tk-mini" type="button">＋ файл</button>`);
    const list = el(`<div class="tk-atts"></div>`);
    function draw(){ list.innerHTML="";
      arr.forEach((a,i)=>{ const c=el(`<div class="tk-chip"></div>`);
        if(a.file && tkIsImg(a)){ const img=el(`<img alt="">`); img.src=URL.createObjectURL(a.file); c.appendChild(img); }
        c.appendChild(el(`<span class="fn" style="cursor:default">${esc(a.name)}</span>`));
        const x=el(`<button class="tk-ib" type="button">✕</button>`); x.onclick=()=>{ arr.splice(i,1); draw(); }; c.appendChild(x);
        list.appendChild(c); }); }
    add.onclick = ()=> pickFiles(files=>{ files.forEach(f=>arr.push({name:f.name,size:f.size,type:f.type||tkGuessType(f.name),file:f})); draw(); });
    box.append(add,list); draw(); return box;
  }

  function builder(draft){
    const box = el(`<div></div>`); const list = el(`<div></div>`);
    function draw(){ list.innerHTML="";
      draft.items.forEach((it,idx)=>{ const row=el(`<div class="tk-addrow"></div>`); const inp=el(`<input value="${esc(it.text)}">`);
        inp.addEventListener("input",()=>it.text=inp.value); const x=el(`<button class="tk-ib tk-x" type="button">✕</button>`); x.onclick=()=>{ draft.items.splice(idx,1); draw(); };
        row.append(inp,x); list.appendChild(row); }); }
    const addRow = el(`<div class="tk-addrow"><input placeholder="Добавить и Enter…"><button class="btn tk-mini" type="button">＋</button></div>`);
    const ai = addRow.querySelector("input");
    const go = ()=>{ const v=ai.value.trim(); if(!v) return; draft.items.push({text:v,done:false,note:"",attachments:[]}); ai.value=""; draw(); ai.focus(); };
    addRow.querySelector("button").onclick=go; ai.addEventListener("keydown", e=>{ if(e.key==="Enter") go(); });
    box.append(list,addRow); draw(); return box;
  }

  render();
}

export { renderTasks };
