import { getText, putText, listDir, ensureDir, davDelete } from "../core/dav.js";
import { bodyOf, parseFrontmatter } from "../core/md.js";
import { MONTHS, pad, fmtDate, parseDate, today, weekStart, addDays, ruDate } from "../core/dates.js";
import { el, esc, setCount } from "../ui/dom.js";
import { showConfirm, showPrompt } from "../ui/modal.js";

// ——— Sport ———
const SP_COLORS = ["#22d3ee","#4ade80","#fb923c","#f472b6","#facc15","#38bdf8","#fb7185","#a3e635","#2dd4bf","#fdba74"];
const SP_HEAT_WEEKS = 26, SP_BAR_WEEKS = 12;

function spParseLog(md){
  const fm = parseFrontmatter(md) || {};
  const types = Array.isArray(fm.types) ? fm.types.slice() : [];
  const lines = bodyOf(md).split(/\r?\n/).map(l=>l.trim()).filter(l=>l.startsWith("|"));
  const log = [];
  if(lines.length>=2){
    const cells = l => l.replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim().replace(/\\\|/g,"|"));
    const header = cells(lines[0]).map(h=>h.toLowerCase());
    const ix = n => header.indexOf(n);
    const iD=ix("date"), iT=ix("type"), iP=ix("program"), iN=ix("note");
    for(let i=1;i<lines.length;i++){
      if(/^[|\s:\-]+$/.test(lines[i])) continue;
      const c = cells(lines[i]); const date=(iD>=0?c[iD]:c[0])||""; if(!date) continue;
      let program=""; if(iP>=0 && c[iP]){ const mm=c[iP].match(/\[([^\]]*)\]/); program = mm?mm[1]:c[iP]; }
      log.push({ date, type:iT>=0?(c[iT]||""):"", program, note:iN>=0?(c[iN]||""):"" });
    }
  }
  return { fm, types, log };
}
function spSerializeLog(fm, types, log){
  const f = Object.assign({}, fm); f.types = types;
  let y; try{ y = jsyaml.dump(f,{lineWidth:-1}).replace(/\n+$/,""); }catch(e){ y = "types: []"; }
  const cell = s => String(s||"").replace(/\r?\n/g," ").replace(/\|/g,"\\|");
  const rows = log.slice().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0).map(e=>{
    const prog = e.program ? `[${e.program}](Workouts/${encodeURI(e.program)}.md)` : "";
    return `| ${e.date} | ${cell(e.type)} | ${prog} | ${cell(e.note)} |`;
  }).join("\n");
  return `---\n${y}\n---\n\n| Date | Type | Program | Note |\n|---|---|---|---|\n${rows}\n`;
}
function spParseProgram(fileName, md){
  const fm = parseFrontmatter(md) || {};
  return { fileName, name:fileName.replace(/\.md$/i,""), type:fm.type||"", fm, body:bodyOf(md).replace(/^\n+/,"") };
}
function spSerializeProgram(p){
  const f = Object.assign({}, p.fm||{}); if(p.type) f.type=p.type; else delete f.type;
  const fmStr = Object.keys(f).length ? "---\n"+jsyaml.dump(f,{lineWidth:-1}).replace(/\n+$/,"")+"\n---\n\n" : "";
  return fmStr + (p.body||"");
}
async function spLoadPrograms(dir){
  let items;
  try{ items=(await listDir(dir)).filter(x=>!x.isDir && /\.md$/i.test(x.name)); }
  catch(e){ if(/HTTP 404/.test(String(e.message))) return []; throw e; }
  const out=[];
  for(const it of items){ try{ out.push(spParseProgram(it.name, await getText(dir+"/"+it.name))); }catch(e){} }
  out.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  return out;
}

async function renderSport(base, host){
  const LOG = base+"/Sport_log.md", WK = base+"/Workouts";
  setCount("");
  host.innerHTML = `<div class="loading"><div class="spin"></div> loading sport…</div>`;
  let fm={}, types=[], log=[], programs=[];
  try{
    let md=""; try{ md = await getText(LOG); }catch(e){ if(!/HTTP 404/.test(String(e.message))) throw e; }
    const p = spParseLog(md); fm=p.fm; types=p.types; log=p.log;
    if(!types.length) types = ["Зал","Плавание","Бег"];
    programs = await spLoadPrograms(WK);
  }catch(e){ host.innerHTML = `<div class="note err">Ошибка загрузки Sport: ${esc(e.message)}</div>`; return; }

  let tab="track", formOpen=false, typesOpen=false, wView="list", wEdit=-1;

  async function saveLog(){ await ensureDir(base); await putText(LOG, spSerializeLog(fm,types,log)); }
  async function saveProgram(p){ await ensureDir(WK); await putText(WK+"/"+p.fileName, spSerializeProgram(p)); }
  const colorOf = t => { const i=types.indexOf(t); return i<0 ? "var(--faint)" : SP_COLORS[i%SP_COLORS.length]; };
  const weekHas = start => log.some(e=>{ const d=parseDate(e.date); return d>=start && d<=addDays(start,6); });
  function weekStreak(){ let ws=weekStart(today()), s=0; if(!weekHas(ws)) ws=addDays(ws,-7); while(weekHas(ws)){ s++; ws=addDays(ws,-7); } return s; }

  function paint(){
    host.innerHTML="";
    const tabs = el(`<div class="sp-tabs"></div>`);
    const t1 = el(`<button class="sp-tab ${tab==="track"?"on":""}">Трекер</button>`);
    const t2 = el(`<button class="sp-tab ${tab==="workouts"?"on":""}">Программы · ${programs.length}</button>`);
    t1.onclick=()=>{ tab="track"; wView="list"; paint(); };
    t2.onclick=()=>{ tab="workouts"; paint(); };
    tabs.append(t1,t2); host.appendChild(tabs);
    if(tab==="workouts"){ paintWorkouts(); return; }
    paintTrack();
  }

  function paintTrack(){
    const ws = weekStart(today());
    const weekN = log.filter(e=>{ const d=parseDate(e.date); return d>=ws && d<=addDays(ws,6); }).length;
    setCount(log.length + (log.length===1?" трен.":" трен."));
    const stats = el(`<div class="sp-stats"></div>`);
    stats.appendChild(el(`<div class="sp-stat"><div class="n">${log.length}</div><div class="l">всего</div></div>`));
    stats.appendChild(el(`<div class="sp-stat"><div class="n">${weekN}</div><div class="l">эта неделя</div></div>`));
    stats.appendChild(el(`<div class="sp-stat"><div class="n">${weekStreak()}</div><div class="l">серия, нед.</div></div>`));
    host.appendChild(stats);

    if(!formOpen){ const b=el(`<button class="btn sp-add">＋ Отметить тренировку</button>`); b.onclick=()=>{ formOpen=true; paint(); }; host.appendChild(b); }
    else host.appendChild(buildForm());

    const tbtn = el(`<button class="btn ghost sp-mini sp-mgrbtn">⚙ Виды спорта (${types.length})</button>`);
    tbtn.onclick=()=>{ typesOpen=!typesOpen; paint(); }; host.appendChild(tbtn);
    if(typesOpen) host.appendChild(buildTypesMgr());

    host.appendChild(el(`<div class="sp-sec">Календарь активности</div>`)); host.appendChild(buildHeatmap());
    host.appendChild(el(`<div class="sp-sec">По неделям</div>`)); host.appendChild(buildBars());
    host.appendChild(el(`<div class="sp-sec">Журнал</div>`)); host.appendChild(buildLog());
  }

  function buildForm(){
    const f = el(`<div class="sp-form"></div>`);
    let selType = types[0]||"", selProg="";
    const dr = el(`<div class="sp-frow"><label>Дата</label><input type="date" id="f_date"></div>`); f.appendChild(dr);
    dr.querySelector("#f_date").value = fmtDate(today());
    const tr = el(`<div class="sp-frow"><label>Тип тренировки</label><div class="sp-chips" id="f_ch"></div></div>`); f.appendChild(tr);
    const ch = tr.querySelector("#f_ch");
    function drawCh(){
      ch.innerHTML="";
      types.forEach(t=>{ const c=el(`<button class="sp-chip ${t===selType?"on":""}">${esc(t)}</button>`); c.onclick=()=>{ selType=t; drawCh(); }; ch.appendChild(c); });
      const a = el(`<button class="sp-chip add">＋ тип</button>`);
      a.onclick=async()=>{ const n=await showPrompt("Новый тип тренировки:","","Добавить"); if(n==null) return; const nm=n.trim(); if(!nm) return;
        if(!types.includes(nm)){ types.push(nm); try{ await saveLog(); }catch(e){ alert("Не сохранилось: "+e.message); } } selType=nm; drawCh(); };
      ch.appendChild(a);
    }
    drawCh();
    const pr = el(`<div class="sp-frow"><label>Программа (опционально)</label><select id="f_prog"></select></div>`); f.appendChild(pr);
    const ps = pr.querySelector("#f_prog");
    ps.innerHTML = `<option value="">— без программы —</option>` + programs.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join("");
    if(!programs.length){ ps.disabled=true; pr.querySelector("label").textContent="Программа (нет — добавь во вкладке «Программы»)"; }
    ps.onchange=()=> selProg=ps.value;
    const nr = el(`<div class="sp-frow"><label>Заметка (необязательно)</label><input class="note" id="f_note" autocomplete="off" placeholder="например: грудь/трицепс, 1 км…"></div>`); f.appendChild(nr);
    const bt = el(`<div class="sp-formbtns"></div>`);
    const sv = el(`<button class="btn">Сохранить</button>`);
    sv.onclick=async()=>{ const date=f.querySelector("#f_date").value||fmtDate(today()); if(!selType){ alert("Выбери тип тренировки."); return; }
      const e={ date, type:selType, program:selProg, note:f.querySelector("#f_note").value.trim() }; log.push(e); sv.disabled=true;
      try{ await saveLog(); formOpen=false; paint(); }catch(err){ log.pop(); sv.disabled=false; alert("Не сохранилось: "+err.message); } };
    const cn = el(`<button class="btn ghost">Отмена</button>`); cn.onclick=()=>{ formOpen=false; paint(); };
    bt.append(sv,cn); f.appendChild(bt); return f;
  }

  function buildTypesMgr(){
    const p = el(`<div class="sp-tmgr"></div>`);
    if(!types.length) p.appendChild(el(`<div class="empty" style="padding:8px 0">Видов пока нет.</div>`));
    types.forEach(t=>{
      const r = el(`<div class="sp-trow"></div>`);
      r.appendChild(el(`<span class="tn"><span class="sp-sw" style="background:${colorOf(t)};margin-right:8px"></span>${esc(t)}</span>`));
      const ren = el(`<button class="btn ghost sp-mini">переим.</button>`);
      ren.onclick=async()=>{ const n=await showPrompt("Новое название вида:",t,"Сохранить"); if(n==null) return; await renameType(t,n); };
      const del = el(`<button class="btn ghost sp-mini tk-danger">удалить</button>`); del.onclick=()=>deleteType(t);
      r.append(ren,del); p.appendChild(r);
    });
    const add = el(`<button class="btn ghost sp-mini" style="margin-top:10px">＋ добавить вид</button>`);
    add.onclick=async()=>{ const n=await showPrompt("Новый вид спорта:","","Добавить"); if(n==null) return; const nm=n.trim();
      if(nm && !types.includes(nm)){ types.push(nm); try{ await saveLog(); }catch(e){ alert(e.message); } } paint(); };
    p.appendChild(add); return p;
  }

  async function renameType(oldN, newN){
    newN=(newN||"").trim(); if(!newN || newN===oldN) return;
    if(types.includes(newN)){ alert("Такой вид уже есть."); return; }
    const i=types.indexOf(oldN); if(i<0) return;
    types[i]=newN; log.forEach(e=>{ if(e.type===oldN) e.type=newN; });
    const aff = programs.filter(p=>p.type===oldN); aff.forEach(p=>p.type=newN);
    try{ await saveLog(); for(const p of aff) await saveProgram(p); }catch(e){ alert("Ошибка переименования: "+e.message); }
    paint();
  }
  async function deleteType(t){
    const inLog=log.filter(e=>e.type===t).length, inProg=programs.filter(p=>p.type===t).length;
    let msg=`Удалить вид «${t}»?`;
    if(inLog) msg+=` В журнале ${inLog} трен. сохранят метку.`;
    if(inProg) msg+=` У ${inProg} программ(ы) вид очистится.`;
    if(!(await showConfirm(msg,"Удалить"))) return;
    types=types.filter(x=>x!==t);
    const aff=programs.filter(p=>p.type===t); aff.forEach(p=>p.type="");
    try{ await saveLog(); for(const p of aff) await saveProgram(p); }catch(e){ alert("Ошибка удаления: "+e.message); }
    paint();
  }

  function buildHeatmap(){
    const byDate={}; log.forEach(e=>{ (byDate[e.date]=byDate[e.date]||[]).push(e); });
    const wrapEl=el(`<div></div>`), scroll=el(`<div class="sp-hm-wrap"></div>`), hm=el(`<div class="sp-hm"></div>`);
    const end=weekStart(today()), start=addDays(end,-(SP_HEAT_WEEKS-1)*7), tEnd=today(); let prevMon=-1;
    for(let w=0;w<SP_HEAT_WEEKS;w++){
      const col=el(`<div class="sp-hm-col"></div>`), cs=addDays(start,w*7), mon=cs.getMonth();
      col.appendChild(el(`<div class="sp-hm-mon">${mon!==prevMon?MONTHS[mon]:""}</div>`)); prevMon=mon;
      for(let r=0;r<7;r++){
        const d=addDays(cs,r), key=fmtDate(d), future=d>tEnd;
        const list=(byDate[key]||[]).slice().sort((a,b)=>types.indexOf(a.type)-types.indexOf(b.type));
        const cell=el(`<div class="sp-cell ${future?"future":""}" title="${key}${list.length?" · "+esc(list.map(e=>e.type).join(", ")):""}"></div>`);
        list.forEach(e=>{ const sg=document.createElement("div"); sg.className="sg"; sg.style.background=colorOf(e.type); cell.appendChild(sg); });
        col.appendChild(cell);
      }
      hm.appendChild(col);
    }
    scroll.appendChild(hm); wrapEl.appendChild(scroll);
    const lg=el(`<div class="sp-legend"></div>`);
    types.forEach(t=>{ lg.appendChild(el(`<span class="sp-lg"><span class="sp-sw" style="background:${colorOf(t)}"></span>${esc(t)}</span>`)); });
    if(types.length) wrapEl.appendChild(lg);
    return wrapEl;
  }

  function buildBars(){
    const cmap={}; log.forEach(e=>{ cmap[e.date]=(cmap[e.date]||0)+1; });
    const wrapEl=el(`<div></div>`), end=weekStart(today()), weeks=[];
    for(let w=SP_BAR_WEEKS-1;w>=0;w--){ const s=addDays(end,-w*7); let n=0; for(let r=0;r<7;r++) n+=cmap[fmtDate(addDays(s,r))]||0; weeks.push({s,n}); }
    const max=Math.max(1,...weeks.map(x=>x.n));
    const bars=el(`<div class="sp-bars"></div>`);
    weeks.forEach(x=>{ const col=el(`<div class="sp-bcol"></div>`); if(x.n>0) col.appendChild(el(`<div class="sp-bval">${x.n}</div>`));
      const h = x.n>0 ? Math.round(x.n/max*72)+8 : 2; col.appendChild(el(`<div class="sp-bar" style="height:${h}%"></div>`)); bars.appendChild(col); });
    wrapEl.appendChild(bars);
    const labels=el(`<div class="sp-blabels"></div>`);
    weeks.forEach((x,i)=> labels.appendChild(el(`<div class="sp-blabel">${i%2===0?(pad(x.s.getDate())+"."+pad(x.s.getMonth()+1)):""}</div>`)));
    wrapEl.appendChild(labels); return wrapEl;
  }

  function buildLog(){
    const box=el(`<div></div>`);
    if(!log.length){ box.appendChild(el(`<div class="empty">Пока пусто — отметь первую тренировку ↑</div>`)); return box; }
    const byDate={}; log.forEach(e=>{ (byDate[e.date]=byDate[e.date]||[]).push(e); });
    const dates=Object.keys(byDate).sort((a,b)=>a<b?1:-1);
    for(const date of dates){
      const day=el(`<div class="sp-logday"></div>`); day.appendChild(el(`<div class="sp-logdate">${ruDate(date)}</div>`));
      for(const e of byDate[date]){
        const row=el(`<div class="sp-entry"></div>`);
        row.appendChild(el(`<span class="sp-badge" style="border-color:${colorOf(e.type)}">${esc(e.type)}</span>`));
        row.appendChild(el(`<span class="note">${esc(e.note||"")}</span>`));
        if(e.program){ const ref=el(`<button class="sp-ref" title="открыть программу">▸ ${esc(e.program)}</button>`);
          ref.onclick=()=>{ const idx=programs.findIndex(p=>p.name===e.program); if(idx>=0){ tab="workouts"; wEdit=idx; wView="read"; paint(); } else alert("Программа не найдена (возможно, переименована/удалена)."); };
          row.appendChild(ref); }
        const x=el(`<button class="sp-ref" title="удалить">✕</button>`);
        x.onclick=async()=>{ const i=log.indexOf(e); if(i<0) return; const bak=log[i]; log.splice(i,1);
          try{ await saveLog(); paint(); }catch(err){ log.splice(i,0,bak); alert("Не сохранилось: "+err.message); } };
        row.appendChild(x);
        day.appendChild(row);
      }
      box.appendChild(day);
    }
    return box;
  }

  // ——— Программы ———
  function paintWorkouts(){
    if(wView==="read" && programs[wEdit]) return programRead(programs[wEdit]);
    if(wView==="edit") return programEdit();
    setCount(programs.length + " прогр.");
    const add=el(`<button class="btn sp-add">＋ Добавить программу</button>`); add.onclick=()=>{ wEdit=-1; wView="edit"; paint(); }; host.appendChild(add);
    host.appendChild(el(`<div class="sp-sec">Программы тренировок</div>`));
    if(!programs.length){ host.appendChild(el(`<div class="empty">Пусто — добавь первую программу.</div>`)); return; }
    programs.forEach((p,i)=>{
      const tb = p.type ? `<span class="sp-badge" style="font-size:10px;border-color:${colorOf(p.type)}">${esc(p.type)}</span>` : "";
      const row=el(`<button class="sp-prog"><span class="pn">${esc(p.name)}</span>${tb}<span class="pm">md ›</span></button>`);
      row.onclick=()=>{ wEdit=i; wView="read"; paint(); }; host.appendChild(row);
    });
  }
  function programRead(p){
    const back=el(`<button class="sp-back">← к программам</button>`); back.onclick=()=>{ wView="list"; paint(); }; host.appendChild(back);
    host.appendChild(el(`<div class="sp-ptitle" style="border:0;margin-bottom:6px">${esc(p.name)}</div>`));
    if(p.type) host.appendChild(el(`<div style="margin-bottom:14px"><span class="sp-badge" style="border-color:${colorOf(p.type)}">${esc(p.type)}</span></div>`));
    const doc=el(`<div class="doc"></div>`); doc.innerHTML = window.marked ? marked.parse(p.body||"") : esc(p.body||""); host.appendChild(doc);
    const act=el(`<div class="sp-pactions"></div>`);
    const ed=el(`<button class="btn">Редактировать</button>`); ed.onclick=()=>{ wView="edit"; paint(); };
    const del=el(`<button class="btn ghost tk-danger">Удалить</button>`);
    del.onclick=async()=>{ if(!(await showConfirm("Удалить программу?","Удалить"))) return;
      try{ await davDelete(WK+"/"+p.fileName); programs=programs.filter(x=>x!==p); wView="list"; paint(); }catch(e){ alert("Не удалилось: "+e.message); } };
    act.append(ed,del); host.appendChild(act);
  }
  function programEdit(){
    const isNew = wEdit<0; const p = isNew ? {fileName:"",name:"",type:"",fm:{},body:""} : programs[wEdit];
    const back=el(`<button class="sp-back">← отмена</button>`); back.onclick=()=>{ wView=isNew?"list":"read"; paint(); }; host.appendChild(back);
    const name=el(`<input class="sp-ptitle" placeholder="Название программы…">`); name.value=p.name; host.appendChild(name);
    let selType=p.type||"";
    host.appendChild(el(`<div class="sp-sec">Вид спорта (опционально)</div>`));
    const ch=el(`<div class="sp-chips"></div>`);
    function drawCh(){ ch.innerHTML="";
      const none=el(`<button class="sp-chip ${selType===""?"on":""}">— без вида —</button>`); none.onclick=()=>{ selType=""; drawCh(); }; ch.appendChild(none);
      types.forEach(t=>{ const c=el(`<button class="sp-chip ${selType===t?"on":""}">${esc(t)}</button>`); c.onclick=()=>{ selType=t; drawCh(); }; ch.appendChild(c); });
    }
    drawCh(); host.appendChild(ch);
    host.appendChild(el(`<div class="sp-sec">Содержимое (markdown)</div>`));
    const body=el(`<textarea class="sp-pbody" placeholder="# Тренировка груди&#10;- Жим лёжа 4×8&#10;- Разводка 3×12"></textarea>`); body.value=p.body; host.appendChild(body);
    const act=el(`<div class="sp-pactions"></div>`);
    const sv=el(`<button class="btn">Сохранить</button>`);
    sv.onclick=async()=>{ const nm=name.value.trim(); if(!nm){ alert("Нужно название."); return; }
      if(programs.some(x=>x!==(isNew?null:p) && x.name===nm)){ alert("Программа с таким именем уже есть."); return; }
      sv.disabled=true;
      try{
        if(isNew){ const np={fileName:nm+".md",name:nm,type:selType,fm:{},body:body.value}; await saveProgram(np); programs.push(np); programs.sort((a,b)=>a.name.localeCompare(b.name,'ru')); wEdit=programs.indexOf(np); }
        else { const oldFile=p.fileName; p.name=nm; p.type=selType; p.body=body.value; p.fileName=nm+".md"; await saveProgram(p); if(oldFile && oldFile!==p.fileName) await davDelete(WK+"/"+oldFile); programs.sort((a,b)=>a.name.localeCompare(b.name,'ru')); wEdit=programs.indexOf(p); }
        wView="read"; paint();
      }catch(e){ sv.disabled=false; alert("Не сохранилось: "+e.message); }
    };
    const cn=el(`<button class="btn ghost">Отмена</button>`); cn.onclick=()=>{ wView=isNew?"list":"read"; paint(); };
    act.append(sv,cn); host.appendChild(act);
  }

  paint();
}

export { renderSport };
